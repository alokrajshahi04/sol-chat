// Payment middlewares

const x402 = require('../lib/x402');
const { MODEL_COSTS } = require('../config/constants');

function calculateCreditsRequired(chatSession) {
  return chatSession.models.reduce((sum, model) => sum + (MODEL_COSTS[model] || 1), 0);
}

// Check credits, return 402 if insufficient
async function checkCredits(req, res, next) {
  const { chatSession, account } = req;

  if (!chatSession || !account) {
    return res.status(500).json({ error: 'Missing session or account', code: 'INTERNAL_ERROR' });
  }

  const creditsRequired = calculateCreditsRequired(chatSession);
  const creditBalance = account.credits || 0;

  if (creditBalance >= creditsRequired) {
    req.creditsRequired = creditsRequired;
    req.creditBalance = creditBalance;
    return next();
  }

  const creditsMissing = creditsRequired - creditBalance;

  if (!account.solanaWallet) {
    return res.status(402).json({
      error: 'Payment Required',
      code: 'WALLET_REQUIRED',
      creditsRequired,
      creditsAvailable: creditBalance,
      creditsMissing,
      message: 'Connect your Solana wallet to purchase credits',
    });
  }

  const paymentRequest = x402.createPaymentRequest({
    creditsRequired: creditsMissing,
    userId: account._id.toString(),
    userType: req.accountType,
    userWallet: account.solanaWallet,
  });

  account.pendingPayment = {
    reference: paymentRequest.reference,
    amount: parseInt(paymentRequest.amount),
    credits: creditsMissing,
    createdAt: new Date(),
    expiresAt: new Date(paymentRequest.expiresAt),
  };
  await account.save();

  return x402.sendPaymentRequired(res, paymentRequest);
}

// Deduct credits from database
async function deductCredits(account, creditsAmount) {
  if (account.credits < creditsAmount) {
    throw new Error('Insufficient credits');
  }
  account.credits -= creditsAmount;
  await account.save();
  return { success: true, creditsDeducted: creditsAmount, remaining: account.credits };
}

// Verify wallet signature for connection
async function verifyWalletSignature(req, res, next) {
  const { wallet, signature, message } = req.body;

  if (!wallet || !signature || !message) {
    return res.status(400).json({ error: 'Missing wallet, signature, or message', code: 'INVALID_REQUEST' });
  }

  try {
    const nacl = require('tweetnacl');
    const bs58 = require('bs58').default;

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(wallet)
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' });
    }

    req.verifiedWallet = wallet;
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(400).json({ error: 'Verification failed', code: 'VERIFICATION_ERROR' });
  }
}

module.exports = { checkCredits, deductCredits, calculateCreditsRequired, verifyWalletSignature };

