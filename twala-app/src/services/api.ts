import { Platform } from 'react-native';

// Use localhost for mobile emulator/simulator or web
const LOCAL_DEV = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api'  // Android emulator localhost alias
    : 'http://localhost:4000/api'; // iOS simulator

const BASE_URL = __DEV__ ? LOCAL_DEV : 'https://your-production-api.com/api';

let cachedBaseUrl = BASE_URL;
let lastConnectivityCheck = 0;
let _isConnected = true;

export function isConnected(): boolean {
  return _isConnected;
}

export function getBaseUrl(): string {
  return cachedBaseUrl;
}

export function setApiUrl(url: string) {
  cachedBaseUrl = url;
}

async function request<T>(path: string, options?: RequestInit): Promise<{ success: boolean; data: T; message?: string }> {
  const url = `${cachedBaseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    _isConnected = true;
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    _isConnected = false;
    if (err?.name === 'AbortError') {
      console.warn(`[API] ${path} timed out`);
      return { success: false, data: null as any, message: 'Request timed out. Is the backend running?' };
    }
    console.warn(`[API] ${path} failed:`, err?.message || err);
    return { success: false, data: null as any, message: `Cannot reach server (${cachedBaseUrl}). Ensure the backend is running.` };
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
  offramp: (body: { amountUsdc: number; recipientName: string; recipientPhone?: string; recipientNetwork?: string; purpose: string }) =>
    request<{ transaction: any; quote: TransferQuote; kotaniReferenceId: string; message: string }>('/transfer/offramp', { method: 'POST', body: JSON.stringify(body) }),
  onramp: (body: { fiatAmount: number; phoneNumber: string; network: string }) =>
    request<{ transaction: any; kotaniReferenceId: string; message: string }>('/transfer/onramp', { method: 'POST', body: JSON.stringify(body) }),
  status: (referenceId: string) => request<{ transaction: any; kotaniStatus: any }>(`/transfer/status/${referenceId}`),
  retry: (referenceId: string) => request<{ transaction: any }>(`/transfer/retry/${referenceId}`, { method: 'POST' }),
  kotaniBalance: () => request<any>('/transfer/kotani-balance'),
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
  suggestions: () => request<string[]>('/chat/suggestions'),
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
