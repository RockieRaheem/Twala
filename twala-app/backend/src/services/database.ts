import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WalletInfo, Transaction, Goal, ChatMessage, ExchangeRate } from '../types/index.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let _db: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!_db) {
    if (!supabaseUrl || !supabaseKey) {
      console.log('  ⚠️  Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      throw new Error('Supabase not configured');
    }
    _db = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('  ✅ Supabase connected');
  }
  return _db!;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export async function getWallet(): Promise<WalletInfo | null> {
  const { data } = await db()
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    publicKey: data.public_key,
    secretKey: data.secret_key,
    balanceUsdc: 0,
    balanceXlm: 0,
    isFunded: data.is_funded,
  };
}

export async function saveWallet(wallet: WalletInfo): Promise<void> {
  // Keep only one wallet — delete all then insert
  await db().from('wallets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db().from('wallets').insert({
    public_key: wallet.publicKey,
    secret_key: wallet.secretKey,
    is_funded: wallet.isFunded,
  });
}

export async function updateWalletBalances(publicKey: string, balanceUsdc: number, balanceXlm: number): Promise<void> {
  await db()
    .from('wallets')
    .update({ updated_at: new Date().toISOString() })
    .eq('public_key', publicKey);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function getGoals(): Promise<Goal[]> {
  const { data } = await db()
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (!data) return [];
  return data.map(goalRow);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const { data } = await db()
    .from('goals')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) return null;
  return goalRow(data);
}

export async function createGoal(input: {
  title: string;
  description?: string;
  targetAmountUgx: number;
  targetDate?: string;
  category?: string;
  milestones?: any[];
}): Promise<Goal> {
  const { data } = await db()
    .from('goals')
    .insert({
      title: input.title,
      description: input.description || '',
      target_amount_ugx: input.targetAmountUgx,
      target_date: input.targetDate || null,
      category: input.category || 'other',
      milestones: input.milestones || [],
    })
    .select()
    .single();

  if (!data) throw new Error('Failed to create goal');
  return goalRow(data);
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.savedAmountUgx !== undefined) dbUpdates.saved_amount_ugx = updates.savedAmountUgx;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.milestones !== undefined) dbUpdates.milestones = updates.milestones;

  const { data } = await db()
    .from('goals')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  return data ? goalRow(data) : null;
}

export async function contributeToGoal(id: string, amountUgx: number): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;

  const newSaved = goal.savedAmountUgx + amountUgx;
  const milestones = goal.milestones.map((m) => {
    if (!m.completed && newSaved >= (m.targetAmountUgx || 0)) {
      return { ...m, completed: true, completedAt: new Date().toISOString() };
    }
    return m;
  });

  const status = newSaved >= goal.targetAmountUgx ? 'completed' : goal.status;

  return updateGoal(id, {
    savedAmountUgx: newSaved,
    milestones,
    status: status as 'active' | 'completed' | 'cancelled',
  });
}

function goalRow(data: any): Goal {
  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    targetAmountUgx: Number(data.target_amount_ugx),
    savedAmountUgx: Number(data.saved_amount_ugx),
    targetDate: data.target_date || '2026-12-31',
    category: data.category || 'other',
    status: data.status || 'active',
    createdAt: data.created_at,
    milestones: data.milestones || [],
  };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function getTransactions(options?: {
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ transactions: Transaction[]; total: number }> {
  const type = options?.type;
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 50, 100);
  const offset = (page - 1) * limit;

  let query = db()
    .from('transactions')
    .select('*', { count: 'exact' });

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return {
    transactions: (data || []).map(txRow),
    total: count || 0,
  };
}

export async function getTransactionByKotaniRef(
  referenceId: string
): Promise<Transaction | null> {
  const { data } = await db()
    .from('transactions')
    .select('*')
    .eq('kotani_reference_id', referenceId)
    .limit(1)
    .single();

  return data ? txRow(data) : null;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const { data } = await db()
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  return data ? txRow(data) : null;
}

