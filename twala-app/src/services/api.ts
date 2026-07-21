import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

const LOCAL_DEV = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api'
    : 'http://localhost:4000/api';

const BASE_URL = __DEV__ ? LOCAL_DEV : 'https://your-production-api.com/api';

let cachedBaseUrl = BASE_URL;
let _backendOnline = false;
let _connectionListeners: Array<(online: boolean) => void> = [];

export function getBaseUrl(): string {
  return cachedBaseUrl;
}

export function setApiUrl(url: string) {
  cachedBaseUrl = url;
}

export function isBackendOnline(): boolean {
  return _backendOnline;
}

export function onConnectionChange(listener: (online: boolean) => void): () => void {
  _connectionListeners.push(listener);
  return () => {
    _connectionListeners = _connectionListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(online: boolean) {
  _backendOnline = online;
  _connectionListeners.forEach((l) => l(online));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransferQuote {
  sendAmountUsdc: number;
  receiveAmountUgx: number;
  feeUsdc: number;
  feeUgx: number;
  rate: number;
  totalUsdc: number;
  estimatedArrival: string;
}

export interface TransactionItem {
  id: string;
  type: 'sent' | 'received' | 'goal_contribution';
  amountUsdc: number;
  amountUgx: number;
  rate: number;
  recipientName: string;
  recipientPhone?: string;
  recipientNetwork?: 'MTN' | 'AIRTEL';
  status: 'pending' | 'completed' | 'failed';
  purpose: string;
  stellarTxHash?: string;
  createdAt: string;
}

export interface GoalData {
  id: string;
  title: string;
  description: string;
  targetAmountUgx: number;
  savedAmountUgx: number;
  targetDate: string;
  category: string;
  milestones: any[];
  status: string;
  createdAt: string;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface RateData {
  usdcToUgx: number;
  usdToUgx: number;
  lastUpdated: string;
  change24h: number;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ---------------------------------------------------------------------------
// Local AI engine (works entirely on-device, no backend needed)
// ---------------------------------------------------------------------------

let localChatHistory: ChatMsg[] = [
  {
    role: 'assistant',
    content: "Hi! I'm **Kanzu**, your AI financial companion! 💪\n\nI can help you:\n💸 Send money to Uganda\n💰 Check your balance\n🏠 Track savings goals\n📋 View transactions\n💱 Check exchange rates\n\nWhat would you like to do?",
    timestamp: new Date().toISOString(),
  },
];

function formatFiat(amount: number): string {
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `UGX ${(amount / 1_000).toFixed(1)}K`;
  return `UGX ${amount.toLocaleString()}`;
}

function formatUsdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Local demo data for AI responses
const DEMO_BALANCE = 4850.75;
const DEMO_GOAL = { title: 'Build My Home — Wakiso', saved: 97500000, target: 150000000 };
const DEMO_TXS = [
  { name: 'Maama', amount: 250, purpose: 'Family Support', status: 'completed' as const },
  { name: 'Ssekandi', amount: 1200, purpose: 'Construction Milestone', status: 'completed' as const },
  { name: 'Sarah', amount: 150, purpose: 'School Fees', status: 'pending' as const },
];

// Gemini API key from environment (exposed to client — acceptable for MVP)
// Get a free key: https://aistudio.google.com/apikey
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

function buildGeminiPrompt(userMsg: string): string {
  const goalPct = Math.round((DEMO_GOAL.saved / DEMO_GOAL.target) * 100);
  return `You are Kanzu, an AI financial companion for the Twala app. Twala helps people send money from the US to Uganda (USDC → Mobile Money) and save towards goals.

Current user context (demo data for offline mode):
- Wallet balance: ${formatUsdc(DEMO_BALANCE)} USDC
- Savings goals:
  - "${DEMO_GOAL.title}": ${formatFiat(DEMO_GOAL.saved)} / ${formatFiat(DEMO_GOAL.target)} (${goalPct}%), status: active
- Recent transactions:
  - Sent $250 to Maama (Family Support, completed)
  - Sent $1,200 to Ssekandi (Construction Milestone, completed)
  - Sent $150 to Sarah (School Fees, pending)

Guidelines:
- Respond in a warm, friendly, helpful tone
- Use markdown formatting (**bold** for emphasis)
- Keep responses concise (under 250 words unless detail requested)
- When discussing amounts, convert USDC to UGX at ~3750 UGX per USDC (after fees)
- Fee for sending money is 0.5% (min $0.50)
- Be honest if you don't have specific data
- Suggest relevant actions based on user context
- Answer general financial questions intelligently
- NEVER make up transactions, goals, or balances`;
}

async function callGeminiLocal(userMsg: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  const systemPrompt = buildGeminiPrompt(userMsg);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

async function generateLocalResponse(userMsg: string): Promise<string> {
  const geminiReply = await callGeminiLocal(userMsg);
  if (geminiReply) return geminiReply;
  return "I'm having trouble connecting to my AI engine right now. Please make sure your Gemini API key is set in the `.env` file (`EXPO_PUBLIC_GEMINI_API_KEY`), or connect to the backend server for full intelligence.";
}

function getLocalSuggestions(): string[] {
  const s: string[] = [];
  s.push('What is my balance?');
  s.push('How is my building project doing?');
  s.push('Send money to Uganda');
  s.push('What is the exchange rate?');
  s.push('Show recent transactions');
  s.push('What can you do?');
  return s;
}

// ---------------------------------------------------------------------------
// Generic fetch with fallback
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit, fallback?: () => T | Promise<T>): Promise<ApiResult<T>> {
  const url = `${cachedBaseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    notifyListeners(true);
    const json = await res.json() as ApiResult<T>;
    return json;
  } catch (err: any) {
    clearTimeout(timeout);
    notifyListeners(false);
    // Use fallback data if provided
    if (fallback) {
      const data = await fallback();
      return { success: true, data };
    }
    return {
      success: false,
      data: null as any,
      message: err?.name === 'AbortError'
        ? 'Request timed out. Start the backend: cd twala-app/backend && npx tsx watch src/index.ts'
        : 'Backend offline. Using demo data. Start the server for full functionality.',
    };
  }
}

// ---------------------------------------------------------------------------
// API clients with built-in fallback data
// ---------------------------------------------------------------------------

export const walletApi = {
  info: () =>
    request<{ publicKey: string; balanceUsdc: number; balanceXlm: number }>(
      '/wallet/info',
      {},
      () => ({ publicKey: 'GDEMO...', balanceUsdc: 4850.75, balanceXlm: 125.5 })
    ),
  create: () =>
    request<{ publicKey: string; balanceUsdc: number; balanceXlm: number }>(
      '/wallet/create', { method: 'POST' },
      () => ({ publicKey: 'GDEMO...', balanceUsdc: 4850.75, balanceXlm: 125.5 })
    ),
  balance: () =>
    request<{ balanceUsdc: number; balanceXlm: number; publicKey: string }>(
      '/wallet/balance', {},
      () => ({ balanceUsdc: 4850.75, balanceXlm: 125.5, publicKey: 'GDEMO...' })
    ),
};

export const transferApi = {
  quote: (amount: number) =>
    request<TransferQuote>(`/transfer/quote?amount=${amount}`, {}, () => {
      const fee = Math.max(amount * 0.005, 0.50);
      return {
        sendAmountUsdc: amount,
        receiveAmountUgx: Math.round((amount - fee) * 3750),
        feeUsdc: fee,
        feeUgx: Math.round(fee * 3750),
        rate: 3750,
        totalUsdc: amount,
        estimatedArrival: '1-2 minutes',
      };
    }),

  offramp: (body: { amountUsdc: number; recipientName: string; recipientPhone?: string; recipientNetwork?: string; purpose: string }) =>
    request<{ transaction: any; quote: TransferQuote; kotaniReferenceId: string; message: string }>(
      '/transfer/offramp', { method: 'POST', body: JSON.stringify(body) },
      () => {
        const fee = Math.max(body.amountUsdc * 0.005, 0.50);
        return {
          transaction: { id: `tx-demo-${Date.now()}`, type: 'sent', amountUsdc: body.amountUsdc, recipientName: body.recipientName, status: 'pending', purpose: body.purpose, createdAt: new Date().toISOString() },
          quote: { sendAmountUsdc: body.amountUsdc, receiveAmountUgx: Math.round((body.amountUsdc - fee) * 3750), feeUsdc: fee, feeUgx: Math.round(fee * 3750), rate: 3750, totalUsdc: body.amountUsdc, estimatedArrival: '1-2 minutes' },
          kotaniReferenceId: `demo-${Date.now()}`,
          message: `Demo: Sent $${body.amountUsdc.toFixed(2)} USDC to ${body.recipientName}. Delivering ~${Math.round((body.amountUsdc - fee) * 3750).toLocaleString()} UGX via ${body.recipientNetwork || 'MTN'} Mobile Money.`,
        };
      }
    ),

  onramp: (body: { fiatAmount: number; phoneNumber: string; network: string }) =>
    request<{ transaction: any; kotaniReferenceId: string; message: string }>(
      '/transfer/onramp', { method: 'POST', body: JSON.stringify(body) },
      () => ({
        transaction: { id: `tx-demo-${Date.now()}`, type: 'received', amountUsdc: (body.fiatAmount / 3750) * 0.98, status: 'pending', createdAt: new Date().toISOString() },
        kotaniReferenceId: `demo-${Date.now()}`,
        message: `Demo: Deposit request submitted! Pay UGX ${body.fiatAmount.toLocaleString()} via ${body.network} Mobile Money to receive ~$${((body.fiatAmount / 3750) * 0.98).toFixed(2)} USDC.`,
      })
    ),

  status: (referenceId: string) =>
    request<{ transaction: any; kotaniStatus: any }>(`/transfer/status/${referenceId}`, {},
      () => ({ transaction: { id: referenceId, status: 'completed' }, kotaniStatus: { status: 'completed' } })
    ),

  retry: (referenceId: string) =>
    request<{ transaction: any }>(`/transfer/retry/${referenceId}`, { method: 'POST' },
      () => ({ transaction: { id: referenceId, status: 'pending' } })
    ),
};

export const historyApi = {
  list: (filter?: string, page = 1) =>
    request<{ transactions: TransactionItem[]; stats: { totalSent: number; totalReceived: number; thisMonth: number } }>(
      `/history?filter=${filter || 'all'}&page=${page}`, {},
      () => ({
        transactions: [
          { id: 'demo-1', type: 'sent', amountUsdc: 250, amountUgx: 937500, rate: 3750, recipientName: 'Maama', status: 'completed', purpose: 'Family Support', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'demo-2', type: 'sent', amountUsdc: 1200, amountUgx: 4500000, rate: 3750, recipientName: 'Ssekandi', status: 'completed', purpose: 'Construction Milestone', createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: 'demo-3', type: 'sent', amountUsdc: 150, amountUgx: 562500, rate: 3750, recipientName: 'Sarah', status: 'pending', purpose: 'School Fees', createdAt: new Date(Date.now() - 172800000).toISOString() },
          { id: 'demo-4', type: 'sent', amountUsdc: 4550, amountUgx: 17062500, rate: 3750, recipientName: 'Sula Contractors', status: 'completed', purpose: 'Material Supply', createdAt: new Date(Date.now() - 345600000).toISOString() },
          { id: 'demo-5', type: 'received', amountUsdc: 12.50, amountUgx: 46875, rate: 3750, recipientName: 'Refund — Kotani Pay', status: 'completed', purpose: 'Failed TX Reversal', createdAt: new Date(Date.now() - 432000000).toISOString() },
        ],
        stats: { totalSent: 6150, totalReceived: 12.50, thisMonth: 23 },
      })
    ),
};

export const goalsApi = {
  list: () =>
    request<GoalData[]>('/goals', {}, () => [
      {
        id: 'demo-goal-1',
        title: 'Build My Home — Wakiso',
        description: 'Three-bedroom house construction in Wakiso district',
        targetAmountUgx: 150000000,
        savedAmountUgx: 97500000,
        targetDate: '2026-12-31',
        category: 'home',
        status: 'active',
        createdAt: new Date(Date.now() - 2592000000).toISOString(),
        milestones: [
          { id: 'ms-1', title: 'Foundation', targetAmountUgx: 30000000, completed: true, completedAt: '2026-03-15', description: 'Land clearing and foundation pouring' },
          { id: 'ms-2', title: 'Walling', targetAmountUgx: 40000000, completed: true, completedAt: '2026-05-20', description: 'Wall construction and roofing prep' },
          { id: 'ms-3', title: 'Roofing', targetAmountUgx: 35000000, completed: false, description: 'Roof installation and ceiling' },
          { id: 'ms-4', title: 'Interior', targetAmountUgx: 45000000, completed: false, description: 'Plumbing, electrical, finishing' },
        ],
      },
      {
        id: 'demo-goal-2',
        title: "Junior's Education Fund",
        description: 'School fees savings for 2027 academic year',
        targetAmountUgx: 12000000,
        savedAmountUgx: 4500000,
        targetDate: '2027-01-15',
        category: 'education',
        status: 'active',
        createdAt: new Date(Date.now() - 864000000).toISOString(),
        milestones: [
          { id: 'ms-5', title: 'Term 1 Fees', targetAmountUgx: 4000000, completed: false, description: 'First term tuition' },
          { id: 'ms-6', title: 'Term 2 Fees', targetAmountUgx: 4000000, completed: false, description: 'Second term tuition' },
          { id: 'ms-7', title: 'Term 3 Fees', targetAmountUgx: 4000000, completed: false, description: 'Third term tuition' },
        ],
      },
    ]),
  get: (id: string) =>
    request<GoalData>(`/goals/${id}`, {}, () => ({
      id,
      title: 'Build My Home — Wakiso',
      description: 'Three-bedroom house construction in Wakiso district',
      targetAmountUgx: 150000000,
      savedAmountUgx: 97500000,
      targetDate: '2026-12-31',
      category: 'home',
      status: 'active',
      createdAt: new Date(Date.now() - 2592000000).toISOString(),
      milestones: [
        { id: 'ms-1', title: 'Foundation', targetAmountUgx: 30000000, completed: true, completedAt: '2026-03-15', description: 'Land clearing and foundation pouring' },
        { id: 'ms-2', title: 'Walling', targetAmountUgx: 40000000, completed: true, completedAt: '2026-05-20', description: 'Wall construction and roofing prep' },
        { id: 'ms-3', title: 'Roofing', targetAmountUgx: 35000000, completed: false, description: 'Roof installation and ceiling' },
        { id: 'ms-4', title: 'Interior', targetAmountUgx: 45000000, completed: false, description: 'Plumbing, electrical, finishing' },
      ],
    })),
  contribute: (id: string, amountUgx: number) =>
    request<GoalData>(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amountUgx }) },
      () => ({
        id, title: 'Build My Home — Wakiso', description: 'Demo goal', targetAmountUgx: 150000000,
        savedAmountUgx: 97500000 + amountUgx, targetDate: '2026-12-31', category: 'home',
        status: 'active', createdAt: new Date().toISOString(), milestones: [],
      })
    ),
};

// ---------------------------------------------------------------------------
// Chat API — ALWAYS works locally, backend just adds persistence
// ---------------------------------------------------------------------------

export const chatApi = {
  list: () =>
    request<ChatMsg[]>('/chat', {}, () => [...localChatHistory]),

  send: (message: string) =>
    request<ChatMsg[]>('/chat', { method: 'POST', body: JSON.stringify({ message }) }, async () => {
      const userMsg: ChatMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
      const aiResponse = await generateLocalResponse(message);
      const assistantMsg: ChatMsg = { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() };
      localChatHistory.push(userMsg, assistantMsg);
      if (localChatHistory.length > 50) localChatHistory = localChatHistory.slice(-50);
      return [...localChatHistory];
    }),

  clear: () =>
    request<ChatMsg[]>('/chat', { method: 'DELETE' }, () => {
      localChatHistory = [
        { role: 'assistant', content: "Hi! I'm **Kanzu**, your AI financial companion! 💪\n\nI can help you:\n💸 Send money to Uganda\n💰 Check your balance\n🏠 Track savings goals\n📋 View transactions\n💱 Check exchange rates\n\nWhat would you like to do?", timestamp: new Date().toISOString() },
      ];
      return [...localChatHistory];
    }),

  suggestions: () =>
    request<string[]>('/chat/suggestions', {}, () => getLocalSuggestions()),
};

export const ratesApi = {
  get: () =>
    request<RateData>('/rates', {}, () => ({
      usdcToUgx: 3750,
      usdToUgx: 3750,
      lastUpdated: new Date().toISOString(),
      change24h: -0.3,
    })),
};