import { Router } from 'express';
import * as kotani from '../services/kotani.js';

const router = Router();

router.get('/balance', async (_req, res) => {
  try {
    const result = await kotani.getMerchantBalance();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

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
