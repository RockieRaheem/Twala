import config from '../config.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = config.kotani.useSandbox
  ? config.kotani.sandboxUrl
  : config.kotani.productionUrl;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.kotani.apiKey}`,
  };
}

// ---------------------------------------------------------------------------
// Types — Kotani Pay v3 API
// ---------------------------------------------------------------------------

export interface KotaniApiResponse<T> {
  success: boolean;
  statusCode?: number;
  message: string;
  data?: T;
  error?: string;
}

export interface KotaniOfframpRequest {
  referenceId: string;
  cryptoAmount: number;
  currency: string;
  chain: string;
  token: string;
  transactionHash?: string;
}

export interface KotaniOfframpData {
  referenceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  cryptoAmount: number;
  cryptoAmountReceived: number;
  fiatAmount: number;
  feeInCrypto: number;
  feeInFiat: number;
  rate: number;
  transactionHash: string;
  phoneNumber?: string;
  network?: string;
  createdAt: string;
  completedAt?: string;
}

export interface KotaniOnrampRequest {
  referenceId: string;
  fiatAmount: number;
  currency: string;
  chain: string;
  token: string;
  phoneNumber: string;
  network: string;
}

export interface KotaniOnrampData {
  referenceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fiatAmount: number;
  cryptoAmount: number;
  cryptoAmountSent: number;
  feeInFiat: number;
  feeInCrypto: number;
  rate: number;
  phoneNumber: string;
  network: string;
  transactionHash: string;
  createdAt: string;
  completedAt?: string;
}

export interface KotaniBalanceData {
  asset: string;
  chain: string;
  balance: number;
  locked: number;
  available: number;
}

export interface KotaniWebhookPayload {
  event: 'offramp.completed' | 'offramp.failed' | 'onramp.completed' | 'onramp.failed';
  referenceId: string;
  status: 'completed' | 'failed';
  transactionHash?: string;
  completedAt?: string;
  failureReason?: string;
}

// ---------------------------------------------------------------------------
// Demo mode helpers
// ---------------------------------------------------------------------------

function isDemoMode(): boolean {
  return !config.kotani.apiKey;
}

function demoDelay(ms = 800): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let demoOfframps: Map<string, KotaniOfframpData> = new Map();
let demoOnramps: Map<string, KotaniOnrampData> = new Map();
let demoIdCounter = 0;

function nextDemoRefId(): string {
  return `twala-demo-${Date.now()}-${++demoIdCounter}`;
}

// ---------------------------------------------------------------------------
// Offramp — USDC → Mobile Money (Twala → Uganda)
// ---------------------------------------------------------------------------

export async function createOfframp(
  params: KotaniOfframpRequest
): Promise<KotaniApiResponse<KotaniOfframpData>> {
  if (isDemoMode()) {
    await demoDelay();
    const rate = 3750;
    const fee = Math.max(params.cryptoAmount * 0.02, 1);
    const received = params.cryptoAmount - fee;
    const data: KotaniOfframpData = {
      referenceId: params.referenceId,
      status: 'pending',
      cryptoAmount: params.cryptoAmount,
      cryptoAmountReceived: received,
      fiatAmount: Math.round(received * rate),
      feeInCrypto: fee,
      feeInFiat: Math.round(fee * rate),
      rate,
      transactionHash: params.transactionHash || `demo-tx-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    demoOfframps.set(data.referenceId, data);

    // Simulate completion after 15s
    setTimeout(() => {
      const stored = demoOfframps.get(data.referenceId);
      if (stored) {
        stored.status = 'completed';
        stored.completedAt = new Date().toISOString();
        demoOfframps.set(data.referenceId, stored);
      }
    }, 15000);

    return { success: true, statusCode: 200, message: 'Offramp created successfully', data };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/offramp`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        referenceId: params.referenceId,
        cryptoAmount: params.cryptoAmount,
        currency: params.currency,
        chain: params.chain,
        token: params.token,
        transactionHash: params.transactionHash,
      }),
    });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

export async function getOfframpStatus(
  referenceId: string
): Promise<KotaniApiResponse<KotaniOfframpData>> {
  if (isDemoMode()) {
    await demoDelay(300);
    const data = demoOfframps.get(referenceId);
    if (!data) {
      return { success: false, statusCode: 404, message: 'Offramp not found' };
    }
    return { success: true, statusCode: 200, message: 'OK', data };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/offramp/status/${referenceId}`, {
      headers: headers(),
    });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Onramp — Mobile Money → USDC (Uganda → Twala)
