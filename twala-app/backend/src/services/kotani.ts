import config from '../config.js';

const BASE_URL = config.kotani.useSandbox
  ? config.kotani.sandboxUrl
  : config.kotani.productionUrl;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.kotani.apiKey}`,
  };
}

export interface KotaniOfframpResponse {
  success: boolean;
  message: string;
  data?: {
    referenceId: string;
    status: string;
    cryptoAmount: number;
    cryptoAmountReceived: number;
    feeInCrypto: number;
    transactionHash: string;
  };
}

export async function createOfframp(params: {
  cryptoAmount: number;
  currency: string;
  chain: string;
  token: string;
  referenceId: string;
  transactionHash?: string;
}): Promise<KotaniOfframpResponse> {
  if (!config.kotani.apiKey) {
    return {
      success: true,
      message: 'Demo mode: offramp simulated',
      data: {
        referenceId: params.referenceId,
        status: 'pending',
        cryptoAmount: params.cryptoAmount,
        cryptoAmountReceived: params.cryptoAmount * 0.98,
        feeInCrypto: params.cryptoAmount * 0.02,
        transactionHash: params.transactionHash || 'demo-tx-hash',
      },
    };
  }

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

  return res.json();
}

export async function getOfframpStatus(referenceId: string): Promise<KotaniOfframpResponse> {
  if (!config.kotani.apiKey) {
    return {
      success: true,
      message: 'Demo mode',
      data: {
        referenceId,
        status: 'completed',
        cryptoAmount: 0,
        cryptoAmountReceived: 0,
        feeInCrypto: 0,
        transactionHash: '',
      },
    };
  }

  const res = await fetch(`${BASE_URL}/api/v3/offramp/status/${referenceId}`, {
    headers: headers(),
  });
  return res.json();
}
