import { store } from '../store.js';
import type { ChatMessage, AiContext } from '../types/index.js';
import { getExchangeRate } from './rates.js';

interface AiResponse {
  reply: string;
  contextUpdate?: Partial<AiContext>;
}

function buildContext(): AiContext {
  return {
    walletBalance: store.wallet?.balanceUsdc || 0,
    goals: store.goals,
    recentTransactions: store.transactions.slice(0, 5),
    activeGoal: store.goals.find((g) => g.status === 'active'),
  };
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

function formatUsdc(amount: number): string {
  return `${amount.toFixed(2)} USDC`;
}

function generateResponse(input: string, ctx: AiContext): AiResponse {
  const lower = input.toLowerCase().trim();

  // --- GREETINGS ---
  if (/^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(lower)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return {
      reply: `Good ${greeting}! 👋 I'm Kanzu. I see you have ${formatUsdc(ctx.walletBalance)} available. Your building project in Wakiso is at ${Math.round((ctx.activeGoal?.savedAmountUgx || 0) / (ctx.activeGoal?.targetAmountUgx || 1) * 100)}% funded. How can I help you today?`,
    };
  }

  // --- BALANCE ---
  if (/(balance|how much|wallet|have money|how many)/i.test(lower)) {
    const goal = ctx.activeGoal;
    const goalProgress = goal ? Math.round((goal.savedAmountUgx / goal.targetAmountUgx) * 100) : 0;
    return {
      reply: `Here's your financial snapshot:\n\n💰 **Wallet**: ${formatUsdc(ctx.walletBalance)}\n🏠 **${goal?.title || 'No active goal'}**: ${formatCurrency(goal?.savedAmountUgx || 0)} of ${formatCurrency(goal?.targetAmountUgx || 0)} (${goalProgress}%)\n📊 **Recent**: ${ctx.recentTransactions.length} transactions this period\n\nWant to see more details on any of these?`,
    };
  }

  // --- GOAL PROGRESS ---
  if (/(goal|progress|milestone|house|building|savings|project|wakiso)/i.test(lower)) {
    const goal = ctx.activeGoal;
    if (!goal) {
      return { reply: "You don't have any active savings goals. Would you like me to help you set one up?" };
    }

    const progress = Math.round((goal.savedAmountUgx / goal.targetAmountUgx) * 100);
    const remaining = goal.targetAmountUgx - goal.savedAmountUgx;
    const completedMilestones = goal.milestones.filter((m) => m.completed).length;
    const totalMilestones = goal.milestones.length;
    const nextMilestone = goal.milestones.find((m) => !m.completed);

    let reply = `🏠 **${goal.title}**\n\nProgress: ${progress}% (${formatCurrency(goal.savedAmountUgx)} of ${formatCurrency(goal.targetAmountUgx)})\nMilestones: ${completedMilestones}/${totalMilestones} completed\nRemaining: ${formatCurrency(remaining)}\n\n`;

    if (nextMilestone) {
      reply += `Next milestone: **${nextMilestone.title}** — ${formatCurrency(nextMilestone.targetAmountUgx)}\n${nextMilestone.description}\n\n`;
    }

    if (remaining > 0) {
      const monthly = Math.ceil(remaining / 6);
      reply += `📅 At ${formatCurrency(monthly)}/month, you'll reach this goal in 6 months.`;
    }

    return { reply };
  }

  // --- SEND MONEY ---
  if (/(send|transfer|remit|send money|send to uganda)/i.test(lower)) {
    const match = lower.match(/(\d+(?:\.\d+)?)\s*(usdc|\$)?/);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > ctx.walletBalance) {
        return {
          reply: `You're trying to send ${formatUsdc(amount)}, but your wallet only has ${formatUsdc(ctx.walletBalance)}. Would you like to deposit more USDC first?`,
        };
      }
      return {
        reply: `Ready to send ${formatUsdc(amount)} to Uganda. Let me walk you through it:\n\n1️⃣ Recipient's MTN or Airtel phone number\n2️⃣ Purpose of transfer\n3️⃣ Review fees and exchange rate\n\nWould you like to start? I can pre-fill the Smart Transfer form for you.`,
      };
    }
    return {
      reply: `I can help you send money to Uganda 🇺🇬\n\nCurrent rate: Live rate shown on Smart Transfer\nFees: Just 0.5% + ${formatUsdc(0.50)} fixed\nDelivery: 1-2 minutes to MTN/Airtel Mobile Money\n\nHow much would you like to send? Just tell me an amount like "Send $200 to Mama."`,
    };
  }

  // --- HISTORY / TRANSACTIONS ---
  if (/(history|recent|past|transactions|activity)/i.test(lower)) {
    const txs = ctx.recentTransactions;
    if (txs.length === 0) {
      return { reply: "You don't have any recent transactions. Would you like to send money to Uganda?" };
    }

    const list = txs.slice(0, 5).map((t) =>
      `• ${t.type === 'sent' ? '→' : '←'} ${t.recipientName}: ${formatUsdc(t.amountUsdc)} (${t.purpose}) — ${t.status === 'completed' ? '✅' : t.status === 'pending' ? '⏳' : '❌'}`
    ).join('\n');

    return {
      reply: `Here are your recent transactions:\n\n${list}\n\nYou can view full history in the History tab. Need help with any of these?`,
    };
  }

  // --- EXCHANGE RATE ---
  if (/(rate|exchange|ugx|how much.*ugx|conversion)/i.test(lower)) {
    return {
      reply: `Current exchange rate information is available in the Smart Transfer screen. As of this moment:\n\n💱 USDC → UGX updates live on the transfer page\n\nWould you like to calculate how much a specific amount would be?`,
    };
  }

  // --- HELP ---
  if (/(help|what can you do|capabilities|features)/i.test(lower)) {
    return {
      reply: `Here's what I can help you with:\n\n💸 **Send Money** — Transfer USDC to Uganda via MTN or Airtel Mobile Money\n🏠 **Track Goals** — Monitor your building project or savings goals\n📊 **Check Balance** — View your wallet and goal balances\n📋 **Recent Activity** — Review transaction history\n💱 **Exchange Rates** — Check USDC to UGX rates\n\nWhat would you like to do?`,
    };
  }

  // --- FALLBACK ---
  const suggestions = [
    'Send money to Uganda',
    'Check my goal progress',
    'View recent transactions',
    'How much do I have?',
  ];

  return {
    reply: `I understand you're asking about "${input.substring(0, 60)}". I'm still learning and I want to make sure I help you properly.\n\nHere are some things I can help with:\n${suggestions.map((s) => `• **${s}**`).join('\n')}\n\nOr just tell me what you need in your own words!`,
  };
}

export function chat(userMessage: string): ChatMessage[] {
  const ctx = buildContext();
  const result = generateResponse(userMessage, ctx);

  store.chatHistory.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  store.chatHistory.push({
    role: 'assistant',
    content: result.reply,
    timestamp: new Date().toISOString(),
  });

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
  store.chatHistory = [
    {
      role: 'assistant',
      content: "Hi! I'm Kanzu, your AI financial companion. I can help you send money to Uganda, track your savings goals, answer questions about your finances, and more. What would you like to do today?",
      timestamp: new Date().toISOString(),
    },
  ];
}
