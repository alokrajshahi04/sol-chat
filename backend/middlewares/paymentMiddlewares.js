/**
 * Payment middlewares for credit checking and x402 flow
 */

const solanaService = require('../lib/solana');
const x402 = require('../lib/x402');
const { MODEL_COSTS, CREDIT_PRICE_LAMPORTS } = require('../config/constants');

/**
 * Calculate credits required for a chat session
 * @param {Object} chatSession - Chat session document
 * @returns {number} - Total credits required
 */
function calculateCreditsRequired(chatSession) {
  return chatSession.models.reduce((total, model) => {
    return total + (MODEL_COSTS[model] || 1);
  }, 0);
}

/**
 * Check if user has enough credits, return 402 if not
 * Requires ensureSession middleware to run first
 */
async function checkCredits(req, res, next) {
  const chatSession = req.chatSession;
  const account = req.account;
  const accountType = req.accountType;
  
  if (!chatSession || !account) {
    return res.status(500).json({
      error: 'Missing chat session or account',
      code: 'INTERNAL_ERROR',
    });
  }
  
  const creditsRequired = calculateCreditsRequired(chatSession);
  
  try {
    // Check on-chain balance if wallet is connected
    let creditBalance = 0;
    
    if (account.solanaWallet) {
      creditBalance = await solanaService.getCreditBalance(account.solanaWallet);
    }
    
    // User has enough credits
    if (creditBalance >= creditsRequired) {
      req.creditsRequired = creditsRequired;
      req.creditBalance = creditBalance;
      return next();
    }
    
    // Calculate credits needed
    const creditsMissing = creditsRequired - creditBalance;
    
    // Check for wallet connection
    if (!account.solanaWallet) {
      return res.status(402).json({
        error: 'Payment Required',
        code: 'WALLET_REQUIRED',
        creditsRequired,
        creditsAvailable: 0,
        creditsMissing: creditsRequired,
        message: 'Please connect your Solana wallet to purchase credits',
      });
    }
    
    // Create payment request
    const paymentRequest = x402.createPaymentRequest({
      creditsRequired: creditsMissing,
      userId: account._id.toString(),
      userType: accountType,
      userWallet: account.solanaWallet,
    });
    
    // Store pending payment in user/guest document
    account.pendingPayment = {
      reference: paymentRequest.reference,
      amount: parseInt(paymentRequest.amount),
      credits: creditsMissing,
      createdAt: new Date(),
      expiresAt: new Date(paymentRequest.expiresAt),
    };
    await account.save();
    
    // Return 402 with payment details
    return x402.sendPaymentRequired(res, paymentRequest);
  } catch (error) {
    console.error('Credit check error:', error);
    return res.status(500).json({
      error: 'Failed to check credits',
      code: 'CREDIT_CHECK_ERROR',
    });
  }
}

/**
 * Deduct credits after successful query
 * Should be called after streaming completes
 */
async function deductCredits(account, creditsAmount, usageDetails) {
  if (!account.solanaWallet) {
    throw new Error('Wallet not connected');
  }
  
  try {
    // Burn credits on-chain
    const signature = await solanaService.burnCredits(
      account.solanaWallet,
      creditsAmount
    );
    
    return {
      success: true,
      signature,
      creditsDeducted: creditsAmount,
    };
  } catch (error) {
    console.error('Failed to deduct credits:', error);
    throw error;
  }
}

/**
 * Verify wallet ownership (for wallet connection)
 * Expects signed message in request body
 */
async function verifyWalletSignature(req, res, next) {
  const { wallet, signature, message } = req.body;
  
  if (!wallet || !signature || !message) {
    return res.status(400).json({
      error: 'Missing wallet, signature, or message',
      code: 'INVALID_REQUEST',
    });
  }
  
  try {
    const nacl = require('tweetnacl');
    const bs58 = require('bs58');
    
    const publicKey = bs58.decode(wallet);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey
    );
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }
    
    req.verifiedWallet = wallet;
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(400).json({
      error: 'Failed to verify signature',
      code: 'VERIFICATION_ERROR',
    });
  }
}

module.exports = {
  checkCredits,
  deductCredits,
  calculateCreditsRequired,
  verifyWalletSignature,
};
