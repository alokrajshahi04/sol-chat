/**
 * Payment routes for credit purchase and verification
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Models
const User = require('../models/User');
const Guest = require('../models/Guest');
const Transaction = require('../models/Transaction');

// Middlewares
const { validateInput } = require('../middlewares/inputValidationMiddlewares');
const { ensureSession, requireWallet } = require('../middlewares/authMiddlewares');

// Lib
const x402 = require('../lib/x402');
const solanaService = require('../lib/solana');
const { CREDIT_PRICE_LAMPORTS, MIN_CREDIT_PURCHASE } = require('../config/constants');
const env = require('../config/env');

// Validation schemas
const verifyPaymentSchema = Joi.object({
  signature: Joi.string().required(),
  payerWallet: Joi.string().required(),
}).required();

const purchaseCreditsSchema = Joi.object({
  credits: Joi.number().integer().min(MIN_CREDIT_PURCHASE).required(),
}).required();

/**
 * GET /balance - Get current credit balance
 */
router.get('/balance', ensureSession, async (req, res) => {
  try {
    const account = req.account;
    
    if (!account.solanaWallet) {
      return res.status(200).json({
        balance: 0,
        hasWallet: false,
        message: 'Connect wallet to view balance',
      });
    }
    
    const balance = await solanaService.getCreditBalance(account.solanaWallet);
    
    res.status(200).json({
      balance,
      hasWallet: true,
      wallet: account.solanaWallet,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to get balance',
      code: 'BALANCE_ERROR',
    });
  }
});

/**
 * POST /purchase - Initiate credit purchase (returns payment details)
 */
router.post(
  '/purchase',
  ensureSession,
  requireWallet,
  validateInput(purchaseCreditsSchema),
  async (req, res) => {
    try {
      const account = req.account;
      const accountType = req.accountType;
      const { credits } = req.body;
      
      // Create payment request
      const paymentRequest = x402.createPaymentRequest({
        creditsRequired: credits,
        userId: account._id.toString(),
        userType: accountType,
        userWallet: account.solanaWallet,
      });
      
      // Store pending payment
      account.pendingPayment = {
        reference: paymentRequest.reference,
        amount: parseInt(paymentRequest.amount),
        credits,
        createdAt: new Date(),
        expiresAt: new Date(paymentRequest.expiresAt),
      };
      await account.save();
      
      // Create pending transaction record
      const transaction = new Transaction({
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
      });
      await transaction.save();
      
      res.status(200).json({
        reference: paymentRequest.reference,
        credits,
        payment: {
          network: paymentRequest.network,
          recipient: paymentRequest.recipient,
          amount: paymentRequest.amount,
          currency: 'lamports',
          amountSOL: (parseInt(paymentRequest.amount) / 1e9).toFixed(9),
          memo: paymentRequest.memo,
        },
        expiresAt: paymentRequest.expiresAt,
        verifyUrl: `/api/pay/verify/${paymentRequest.reference}`,
      });
    } catch (error) {
      console.error('Purchase error:', error);
      res.status(500).json({
        error: 'Failed to initiate purchase',
        code: 'PURCHASE_ERROR',
      });
    }
  }
);

/**
 * POST /verify/:reference - Verify payment and mint credits
 */
router.post(
  '/verify/:reference',
  ensureSession,
  validateInput(verifyPaymentSchema),
  async (req, res) => {
    try {
      const { reference } = req.params;
      const { signature, payerWallet } = req.body;
      const account = req.account;
      const accountType = req.accountType;
      
      // Verify payment with x402 facilitator
      const verification = await x402.verifyPayment(reference, signature, payerWallet);
      
      if (!verification.success) {
        // Update transaction status
        await Transaction.findOneAndUpdate(
          { paymentReference: reference },
          { 
            status: 'failed',
            error: verification.error,
          }
        );
        
        return res.status(400).json({
          error: verification.error,
          code: 'VERIFICATION_FAILED',
        });
      }
      
      // Verify the payment belongs to this user
      if (verification.userId !== account._id.toString()) {
        return res.status(403).json({
          error: 'Payment reference does not belong to this account',
          code: 'PAYMENT_MISMATCH',
        });
      }
      
      // Mint credits to user's wallet
      const mintSignature = await solanaService.mintCredits(
        account.solanaWallet,
        verification.credits
      );
      
      // Get new balance
      const newBalance = await solanaService.getCreditBalance(account.solanaWallet);
      
      // Update transaction
      await Transaction.findOneAndUpdate(
        { paymentReference: reference },
        {
          status: 'completed',
          creditsBalanceAfter: newBalance,
          'solana.signature': signature,
          'solana.payerWallet': payerWallet,
          'solana.confirmedAt': new Date(),
        }
      );
      
      // Clear pending payment
      account.pendingPayment = null;
      await account.save();
      
      res.status(200).json({
        success: true,
        creditsAdded: verification.credits,
        newBalance,
        mintTransaction: mintSignature,
        explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=${env.SOLANA_NETWORK}`,
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({
        error: 'Failed to verify payment',
        code: 'VERIFY_ERROR',
      });
    }
  }
);

/**
 * GET /verify/:reference - Check payment status
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    const pendingPayment = x402.getPendingPayment(reference);
    
    if (!pendingPayment) {
      return res.status(404).json({
        error: 'Payment reference not found',
        code: 'REFERENCE_NOT_FOUND',
      });
    }
    
    // Get transaction record
    const transaction = await Transaction.findOne({ paymentReference: reference });
    
    res.status(200).json({
      reference,
      status: pendingPayment.status,
      credits: pendingPayment.creditsRequired,
      expiresAt: pendingPayment.expiresAt,
      transaction: transaction ? {
        id: transaction._id,
        status: transaction.status,
        createdAt: transaction.createdAt,
        solanaSignature: transaction.solana?.signature,
        explorerUrl: transaction.explorerUrl,
      } : null,
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      error: 'Failed to check payment status',
      code: 'STATUS_ERROR',
    });
  }
});

/**
 * GET /pricing - Get credit pricing info
 */
router.get('/pricing', (req, res) => {
  res.status(200).json({
    pricePerCredit: {
      lamports: CREDIT_PRICE_LAMPORTS,
      sol: CREDIT_PRICE_LAMPORTS / 1e9,
    },
    minPurchase: MIN_CREDIT_PURCHASE,
    network: env.SOLANA_NETWORK,
    treasuryWallet: env.TREASURY_WALLET,
  });
});

module.exports = router;

