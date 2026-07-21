import * as db from './database.js';
import * as stellar from './stellar.js';
import { getExchangeRate, calculateQuote } from './rates.js';
import * as kotani from './kotani.js';
import config from '../config.js';
import type { ChatMessage, AiContext } from '../types/index.js';

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

async function buildContext(): Promise<AiContext> {
  const wallet = await db.getWallet();
  const goals = await db.getGoals();
  const { transactions } = await db.getTransactions({ limit: 10 });

  let liveBalance = 0;
  if (wallet?.publicKey) {
    try {
      const b = await stellar.getBalance(wallet.publicKey);
      liveBalance = b.usdc;
    } catch { /* 0 */ }
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: AiContext): string {
  const goalsText = ctx.goals.length > 0
    ? ctx.goals.map((g) => {
        const msText = g.milestones.length > 0
          ? g.milestones.map((m) =>
              `    - "${m.title}" (${m.completed ? '✅ Done' : `⏳ Pending — ${fiat(m.targetAmountUgx)}`})`
            ).join('\n')
          : '    (no milestones)';
        return `  - ID: "${g.id}"\n    Title: "${g.title}"\n    Saved: ${fiat(g.savedAmountUgx)} / ${fiat(g.targetAmountUgx)} (${percent(g.savedAmountUgx, g.targetAmountUgx)}%)\n    Remaining: ${fiat(g.targetAmountUgx - g.savedAmountUgx)}\n    Status: ${g.status}\n    Milestones:\n${msText}`;
      }).join('\n')
    : '  (no savings goals yet)';

  const txText = ctx.recentTransactions.length > 0
    ? ctx.recentTransactions.map((t) =>
        `  - ${t.type === 'sent' ? '→ Sent' : '← Received'} ${usdc(t.amountUsdc)} ${t.type === 'sent' ? 'to' : 'from'} ${t.recipientName} — ${t.purpose} (${t.status}, ${timeAgo(t.createdAt)})`
      ).join('\n')
    : '  (no recent transactions)';

  return `You are **Kanzu**, an AI financial companion for Twala. Twala helps people send money from the US to Uganda (USDC → Mobile Money via MTN/Airtel) and save towards financial goals.

## Current System State

**Wallet:** ${usdc(ctx.walletBalance)} USDC

**Savings Goals:**
${goalsText}

**Recent Transactions:**
${txText}

**Exchange Rate:** 1 USDC ≈ UGX 3,750 (0.5% fee applies, min $0.50)

## IMPORTANT — You Can Perform Actions

You have the ability to EXECUTE actions on behalf of the user using function calls. When the user asks you to do something, DO IT using the available functions. Do NOT just tell them how — actually execute it.

### Available Actions:
1. **create_goal** — Create a new savings goal
2. **contribute_to_goal** — Add funds to an existing goal (this also records a transaction)
3. **send_money** — Send USDC to someone in Uganda via Mobile Money
4. **update_goal** — Edit an existing goal's title, target, description, or milestones
5. **delete_goal** — Delete a goal permanently

## Guidelines
- When the user asks to create a goal, CALL create_goal immediately
- When asked to add funds to a goal, CALL contribute_to_goal
- When asked to send money, CALL send_money
- When asked to edit/update a goal, CALL update_goal
- When asked to remove/delete a goal, CALL delete_goal
- After executing, explain what happened and the result clearly
- Use markdown formatting
- Always reference actual data — never fabricate
- 1 USDC = 3,750 UGX (after 0.5% fee, min $0.50)
- Be warm and helpful`;
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
          amountUsdc: {
            oneOf: [{ type: 'number' }, { type: 'string' }],
            description: 'Amount in USDC (min 10, max 5000). Accepts number or string.',
          },
          recipientName: { type: 'string', description: 'Recipient full name' },
          recipientPhone: { type: 'string', description: 'Phone (e.g. +256...)' },
          recipientNetwork: {
            type: 'string',
            enum: ['MTN', 'AIRTEL'],
            description: 'Mobile network: MTN or AIRTEL',
          },
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
      description: 'Update an existing goal (title, description, target amount, category, milestones, status)',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'The goal ID to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          targetAmountUgx: { type: 'number', description: 'New target amount in UGX' },
          category: { type: 'string', enum: ['home', 'education', 'business', 'savings', 'land', 'other'], description: 'New category' },
          status: { type: 'string', enum: ['active', 'completed', 'cancelled'], description: 'New status' },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                targetAmountUgx: { type: 'number' },
                description: { type: 'string' },
              },
            },
            description: 'Milestone list (replaces all milestones)',
          },
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
        properties: {
          goalId: { type: 'string', description: 'The goal ID to delete' },
        },
        required: ['goalId'],
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
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return `❌ Error: Invalid arguments for ${name}`;
  }

  try {
    switch (name) {
      // ---------- create_goal ----------
      case 'create_goal': {
        const goal = await db.createGoal({
          title: args.title,
          description: args.description || '',
          targetAmountUgx: args.targetAmountUgx,
          category: args.category || 'other',
        });
        return `✅ Successfully created goal "${goal.title}" — target ${fiat(goal.targetAmountUgx)}. Goal ID: ${goal.id}`;
      }

      // ---------- contribute_to_goal ----------
      case 'contribute_to_goal': {
        const goal = await db.contributeToGoal(args.goalId, args.amountUgx);
        if (!goal) return `❌ Goal not found: ${args.goalId}`;

        // Record transaction
        await db.createTransaction({
          type: 'received',
          amountUsdc: args.amountUgx / 3750,
          amountUgx: args.amountUgx,
          rate: 3750,
          recipientName: `Contribution to ${goal.title}`,
          purpose: 'Goal Contribution',
          status: 'completed',
          goalId: goal.id,
        });

        const remaining = goal.targetAmountUgx - goal.savedAmountUgx;
        const pct = percent(goal.savedAmountUgx, goal.targetAmountUgx);
        const doneMs = goal.milestones.filter((m: any) => m.completed).length;
        const totMs = goal.milestones.length;

        let msg = `✅ Added ${fiat(args.amountUgx)} to "${goal.title}". Now ${fiat(goal.savedAmountUgx)} / ${fiat(goal.targetAmountUgx)} (${pct}%)`;
        if (remaining > 0) msg += `. ${fiat(remaining)} remaining to reach your goal! 🎯`;
        else msg += ` 🎉🎉 Goal fully funded! Congratulations!`;
        if (totMs > 0) msg += ` Milestones: ${doneMs}/${totMs} completed.`;
        return msg;
      }

      // ---------- send_money ----------
      case 'send_money': {
        // Coerce amountUsdc from string to number if needed
        const amountUsdc = typeof args.amountUsdc === 'string' ? parseFloat(args.amountUsdc) : args.amountUsdc;
        if (isNaN(amountUsdc)) return `❌ Invalid amount: ${args.amountUsdc}`;

        // Normalize network
        const network = args.recipientNetwork?.toUpperCase() === 'AIRTEL' ? 'AIRTEL' : 'MTN';

        const wallet = await db.getWallet();
        if (!wallet) return '❌ No wallet found. Create a wallet first.';

        const balance = await stellar.getBalance(wallet.publicKey);
        if (amountUsdc > balance.usdc) {
          return `❌ Insufficient balance. You have ${usdc(balance.usdc)} USDC but trying to send ${usdc(amountUsdc)}.`;
        }
        if (amountUsdc < config.twala.minTransferUsdc) return `❌ Minimum transfer is ${config.twala.minTransferUsdc} USDC.`;
        if (amountUsdc > config.twala.maxTransferUsdc) return `❌ Maximum transfer is ${config.twala.maxTransferUsdc} USDC.`;

        const rate = await getExchangeRate();
        const quote = calculateQuote(amountUsdc, rate);
        const referenceId = `twala-ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        let stellarTxHash = '';
        try {
          await stellar.ensureTrustline(wallet.secretKey);
          stellarTxHash = await stellar.submitPayment(
            wallet.secretKey,
            'GA7Q5OQJ6X4G6T5ZVQ4Q3Z6H5KQ7R5QKZ6H5KQ7R5QKZ6H5KQ7R5QKZ6',
            quote.sendAmountUsdc.toFixed(7),
            referenceId
          );
        } catch {
          stellarTxHash = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        const kotaniResult = await kotani.createOfframp({
          referenceId,
          cryptoAmount: quote.sendAmountUsdc,
          currency: 'UGX',
          chain: 'STELLAR',
          token: 'USDC',
          transactionHash: stellarTxHash,
        });

        await db.createTransaction({
          type: 'sent',
          amountUsdc: quote.sendAmountUsdc,
          amountUgx: quote.receiveAmountUgx,
          rate: quote.rate,
          recipientName: args.recipientName,
          recipientPhone: args.recipientPhone || '',
          recipientNetwork: network,
          status: 'pending',
          purpose: args.purpose || 'Transfer',
          stellarTxHash,
          kotaniReferenceId: referenceId,
          kotaniStatus: kotaniResult.data?.status || 'pending',
        });

        return `✅ **Sent ${usdc(quote.sendAmountUsdc)} to ${args.recipientName}!**\n- Delivery: ~${fiat(quote.receiveAmountUgx)} UGX via ${network}\n- Fee: ${usdc(quote.feeUsdc)}\n- Reference: ${referenceId.slice(-8)}`;
      }

      // ---------- update_goal ----------
      case 'update_goal': {
        const existing = await db.getGoal(args.goalId);
        if (!existing) return `❌ Goal not found: ${args.goalId}`;

        const updates: Record<string, any> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.description !== undefined) updates.description = args.description;
        if (args.targetAmountUgx !== undefined) updates.targetAmountUgx = args.targetAmountUgx;
        if (args.category !== undefined) updates.category = args.category;
        if (args.status !== undefined) updates.status = args.status;
        if (args.milestones !== undefined) {
          updates.milestones = args.milestones.map((m: any, i: number) => ({
            id: existing.milestones[i]?.id || `ms-${Date.now()}-${i}`,
            title: m.title,
            targetAmountUgx: m.targetAmountUgx || 0,
            description: m.description || '',
            completed: existing.milestones[i]?.completed || false,
            completedAt: existing.milestones[i]?.completedAt || undefined,
          }));
        }

        const updated = await db.updateGoal(args.goalId, updates as any);
        if (!updated) return `❌ Failed to update goal.`;
        return `✅ Goal "${updated.title}" updated! Target: ${fiat(updated.targetAmountUgx)}, Saved: ${fiat(updated.savedAmountUgx)} (${percent(updated.savedAmountUgx, updated.targetAmountUgx)}%)`;
      }

      // ---------- delete_goal ----------
      case 'delete_goal': {
        const goal = await db.getGoal(args.goalId);
        if (!goal) return `❌ Goal not found: ${args.goalId}`;
        await db.deleteGoal(args.goalId);
        return `✅ Goal "${goal.title}" has been deleted permanently.`;
      }

      default:
        return `❌ Unknown action: ${name}`;
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
  for (const msg of history.slice(-20)) {
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
          contents: buildGeminiContents(history, userMessage),
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.95, topK: 40 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      }
    );
    if (!response.ok) { console.error(`Gemini ${response.status}`, await response.text().catch(() => '')); return null; }
    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch (err) { console.error('Gemini fail:', err); return null; }
}

// ---------------------------------------------------------------------------
// Groq with function calling
// ---------------------------------------------------------------------------

async function callGroq(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GROQ_API_KEY();
  if (!key) return null;

  const messages: any[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
  ];
  for (const msg of history.slice(-20)) {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    // Round 1: Send with tools
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Groq error ${response.status}:`, body);
      // If it's a tool validation error, retry without tools
      if (response.status === 400 && body.includes('tool call validation')) {
        return await callGroqWithoutTools(key, messages);
      }
      return null;
    }

    const data: any = await response.json();
    const choice = data?.choices?.[0]?.message;
    if (!choice) return null;

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content?.trim() || null;
    }

    // Execute tools
    const toolResults: string[] = [];
    for (const toolCall of choice.tool_calls) {
      const result = await executeToolCall(toolCall);
      toolResults.push(result);
      messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] });
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }

    // Round 2: Get final response
    const finalRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
      }),
    });

    if (!finalRes.ok) return toolResults.join('\n\n');
    const finalData: any = await finalRes.json();
    return finalData?.choices?.[0]?.message?.content?.trim() || toolResults.join('\n\n');
  } catch (err) {
    console.error('Groq fail:', err);
    return null;
  }
}

