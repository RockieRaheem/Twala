const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  stellar: {
    network: (process.env.STELLAR_NETWORK || 'TESTNET') as 'TESTNET' | 'PUBLIC',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    usdcIssuer: process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  kotani: {
    apiKey: process.env.KOTANI_API_KEY || '',
    sandboxUrl: 'https://sandbox-api.kotanipay.io',
    productionUrl: 'https://api.kotanipay.io',
    useSandbox: process.env.KOTANI_USE_SANDBOX !== 'false',
  },
  twala: {
    feePercent: 0.5,
    feeFixedUsdc: 0.50,
    minTransferUsdc: 10,
    maxTransferUsdc: 5000,
  },
};

export default config;
