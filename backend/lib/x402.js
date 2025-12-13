/**
 * x402 Payment Required Protocol Implementation
 * 
 * Implements HTTP 402 Payment Required for Solana payments.
 * When a user doesn't have enough credits, they receive a 402 response
 * with payment details to complete the transaction on Solana.
 */

const { v4: uuidv4 } = require('uuid');
const { CREDIT_PRICE_LAMPORTS, PAYMENT_EXPIRY_MS } = require('../config/constants');
const solanaService = require('./solana');

class X402Facilitator {
  constructor() {
    this.pendingPayments = new Map(); // In-memory store for development
  }

  /**
   * Create a payment request for missing credits
   * @param {Object} options - Payment request options
   * @param {number} options.creditsRequired - Number of credits needed
   * @param {string} options.userId - User or guest ID
   * @param {string} options.userType - 'user' or 'guest'
   * @param {string} options.userWallet - User's Solana wallet address (optional)
   * @returns {Object} - Payment request object
   */
  createPaymentRequest({ creditsRequired, userId, userType, userWallet }) {
    const reference = uuidv4();
    const paymentDetails = solanaService.generatePaymentDetails(
      creditsRequired,
      CREDIT_PRICE_LAMPORTS
    );
    
    const paymentRequest = {
      reference,
      creditsRequired,
      userId,
      userType,
      userWallet,
      amount: paymentDetails.amount,
      currency: 'lamports',
      recipient: paymentDetails.recipient,
      network: paymentDetails.network,
      memo: paymentDetails.memo,
      expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS).toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    // Store pending payment
    this.pendingPayments.set(reference, {
      ...paymentRequest,
      status: 'pending',
    });
    
    // Auto-expire after timeout
    setTimeout(() => {
      const payment = this.pendingPayments.get(reference);
      if (payment && payment.status === 'pending') {
        payment.status = 'expired';
      }
    }, PAYMENT_EXPIRY_MS);
    
    return paymentRequest;
  }

  /**
   * Get a pending payment by reference
   * @param {string} reference - Payment reference ID
   * @returns {Object|null} - Payment request or null
   */
  getPendingPayment(reference) {
    return this.pendingPayments.get(reference) || null;
  }

  /**
   * Mark a payment as completed
   * @param {string} reference - Payment reference ID
   * @param {string} signature - Solana transaction signature
   */
  completePayment(reference, signature) {
    const payment = this.pendingPayments.get(reference);
    if (payment) {
      payment.status = 'completed';
      payment.signature = signature;
      payment.completedAt = new Date().toISOString();
    }
  }

  /**
   * Mark a payment as failed
   * @param {string} reference - Payment reference ID
   * @param {string} error - Error message
   */
  failPayment(reference, error) {
    const payment = this.pendingPayments.get(reference);
    if (payment) {
      payment.status = 'failed';
      payment.error = error;
    }
  }

  /**
   * Send 402 Payment Required response
   * @param {Object} res - Express response object
   * @param {Object} paymentRequest - Payment request object
   */
  sendPaymentRequired(res, paymentRequest) {
    res.status(402).json({
      error: 'Payment Required',
      code: 'INSUFFICIENT_CREDITS',
      payment: {
        reference: paymentRequest.reference,
        network: paymentRequest.network,
        recipient: paymentRequest.recipient,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        memo: paymentRequest.memo,
        credits: paymentRequest.creditsRequired,
        expiresAt: paymentRequest.expiresAt,
        verifyUrl: `/api/pay/verify/${paymentRequest.reference}`,
      },
      message: `You need ${paymentRequest.creditsRequired} more credit(s) to make this query. Please send ${paymentRequest.amount} lamports to ${paymentRequest.recipient} and verify payment.`,
    });
  }

  /**
   * Verify payment and return result
   * @param {string} reference - Payment reference ID
   * @param {string} signature - Solana transaction signature
   * @param {string} payerWallet - Wallet that made the payment
   * @returns {Promise<{success: boolean, credits?: number, error?: string}>}
   */
  async verifyPayment(reference, signature, payerWallet) {
    const pendingPayment = this.getPendingPayment(reference);
    
    if (!pendingPayment) {
      return { success: false, error: 'Payment reference not found' };
    }
    
    if (pendingPayment.status === 'completed') {
      return { success: false, error: 'Payment already processed' };
    }
    
    if (pendingPayment.status === 'expired') {
      return { success: false, error: 'Payment request expired' };
    }
    
    // Verify on-chain
    const verification = await solanaService.verifyPayment(
      signature,
      payerWallet,
      parseInt(pendingPayment.amount)
    );
    
    if (!verification.valid) {
      this.failPayment(reference, verification.error);
      return { success: false, error: verification.error };
    }
    
    this.completePayment(reference, signature);
    
    return {
      success: true,
      credits: pendingPayment.creditsRequired,
      userId: pendingPayment.userId,
      userType: pendingPayment.userType,
      userWallet: pendingPayment.userWallet,
    };
  }

  /**
   * Clean up old expired payments (call periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [reference, payment] of this.pendingPayments.entries()) {
      const expiresAt = new Date(payment.expiresAt).getTime();
      // Remove payments expired for more than 1 hour
      if (now - expiresAt > 60 * 60 * 1000) {
        this.pendingPayments.delete(reference);
      }
    }
  }
}

// Export singleton instance
module.exports = new X402Facilitator();

// Run cleanup every 10 minutes
setInterval(() => {
  module.exports.cleanup();
}, 10 * 60 * 1000);

