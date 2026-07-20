import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  const filter = req.query.filter as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  let txs = [...store.transactions];

  if (filter && filter !== 'all') {
    txs = txs.filter((t) => t.type === filter.toLowerCase());
  }

  txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSent = store.transactions.filter((t) => t.type === 'sent' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amountUsdc, 0);

  const totalReceived = store.transactions.filter((t) => t.type === 'received' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amountUsdc, 0);

  const start = (page - 1) * limit;
  const paginated = txs.slice(start, start + limit);

  res.json({
    success: true,
    data: {
      transactions: paginated,
      stats: {
        totalSent,
        totalReceived,
        totalCount: txs.length,
        thisMonth: txs.filter((t) => {
          const d = new Date(t.createdAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      },
      pagination: {
        page,
        limit,
        total: txs.length,
        totalPages: Math.ceil(txs.length / limit),
      },
    },
  });
});

export default router;
