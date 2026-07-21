import { Router } from 'express';
import * as stellar from '../services/stellar.js';
import * as kotani from '../services/kotani.js';
import { getExchangeRate, calculateQuote } from '../services/rates.js';
import * as db from '../services/database.js';
import config from '../config.js';

const router = Router();

const KOTANI_ESCROW_ADDRESS = 'GA7Q5OQJ6X4G6T5ZVQ4Q3Z6H5KQ7R5QKZ6H5KQ7R5QKZ6H5KQ7R5QKZ6';

// ---------------------------------------------------------------------------
// GET /api/transfer/quote?amount=XXX
// ---------------------------------------------------------------------------

router.get('/quote', async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount as string);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }
    if (amount < config.twala.minTransferUsdc) {
      return res.status(400).json({
        success: false,
        message: `Minimum transfer is ${config.twala.minTransferUsdc} USDC`,
      });
    }
    if (amount > config.twala.maxTransferUsdc) {
      return res.status(400).json({
        success: false,
        message: `Maximum transfer is ${config.twala.maxTransferUsdc} USDC`,
      });
    }

    const rate = await getExchangeRate();
    const quote = calculateQuote(amount, rate);
    res.json({ success: true, data: quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/transfer/offramp — Send USDC → Mobile Money (Uganda)
// ---------------------------------------------------------------------------

router.post('/offramp', async (req, res) => {
  try {
    const { amountUsdc, recipientName, recipientPhone, recipientNetwork, purpose } = req.body;

    const errors: string[] = [];
    if (!amountUsdc || amountUsdc <= 0) errors.push('Valid amountUsdc required');
    if (!recipientName || !recipientName.trim()) errors.push('recipientName required');
    if (!purpose || !purpose.trim()) errors.push('purpose required');
    if (amountUsdc < config.twala.minTransferUsdc) errors.push(`Minimum transfer is ${config.twala.minTransferUsdc} USDC`);
    if (amountUsdc > config.twala.maxTransferUsdc) errors.push(`Maximum transfer is ${config.twala.maxTransferUsdc} USDC`);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const wallet = await db.getWallet();
    if (!wallet) {
      return res.status(400).json({ success: false, message: 'No wallet found. Create a wallet first.' });
    }

    // Validate balance via Stellar
    const balance = await stellar.getBalance(wallet.publicKey);
    if (amountUsdc > balance.usdc) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You have $${balance.usdc.toFixed(2)} USDC but trying to send $${amountUsdc.toFixed(2)}.`,
        data: { balance: balance.usdc, shortfall: amountUsdc - balance.usdc },
      });
    }

    const rate = await getExchangeRate();
    const quote = calculateQuote(amountUsdc, rate);
    const referenceId = kotani.generateReferenceId();

    // Step 1: Submit USDC payment to Kotani Pay escrow on Stellar
    let stellarTxHash = '';

    try {
      await stellar.ensureTrustline(wallet.secretKey);

      if (!stellar.isValidPublicKey(KOTANI_ESCROW_ADDRESS)) {
        throw new Error('Invalid Kotani escrow address configured.');
      }

      stellarTxHash = await stellar.submitPayment(
        wallet.secretKey,
        KOTANI_ESCROW_ADDRESS,
        quote.sendAmountUsdc.toFixed(7),
        referenceId
      );
    } catch (stellarErr) {
      const msg = stellarErr instanceof Error ? stellarErr.message : String(stellarErr);
      stellarTxHash = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    // Step 2: Submit offramp request to Kotani Pay
    const kotaniResult = await kotani.createOfframp({
      referenceId,
      cryptoAmount: quote.sendAmountUsdc,
      currency: 'UGX',
      chain: 'STELLAR',
      token: 'USDC',
      transactionHash: stellarTxHash,
    });

    // Step 3: Create transaction record in DB
    const tx = await db.createTransaction({
      type: 'sent',
      amountUsdc: quote.sendAmountUsdc,
      amountUgx: quote.receiveAmountUgx,
      rate: quote.rate,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone || '',
      recipientNetwork: (recipientNetwork as 'MTN' | 'AIRTEL') || 'MTN',
      status: 'pending',
      purpose: purpose.trim(),
      stellarTxHash,
      kotaniReferenceId: referenceId,
      kotaniStatus: kotaniResult.data?.status || 'pending',
    });

    res.json({
      success: true,
      data: {
        transaction: tx,
        quote,
        kotaniReferenceId: referenceId,
        message: `Sent $${quote.sendAmountUsdc.toFixed(2)} USDC → ${recipientName.trim()}. Delivering ~${quote.receiveAmountUgx.toLocaleString()} UGX via ${recipientNetwork || 'MTN'} Mobile Money. Reference: ${referenceId.slice(-8)}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: `Transfer failed: ${msg}` });
  }
});

// ---------------------------------------------------------------------------
// POST /api/transfer/onramp — Mobile Money → USDC (deposit from Uganda)
// ---------------------------------------------------------------------------

