/**
 * Authentication routes for local auth, OAuth, and wallet connection
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const Joi = require('joi');

// Models
const User = require('../models/User');
const Guest = require('../models/Guest');

// Middlewares
const { validateInput } = require('../middlewares/inputValidationMiddlewares');
const { isAuthenticated, ensureSession } = require('../middlewares/authMiddlewares');
const { verifyWalletSignature } = require('../middlewares/paymentMiddlewares');

// Lib
const env = require('../config/env');

// Validation schemas
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().max(100).optional(),
}).required();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).required();

const walletConnectSchema = Joi.object({
  wallet: Joi.string().required(),
  signature: Joi.string().required(),
  message: Joi.string().required(),
}).required();

/**
 * POST /signup - Register a new user with email/password
 */
router.post('/signup', validateInput(signupSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0],
      oauthProvider: 'local',
    });
    await user.save();
    
    // Set session
    req.session.userId = user._id;
    
    // Clear guest session if exists
    if (req.session.guestId) {
      delete req.session.guestId;
    }
    
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasWallet: user.hasWallet,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Failed to create account',
      code: 'SIGNUP_ERROR',
    });
  }
});

/**
 * POST /login - Authenticate with email/password
 */
router.post('/login', validateInput(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    
    // Check if user uses OAuth
    if (!user.passwordHash) {
      return res.status(401).json({ 
        error: `This account uses ${user.oauthProvider} login`,
        code: 'OAUTH_ACCOUNT',
        provider: user.oauthProvider,
      });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    
    // Set session
    req.session.userId = user._id;
    
    // Clear guest session if exists
    if (req.session.guestId) {
      delete req.session.guestId;
    }
    
    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasWallet: user.hasWallet,
        solanaWallet: user.solanaWallet,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login',
      code: 'LOGIN_ERROR',
    });
  }
});

/**
 * POST /logout - End session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        error: 'Failed to logout',
        code: 'LOGOUT_ERROR',
      });
    }
    
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

/**
 * GET /me - Get current user info
 */
router.get('/me', ensureSession, async (req, res) => {
  const account = req.account;
  const accountType = req.accountType;
  
  if (accountType === 'user') {
    res.status(200).json({
      authenticated: true,
      type: 'user',
      user: {
        id: account._id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        oauthProvider: account.oauthProvider,
        hasWallet: !!account.solanaWallet,
        solanaWallet: account.solanaWallet,
      },
    });
  } else {
    res.status(200).json({
      authenticated: false,
      type: 'guest',
      guest: {
        id: account._id,
        hasWallet: !!account.solanaWallet,
        solanaWallet: account.solanaWallet,
      },
    });
  }
});

/**
 * POST /wallet/connect - Connect Solana wallet to account
 */
router.post(
  '/wallet/connect',
  ensureSession,
  validateInput(walletConnectSchema),
  verifyWalletSignature,
  async (req, res) => {
    try {
      const account = req.account;
      const wallet = req.verifiedWallet;
      
      // Check if wallet is already connected to another account
      const existingUser = await User.findOne({ solanaWallet: wallet });
      const existingGuest = await Guest.findOne({ solanaWallet: wallet });
      
      if (existingUser && existingUser._id.toString() !== account._id.toString()) {
        return res.status(409).json({
          error: 'Wallet already connected to another account',
          code: 'WALLET_IN_USE',
        });
      }
      
      if (existingGuest && existingGuest._id.toString() !== account._id.toString()) {
        return res.status(409).json({
          error: 'Wallet already connected to another account',
          code: 'WALLET_IN_USE',
        });
      }
      
      // Connect wallet
      account.solanaWallet = wallet;
      await account.save();
      
      res.status(200).json({
        message: 'Wallet connected successfully',
        wallet,
      });
    } catch (error) {
      console.error('Wallet connect error:', error);
      res.status(500).json({
        error: 'Failed to connect wallet',
        code: 'WALLET_CONNECT_ERROR',
      });
    }
  }
);

/**
 * POST /wallet/disconnect - Disconnect Solana wallet from account
 */
router.post('/wallet/disconnect', ensureSession, async (req, res) => {
  try {
    const account = req.account;
    
    account.solanaWallet = null;
    account.tokenAccount = null;
    account.delegateAuthorized = false;
    account.delegateAmount = 0;
    await account.save();
    
    res.status(200).json({
      message: 'Wallet disconnected successfully',
    });
  } catch (error) {
    console.error('Wallet disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect wallet',
      code: 'WALLET_DISCONNECT_ERROR',
    });
  }
});

// ============= OAuth Routes =============

/**
 * GET /google - Initiate Google OAuth
 */
router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({
      error: 'Google OAuth not configured',
      code: 'OAUTH_NOT_CONFIGURED',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

/**
 * GET /google/callback - Google OAuth callback
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) {
        return res.redirect(`${env.FRONTEND_URL}/auth/error?provider=google`);
      }
      
      req.session.userId = user._id;
      res.redirect(`${env.FRONTEND_URL}/auth/success`);
    })(req, res, next);
  }
);

module.exports = router;
