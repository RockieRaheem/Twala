import { Router } from 'express';
import * as ai from '../services/ai.js';
import * as db from '../services/database.js';

const router = Router();

router.get('/', async (_req, res) => {
  const history = await db.getChatMessages();
  res.json({ success: true, data: history });
});

router.get('/suggestions', async (_req, res) => {
  const suggestions: string[] = [];
  const wallet = await db.getWallet();
  const goals = await db.getGoals();

  if (wallet && wallet.balanceUsdc > 0) {
    suggestions.push('What is my balance?');
    suggestions.push('Send money to Uganda');
  } else {
    suggestions.push('Create a wallet');
  }
  if (goals.length > 0) {
    suggestions.push(`How is "${goals[0].title.substring(0, 20)}" doing?`);
    suggestions.push('Add to savings goal');
  } else {
    suggestions.push('Help me set a savings goal');
  }
  suggestions.push('What is the exchange rate?');
  suggestions.push('Show recent transactions');
  suggestions.push('What can you do?');

  res.json({ success: true, data: suggestions });
});

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message required' });
  }

  try {
    const { messages, navigate } = await ai.chat(message.trim());
    res.json({ success: true, data: messages, navigate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.delete('/', async (_req, res) => {
  await db.clearChatMessages();
  const history = await db.getChatMessages();
  res.json({ success: true, data: history });
});

export default router;
