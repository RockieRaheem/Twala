import { Keypair, TransactionBuilder, Operation, Asset, Networks, BASE_FEE, Horizon, Memo } from '@stellar/stellar-sdk';
import config from '../config.js';
import type { WalletInfo, Transaction } from '../types/index.js';
import { store } from '../store.js';

const server = new Horizon.Server(config.stellar.horizonUrl);
const usdcAsset = new Asset('USDC', config.stellar.usdcIssuer);

function getNetwork(): string {
  return config.stellar.network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;
}

export async function createWallet(): Promise<WalletInfo> {
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  if (config.stellar.network === 'TESTNET') {
    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${publicKey}`
      );
      const json = await response.json() as any;
      if (!json) throw new Error('Friendbot response empty');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Friendbot funding failed: ${msg}`);
    }
  }

  store.wallet = { publicKey, secretKey, balanceUsdc: 0, balanceXlm: 0 };

  const balance = await getBalance(publicKey);
  store.wallet.balanceUsdc = balance.usdc;
  store.wallet.balanceXlm = balance.xlm;

  return {
    publicKey,
    secretKey,
    balanceUsdc: balance.usdc,
    balanceXlm: balance.xlm,
  };
}

export async function getBalance(address: string): Promise<{ usdc: number; xlm: number }> {
  const account = await server.loadAccount(address);
  let usdc = 0;
  let xlm = 0;

  for (const b of account.balances) {
    const bal = b as any;
    if (bal.asset_type === 'native') {
      xlm = parseFloat(bal.balance);
    } else if (
      bal.asset_code === 'USDC' &&
      bal.asset_issuer === config.stellar.usdcIssuer
    ) {
      usdc = parseFloat(bal.balance);
    }
  }

  return { usdc, xlm };
}

export async function ensureTrustline(secretKey: string): Promise<void> {
  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();
  const account = await server.loadAccount(publicKey);

  const hasTrustline = account.balances.some(
    (b: any) =>
      b.asset_code === 'USDC' && b.asset_issuer === config.stellar.usdcIssuer
  );
  if (hasTrustline) return;

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetwork(),
  })
    .addOperation(Operation.changeTrust({
      asset: usdcAsset,
    }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  await server.submitTransaction(tx);
}

export async function submitPayment(
  secretKey: string,
  destination: string,
  amountUsdc: string,
  memo?: string
): Promise<string> {
  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();
  const account = await server.loadAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetwork(),
  })
    .addOperation(Operation.payment({
      destination,
      asset: usdcAsset,
      amount: amountUsdc,
    }))
    .setTimeout(30)
    .build();

  if (memo) {
    (tx as any)._memo = Memo.text(memo);
  }

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

export async function getRecentTransactions(address: string, limit = 20): Promise<any[]> {
  const txs = await server
    .transactions()
    .forAccount(address)
    .limit(limit)
    .order('desc')
    .call();

  const payments = await server
    .payments()
    .forAccount(address)
    .limit(limit)
    .order('desc')
    .call();

  return payments.records.map((p: any) => ({
    id: p.id,
    type: p.from === address ? 'sent' : 'received',
    amount: p.amount || '0',
    asset: p.asset_code || 'XLM',
    from: p.from,
    to: p.to,
    createdAt: p.created_at,
    txHash: p.transaction_hash,
  }));
}

export async function restoreWallet(secretKey: string): Promise<WalletInfo> {
  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();
  const balance = await getBalance(publicKey);

  store.wallet = { publicKey, secretKey, balanceUsdc: balance.usdc, balanceXlm: balance.xlm };

  return {
    publicKey,
    secretKey,
    balanceUsdc: balance.usdc,
    balanceXlm: balance.xlm,
  };
}
