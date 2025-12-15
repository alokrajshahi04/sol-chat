// Payment routes

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const Transaction = require('../models/Transaction');
const { validateInput } = require('../middlewares/inputValidationMiddlewares');
const { ensureSession, requireWallet } = require('../middlewares/authMiddlewares');
const x402 = require('../lib/x402');
const solanaService = require('../lib/solana');
const { CREDIT_PRICE_LAMPORTS, MIN_CREDIT_PURCHASE } = require('../config/constants');
const env = require('../config/env');

const verifySchema = Joi.object({
  signature: Joi.string().required(),
  payerWallet: Joi.string().required(),
});

const purchaseSchema = Joi.object({
  credits: Joi.number().integer().min(MIN_CREDIT_PURCHASE).required(),
});

router.get('/balance', ensureSession, async (req, res) => {
  try {
    const balance = req.account.credits || 0;
    res.json({
      balance,
      hasWallet: !!req.account.solanaWallet,
      wallet: req.account.solanaWallet || null
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: 'Failed to get balance', code: 'BALANCE_ERROR' });
  }
});

router.post('/purchase', ensureSession, requireWallet, validateInput(purchaseSchema), async (req, res) => {
  try {
    const { account, accountType } = req;
    const { credits } = req.body;

    const paymentRequest = x402.createPaymentRequest({
      creditsRequired: credits,
      userId: account._id.toString(),
      userType: accountType,
      userWallet: account.solanaWallet,
    });

    account.pendingPayment = {
      reference: paymentRequest.reference,
      amount: parseInt(paymentRequest.amount),
      credits,
      createdAt: new Date(),
      expiresAt: new Date(paymentRequest.expiresAt),
    };
    await account.save();

    await new Transaction({
      [accountType === 'user' ? 'userId' : 'guestId']: account._id,
      type: 'credit_purchase',
      creditsAmount: credits,
      paymentReference: paymentRequest.reference,
      status: 'pending',
      solana: {
        recipientWallet: paymentRequest.recipient,
        amountLamports: parseInt(paymentRequest.amount),
        network: env.SOLANA_NETWORK,
      },
    }).save();

    res.json({
      reference: paymentRequest.reference,
      credits,
      payment: {
        network: paymentRequest.network,
        recipient: paymentRequest.recipient,
        amount: paymentRequest.amount,
        amountSOL: (parseInt(paymentRequest.amount) / 1e9).toFixed(9),
        memo: paymentRequest.memo,
      },
      expiresAt: paymentRequest.expiresAt,
      verifyUrl: `/api/pay/verify/${paymentRequest.reference}`,
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Purchase failed', code: 'PURCHASE_ERROR' });
  }
});

router.post('/verify/:reference', ensureSession, validateInput(verifySchema), async (req, res) => {
  try {
    const { reference } = req.params;
    const { signature, payerWallet } = req.body;
    const { account } = req;

    const result = await x402.verifyPayment(reference, signature, payerWallet);

    if (!result.success) {
      await Transaction.findOneAndUpdate({ paymentReference: reference }, { status: 'failed', error: result.error });
      return res.status(400).json({ error: result.error, code: 'VERIFICATION_FAILED' });
    }

    if (result.userId !== account._id.toString()) {
      return res.status(403).json({ error: 'Payment mismatch', code: 'PAYMENT_MISMATCH' });
    }

    // Add credits to database
    account.credits = (account.credits || 0) + result.credits;
    account.pendingPayment = null;
    await account.save();

    const newBalance = account.credits;

    await Transaction.findOneAndUpdate(
      { paymentReference: reference },
      { status: 'completed', creditsBalanceAfter: newBalance, 'solana.signature': signature, 'solana.payerWallet': payerWallet, 'solana.confirmedAt': new Date() }
    );

    res.json({
      success: true,
      creditsAdded: result.credits,
      newBalance,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${env.SOLANA_NETWORK}`,
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed', code: 'VERIFY_ERROR' });
  }
});

router.get('/verify/:reference', async (req, res) => {
  try {
    const payment = x402.getPendingPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Not found', code: 'REFERENCE_NOT_FOUND' });

    const tx = await Transaction.findOne({ paymentReference: req.params.reference });

    res.json({
      reference: req.params.reference,
      status: payment.status,
      credits: payment.creditsRequired,
      expiresAt: payment.expiresAt,
      transaction: tx ? { id: tx._id, status: tx.status, createdAt: tx.createdAt } : null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Status check failed', code: 'STATUS_ERROR' });
  }
});

router.get('/pricing', (req, res) => {
  res.json({
    pricePerCredit: { lamports: CREDIT_PRICE_LAMPORTS, sol: CREDIT_PRICE_LAMPORTS / 1e9 },
    minPurchase: MIN_CREDIT_PURCHASE,
    network: env.SOLANA_NETWORK,
    treasuryWallet: env.TREASURY_WALLET,
  });
});

module.exports = router;
