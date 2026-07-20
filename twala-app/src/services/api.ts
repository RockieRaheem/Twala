const BASE_URL = __DEV__
  ? 'http://192.168.1.100:4000/api'  // Change to your dev machine's LAN IP
  : 'https://your-production-api.com/api';

let cachedBaseUrl = BASE_URL;

export function setApiUrl(url: string) {
  cachedBaseUrl = url;
}

async function request<T>(path: string, options?: RequestInit): Promise<{ success: boolean; data: T; message?: string }> {
  const url = `${cachedBaseUrl}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    return res.json();
  } catch (err) {
    console.warn(`[API] ${path} failed:`, err);
    return { success: false, data: null as any, message: 'Network error' };
  }
}

// Wallet
export const walletApi = {
  create: () => request<{ publicKey: string; balanceUsdc: number; balanceXlm: number }>('/wallet/create', { method: 'POST' }),
  balance: () => request<{ balanceUsdc: number; balanceXlm: number; publicKey: string }>('/wallet/balance'),
  info: () => request<{ publicKey: string; balanceUsdc: number; balanceXlm: number } | null>('/wallet/info'),
};

// Transfer
export interface TransferQuote {
  sendAmountUsdc: number;
  receiveAmountUgx: number;
  feeUsdc: number;
  feeUgx: number;
  rate: number;
  totalUsdc: number;
  estimatedArrival: string;
}

export const transferApi = {
  quote: (amount: number) => request<TransferQuote>(`/transfer/quote?amount=${amount}`),
  submit: (body: { amountUsdc: number; recipientName: string; recipientPhone?: string; recipientNetwork?: string; purpose: string }) =>
    request<{ transaction: any; quote: TransferQuote; message: string }>('/transfer/submit', { method: 'POST', body: JSON.stringify(body) }),
};

// History
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

export const historyApi = {
  list: (filter?: string, page = 1) =>
    request<{ transactions: TransactionItem[]; stats: { totalSent: number; totalReceived: number; totalCount: number; thisMonth: number }; pagination: any }>(
      `/history?filter=${filter || 'all'}&page=${page}`
    ),
};

// Goals
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

export const goalsApi = {
  list: () => request<GoalData[]>('/goals'),
  get: (id: string) => request<GoalData>(`/goals/${id}`),
  contribute: (id: string, amountUgx: number) =>
    request<GoalData>(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amountUgx }) }),
};

// Chat
export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const chatApi = {
  list: () => request<ChatMsg[]>('/chat'),
  send: (message: string) => request<ChatMsg[]>('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  clear: () => request<ChatMsg[]>('/chat', { method: 'DELETE' }),
};

// Rates
export interface RateData {
  usdcToUgx: number;
  usdToUgx: number;
  lastUpdated: string;
  change24h: number;
}

export const ratesApi = {
  get: () => request<RateData>('/rates'),
};
