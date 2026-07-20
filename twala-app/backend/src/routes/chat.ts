import { Router } from 'express';
import * as ai from '../services/ai.js';

const router = Router();

router.get('/', (_req, res) => {
  const history = ai.getChatHistory();
  res.json({ success: true, data: history });
});

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message required' });
  }

  try {
    const history = await ai.chat(message.trim());
    res.json({ success: true, data: history });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.delete('/', (_req, res) => {
  ai.clearChat();
  res.json({ success: true, data: ai.getChatHistory() });
});

export default router;
