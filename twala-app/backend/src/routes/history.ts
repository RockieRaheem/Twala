import { Router } from 'express';
import * as db from '../services/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const filter = req.query.filter as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { transactions, total } = await db.getTransactions({ type: filter, page, limit });
  const stats = await db.getTransactionStats();

  res.json({
    success: true,
    data: {
      transactions,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export default router;
