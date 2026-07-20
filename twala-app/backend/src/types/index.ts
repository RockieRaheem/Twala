export interface WalletInfo {
  publicKey: string;
  secretKey: string;
  balanceUsdc: number;
  balanceXlm: number;
}

export interface Transaction {
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
  kotaniReferenceId?: string;
  kotaniStatus?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmountUgx: number;
  savedAmountUgx: number;
  targetDate: string;
  category: 'home' | 'education' | 'business' | 'savings' | 'other';
  milestones: Milestone[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  targetAmountUgx: number;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExchangeRate {
  usdcToUgx: number;
  usdToUgx: number;
  lastUpdated: string;
  change24h: number;
}

export interface TransferQuote {
  sendAmountUsdc: number;
  receiveAmountUgx: number;
  feeUsdc: number;
  feeUgx: number;
  rate: number;
  totalUsdc: number;
  estimatedArrival: string;
}

export interface AiContext {
  walletBalance: number;
  goals: Goal[];
  recentTransactions: Transaction[];
  activeGoal?: Goal;
}