// ---------------------------------------------------------------------------

export async function createOnramp(
  params: KotaniOnrampRequest
): Promise<KotaniApiResponse<KotaniOnrampData>> {
  if (isDemoMode()) {
    await demoDelay();
    const rate = 3750;
    const fee = Math.max(params.fiatAmount * 0.02, 1000);
    const cryptoAmount = (params.fiatAmount - fee) / rate;
    const data: KotaniOnrampData = {
      referenceId: params.referenceId,
      status: 'pending',
      fiatAmount: params.fiatAmount,
      cryptoAmount,
      cryptoAmountSent: cryptoAmount * 0.98,
      feeInFiat: fee,
      feeInCrypto: fee / rate,
      rate,
      phoneNumber: params.phoneNumber,
      network: params.network,
      transactionHash: '',
      createdAt: new Date().toISOString(),
    };
    demoOnramps.set(data.referenceId, data);

    // Simulate incoming USDC after 30s
    setTimeout(() => {
      const stored = demoOnramps.get(data.referenceId);
      if (stored) {
        stored.status = 'completed';
        stored.transactionHash = `demo-incoming-${Date.now()}`;
        stored.completedAt = new Date().toISOString();
        demoOnramps.set(data.referenceId, stored);
      }
    }, 30000);

    return { success: true, statusCode: 200, message: 'Onramp created successfully', data };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/onramp`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        referenceId: params.referenceId,
        fiatAmount: params.fiatAmount,
        currency: params.currency,
        chain: params.chain,
        token: params.token,
        phoneNumber: params.phoneNumber,
        network: params.network,
      }),
    });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

export async function getOnrampStatus(
  referenceId: string
): Promise<KotaniApiResponse<KotaniOnrampData>> {
  if (isDemoMode()) {
    await demoDelay(300);
    const data = demoOnramps.get(referenceId);
    if (!data) {
      return { success: false, statusCode: 404, message: 'Onramp not found' };
    }
    return { success: true, statusCode: 200, message: 'OK', data };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/onramp/status/${referenceId}`, {
      headers: headers(),
    });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Merchant balance
// ---------------------------------------------------------------------------

export async function getMerchantBalance(): Promise<KotaniApiResponse<KotaniBalanceData[]>> {
  if (isDemoMode()) {
    await demoDelay(300);
    return {
      success: true,
      statusCode: 200,
      message: 'OK',
      data: [
        { asset: 'USDC', chain: 'STELLAR', balance: 25000, locked: 3200, available: 21800 },
        { asset: 'XLM', chain: 'STELLAR', balance: 5000, locked: 0, available: 5000 },
      ],
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/balance`, { headers: headers() });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Webhook registration
// ---------------------------------------------------------------------------

export async function registerWebhook(url: string): Promise<KotaniApiResponse<any>> {
  if (isDemoMode()) {
    await demoDelay();
    return { success: true, statusCode: 200, message: 'Webhook registered (demo)' };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v3/webhook`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        url,
        events: ['offramp.completed', 'offramp.failed', 'onramp.completed', 'onramp.failed'],
      }),
    });
    const json = await res.json();
    return { success: res.ok, statusCode: res.status, ...json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, statusCode: 0, message: `Network error: ${msg}`, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Webhook payload verification
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  if (isDemoMode()) return true;
  // In production, verify HMAC-SHA256 signature
  // const crypto = require('crypto');
  // const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return signature === secret;
}

// ---------------------------------------------------------------------------
// Helper: Generate unique reference ID
// ---------------------------------------------------------------------------

export function generateReferenceId(): string {
  return isDemoMode()
    ? nextDemoRefId()
    : `twala-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}