import express from 'express';
import cors from 'cors';
import config from './config.js';
import walletRouter from './routes/wallet.js';
import transferRouter from './routes/transfer.js';
import goalsRouter from './routes/goals.js';
import historyRouter from './routes/history.js';
import chatRouter from './routes/chat.js';
import ratesRouter from './routes/rates.js';
import kotaniRouter from './routes/kotani.js';
import { store } from './store.js';
import * as stellar from './services/stellar.js';
import { getExchangeRate } from './services/rates.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      stellarNetwork: config.stellar.network,
      walletExists: !!store.wallet,
      walletAddress: store.wallet?.publicKey || null,
      goalsCount: store.goals.length,
      transactionsCount: store.transactions.length,
      kotaniConfigured: !!config.kotani.apiKey,
    },
  });
});

app.use('/api/wallet', walletRouter);
app.use('/api/transfer', transferRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/history', historyRouter);
app.use('/api/chat', chatRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/kotani', kotaniRouter);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n  🏦 Twala Backend running`);
  console.log(`  ─────────────────────`);
  console.log(`  Network : ${config.stellar.network} (${config.stellar.horizonUrl})`);
  console.log(`  Port    : ${config.port}`);
  console.log(`  Kotani  : ${config.kotani.apiKey ? 'Configured' : 'Demo mode (no key)'}`);
  console.log(`  Address : http://localhost:${config.port}`);
  console.log(`  API     : http://localhost:${config.port}/api/health\n`);

  // Create demo wallet on startup
  stellar.createWallet()
    .then(async (w) => {
      await stellar.ensureTrustline(w.secretKey);
      console.log(`  ✅ Demo wallet created: ${w.publicKey.slice(0, 8)}...`);
    })
    .catch(() => {
      console.log(`  ℹ️  Using in-memory demo wallet (no Stellar connection)`);
    });
});
