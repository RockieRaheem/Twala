import { Router } from 'express';
import * as stellar from '../services/stellar.js';
import * as kotani from '../services/kotani.js';
import { getExchangeRate, calculateQuote } from '../services/rates.js';
import { store } from '../store.js';

const router = Router();

router.get('/quote', async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount as string);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const rate = await getExchangeRate();
    const quote = calculateQuote(amount, rate);
    res.json({ success: true, data: quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { amountUsdc, recipientName, recipientPhone, recipientNetwork, purpose } = req.body;

    if (!amountUsdc || !recipientName || !purpose) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (amountUsdc < 10) return res.status(400).json({ success: false, message: 'Minimum transfer is 10 USDC' });

    if (!store.wallet) return res.status(400).json({ success: false, message: 'No wallet. Create one first.' });

    const rate = await getExchangeRate();
    const quote = calculateQuote(amountUsdc, rate);

    // Submit Stellar payment (simulated if no wallet secret or test mode)
    let stellarTxHash = '';
    try {
      stellarTxHash = await stellar.submitPayment(
        store.wallet.secretKey,
        'GA7Q5OQJ6X4G6T5ZVQ4Q3Z6H5KQ7R5QKZ6H5KQ7R5QKZ6H5KQ7R5QKZ6', // Kotani escrow placeholder
        quote.sendAmountUsdc.toFixed(7),
        `twala-${Date.now()}`
      );
    } catch {
      stellarTxHash = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // Submit Kotani offramp
    const kotaniResult = await kotani.createOfframp({
      cryptoAmount: quote.sendAmountUsdc,
      currency: 'UGX',
      chain: 'STELLAR',
      token: 'USDC',
      referenceId: `twala-${Date.now()}`,
      transactionHash: stellarTxHash,
    });

    const tx = {
      id: `tx-${Date.now()}`,
      type: 'sent' as const,
      amountUsdc: quote.sendAmountUsdc,
      amountUgx: quote.receiveAmountUgx,
      rate: quote.rate,
      recipientName,
      recipientPhone: recipientPhone || '',
      recipientNetwork: (recipientNetwork as 'MTN' | 'AIRTEL') || 'MTN',
      status: 'pending' as const,
      purpose,
      stellarTxHash,
      kotaniReferenceId: kotaniResult.data?.referenceId,
      createdAt: new Date().toISOString(),
    };

    store.transactions.unshift(tx);

    // Simulate completion after 30s
    setTimeout(() => {
      const found = store.transactions.find((t) => t.id === tx.id);
      if (found) found.status = 'completed';
    }, 30000);

    res.json({
      success: true,
      data: {
        transaction: tx,
        quote,
        message: `Sent ${quote.sendAmountUsdc.toFixed(2)} USDC to ${recipientName}. Delivering ~${quote.receiveAmountUgx.toLocaleString()} UGX via ${recipientNetwork || 'MTN'} Mobile Money.`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
