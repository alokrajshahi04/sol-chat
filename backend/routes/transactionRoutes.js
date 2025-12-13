/**
 * Transaction routes for viewing transaction history
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Models
const Transaction = require('../models/Transaction');
const ChatSession = require('../models/ChatSession');

// Middlewares
const { isAuthenticated, ensureSession } = require('../middlewares/authMiddlewares');

// Lib
const env = require('../config/env');

/**
 * GET / - Get transaction history for authenticated user
 */
router.get('/', ensureSession, async (req, res) => {
  try {
    const account = req.account;
    const accountType = req.accountType;
    
    // Query params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const type = req.query.type; // credit_purchase, query_usage, refund
    const status = req.query.status; // pending, completed, failed
    
    // Build query
    const query = {
      [accountType === 'user' ? 'userId' : 'guestId']: account._id,
    };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    // Enrich with chat session info where applicable
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const enriched = {
          id: tx._id,
          type: tx.type,
          creditsAmount: tx.creditsAmount,
          creditsBalanceAfter: tx.creditsBalanceAfter,
          status: tx.status,
          createdAt: tx.createdAt,
        };
        
        // Add Solana details for credit purchases
        if (tx.solana?.signature) {
          enriched.solana = {
            signature: tx.solana.signature,
            payerWallet: tx.solana.payerWallet,
            recipientWallet: tx.solana.recipientWallet,
            amountLamports: tx.solana.amountLamports,
            amountSOL: tx.solana.amountLamports ? tx.solana.amountLamports / 1e9 : null,
            network: tx.solana.network,
            confirmedAt: tx.solana.confirmedAt,
            explorerUrl: getExplorerUrl(tx.solana.signature, tx.solana.network),
          };
        }
        
        // Add usage details for query usage
        if (tx.usage?.chatSessionId) {
          const chatSession = await ChatSession.findById(tx.usage.chatSessionId)
            .select('title')
            .lean();
          
          enriched.usage = {
            chatSessionId: tx.usage.chatSessionId,
            chatSessionTitle: chatSession?.title || 'Untitled',
            queryId: tx.usage.queryId,
            models: tx.usage.models,
          };
        }
        
        // Add error info if failed
        if (tx.status === 'failed' && tx.error) {
          enriched.error = tx.error;
        }
        
        return enriched;
      })
    );
    
    res.status(200).json({
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to get transactions',
      code: 'GET_TRANSACTIONS_ERROR',
    });
  }
});

/**
 * GET /summary - Get transaction summary/stats
 */
router.get('/summary', ensureSession, async (req, res) => {
  try {
    const account = req.account;
    const accountType = req.accountType;
    
    const baseQuery = {
      [accountType === 'user' ? 'userId' : 'guestId']: account._id,
      status: 'completed',
    };
    
    // Aggregate stats
    const [purchaseStats, usageStats, totalStats] = await Promise.all([
      // Credit purchases
      Transaction.aggregate([
        { $match: { ...baseQuery, type: 'credit_purchase' } },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: '$creditsAmount' },
            totalLamports: { $sum: '$solana.amountLamports' },
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Query usage
      Transaction.aggregate([
        { $match: { ...baseQuery, type: 'query_usage' } },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: { $abs: '$creditsAmount' } },
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Total transactions
      Transaction.countDocuments({
        [accountType === 'user' ? 'userId' : 'guestId']: account._id,
      }),
    ]);
    
    const purchase = purchaseStats[0] || { totalCredits: 0, totalLamports: 0, count: 0 };
    const usage = usageStats[0] || { totalCredits: 0, count: 0 };
    
    res.status(200).json({
      purchases: {
        totalCredits: purchase.totalCredits,
        totalSpentLamports: purchase.totalLamports,
        totalSpentSOL: purchase.totalLamports ? purchase.totalLamports / 1e9 : 0,
        transactionCount: purchase.count,
      },
      usage: {
        totalCreditsUsed: usage.totalCredits,
        queryCount: usage.count,
      },
      overall: {
        totalTransactions: totalStats,
        netCredits: purchase.totalCredits - usage.totalCredits,
      },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      code: 'GET_SUMMARY_ERROR',
    });
  }
});

/**
 * GET /:transactionId - Get single transaction details
 */
router.get('/:transactionId', ensureSession, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const account = req.account;
    const accountType = req.accountType;
    
    const transaction = await Transaction.findOne({
      _id: transactionId,
      [accountType === 'user' ? 'userId' : 'guestId']: account._id,
    }).lean();
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND',
      });
    }
    
    // Build response
    const response = {
      id: transaction._id,
      type: transaction.type,
      creditsAmount: transaction.creditsAmount,
      creditsBalanceAfter: transaction.creditsBalanceAfter,
      status: transaction.status,
      paymentReference: transaction.paymentReference,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
    
    // Add Solana details
    if (transaction.solana) {
      response.solana = {
        signature: transaction.solana.signature,
        payerWallet: transaction.solana.payerWallet,
        recipientWallet: transaction.solana.recipientWallet,
        amountLamports: transaction.solana.amountLamports,
        amountSOL: transaction.solana.amountLamports ? transaction.solana.amountLamports / 1e9 : null,
        network: transaction.solana.network,
        slot: transaction.solana.slot,
        confirmedAt: transaction.solana.confirmedAt,
        explorerUrl: transaction.solana.signature 
          ? getExplorerUrl(transaction.solana.signature, transaction.solana.network)
          : null,
      };
    }
    
    // Add usage details
    if (transaction.usage) {
      const chatSession = await ChatSession.findById(transaction.usage.chatSessionId)
        .select('title models')
        .lean();
      
      response.usage = {
        chatSessionId: transaction.usage.chatSessionId,
        chatSessionTitle: chatSession?.title || 'Untitled',
        queryId: transaction.usage.queryId,
        models: transaction.usage.models,
        costPerModel: transaction.usage.costPerModel,
      };
    }
    
    // Add error info
    if (transaction.error) {
      response.error = transaction.error;
    }
    
    // Add refund info
    if (transaction.refundTransactionId) {
      response.refundTransactionId = transaction.refundTransactionId;
    }
    
    res.status(200).json(response);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid transaction ID',
        code: 'INVALID_TRANSACTION_ID',
      });
    }
    console.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Failed to get transaction',
      code: 'GET_TRANSACTION_ERROR',
    });
  }
});

/**
 * Helper function to get Solana explorer URL
 */
function getExplorerUrl(signature, network) {
  if (!signature) return null;
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

module.exports = router;

