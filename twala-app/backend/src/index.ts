import 'dotenv/config';
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
import * as stellar from './services/stellar.js';
import * as db from './services/database.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const wallet = await db.getWallet().catch(() => null);
  const goals = await db.getGoals().catch(() => []);
  const { transactions } = await db.getTransactions({ limit: 1 }).catch(() => ({ transactions: [], total: 0 }));

  res.json({
    success: true,
    data: {
      status: 'ok',
      database: 'supabase',
      stellarNetwork: config.stellar.network,
      stellarHorizon: config.stellar.horizonUrl,
      usdcIssuer: config.stellar.usdcIssuer,
      walletExists: !!wallet,
      walletAddress: wallet?.publicKey || null,
      walletFunded: wallet?.isFunded || false,
      goalsCount: goals.length,
      transactionsCount: transactions.length,
      kotaniConfigured: !!config.kotani.apiKey,
      aiConfigured: !!process.env.GROQ_API_KEY || !!process.env.GEMINI_API_KEY,
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

app.listen(config.port, '0.0.0.0', async () => {
  console.log(`\n  🏦 Twala Backend running`);
  console.log(`  ─────────────────────`);
  console.log(`  Network : ${config.stellar.network}`);
  console.log(`  Horizon : ${config.stellar.horizonUrl}`);
  console.log(`  Port    : ${config.port}`);
  console.log(`  Kotani  : ${config.kotani.apiKey ? 'Configured ✓' : 'Demo mode'}`);
  console.log(`  Address : http://localhost:${config.port}`);
  console.log(`  API     : http://localhost:${config.port}/api/health\n`);

  // Step 1: Initialize test USDC issuer
  await stellar.initializeTestUsdc();

  // Step 2: Check for existing wallet in DB
  let existing = await db.getWallet().catch(() => null);

  if (existing) {
    console.log(`  🔄 Restoring wallet from database...`);
    const balance = await stellar.getBalance(existing.publicKey);
    console.log(`  ✅ Wallet  : ${existing.publicKey} ${existing.isFunded ? '(funded)' : '(unfunded)'}`);

    // Ensure trustline and mint if freshly restored
    if (existing.isFunded) {
      try {
        await stellar.ensureTrustline(existing.secretKey);
      } catch (tlErr) {
        const msg = tlErr instanceof Error ? tlErr.message : String(tlErr);
        console.log(`  ⚠️  Trustline: ${msg}`);
      }
      if (balance.usdc === 0) {
        await stellar.mintTestUsdc(existing.secretKey, config.testUsdc.initialMintAmount);
      }
      const fresh = await stellar.getBalance(existing.publicKey);
      console.log(`  💰 Balance : $${fresh.usdc.toFixed(2)} USDC · ${fresh.xlm.toFixed(2)} XLM`);
    }
  } else {
    console.log(`  🆕 Creating new wallet...`);
    try {
      const wallet = await stellar.createWallet();
      await db.saveWallet(wallet);
      console.log(`  ✅ Wallet  : ${wallet.publicKey} ${wallet.isFunded ? '(funded via Friendbot)' : '(unfunded)'}`);
      console.log(`  👛 Secret  : ${wallet.secretKey}`);

      if (wallet.isFunded) {
        try {
          await stellar.ensureTrustline(wallet.secretKey);
          console.log(`  ✅ Trustline: USDC trustline established`);
        } catch (tlErr) {
          const msg = tlErr instanceof Error ? tlErr.message : String(tlErr);
          console.log(`  ⚠️  Trustline: ${msg}`);
        }

        await stellar.mintTestUsdc(wallet.secretKey, config.testUsdc.initialMintAmount);

        const balance = await stellar.getBalance(wallet.publicKey);
        console.log(`  💰 Balance : $${balance.usdc.toFixed(2)} USDC · ${balance.xlm.toFixed(2)} XLM`);
        if (balance.usdc > 0) {
          console.log(`  🎉 Wallet is ready for test transactions!`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ⚠️  Wallet  : ${msg}`);
    }
  }
});
