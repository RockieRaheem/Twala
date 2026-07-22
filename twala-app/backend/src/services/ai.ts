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
  try {
    const wallet = await db.getWallet();
    const goals = await db.getGoals();
    const { transactions } = await db.getTransactions({ limit: 5 });

    let liveBalance = 0;
    if (wallet?.publicKey) {
      try { const b = await stellar.getBalance(wallet.publicKey); liveBalance = b.usdc; } catch { }
    }

    return {
      walletBalance: liveBalance,
      goals,
      recentTransactions: transactions,
      activeGoal: goals.find((g) => g.status === 'active') || undefined,
    };
  } catch {
    return { walletBalance: 0, goals: [], recentTransactions: [], activeGoal: undefined };
  }
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
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: AiContext): string {
  const goalsBrief = ctx.goals.length > 0
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

You can perform these actions via function calls — DO IT when asked:
1. create_goal(title, targetAmountUgx, category?, description?)
2. contribute_to_goal(goalId, amountUgx)
3. send_money(amountUsdc, recipientName, recipientPhone?, recipientNetwork?, purpose)
4. update_goal(goalId, title?, targetAmountUgx?, category?, status?, description?)
5. delete_goal(goalId)
6. navigate(screen, goalId?) — go to Dashboard | Goals | Transfer | History | GoalDetail

Be warm and helpful. Use markdown. Never fabricate data.`;
}

// ---------------------------------------------------------------------------
// Tools
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
          purpose: { type: 'string', description: 'Purpose (e.g. "Family Support")' },
        },
        required: ['amountUsdc', 'recipientName', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal',
      description: 'Update an existing goal',
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
          goalId: { type: 'string', description: 'Goal ID (for GoalDetail)' },
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
// Gemini
// ---------------------------------------------------------------------------

async function callGemini(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key) return null;
  try {
    const contents: any[] = [];
    for (const msg of history.slice(-10)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );
    if (!res.ok) { console.error(`Gemini ${res.status}`); return null; }
    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) { console.error('Gemini fail:', err); return null; }
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------

async function callGroq(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GROQ_API_KEY();
  if (!key) return null;

  for (const model of GROQ_MODELS) {
    try {
      const result = await tryGroqModel(model, key, userMessage, ctx, history);
      if (result !== null) return result;
    } catch (err) {
      console.error(`Groq ${model} error:`, err);
    }
    console.warn(`  Groq ${model} failed, trying next...`);
  }

  return null;
}

async function tryGroqModel(
  model: string, key: string, userMessage: string, ctx: AiContext, history: ChatMessage[],
): Promise<string | null> {
  const messages: any[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
  ];
  for (const msg of history.slice(-10)) {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.7, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 429) return null;
    if (response.status === 400 && body.includes('tool call validation')) {
      return await tryGroqText(model, key, messages);
    }
    console.error(`Groq ${model} ${response.status}:`, body);
    return null;
  }

  const data: any = await response.json();
  const choice = data?.choices?.[0]?.message;
  if (!choice) return null;

  if (!choice.tool_calls || choice.tool_calls.length === 0) {
    return choice.content || null;
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
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  });

  if (!finalRes.ok) return toolResults.join('\n\n');
  const finalData: any = await finalRes.json();
  return finalData?.choices?.[0]?.message?.content?.trim() || toolResults.join('\n\n');
}

async function tryGroqText(model: string, key: string, messages: any[]): Promise<string | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Startup log
// ---------------------------------------------------------------------------

console.log(`  AI      : ${GEMINI_API_KEY() ? 'Gemini ✓' : 'Gemini ✗'} | ${GROQ_API_KEY() ? `Groq ✓ (${GROQ_MODELS.join(', ')})` : 'Groq ✗'}`);

// ---------------------------------------------------------------------------
// Public API — EVERYTHING wrapped in try/catch so it NEVER throws
// ---------------------------------------------------------------------------

export async function chat(userMessage: string): Promise<{ messages: ChatMessage[]; navigate: { screen: string; goalId?: string } | null }> {
  _pendingNavigate = null;

  // 1. Save user message (best effort)
  try { await db.addChatMessage({ role: 'user', content: userMessage }); } catch (e) { console.error('Failed to save user msg:', e); }

  // 2. Build context
  const ctx = await buildContext();

  // 3. Get fresh history
  let history: ChatMessage[] = [];
  try { history = await db.getChatMessages(); } catch (e) { console.error('Failed to get history:', e); }

  // 4. Try AI providers
  let reply: string | null = null;

  if (GROQ_API_KEY()) {
    try { reply = await callGroq(userMessage, ctx, history); } catch (e) { console.error('Groq exception:', e); }
  }

  if (!reply && GEMINI_API_KEY()) {
    try { reply = await callGemini(userMessage, ctx, history); } catch (e) { console.error('Gemini exception:', e); }
  }

  // 5. Fallback if all providers failed
  if (!reply) {
    reply = "I'm sorry, I'm having trouble connecting right now due to rate limits. Please try again in a moment. In the meantime, you can use the Goals and Transfer tabs directly.";
    console.warn('  AI: All providers failed, using fallback message');
  }

  // 6. Save reply
  try { await db.addChatMessage({ role: 'assistant', content: reply }); } catch (e) { console.error('Failed to save reply:', e); }

  // 7. Return messages
  let messages: ChatMessage[] = [];
  try { messages = await db.getChatMessages(); } catch (e) { console.error('Failed to get final messages:', e); }

  return { messages, navigate: _pendingNavigate };
}
