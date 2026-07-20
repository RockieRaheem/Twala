import { Router } from 'express';
import * as ai from '../services/ai.js';
import { store } from '../store.js';

const router = Router();

function buildSuggestions(): string[] {
  const s: string[] = [];
  if (store.wallet && store.wallet.balanceUsdc > 0) {
    s.push('What is my balance?');
    s.push('Send money to Uganda');
  } else {
    s.push('Create a wallet');
  }
  if (store.goals.length > 0) {
    s.push(`How is "${store.goals[0].title.substring(0, 20)}" doing?`);
    s.push('Add to savings goal');
  } else {
    s.push('Help me set a savings goal');
  }
  s.push('What is the exchange rate?');
  s.push('Show recent transactions');
  s.push('What can you do?');
  return s;
}

router.get('/', (_req, res) => {
  const history = ai.getChatHistory();
  res.json({ success: true, data: history });
});

router.get('/suggestions', (_req, res) => {
  res.json({ success: true, data: buildSuggestions() });
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
