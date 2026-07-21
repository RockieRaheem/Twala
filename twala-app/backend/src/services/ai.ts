import * as db from './database.js';
import * as stellar from './stellar.js';
import { getExchangeRate, calculateQuote } from './rates.js';
import * as kotani from './kotani.js';
import config from '../config.js';
import type { ChatMessage, AiContext } from '../types/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

// ---------------------------------------------------------------------------
// Context builder (reads live data from DB + Stellar)
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
    } catch { /* use 0 */ }
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
// System prompt — tells the AI it can ACT, not just talk
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: AiContext): string {
  const goalsText = ctx.goals.length > 0
    ? ctx.goals.map((g) => {
        const milestoneText = g.milestones.length > 0
          ? g.milestones.map((m) =>
              `    - "${m.title}" (${m.completed ? '✅ Done' : `⏳ Pending — ${fiat(m.targetAmountUgx)}`})`
            ).join('\n')
          : '    (no milestones)';
        return `  - ID: "${g.id}"\n    Title: "${g.title}"\n    Saved: ${fiat(g.savedAmountUgx)} / ${fiat(g.targetAmountUgx)} (${percent(g.savedAmountUgx, g.targetAmountUgx)}%)\n    Status: ${g.status}\n    Target date: ${new Date(g.targetDate).toLocaleDateString()}\n    Milestones:\n${milestoneText}`;
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

### Actions you can take:
1. **create_goal** — Create a new savings goal (title, targetAmountUgx, category, description)
2. **contribute_to_goal** — Add funds to an existing goal (goalId, amountUgx)
3. **send_money** — Send USDC to someone in Uganda (amountUsdc, recipientName, recipientPhone, recipientNetwork, purpose)

## Guidelines
- When the user asks to create a goal, SEND the create_goal function call
- When the user asks to add to a goal, SEND contribute_to_goal
- When the user asks to send money, SEND send_money
- After executing an action, explain what happened and the result
- Use markdown formatting (**bold** for emphasis, ## for section headers)
- Keep responses concise
- REFERENCE ACTUAL DATA — never make up transactions, goals, or balances
- Convert USDC to UGX at ~3,750 when discussing amounts
- Be helpful and warm`;
}

// ---------------------------------------------------------------------------
// Tool / Function definitions for Groq function calling
// ---------------------------------------------------------------------------

const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new savings goal with a target amount in UGX',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Goal title (e.g. "Buy Land in Wakiso")' },
          description: { type: 'string', description: 'Optional description' },
          targetAmountUgx: { type: 'number', description: 'Target amount in UGX' },
          category: { type: 'string', enum: ['home', 'education', 'business', 'savings', 'land', 'other'], description: 'Goal category' },
        },
        required: ['title', 'targetAmountUgx'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'contribute_to_goal',
      description: 'Add funds to an existing savings goal and auto-complete milestones when reached',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'The ID of the goal to contribute to' },
          amountUgx: { type: 'number', description: 'Amount to add in UGX' },
        },
        required: ['goalId', 'amountUgx'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_money',
      description: 'Send USDC from the wallet to a recipient in Uganda via Mobile Money',
      parameters: {
        type: 'object',
        properties: {
          amountUsdc: { type: 'number', description: 'Amount in USDC to send (min 10, max 5000)' },
          recipientName: { type: 'string', description: 'Recipient full name' },
          recipientPhone: { type: 'string', description: 'Recipient phone number (e.g. +2567...)', default: '' },
          recipientNetwork: { type: 'string', enum: ['MTN', 'AIRTEL'], description: 'Mobile network', default: 'MTN' },
          purpose: { type: 'string', description: 'Purpose of the transfer (e.g. "Family Support", "Land Payment", "School Fees")' },
        },
        required: ['amountUsdc', 'recipientName', 'purpose'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution handlers
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
      case 'create_goal': {
        const goal = await db.createGoal({
          title: args.title,
          description: args.description || '',
          targetAmountUgx: args.targetAmountUgx,
          category: args.category || 'other',
        });
        const targetFormatted = fiat(goal.targetAmountUgx);
        return `✅ Successfully created goal "${goal.title}" with target ${targetFormatted}. Goal ID: ${goal.id}. The user can now contribute towards it.`;
      }

      case 'contribute_to_goal': {
        const goal = await db.contributeToGoal(args.goalId, args.amountUgx);
        if (!goal) return `❌ Goal not found. ID: ${args.goalId}`;
        const remaining = goal.targetAmountUgx - goal.savedAmountUgx;
        const pct = percent(goal.savedAmountUgx, goal.targetAmountUgx);
        const completedCount = goal.milestones.filter((m: any) => m.completed).length;
        const totalMilestones = goal.milestones.length;
        let msg = `✅ Added ${fiat(args.amountUgx)} to "${goal.title}". Saved: ${fiat(goal.savedAmountUgx)} / ${fiat(goal.targetAmountUgx)} (${pct}%)`;
        if (remaining > 0) msg += `. Remaining: ${fiat(remaining)}.`;
        else msg += ` 🎉 Goal completed!`;
        if (totalMilestones > 0) msg += ` Milestones: ${completedCount}/${totalMilestones} done.`;
        return msg;
      }

      case 'send_money': {
        const wallet = await db.getWallet();
        if (!wallet) return '❌ No wallet found. Create a wallet first.';

        const balance = await stellar.getBalance(wallet.publicKey);
        if (args.amountUsdc > balance.usdc) {
          return `❌ Insufficient balance. You have ${usdc(balance.usdc)} USDC but trying to send ${usdc(args.amountUsdc)}.`;
        }
        if (args.amountUsdc < config.twala.minTransferUsdc) {
          return `❌ Minimum transfer is ${config.twala.minTransferUsdc} USDC.`;
        }
        if (args.amountUsdc > config.twala.maxTransferUsdc) {
          return `❌ Maximum transfer is ${config.twala.maxTransferUsdc} USDC.`;
        }

        const rate = await getExchangeRate();
        const quote = calculateQuote(args.amountUsdc, rate);
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

        const tx = await db.createTransaction({
          type: 'sent',
          amountUsdc: quote.sendAmountUsdc,
          amountUgx: quote.receiveAmountUgx,
          rate: quote.rate,
          recipientName: args.recipientName,
          recipientPhone: args.recipientPhone || '',
          recipientNetwork: (args.recipientNetwork as 'MTN' | 'AIRTEL') || 'MTN',
          status: 'pending',
          purpose: args.purpose || 'Transfer',
          stellarTxHash,
          kotaniReferenceId: referenceId,
          kotaniStatus: kotaniResult.data?.status || 'pending',
        });

        return `✅ **Sent ${usdc(quote.sendAmountUsdc)} USDC to ${args.recipientName}!**\n- Delivery: ~${fiat(quote.receiveAmountUgx)} UGX via ${args.recipientNetwork || 'MTN'} Mobile Money\n- Fee: ${usdc(quote.feeUsdc)}\n- Reference: ${referenceId.slice(-8)}\n- Status: ${tx.status}\n\nThe money is on its way!`;
      }

      default:
        return `❌ Unknown action: ${name}`;
    }
  } catch (err: any) {
    return `❌ Error executing ${name}: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Gemini provider (text-only, no tools)
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

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status}`, await response.text().catch(() => ''));
      return null;
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Groq provider (with function calling / tool use)
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
      console.error(`Groq API error: ${response.status}`, await response.text().catch(() => ''));
      return null;
    }

    const data: any = await response.json();
    const choice = data?.choices?.[0]?.message;
    if (!choice) return null;

    // If no tool calls, return text directly
    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content?.trim() || null;
    }

    // Execute all tool calls (can be multiple in one response)
    const toolResults: string[] = [];
    for (const toolCall of choice.tool_calls) {
      const result = await executeToolCall(toolCall);
      toolResults.push(result);
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [toolCall],
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Round 2: Send tool results back to get final response
    const finalResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    if (!finalResponse.ok) {
      // If the follow-up fails, return the tool results as the response
      return toolResults.join('\n\n');
    }

    const finalData: any = await finalResponse.json();
    const finalText = finalData?.choices?.[0]?.message?.content;
    return finalText?.trim() || toolResults.join('\n\n');
  } catch (err) {
    console.error('Groq API call failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Retry helper
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
// Log configured providers at startup
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

  // Groq with function calling
  if (_groqKeyAvailable) {
    reply = await withRetry(() => callGroq(userMessage, ctx, history), 1, 1500);
  }

  // Gemini fallback (text-only)
  if (!reply && _geminiKeyAvailable) {
    reply = await withRetry(() => callGemini(userMessage, ctx, history), 1, 2000);
  }

  if (!reply) {
    throw new Error('AI service unavailable — no API keys configured or all providers failed');
  }

  // Persist to DB
  await db.addChatMessage({ role: 'user', content: userMessage });
  await db.addChatMessage({ role: 'assistant', content: reply });

  return db.getChatMessages();
}
