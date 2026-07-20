import { Router } from 'express';
import { getExchangeRate } from '../services/rates.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rate = await getExchangeRate();
    res.json({ success: true, data: rate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