export async function createTransaction(
  input: Omit<Transaction, 'id' | 'createdAt'> & { goalId?: string }
): Promise<Transaction> {
  const { data } = await db()
    .from('transactions')
    .insert({
      type: input.type,
      amount_usdc: input.amountUsdc,
      amount_ugx: input.amountUgx || null,
      rate: input.rate || null,
      recipient_name: input.recipientName || '',
      recipient_phone: input.recipientPhone || '',
      recipient_network: input.recipientNetwork || '',
      status: input.status || 'pending',
      purpose: input.purpose || '',
      stellar_tx_hash: input.stellarTxHash || '',
      stellar_operation_id: input.stellarOperationId || '',
      kotani_reference_id: input.kotaniReferenceId || '',
      kotani_status: input.kotaniStatus || '',
      goal_id: input.goalId || null,
    })
    .select()
    .single();

  if (!data) throw new Error('Failed to create transaction');
  return txRow(data);
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction | null> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.kotaniStatus !== undefined) dbUpdates.kotani_status = updates.kotaniStatus;
  if (updates.stellarTxHash !== undefined) dbUpdates.stellar_tx_hash = updates.stellarTxHash;

  const { data } = await db()
    .from('transactions')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  return data ? txRow(data) : null;
}

export async function getTransactionStats(): Promise<{
  totalSent: number;
  totalReceived: number;
  thisMonth: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: sentData } = await db()
    .from('transactions')
    .select('amount_usdc')
    .eq('type', 'sent')
    .eq('status', 'completed');

  const { data: receivedData } = await db()
    .from('transactions')
    .select('amount_usdc')
    .eq('type', 'received')
    .eq('status', 'completed');

  const { data: monthData } = await db()
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth);

  return {
    totalSent: (sentData || []).reduce((s, r) => s + Number(r.amount_usdc), 0),
    totalReceived: (receivedData || []).reduce((s, r) => s + Number(r.amount_usdc), 0),
    thisMonth: monthData?.length || 0,
  };
}

function txRow(data: any): Transaction {
  return {
    id: data.id,
    type: data.type,
    amountUsdc: Number(data.amount_usdc),
    amountUgx: data.amount_ugx ? Number(data.amount_ugx) : undefined,
    rate: data.rate ? Number(data.rate) : undefined,
    recipientName: data.recipient_name || '',
    recipientPhone: data.recipient_phone || '',
    recipientNetwork: data.recipient_network || undefined,
    status: data.status,
    purpose: data.purpose || '',
    stellarTxHash: data.stellar_tx_hash || undefined,
    stellarOperationId: data.stellar_operation_id || undefined,
    kotaniReferenceId: data.kotani_reference_id || undefined,
    kotaniStatus: data.kotani_status || undefined,
    goalId: data.goal_id || undefined,
    createdAt: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function getChatMessages(): Promise<ChatMessage[]> {
  const { data } = await db()
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (!data) return [];
  return data.map((r: any) => ({
    id: r.id,
    role: r.role as 'user' | 'assistant' | 'system',
    content: r.content,
    timestamp: r.created_at,
  }));
}

export async function addChatMessage(msg: {
  role: 'user' | 'assistant' | 'system';
  content: string;
}): Promise<void> {
  await db().from('chat_messages').insert({
    role: msg.role,
    content: msg.content,
  });
}

export async function clearChatMessages(): Promise<void> {
  await db().from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // Re-seed welcome message
  await addChatMessage({
    role: 'assistant',
    content: "Hi! I'm **Kanzu**, your AI financial companion. I can help you send money to Uganda, track your savings goals, and more. What would you like to do today?",
  });
}

// ---------------------------------------------------------------------------
// Exchange Rates
// ---------------------------------------------------------------------------

export async function getLatestRate(): Promise<ExchangeRate | null> {
  const { data } = await db()
    .from('exchange_rates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    usdcToUgx: Number(data.usdc_to_ugx),
    usdToUgx: Number(data.usd_to_ugx),
    lastUpdated: data.fetched_at,
    change24h: Number(data.change_24h),
  };
}

export async function saveRate(rate: ExchangeRate): Promise<void> {
  await db().from('exchange_rates').insert({
    usdc_to_ugx: rate.usdcToUgx,
    usd_to_ugx: rate.usdToUgx,
    change_24h: rate.change24h || 0,
    fetched_at: rate.lastUpdated || new Date().toISOString(),
  });
}
