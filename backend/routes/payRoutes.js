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
    let balance = req.account.credits || 0;

    // Sync with on-chain balance if wallet exists
    if (req.account.solanaWallet) {
      try {
        const onChainBalance = await solanaService.getCreditBalance(req.account.solanaWallet);
        // Only sync if on-chain is greater (deposit) OR if on-chain is exactly what we expect
        // If on-chain is GREATER than DB, it means user topped up externally -> Update DB
        // If on-chain is LESS than DB, it means user burnt tokens elsewhere? -> Update DB
        // But if we JUST deducted in DB and on-chain is pending... on-chain > DB.
        // Wait, if pending burn: OnChain (100) > DB (99).
        // If we sync now, DB becomes 100. Bad.
        // How to detect pending burn?
        // We can check if there are pending transactions?
        // Or we simply check: If OnChain > DB, only update if difference is > 0 (deposit).
        // The issue is distinguishing "Deposit" from "Pending Burn Lag".
        // Solution: Trust DB for small "lags". Trust OnChain for deposits.
        // A deposit is usually >= MIN_CREDIT_PURCHASE (1).
        // A burn is small (1-2).
        // Taking a safer approach: Only sync up if we haven't done a query recently?
        // Or: `deductCredits` waits for confirmation, so Lag shouldn't exist?
        // If `deductCredits` confirmed, then OnChain IS 99.
        // So why did the user see lag?
        // Maybe confirmation is "confirmed" but RPC node not yet consistent?
        // Let's rely on LAST_WRITE_WINS or similar? No.
        // Let's add a "lastDeductionTime" to account?
        // Or simpler: Trust DB. Only update DB if OnChain > DB + threshold?
        // For now, I will comment out the auto-sync to prioritize UX responsiveness,
        // and add an explicit "Sync" button or logic later if needed.
        // Or better: Only sync if OnChain != DB and no recent transactions.

        // Revised Logic:
        // We trust our DB state for deduction.
        // We only want to catch "External Deposits".
        // If OnChain > DB, it MIGHT be a deposit. OR it might be lag.
        // Users rarely deposit externally (they use our UI).
        // So disabling auto-sync on /balance read is safer for now to fix the "revert" bug.
        // We already mint on-chain in `/verify`, so DB is updated there too.

        // Check for pending/recent transactions to avoid race conditions
        const hasPendingTransactions = await Transaction.exists({
          [req.account.constructor.modelName === 'User' ? 'userId' : 'guestId']: req.account._id,
          type: 'query_usage',
          $or: [
            { status: 'pending' },
            { status: 'completed', createdAt: { $gt: new Date(Date.now() - 5000) } }
          ]
        });

        if (!hasPendingTransactions) {
          if (onChainBalance !== balance) {
            console.log(`Syncing balance: DB=${balance} -> Chain=${onChainBalance}`);
            balance = onChainBalance;
            req.account.credits = balance;
            await req.account.save();
          }
        } else if (onChainBalance !== balance) {
          console.log(`Skipping sync due to pending tx: DB=${balance}, Chain=${onChainBalance}`);
        }
      } catch (err) {
        console.error('Failed to sync on-chain balance:', err);
      }
    }

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
        tokenMint: env.CREDITS_TOKEN_MINT, // Send mint address for frontend
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

    // Mint SPL tokens to user (On-Chain)
    try {
      await solanaService.mintCredits(payerWallet, result.credits);
    } catch (mintError) {
      console.error('Failed to mint tokens:', mintError);
      // We don't fail the request here, but we should probably log/alert failure.
      // The user got DB credits at least.
    }

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
    backendWallet: solanaService.getBackendPublicKey(),
  });
});

module.exports = router;
