import { Router } from 'express';
import * as kotani from '../services/kotani.js';
import * as db from '../services/database.js';
import config from '../config.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/kotani/webhook — Kotani Pay webhook handler
// ---------------------------------------------------------------------------

router.post('/webhook', async (req, res) => {
  try {
    const payload: kotani.KotaniWebhookPayload = req.body;
    const signature = req.headers['x-kotani-signature'] as string;

    if (!kotani.verifyWebhookSignature(payload, signature, config.kotani.apiKey)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const tx = await db.getTransactionByKotaniRef(payload.referenceId);
    if (tx) {
      if (payload.event.endsWith('.completed')) {
        await db.updateTransaction(tx.id, {
          status: 'completed',
          kotaniStatus: 'completed',
          stellarTxHash: payload.transactionHash || tx.stellarTxHash,
        });
      } else if (payload.event.endsWith('.failed')) {
        await db.updateTransaction(tx.id, { status: 'failed', kotaniStatus: 'failed' });
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/kotani/balance — Kotani Pay merchant balance
// ---------------------------------------------------------------------------

router.get('/balance', async (_req, res) => {
  try {
    const result = await kotani.getMerchantBalance();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/kotani/register-webhook — Self-register webhook URL
// ---------------------------------------------------------------------------

router.post('/register-webhook', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL required' });
    const result = await kotani.registerWebhook(url);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