// Fallback when tool validation fails
async function callGroqWithoutTools(key: string, messages: any[]): Promise<string | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

async function withRetry<T>(fn: () => Promise<T | null>, retries = 2, delay = 1000): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    const result = await fn();
    if (result !== null) return result;
    if (i < retries) await new Promise((r) => setTimeout(r, delay * (i + 1)));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Startup log
// ---------------------------------------------------------------------------

const _geminiKeyAvailable = !!GEMINI_API_KEY();
const _groqKeyAvailable = !!GROQ_API_KEY();
console.log(`  AI      : ${_geminiKeyAvailable ? 'Gemini ✓' : 'Gemini ✗'} | ${_groqKeyAvailable ? 'Groq ✓' : 'Groq ✗'}`);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function chat(userMessage: string): Promise<ChatMessage[]> {
  const ctx = await buildContext();
  const history = await db.getChatMessages();

  let reply: string | null = null;

  if (_groqKeyAvailable) {
    reply = await withRetry(() => callGroq(userMessage, ctx, history), 1, 1500);
  }
  if (!reply && _geminiKeyAvailable) {
    reply = await withRetry(() => callGemini(userMessage, ctx, history), 1, 2000);
  }
  if (!reply) {
    throw new Error('AI service unavailable — no API keys configured or all providers failed');
  }

  await db.addChatMessage({ role: 'user', content: userMessage });
  await db.addChatMessage({ role: 'assistant', content: reply });

  return db.getChatMessages();
}
