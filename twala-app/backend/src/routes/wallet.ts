import { Router } from 'express';
import * as stellar from '../services/stellar.js';
import { store } from '../store.js';

const router = Router();

router.post('/create', async (_req, res) => {
  try {
    const wallet = await stellar.createWallet();
    await stellar.ensureTrustline(wallet.secretKey);
    res.json({ success: true, data: { publicKey: wallet.publicKey, balanceUsdc: wallet.balanceUsdc, balanceXlm: wallet.balanceXlm } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/restore', async (req, res) => {
  try {
    const { secretKey } = req.body;
    if (!secretKey) return res.status(400).json({ success: false, message: 'secretKey required' });
    const wallet = await stellar.restoreWallet(secretKey);
    res.json({ success: true, data: { publicKey: wallet.publicKey, balanceUsdc: wallet.balanceUsdc, balanceXlm: wallet.balanceXlm } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.get('/balance', async (_req, res) => {
  try {
    if (!store.wallet) return res.json({ success: true, data: { balanceUsdc: 0, balanceXlm: 0 } });
    const balance = await stellar.getBalance(store.wallet.publicKey);
    if (store.wallet) {
      store.wallet.balanceUsdc = balance.usdc;
      store.wallet.balanceXlm = balance.xlm;
    }
    res.json({ success: true, data: { balanceUsdc: balance.usdc, balanceXlm: balance.xlm, publicKey: store.wallet.publicKey } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.get('/info', (_req, res) => {
  if (!store.wallet) return res.json({ success: true, data: null });
  res.json({
    success: true,
    data: {
      publicKey: store.wallet.publicKey,
      balanceUsdc: store.wallet.balanceUsdc,
      balanceXlm: store.wallet.balanceXlm,
    },
  });
});

export default router;
