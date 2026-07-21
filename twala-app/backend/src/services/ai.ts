import { store } from '../store.js';
import type { ChatMessage, AiContext, Goal, Transaction } from '../types/index.js';
import { getExchangeRate } from './rates.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntentResult {
  action: IntentAction;
  confidence: number;
  entities: Record<string, any>;
}

type IntentAction =
  | 'greet'
  | 'check_balance'
  | 'goal_progress'
  | 'goal_create'
  | 'goal_contribute'
  | 'send_money'
  | 'transaction_history'
  | 'exchange_rate'
  | 'help'
  | 'proactive_tip'
  | 'ambiguous';

interface ConversationState {
  lastIntent: IntentAction;
  pendingAction: string | null;
  pendingData: Record<string, any>;
  turnCount: number;
}

// ---------------------------------------------------------------------------
// Conversation memory (only used by rule-based fallback)
// ---------------------------------------------------------------------------

let convState: ConversationState = {
  lastIntent: 'greet',
  pendingAction: null,
  pendingData: {},
  turnCount: 0,
};

function resetConversationState(): void {
  convState = { lastIntent: 'greet', pendingAction: null, pendingData: {}, turnCount: 0 };
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function buildContext(): AiContext {
  return {
    walletBalance: store.wallet?.balanceUsdc || 0,
    goals: store.goals,
    recentTransactions: store.transactions.slice(0, 10),
    activeGoal: store.goals.find((g) => g.status === 'active'),
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
// LLM-based response via Gemini (primary) / Groq (fallback)
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: AiContext): string {
  const goalsText = ctx.goals.length > 0
    ? ctx.goals.map((g) =>
        `- "${g.title}": ${fiat(g.savedAmountUgx)} / ${fiat(g.targetAmountUgx)} (${percent(g.savedAmountUgx, g.targetAmountUgx)}%), status: ${g.status}`
      ).join('\n')
    : 'No savings goals yet.';

  const txText = ctx.recentTransactions.length > 0
    ? ctx.recentTransactions.slice(0, 5).map((t) =>
        `- ${t.type === 'sent' ? 'Sent' : 'Received'} ${usdc(t.amountUsdc)} ${t.type === 'sent' ? 'to' : 'from'} ${t.recipientName} (${t.purpose}, ${t.status})`
      ).join('\n')
    : 'No recent transactions.';

  return `You are Kanzu, an AI financial companion for the Twala app. Twala helps people send money from the US to Uganda (USDC → Mobile Money) and save towards goals.

Current user context:
- Wallet balance: ${usdc(ctx.walletBalance)} USDC
- Savings goals:
${goalsText}
- Recent transactions:
${txText}

Guidelines:
- Respond in a warm, friendly, helpful tone
- Use markdown formatting (**bold** for emphasis)
- Keep responses concise (under 250 words unless detail is requested)
- When discussing amounts, convert USDC to UGX at ~3750 UGX per USDC (after fees)
- The fee for sending money is 0.5% (min $0.50)
- If the user asks about something you don't have data for, be honest and suggest what they can do
- Proactively suggest relevant actions based on the user's context
- You CAN answer general financial questions intelligently
- NEVER make up transactions, goals, or balances — only reference actual data from the context above
- If the user wants to perform an action (send money, create goal, etc.), guide them through it step by step`;
}

function buildContents(history: ChatMessage[], userMessage: string): any[] {
  const contents: any[] = [];

  for (const msg of history.slice(-20)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return contents;
}

async function callGemini(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key) return null;

  const systemPrompt = buildSystemPrompt(ctx);
  const contents = buildContents(history, userMessage);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.95,
            topK: 40,
          },
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

async function callGroq(userMessage: string, ctx: AiContext, history: ChatMessage[]): Promise<string | null> {
  const key = GROQ_API_KEY();
  if (!key) return null;

  const systemPrompt = buildSystemPrompt(ctx);

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history.slice(-20)) {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }

  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      console.error(`Groq API error: ${response.status}`, await response.text().catch(() => ''));
      return null;
    }

    const data: any = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch (err) {
    console.error('Groq API call failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rule-based intent classifier (fallback when no LLM available)
// ---------------------------------------------------------------------------

function classifyIntent(input: string, ctx: AiContext): IntentResult {
  const lower = input.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // ---- Check for pending action continuations first ----
  if (convState.pendingAction === 'awaiting_goal_amount') {
    const amount = parseUgxAmount(lower);
    if (amount && amount > 0) {
      return { action: 'goal_contribute', confidence: 0.95, entities: { amountUgx: amount } };
    }
    return { action: 'goal_contribute', confidence: 0.5, entities: {} };
  }

  if (convState.pendingAction === 'awaiting_goal_details') {
    return { action: 'goal_create', confidence: 0.85, entities: { raw: input } };
  }

  if (convState.pendingAction === 'awaiting_recipient') {
    return { action: 'send_money', confidence: 0.85, entities: { raw: input } };
  }

  // ---- Greetings ----
  if (/^(hi|hello|hey|good\s*(morning|evening|afternoon)|yo|sup|howdy|greetings)$/i.test(lower)) {
    return { action: 'greet', confidence: 0.95, entities: {} };
  }

  // ---- Balance ----
  if (/(^|\s)(balance|how\s*much|wallet|have\s*money|my\s*money|what\s*(do\s*)?i\s*have|portfolio|net\s*worth)(\s|$|[?.!])/i.test(lower)) {
    return { action: 'check_balance', confidence: 0.92, entities: {} };
  }

  // ---- Goal progress ----
  if (/(goal|progress|milestone|house|building|savings|project|home|land|wakiso|school\s*fees|education\s*fund|target)/i.test(lower)) {
    // Check if it looks like goal creation
    if (/(create|set\s*up|new|start|add|open).*(goal|savings|fund|target)/i.test(lower) ||
        /(i want to save|i'd like to save|help me save|start saving)/i.test(lower)) {
      return { action: 'goal_create', confidence: 0.85, entities: { raw: input } };
    }
    // Check for specific goal mentions
    const matchedGoal = ctx.goals.find((g) =>
      lower.includes(g.title.toLowerCase().slice(0, 10))
    );
    return {
      action: 'goal_progress',
      confidence: 0.88,
      entities: { goalId: matchedGoal?.id },
    };
  }

  // ---- Send money ----
  if (/(send|transfer|remit|send\s*money|send\s*to|pay|send\s*uganda|wire)/i.test(lower)) {
    const amount = parseUsdcAmount(lower);
    const recipient = extractRecipient(lower);
    return {
      action: 'send_money',
      confidence: 0.9,
      entities: { amountUsdc: amount, recipient },
    };
  }

  // ---- Transaction history ----
  if (/(history|recent|past\s*transactions|activity|what\s*(did|have)\s*i\s*(send|spend|pay|done)|show\s*me\s*(my\s*)?(transactions|activity))/i.test(lower)) {
    return { action: 'transaction_history', confidence: 0.9, entities: {} };
  }

  // ---- Exchange rate ----
  if (/(rate|exchange|ugx|conversion|how\s*much.*ugx|how\s*many.*ugx|what'?s\s*the\s*rate|dollar\s*rate)/i.test(lower)) {
    const amount = parseUsdcAmount(lower);
    return { action: 'exchange_rate', confidence: 0.9, entities: { amountUsdc: amount } };
  }

  // ---- Help ----
  if (/(help|what can you do|capabilities|features|how\s*(do|can)\s*(you|i)|what\s*are\s*you|commands)/i.test(lower)) {
    return { action: 'help', confidence: 0.95, entities: {} };
  }

  // ---- Thank you / affirmations ----
  if (/(thank|thanks|appreciate|gracias|okay|ok|sure|yes|yeah|correct|right)/i.test(lower)) {
    if (convState.lastIntent === 'goal_progress') {
      return { action: 'goal_contribute', confidence: 0.7, entities: {} };
    }
    return {
      action: convState.lastIntent,
      confidence: 0.6,
      entities: {},
    };
  }

  // ---- Ambiguous ----
  return { action: 'ambiguous', confidence: 0.3, entities: { raw: input } };
}

// ---------------------------------------------------------------------------
// Entity parsers
// ---------------------------------------------------------------------------

function parseUsdcAmount(text: string): number | null {
  const patterns = [
    /\$(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(usdc|usd|\$)/i,
    /(\d+(?:\.\d+)?)\s*dollars/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function parseUgxAmount(text: string): number | null {
  const patterns = [
    /ugx\s*([\d,.]+)/i,
    /([\d,.]+)\s*ugx/i,
    /(\d+(?:\.\d+)?)\s*k\b/i,
    /(\d+(?:\.\d+)?)\s*m\b/i,
    /(\d+(?:\.\d+)?)\s*million/i,
    /(\d+(?:\.\d+)?)\s*thousand/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (p.source.includes('k\\b') || p.source.includes('thousand')) return val * 1000;
      if (p.source.includes('m\\b') || p.source.includes('million')) return val * 1_000_000;
      return val;
    }
  }
  return null;
}

function extractRecipient(text: string): string | null {
  const m = text.match(/(?:to|for)\s+(\w+(?:\s+\w+){0,2})$/i);
  if (m) return m[1].trim();
  const m2 = text.match(/(?:send|pay|transfer)\s+(\w+(?:\s+\w+){0,2})\s/i);
  if (m2) return m2[1].trim();
  return null;
}

// ---------------------------------------------------------------------------
// Rule-based response builders (fallback when no LLM available)
// ---------------------------------------------------------------------------

function respondGreet(ctx: AiContext): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const hasWallet = ctx.walletBalance > 0;
  const hasGoal = ctx.goals.length > 0;

  let line2: string;
  if (hasGoal && hasWallet) {
    const g = ctx.goals[0];
    const p = percent(g.savedAmountUgx, g.targetAmountUgx);
    line2 = `You have ${usdc(ctx.walletBalance)} available and your goal "${g.title}" is **${p}% funded**.`;
  } else if (hasWallet) {
    line2 = `You have ${usdc(ctx.walletBalance)} available. Ready to send or save?`;
  } else {
    line2 = `Let's get started! Create a wallet or set a savings goal to begin.`;
  }

  return `Good ${greeting}! I'm **Kanzu**, your AI financial companion. ${line2}\n\nHow can I help you today?`;
}

function respondBalance(ctx: AiContext): string {
  const lines: string[] = [`## Financial Snapshot`];
  lines.push(`\n**Wallet**  ${usdc(ctx.walletBalance)} (USDC)`);

  if (ctx.goals.length > 0) {
    lines.push(`\n**Goals**  ${ctx.goals.length} active`);
    for (const g of ctx.goals) {
      const p = percent(g.savedAmountUgx, g.targetAmountUgx);
      lines.push(`• ${g.title}: ${fiat(g.savedAmountUgx)} / ${fiat(g.targetAmountUgx)} (${p}%)`);
    }
  }

  if (ctx.recentTransactions.length > 0) {
    const sent = ctx.recentTransactions.filter((t) => t.type === 'sent').reduce((s, t) => s + t.amountUsdc, 0);
    const received = ctx.recentTransactions.filter((t) => t.type === 'received').reduce((s, t) => s + t.amountUsdc, 0);
    lines.push(`\n**Recent Activity**  Sent ${usdc(sent)} · Received ${usdc(received)}`);
  }

  lines.push(`\nWant to see details on anything? Just ask!`);
  return lines.join('\n');
}

function respondGoalProgress(ctx: AiContext, goalId?: string): string {
  const goal = goalId ? ctx.goals.find((g) => g.id === goalId) : ctx.goals[0] || ctx.activeGoal;
  if (!goal) {
    return "You don't have any savings goals yet. Would you like me to help you **create one**? Just tell me what you're saving for and how much.";
  }

  const p = percent(goal.savedAmountUgx, goal.targetAmountUgx);
  const remaining = goal.targetAmountUgx - goal.savedAmountUgx;
  const completedM = goal.milestones.filter((m) => m.completed).length;
  const totalM = goal.milestones.length;
  const nextM = goal.milestones.find((m) => !m.completed);

  const lines: string[] = [
    `## ${goal.title}`,
    `**Progress** ${p}% (${fiat(goal.savedAmountUgx)} of ${fiat(goal.targetAmountUgx)})`,
    `**Milestones** ${completedM}/${totalM} completed`,
    remaining > 0 ? `**Remaining** ${fiat(remaining)}` : '',
    '',
  ];

  if (nextM) {
    lines.push(`**Next Milestone**: ${nextM.title}`);
    lines.push(`Target: ${fiat(nextM.targetAmountUgx)} — ${nextM.description}`);
    lines.push('');
  }

  if (remaining > 0) {
    const monthly = Math.ceil(remaining / 6);
    lines.push(`📅 At **${fiat(monthly)}/month**, you'll complete this goal in **6 months**.`);
  }

  if (goal.savedAmountUgx >= goal.targetAmountUgx) {
    lines.push(`\n🎉 **Congratulations!** This goal is fully funded!`);
  }

  lines.push(`\nWant to contribute to this goal now? Just tell me an amount like "Add 500K UGX".`);

  return lines.join('\n');
}

function respondGoalCreate(ctx: AiContext, raw?: string): string {
  if (raw) {
    const titleMatch = raw.match(/(?:save|saving)\s+(?:for|toward(?:ds)?)?\s*(.+?)(?:\s*for\s*\d+|$)/i)
      || raw.match(/(?:create|set|start|new)\s*(?:a\s*)?(?:goal|savings|fund)\s*(?:for|to\s*buy|to\s*build|called)?\s*(.+?)$/i);
    const amountMatch = parseUgxAmount(raw);

    if (titleMatch || amountMatch) {
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+\d+.*$/, '').substring(0, 60) : '';
      return `I'd love to help set that up! I understood:\n\n**Goal**: ${title || '(name needed)'}\n**Target**: ${amountMatch ? fiat(amountMatch) : '(amount needed)'}\n\nCould you confirm these details? Or tell me what you're saving for and the target amount.`;
    }
  }

  return `Let's create a savings goal! Tell me:\n\n1️⃣ **What** are you saving for? (e.g., "building a house", "school fees", "land")\n2️⃣ **How much** is the target? (e.g., "UGX 150M", "30 million")\n3️⃣ **By when**? (optional — e.g., "December 2026")\n\nJust describe your goal in your own words!`;
}

function respondGoalContribute(ctx: AiContext, amountUgx?: number): string {
  const goal = ctx.activeGoal || ctx.goals[0];
  if (!goal) {
    return "You don't have any goals to contribute to. Would you like to create one?";
  }

  if (!amountUgx) {
    return `How much would you like to add to **${goal.title}**? (Current: ${fiat(goal.savedAmountUgx)} of ${fiat(goal.targetAmountUgx)})`;
  }

  const newSaved = goal.savedAmountUgx + amountUgx;
  const newPct = percent(newSaved, goal.targetAmountUgx);
  const usdcAmount = amountUgx / 3750;

  return `✅ **${fiat(amountUgx)}** added to **${goal.title}**!\n\nNow at **${newPct}%** (${fiat(newSaved)} of ${fiat(goal.targetAmountUgx)})\n(${usdc(usdcAmount)} USDC from wallet)\n\nKeep going! You're making great progress. 🎯`;
}

function respondSendMoney(ctx: AiContext, amountUsdc?: number | null, recipient?: string | null): string {
  if (!amountUsdc && !recipient) {
    return `I can help you send money to Uganda! 🇺🇬\n\n**How it works:**\n💸 USDC → MTN/Airtel Mobile Money\n⚡ 1-2 minutes delivery\n💵 0.5% fee (min $0.50)\n\nTo get started, tell me:\n• **Who** are you sending to? (name)\n• **How much**? (e.g., $200)\n• **What's it for?** (e.g., school fees)`;
  }

  if (amountUsdc && amountUsdc > ctx.walletBalance) {
    return `You want to send **${usdc(amountUsdc)}**, but your wallet has **${usdc(ctx.walletBalance)}**. That's ${usdc(amountUsdc - ctx.walletBalance)} short.\n\nOptions:\n1️⃣ Send a smaller amount\n2️⃣ Deposit more USDC first\n3️⃣ Check your savings goals for available funds`;
  }

  const fee = Math.max(amountUsdc! * 0.005, 0.50);
  const receiveEst = (amountUsdc! - fee) * 3750;

  return `## Send Money Preview\n\n**Amount**: ${usdc(amountUsdc || 0)}\n**Fee**: ${usdc(fee)} (0.5%)\n**Recipient**: ${recipient || '(not specified)'}\n**Est. Delivery**: 1-2 minutes to MTN Mobile Money\n**Recipient Gets**: ~${fiat(receiveEst)}\n\nTo proceed, confirm the recipient's **full name** and **phone number** (e.g., "Mama Namubiru, +256712345678").`;
}

function respondTransactionHistory(ctx: AiContext): string {
  const txs = ctx.recentTransactions;
  if (txs.length === 0) {
    return "You don't have any transactions yet. Once you send money or receive funds, they'll show up here!";
  }

  const lines: string[] = ['## Recent Transactions'];
  for (const t of txs.slice(0, 8)) {
    const icon = t.type === 'sent' ? '→' : t.type === 'received' ? '←' : '●';
    const statusIcon = t.status === 'completed' ? '✅' : t.status === 'pending' ? '⏳' : '❌';
    lines.push(`\n${icon} **${t.recipientName}**  ${usdc(t.amountUsdc)}`);
    lines.push(`   ${t.purpose} · ${statusIcon} ${t.status} · ${timeAgo(t.createdAt)}`);
  }

  lines.push(`\nThat's your latest activity. Full history is in the **History** tab. Need help with a specific transaction?`);
  return lines.join('\n');
}

async function respondExchangeRate(amountUsdc?: number | null): Promise<string> {
  const rate = await getExchangeRate();
  const lines: string[] = [
    `## Exchange Rate (Live)`,
    `**1 USDC** → **${fiat(rate.usdcToUgx)}**`,
    `**1 USD** → **${fiat(rate.usdToUgx)}**`,
    `*Updated: ${new Date(rate.lastUpdated).toLocaleTimeString()}*`,
    ``,
  ];

  if (amountUsdc && amountUsdc > 0) {
    const receive = (amountUsdc - Math.max(amountUsdc * 0.005, 0.50)) * rate.usdcToUgx;
    lines.push(`**${usdc(amountUsdc)}** → **${fiat(Math.round(receive))}** (after fee)`);
  } else {
    lines.push(`Want to calculate a specific amount? Just tell me like "How much is $250 in UGX?"`);
  }

  return lines.join('\n');
}

function respondHelp(): string {
  return `## How I Can Help You\n\n` +
    `💸 **Send Money** — "Send $200 to Mama"\n` +
    `🏠 **Goal Progress** — "How's my building project?"\n` +
    `🎯 **Create Goal** — "Help me save for land"\n` +
    `💰 **Check Balance** — "How much do I have?"\n` +
    `📋 **Transactions** — "Show recent activity"\n` +
    `💱 **Exchange Rate** — "What's the current rate?"\n\n` +
    `Just tell me what you need in plain English! I'll handle the rest. 👇`;
}

function respondProactiveTip(ctx: AiContext): string {
  const tips: string[] = [];

  if (ctx.walletBalance > 0 && ctx.walletBalance < 50) {
    tips.push(`⚠️ Your wallet is running low (${usdc(ctx.walletBalance)}). Consider topping up.`);
  }

  for (const g of ctx.goals) {
    if (g.status !== 'active') continue;
    const targetDate = new Date(g.targetDate);
    const now = new Date();
    const daysLeft = Math.floor((targetDate.getTime() - now.getTime()) / 86400000);
    if (daysLeft > 0 && daysLeft < 90) {
      const p = percent(g.savedAmountUgx, g.targetAmountUgx);
      tips.push(`⏰ **${g.title}** target is ${daysLeft} days away (${p}% funded). Want to boost savings?`);
    }
  }

  const failed = ctx.recentTransactions.find((t) => t.status === 'failed');
  if (failed) {
    tips.push(`❌ A recent transfer to **${failed.recipientName}** (${usdc(failed.amountUsdc)}) failed. Would you like to retry?`);
  }

  if (tips.length === 0) {
    tips.push(`✅ Everything looks good! Your finances are in order.`);
  }

  return `## Proactive Tips\n\n${tips.join('\n\n')}`;
}

// ---------------------------------------------------------------------------
// Rule-based dispatch (fallback)
// ---------------------------------------------------------------------------

async function dispatch(intent: IntentResult, ctx: AiContext): Promise<string> {
  convState.lastIntent = intent.action;
  convState.turnCount++;

  switch (intent.action) {
    case 'greet':
      convState.pendingAction = null;
      return respondGreet(ctx);

    case 'check_balance':
      convState.pendingAction = null;
      return respondBalance(ctx);

    case 'goal_progress':
      convState.pendingAction = 'awaiting_goal_amount';
      return respondGoalProgress(ctx, intent.entities.goalId);

    case 'goal_create':
      convState.pendingAction = 'awaiting_goal_details';
      return respondGoalCreate(ctx, intent.entities.raw);

    case 'goal_contribute': {
      const amount = intent.entities.amountUgx;
      if (amount && amount > 0) {
        convState.pendingAction = null;
        return respondGoalContribute(ctx, amount);
      }
      convState.pendingAction = 'awaiting_goal_amount';
      return respondGoalContribute(ctx);
    }

    case 'send_money': {
      const amt = intent.entities.amountUsdc;
      const rec = intent.entities.recipient;
      if (amt && rec) {
        convState.pendingAction = 'awaiting_recipient';
      } else {
        convState.pendingAction = null;
      }
      return respondSendMoney(ctx, amt, rec);
    }

    case 'transaction_history':
      convState.pendingAction = null;
      return respondTransactionHistory(ctx);

    case 'exchange_rate':
      convState.pendingAction = null;
      return await respondExchangeRate(intent.entities.amountUsdc);

    case 'help':
      convState.pendingAction = null;
      return respondHelp();

    case 'proactive_tip':
      convState.pendingAction = null;
      return respondProactiveTip(ctx);

    default: {
      convState.pendingAction = null;
      const suggestions: string[] = [];
      if (ctx.walletBalance > 0) suggestions.push('What is my balance?');
      if (ctx.goals.length > 0) suggestions.push(`How is "${ctx.goals[0].title}" doing?`);
      suggestions.push('Send money to Uganda');
      suggestions.push('What can you do?');

      return [
        `I want to make sure I understand. Could you rephrase? Here are some things I can help with:`,
        '',
        ...suggestions.map((s) => `• **${s}**`),
        '',
        'Or just tell me in your own words!',
      ].join('\n');
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — tries Gemini first, then Groq, then rule-based fallback
// ---------------------------------------------------------------------------

export async function chat(userMessage: string): Promise<ChatMessage[]> {
  const ctx = buildContext();
  const history = store.chatHistory;

  let reply: string | null = null;

  // Try Gemini (primary LLM)
  reply = await callGemini(userMessage, ctx, history);

  // Try Groq (secondary LLM)
  if (!reply) {
    reply = await callGroq(userMessage, ctx, history);
  }

  // Fall back to rule-based engine
  if (!reply) {
    const intent = classifyIntent(userMessage, ctx);
    reply = await dispatch(intent, ctx);
  }

  store.chatHistory.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  store.chatHistory.push({
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  });

  // Keep history bounded
  if (store.chatHistory.length > 50) {
    store.chatHistory = store.chatHistory.slice(-50);
  }

  return store.chatHistory.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

export function getChatHistory(): ChatMessage[] {
  return store.chatHistory;
}

export function clearChat(): void {
  resetConversationState();
  store.chatHistory = [
    {
      role: 'assistant',
      content: "Hi! I'm **Kanzu**, your AI financial companion. I can help you send money to Uganda, track your savings goals, and more. What would you like to do today?",
      timestamp: new Date().toISOString(),
    },
  ];
}
