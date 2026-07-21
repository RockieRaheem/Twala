import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

const LAN_IP = process.env.EXPO_PUBLIC_LAN_IP || '192.168.1.153';

const LOCAL_DEV = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api'
    : `http://${LAN_IP}:4000/api`;

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
// Change notification — lets chat signal dashboard to refresh
// ---------------------------------------------------------------------------

let _changeCounter = 0;

export function notifyChange() { _changeCounter++; }

export function getChangeCounter() { return _changeCounter; }

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
  type: 'sent' | 'received';
  amountUsdc: number;
  amountUgx?: number;
  rate?: number;
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
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface NavigateAction {
  screen: string;
  goalId?: string;
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
// Generic fetch (no fallbacks — errors propagate to caller)
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit, timeoutMs = 3000): Promise<ApiResult<T>> {
  const url = `${cachedBaseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check that the backend is running.');
    }
    throw new Error('Backend is offline. Make sure the server is running.');
  }
}

// ---------------------------------------------------------------------------
// API clients — pure backend calls, no fabricated data
// ---------------------------------------------------------------------------

export const walletApi = {
  info: () =>
    request<{ publicKey: string; balanceUsdc: number; balanceXlm: number; isFunded: boolean }>('/wallet/info'),
  create: () =>
    request<{ publicKey: string; balanceUsdc: number; balanceXlm: number; isFunded: boolean }>('/wallet/create', { method: 'POST' }),
  balance: () =>
    request<{ balanceUsdc: number; balanceXlm: number; publicKey: string | null; isFunded: boolean }>('/wallet/balance'),
};

export const transferApi = {
  quote: (amount: number) =>
    request<TransferQuote>(`/transfer/quote?amount=${amount}`),

  offramp: (body: { amountUsdc: number; recipientName: string; recipientPhone?: string; recipientNetwork?: string; purpose: string }) =>
    request<{ transaction: TransactionItem; quote: TransferQuote; kotaniReferenceId: string; message: string }>(
      '/transfer/offramp', { method: 'POST', body: JSON.stringify(body) }
    ),

  onramp: (body: { fiatAmount: number; phoneNumber: string; network: string }) =>
    request<{ transaction: TransactionItem; kotaniReferenceId: string; message: string }>(
      '/transfer/onramp', { method: 'POST', body: JSON.stringify(body) }
    ),

  status: (referenceId: string) =>
    request<{ transaction: TransactionItem; kotaniStatus: any }>(`/transfer/status/${referenceId}`),

  retry: (referenceId: string) =>
    request<{ transaction: TransactionItem }>(`/transfer/retry/${referenceId}`, { method: 'POST' }),
};

export const historyApi = {
  list: (filter?: string, page = 1) =>
    request<{ transactions: TransactionItem[]; stats: { totalSent: number; totalReceived: number; thisMonth: number }; pagination: any }>(
      `/history?filter=${filter || 'all'}&page=${page}`
    ),
};

export const goalsApi = {
  list: () =>
    request<GoalData[]>('/goals'),

  get: (id: string) =>
    request<GoalData>(`/goals/${id}`),

  create: (data: { title: string; targetAmountUgx: number; category: string; description?: string }) =>
    request<GoalData>('/goals', { method: 'POST', body: JSON.stringify(data) }),

  contribute: (id: string, amountUgx: number) =>
    request<GoalData>(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amountUgx }) }),

  update: (id: string, data: { title?: string; targetAmountUgx?: number; category?: string; description?: string }) =>
    request<GoalData>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/goals/${id}`, { method: 'DELETE' }),
};

export const chatApi = {
  list: () =>
    request<ChatMsg[]>('/chat'),

  send: (message: string) =>
    request<{ messages: ChatMsg[]; navigate?: NavigateAction }>('/chat', { method: 'POST', body: JSON.stringify({ message }) }, 25000),

  clear: () =>
    request<ChatMsg[]>('/chat', { method: 'DELETE' }),

  suggestions: () =>
    request<string[]>('/chat/suggestions'),
};

export const ratesApi = {
  get: () =>
    request<RateData>('/rates'),
};