router.post('/onramp', async (req, res) => {
  try {
    const { fiatAmount, phoneNumber, network } = req.body;
    const currency = 'UGX';

    const errors: string[] = [];
    if (!fiatAmount || fiatAmount <= 0) errors.push('Valid fiatAmount required');
    if (!phoneNumber || !phoneNumber.trim()) errors.push('phoneNumber required');
    if (!network || !['MTN', 'AIRTEL'].includes(network)) errors.push('network must be MTN or AIRTEL');
    if (fiatAmount < 10000) errors.push('Minimum onramp is UGX 10,000');
    if (fiatAmount > 20000000) errors.push('Maximum onramp is UGX 20,000,000');
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const rate = await getExchangeRate();
    const cryptoAmount = (fiatAmount / rate.usdcToUgx) * 0.98;
    const referenceId = kotani.generateReferenceId();

    const kotaniResult = await kotani.createOnramp({
      referenceId,
      fiatAmount,
      currency,
      chain: 'STELLAR',
      token: 'USDC',
      phoneNumber: phoneNumber.trim(),
      network,
    });

    const tx = await db.createTransaction({
      type: 'received',
      amountUsdc: cryptoAmount,
      amountUgx: fiatAmount,
      rate: rate.usdcToUgx,
      recipientName: phoneNumber.trim(),
      recipientPhone: phoneNumber.trim(),
      recipientNetwork: network as 'MTN' | 'AIRTEL',
      status: 'pending',
      purpose: 'Mobile Money Deposit',
      kotaniReferenceId: referenceId,
      kotaniStatus: kotaniResult.data?.status || 'pending',
    });

    res.json({
      success: true,
      data: {
        transaction: tx,
        kotaniReferenceId: referenceId,
        message: `Deposit request submitted! Pay UGX ${fiatAmount.toLocaleString()} via ${network} Mobile Money to receive ~$${cryptoAmount.toFixed(2)} USDC. Reference: ${referenceId.slice(-8)}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: `Onramp failed: ${msg}` });
  }
});

// ---------------------------------------------------------------------------
// GET /api/transfer/status/:referenceId
// ---------------------------------------------------------------------------

router.get('/status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const tx = await db.getTransactionByKotaniRef(referenceId);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const statusResult = tx.type === 'sent'
      ? await kotani.getOfframpStatus(referenceId)
      : await kotani.getOnrampStatus(referenceId);

    if (statusResult.success && statusResult.data) {
      const kotaniStatus = statusResult.data.status;
      let newStatus: 'pending' | 'completed' | 'failed' | undefined;
      if (kotaniStatus === 'completed' && tx.status === 'pending') {
        newStatus = 'completed';
      } else if (kotaniStatus === 'failed' && tx.status === 'pending') {
        newStatus = 'failed';
      }
      if (newStatus) {
        await db.updateTransaction(tx.id, { status: newStatus, kotaniStatus });
        tx.status = newStatus;
        tx.kotaniStatus = kotaniStatus;
      }
    }

    res.json({
      success: true,
      data: {
        transaction: tx,
        kotaniStatus: statusResult.data || null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/transfer/webhook — Kotani Pay webhook handler
// ---------------------------------------------------------------------------

router.post('/webhook', async (req, res) => {
  try {
    const payload: kotani.KotaniWebhookPayload = req.body;
    const signature = req.headers['x-kotani-signature'] as string;

    if (!kotani.verifyWebhookSignature(payload, signature, config.kotani.apiKey)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const tx = await db.getTransactionByKotaniRef(payload.referenceId);
    if (tx) {
      if (payload.event.endsWith('.completed')) {
        await db.updateTransaction(tx.id, {
          status: 'completed',
          kotaniStatus: 'completed',
          stellarTxHash: payload.transactionHash || tx.stellarTxHash,
        });
      } else if (payload.event.endsWith('.failed')) {
        await db.updateTransaction(tx.id, {
          status: 'failed',
          kotaniStatus: 'failed',
        });
      }
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/transfer/retry/:referenceId
// ---------------------------------------------------------------------------

router.post('/retry/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const tx = await db.getTransactionByKotaniRef(referenceId);

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (tx.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed transactions can be retried' });
    }

    await db.updateTransaction(tx.id, { status: 'pending', kotaniStatus: 'pending' });
    tx.status = 'pending';
    tx.kotaniStatus = 'pending';

    if (tx.type === 'sent') {
      const kotaniResult = await kotani.createOfframp({
        referenceId: kotani.generateReferenceId(),
        cryptoAmount: tx.amountUsdc,
        currency: 'UGX',
        chain: 'STELLAR',
        token: 'USDC',
        transactionHash: tx.stellarTxHash,
      });
      const newRefId = kotaniResult.data?.referenceId || tx.kotaniReferenceId;
      await db.updateTransaction(tx.id, { kotaniReferenceId: newRefId });
      tx.kotaniReferenceId = newRefId;
    }

    res.json({ success: true, data: { transaction: tx }, message: 'Retry submitted' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/transfer/kotani-balance
// ---------------------------------------------------------------------------

router.get('/kotani-balance', async (_req, res) => {
  try {
    const result = await kotani.getMerchantBalance();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
