const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  stellar: {
    network: (process.env.STELLAR_NETWORK || 'TESTNET') as 'TESTNET' | 'PUBLIC',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    usdcIssuer: process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    usdcIssuerSecret: process.env.USDC_ISSUER_SECRET || '',
  },
  kotani: {
    apiKey: process.env.KOTANI_API_KEY || '',
    sandboxUrl: 'https://sandbox-api.kotanipay.io',
    productionUrl: 'https://api.kotanipay.io',
    useSandbox: process.env.KOTANI_USE_SANDBOX !== 'false',
    escrowAddress: process.env.KOTANI_ESCROW_ADDRESS || '',
  },
  africasTalking: {
    username: process.env.AT_USERNAME || 'sandbox',
    apiKey: process.env.AT_API_KEY || '',
    senderId: process.env.AT_SENDER_ID || 'TWAALA',
    baseUrl: 'https://api.africastalking.com/version1',
    sandboxUrl: 'https://api.sandbox.africastalking.com/version1',
  },
  twala: {
    feePercent: 0.5,
    feeFixedUsdc: 0.50,
    minTransferUsdc: 10,
    maxTransferUsdc: 5000,
  },
  testUsdc: {
    issuerSecret: '',
    initialMintAmount: 100000,
  },
};

export default config;
