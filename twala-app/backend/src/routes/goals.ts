import { Router } from 'express';
import * as db from '../services/database.js';

const router = Router();

router.get('/', async (_req, res) => {
  const goals = await db.getGoals();
  res.json({ success: true, data: goals });
});

router.get('/:id', async (req, res) => {
  const goal = await db.getGoal(req.params.id);
  if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
  res.json({ success: true, data: goal });
});

router.post('/', async (req, res) => {
  const { title, description, targetAmountUgx, targetDate, category, milestones } = req.body;
  if (!title || !targetAmountUgx) {
    return res.status(400).json({ success: false, message: 'title and targetAmountUgx required' });
  }

  const goal = await db.createGoal({
    title,
    description: description || '',
    targetAmountUgx,
    targetDate: targetDate || undefined,
    category: category || 'other',
    milestones: milestones || [],
  });

  res.json({ success: true, data: goal });
});

router.post('/:id/contribute', async (req, res) => {
  const { amountUgx } = req.body;
  if (!amountUgx || amountUgx <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amountUgx required' });
  }

  const goal = await db.contributeToGoal(req.params.id, amountUgx);
  if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

  res.json({ success: true, data: goal });
});

export default router;
