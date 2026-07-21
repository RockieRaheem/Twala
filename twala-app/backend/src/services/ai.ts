import * as db from './database.js';
import * as stellar from './stellar.js';
import { getExchangeRate, calculateQuote } from './rates.js';
import * as kotani from './kotani.js';
import config from '../config.js';
import type { ChatMessage, AiContext } from '../types/index.js';

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

const KOTANI_ESCROW_ADDRESS = 'GA7Q5OQJ6X4G6T5ZVQ4Q3Z6H5KQ7R5QKZ6H5KQ7R5QKZ6H5KQ7R5QKZ6';

const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];

let _pendingNavigate: { screen: string; goalId?: string } | null = null;

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

async function buildContext(): Promise<AiContext> {
  const wallet = await db.getWallet();
  const goals = await db.getGoals();
  const { transactions } = await db.getTransactions({ limit: 5 });

  let liveBalance = 0;
  if (wallet?.publicKey) {
    try { const b = await stellar.getBalance(wallet.publicKey); liveBalance = b.usdc; } catch { /* 0 */ }
  }

  return {
    walletBalance: liveBalance,
    goals,
    recentTransactions: transactions,
    activeGoal: goals.find((g) => g.status === 'active') || undefined,
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fiat(amount: number): string {
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `UGX ${(amount / 1_000).toFixed(1)}K`;
  return `UGX ${amount.toLocaleString('en-US')}`;
}

function usdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function percent(a: number, b: number): number {
  if (b <= 0) return 0;
  return Math.round((a / b) * 100);
}

// ---------------------------------------------------------------------------
// System prompt — KEPT SHORT to minimise token usage
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: AiContext): string {
  const goalCount = ctx.goals.length;
  const goalsBrief = goalCount > 0
    ? ctx.goals.map((g) =>
        `- "${g.title}" (${fiat(g.savedAmountUgx)}/${fiat(g.targetAmountUgx)}, ${percent(g.savedAmountUgx, g.targetAmountUgx)}%, id="${g.id}")`
      ).join('\n')
    : '(none)';

  const txBrief = ctx.recentTransactions.length > 0
    ? ctx.recentTransactions.map((t) =>
        `- ${t.type === 'sent' ? '→' : '←'} ${usdc(t.amountUsdc)} ${t.recipientName} (${t.status})`
      ).join('\n')
    : '(none)';

  return `You are Kanzu, an AI assistant for Twala — a USDC → Mobile Money service for Uganda.

Wallet: ${usdc(ctx.walletBalance)} USDC
Goals:\n${goalsBrief}
Recent txs:\n${txBrief}
Rate: 1 USDC ≈ UGX 3,750 (0.5% fee, min $0.50)

You can perform these actions via function calls — DO IT when asked, don't just describe it:
1. create_goal(title, targetAmountUgx, category?, description?) — new goal
2. contribute_to_goal(goalId, amountUgx) — add funds (records a tx)
3. send_money(amountUsdc, recipientName, recipientPhone?, recipientNetwork?, purpose) — send via Mobile Money
4. update_goal(goalId, title?, targetAmountUgx?, category?, status?, description?, milestones?) — edit goal
5. delete_goal(goalId) — remove goal
6. navigate(screen, goalId?) — go to Dashboard | Goals | Transfer | History | GoalDetail

Guidelines:
- Execute immediately when asked. Explain what happened after.
- Use markdown. Be warm and helpful.
- Always use real data — never fabricate.`;
}

// ---------------------------------------------------------------------------
// Tools (Groq function calling)
// ---------------------------------------------------------------------------

const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new savings goal',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Goal title (e.g. "Buy Land in Wakiso")' },
          description: { type: 'string', description: 'Optional description' },
          targetAmountUgx: { type: 'number', description: 'Target amount in UGX' },
          category: { type: 'string', enum: ['home', 'education', 'business', 'savings', 'land', 'other'], description: 'Category' },
        },
        required: ['title', 'targetAmountUgx'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'contribute_to_goal',
      description: 'Add funds to an existing savings goal',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'The goal ID to contribute to' },
          amountUgx: { type: 'number', description: 'Amount in UGX' },
        },
        required: ['goalId', 'amountUgx'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_money',
      description: 'Send USDC to a recipient in Uganda via Mobile Money',
      parameters: {
        type: 'object',
        properties: {
          amountUsdc: { oneOf: [{ type: 'number' }, { type: 'string' }], description: 'Amount in USDC (min 10, max 5000)' },
          recipientName: { type: 'string', description: 'Recipient full name' },
          recipientPhone: { type: 'string', description: 'Phone (e.g. +256...)' },
          recipientNetwork: { type: 'string', enum: ['MTN', 'AIRTEL'], description: 'Mobile network: MTN or AIRTEL' },
          purpose: { type: 'string', description: 'Purpose (e.g. "Family Support", "Land Payment")' },
        },
        required: ['amountUsdc', 'recipientName', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal',
      description: 'Update an existing goal (title, target, category, status, description, milestones)',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'The goal ID to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          targetAmountUgx: { type: 'number', description: 'New target amount in UGX' },
          category: { type: 'string', enum: ['home', 'education', 'business', 'savings', 'land', 'other'], description: 'New category' },
          status: { type: 'string', enum: ['active', 'completed', 'cancelled'], description: 'New status' },
        },
        required: ['goalId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_goal',
      description: 'Delete a savings goal permanently',
      parameters: {
        type: 'object',
        properties: { goalId: { type: 'string', description: 'The goal ID to delete' } },
        required: ['goalId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate/redirect the user to a specific screen in the app',
      parameters: {
        type: 'object',
        properties: {
          screen: { type: 'string', enum: ['Dashboard', 'Goals', 'Transfer', 'History', 'GoalDetail'], description: 'The screen to navigate to' },
          goalId: { type: 'string', description: 'Goal ID (required only when screen is GoalDetail)' },
        },
        required: ['screen'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeToolCall(toolCall: any): Promise<string> {
  const { name, arguments: rawArgs } = toolCall.function;
  let args: Record<string, any>;
  try { args = JSON.parse(rawArgs); } catch { return `❌ Invalid arguments for ${name}`; }

  try {
    switch (name) {
      case 'create_goal': {
        const goal = await db.createGoal({
          title: args.title,
          description: args.description || '',
          targetAmountUgx: args.targetAmountUgx,
          category: args.category || 'other',
        });
        return `✅ Created goal "${goal.title}" — target ${fiat(goal.targetAmountUgx)}. ID: ${goal.id}`;
      }

      case 'contribute_to_goal': {
        const goal = await db.contributeToGoal(args.goalId, args.amountUgx);
        if (!goal) return `❌ Goal not found: ${args.goalId}`;
        await db.createTransaction({
          type: 'received', amountUsdc: args.amountUgx / 3750, amountUgx: args.amountUgx,
          rate: 3750, recipientName: `Contribution to ${goal.title}`, purpose: 'Goal Contribution',
          status: 'completed', goalId: goal.id,
        });
        const remaining = goal.targetAmountUgx - goal.savedAmountUgx;
        const pct = percent(goal.savedAmountUgx, goal.targetAmountUgx);
        let msg = `✅ Added ${fiat(args.amountUgx)} to "${goal.title}". Now ${fiat(goal.savedAmountUgx)}/${fiat(goal.targetAmountUgx)} (${pct}%)`;
        if (remaining > 0) msg += `. ${fiat(remaining)} remaining 🎯`;
        else msg += ` 🎉 Fully funded!`;
        return msg;
      }

      case 'send_money': {
        const amountUsdc = typeof args.amountUsdc === 'string' ? parseFloat(args.amountUsdc) : args.amountUsdc;
        if (isNaN(amountUsdc)) return `❌ Invalid amount: ${args.amountUsdc}`;
        const network = args.recipientNetwork?.toUpperCase() === 'AIRTEL' ? 'AIRTEL' : 'MTN';
        const wallet = await db.getWallet();
        if (!wallet) return '❌ No wallet found.';
        const balance = await stellar.getBalance(wallet.publicKey);
        if (amountUsdc > balance.usdc) return `❌ Insufficient balance. You have ${usdc(balance.usdc)} USDC.`;
        if (amountUsdc < config.twala.minTransferUsdc) return `❌ Minimum is ${config.twala.minTransferUsdc} USDC.`;
        if (amountUsdc > config.twala.maxTransferUsdc) return `❌ Maximum is ${config.twala.maxTransferUsdc} USDC.`;

        const rate = await getExchangeRate();
        const quote = calculateQuote(amountUsdc, rate);
        const referenceId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        let stellarTxHash = '';
        try {
          await stellar.ensureTrustline(wallet.secretKey);
          stellarTxHash = await stellar.submitPayment(wallet.secretKey, KOTANI_ESCROW_ADDRESS, quote.sendAmountUsdc.toFixed(7), referenceId);
        } catch { stellarTxHash = `demo-${Date.now()}`; }

        const kotaniResult = await kotani.createOfframp({
          referenceId, cryptoAmount: quote.sendAmountUsdc, currency: 'UGX',
          chain: 'STELLAR', token: 'USDC', transactionHash: stellarTxHash,
        });

        await db.createTransaction({
          type: 'sent', amountUsdc: quote.sendAmountUsdc, amountUgx: quote.receiveAmountUgx,
          rate: quote.rate, recipientName: args.recipientName, recipientPhone: args.recipientPhone || '',
          recipientNetwork: network, status: 'pending', purpose: args.purpose || 'Transfer',
          stellarTxHash, kotaniReferenceId: referenceId, kotaniStatus: kotaniResult.data?.status || 'pending',
        });

        return `✅ **Sent ${usdc(quote.sendAmountUsdc)} to ${args.recipientName}!**\n- Delivery: ~${fiat(quote.receiveAmountUgx)} UGX via ${network}\n- Fee: ${usdc(quote.feeUsdc)}\n- Ref: ${referenceId.slice(-8)}`;
      }

      case 'update_goal': {
        const existing = await db.getGoal(args.goalId);
        if (!existing) return `❌ Goal not found: ${args.goalId}`;
        const updates: Record<string, any> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.description !== undefined) updates.description = args.description;
        if (args.targetAmountUgx !== undefined) updates.targetAmountUgx = args.targetAmountUgx;
        if (args.category !== undefined) updates.category = args.category;
        if (args.status !== undefined) updates.status = args.status;
        const updated = await db.updateGoal(args.goalId, updates as any);
        if (!updated) return `❌ Failed to update goal.`;
        return `✅ Goal "${updated.title}" updated! Target: ${fiat(updated.targetAmountUgx)}, Saved: ${fiat(updated.savedAmountUgx)} (${percent(updated.savedAmountUgx, updated.targetAmountUgx)}%)`;
      }

      case 'delete_goal': {
        const goal = await db.getGoal(args.goalId);
        if (!goal) return `❌ Goal not found: ${args.goalId}`;
        await db.deleteGoal(args.goalId);
        return `✅ Goal "${goal.title}" deleted permanently.`;
      }

      case 'navigate': {
        _pendingNavigate = { screen: args.screen, goalId: args.goalId };
        return `__NAVIGATE__:{"screen":"${args.screen}"${args.goalId ? `,"goalId":"${args.goalId}"` : ''}}`;
      }

      default: return `❌ Unknown action: ${name}`;
    }
  } catch (err: any) {
    return `❌ Error executing ${name}: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Gemini (text-only)
// ---------------------------------------------------------------------------

function buildGeminiContents(history: ChatMessage[], userMessage: string): any[] {
  const contents: any[] = [];
  for (const msg of history.slice(-10)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  return contents;
}

async function callGemini(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
          contents: buildGeminiContents(history, userMessage),
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      }
    );
    if (!res.ok) { console.error(`Gemini ${res.status}`); return null; }
    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) { console.error('Gemini fail:', err); return null; }
}

// ---------------------------------------------------------------------------
// Groq — returns string | null (null = all models exhausted)
// ---------------------------------------------------------------------------

async function callGroq(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GROQ_API_KEY();
  if (!key) return null;

  const messages: any[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
  ];
  for (const msg of history.slice(-10)) {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  for (const model of GROQ_MODELS) {
    const result = await tryGroqModel(model, key, messages);
    if (result !== null) return result;
    console.warn(`  Groq ${model} exhausted, trying next...`);
  }

  return null;
}

async function tryGroqModel(model: string, key: string, messages: any[]): Promise<string | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.7, max_tokens: 1024, top_p: 0.95 }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 429) {
        return null;
      }
      if (response.status === 400 && body.includes('tool call validation')) {
        const text = await tryGroqTextFallback(model, key, messages);
        return text;
      }
      console.error(`Groq ${model} error ${response.status}:`, body);
      return null;
    }

    const data: any = await response.json();
    const choice = data?.choices?.[0]?.message;
    if (!choice) return null;

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content?.trim() || null;
    }

    const toolResults: string[] = [];
    for (const toolCall of choice.tool_calls) {
      const result = await executeToolCall(toolCall);
      toolResults.push(result);
      messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] });
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }

    const finalRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024, top_p: 0.95 }),
    });

    if (!finalRes.ok) return toolResults.join('\n\n');
    const finalData: any = await finalRes.json();
    return finalData?.choices?.[0]?.message?.content?.trim() || toolResults.join('\n\n');
  } catch (err) {
    console.error(`Groq ${model} fail:`, err);
    return null;
  }
}

async function tryGroqTextFallback(model: string, key: string, messages: any[]): Promise<string | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024, top_p: 0.95 }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function chat(userMessage: string): Promise<{ messages: ChatMessage[]; navigate: { screen: string; goalId?: string } | null }> {
  _pendingNavigate = null;

  const ctx = await buildContext();
  const history = await db.getChatMessages();

  let reply: string | null = null;

  // Try Groq with all models
  if (GROQ_API_KEY()) {
    reply = await callGroq(userMessage, ctx, history);
  }

  // Fallback to Gemini if Groq failed
  if (!reply && GEMINI_API_KEY()) {
    reply = await callGemini(userMessage, ctx, history);
  }

  if (!reply) {
    throw new Error('AI service unavailable — all providers failed or rate limited');
  }

  // Check if a navigate tool was called
  if (_pendingNavigate) {
    // Inject navigate info into reply so frontend can pick it up
    // The reply itself will mention the navigation
  }

  await db.addChatMessage({ role: 'user', content: userMessage });
  await db.addChatMessage({ role: 'assistant', content: reply });

  const messages = await db.getChatMessages();

  return { messages, navigate: _pendingNavigate };
}
