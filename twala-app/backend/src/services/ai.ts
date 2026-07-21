import * as db from './database.js';
import type { ChatMessage, AiContext, Transaction } from '../types/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

// ---------------------------------------------------------------------------
// Context builder (reads live data from DB)
// ---------------------------------------------------------------------------

async function buildContext(): Promise<AiContext> {
  const wallet = await db.getWallet();
  const goals = await db.getGoals();
  const { transactions } = await db.getTransactions({ limit: 10 });

  return {
    walletBalance: wallet?.balanceUsdc || 0,
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
// System prompt builder — gives the LLM full awareness of the system
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

  return `You are Kanzu, an AI financial companion for Twala. Twala helps people send money from the US to Uganda (USDC → Mobile Money via MTN/Airtel) and save towards financial goals.

## Current System State

**Wallet:** ${usdc(ctx.walletBalance)} USDC

**Savings Goals:**
${goalsText}

**Recent Transactions:**
${txText}

**Exchange Rate:** 1 USDC ≈ UGX 3,750 (0.5% fee applies, min $0.50)

## Available Actions
- Send money to Uganda (USDC → Mobile Money, 1-2 min delivery)
- Create savings goals with milestones
- Contribute to existing goals
- Check wallet balance and transaction history
- View exchange rates

## Guidelines
- Respond warmly and helpfully as a financial companion
- Use markdown formatting (**bold** for emphasis, ## for section headers)
- Keep responses concise (under 250 words unless detail is requested)
- REFERENCE ACTUAL DATA from the system state above — never make up transactions, goals, or balances
- When the user asks about a goal, use its exact title and correct progress numbers
- When discussing amounts, convert USDC to UGX at ~3,750 UGX per USDC (after deducting the 0.5% fee)
- If the user wants to perform an action (send money, create a goal, add funds), guide them step by step
- Suggest relevant actions based on the user's current financial situation
- You can answer general financial questions intelligently
- If you don't have specific data about something, be honest`;
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

// ---------------------------------------------------------------------------
// LLM providers
// ---------------------------------------------------------------------------

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
        signal: AbortSignal.timeout(25000),
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
      signal: AbortSignal.timeout(25000),
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
// Retry helper for flaky providers
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
// Public API — pure LLM-powered, reads context from DB
// ---------------------------------------------------------------------------

export async function chat(userMessage: string): Promise<ChatMessage[]> {
  const ctx = await buildContext();
  const history = await db.getChatMessages();

  let reply: string | null = null;

  // Groq first (faster, more reliable free tier)
  if (_groqKeyAvailable) {
    reply = await withRetry(() => callGroq(userMessage, ctx, history), 1, 1500);
  }

  // Gemini as secondary fallback
  if (!reply && _geminiKeyAvailable) {
    reply = await withRetry(() => callGemini(userMessage, ctx, history), 1, 2000);
  }

  if (!reply) {
    throw new Error('AI service unavailable — no API keys configured or all providers failed');
  }

  // Persist messages to DB
  await db.addChatMessage({ role: 'user', content: userMessage });
  await db.addChatMessage({ role: 'assistant', content: reply });

  // Return full history
  return db.getChatMessages();
}
