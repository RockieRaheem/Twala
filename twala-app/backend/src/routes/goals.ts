import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: store.goals });
});

router.get('/:id', (req, res) => {
  const goal = store.goals.find((g) => g.id === req.params.id);
  if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
  res.json({ success: true, data: goal });
});

router.post('/', (req, res) => {
  const { title, description, targetAmountUgx, targetDate, category, milestones } = req.body;
  if (!title || !targetAmountUgx) {
    return res.status(400).json({ success: false, message: 'title and targetAmountUgx required' });
  }

  const goal = {
    id: `goal-${Date.now()}`,
    title,
    description: description || '',
    targetAmountUgx,
    savedAmountUgx: 0,
    targetDate: targetDate || '2026-12-31',
    category: category || 'other',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    milestones: milestones || [],
  };

  store.goals.push(goal);
  res.json({ success: true, data: goal });
});

router.post('/:id/contribute', (req, res) => {
  const { amountUgx } = req.body;
  if (!amountUgx || amountUgx <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amountUgx required' });
  }

  const goal = store.goals.find((g) => g.id === req.params.id);
  if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

  const newSaved = goal.savedAmountUgx + amountUgx;

  goal.milestones.forEach((m) => {
    if (!m.completed && newSaved >= m.targetAmountUgx) {
      m.completed = true;
      m.completedAt = new Date().toISOString();
    }
  });

  goal.savedAmountUgx = newSaved;

  if (goal.savedAmountUgx >= goal.targetAmountUgx) {
    goal.status = 'completed';
  }

  res.json({ success: true, data: goal });
});

export default router;
