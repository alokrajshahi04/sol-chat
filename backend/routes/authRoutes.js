// Auth routes

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const Joi = require('joi');

const User = require('../models/User');
const Guest = require('../models/Guest');
const { validateInput } = require('../middlewares/inputValidationMiddlewares');
const { ensureSession } = require('../middlewares/authMiddlewares');
const { verifyWalletSignature } = require('../middlewares/paymentMiddlewares');
const env = require('../config/env');

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const walletSchema = Joi.object({
  wallet: Joi.string().required(),
  signature: Joi.string().required(),
  message: Joi.string().required(),
});

router.post('/signup', validateInput(signupSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const user = new User({
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      name: name || email.split('@')[0],
      oauthProvider: 'local',
    });
    await user.save();

    req.session.userId = user._id;
    delete req.session.guestId;

    res.status(201).json({
      message: 'Account created',
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', code: 'SIGNUP_ERROR' });
  }
});

router.post('/login', validateInput(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: `Use ${user.oauthProvider} login`, code: 'OAUTH_ACCOUNT' });
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    req.session.userId = user._id;
    delete req.session.guestId;

    res.json({
      message: 'Logged in',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        solanaWallet: user.solanaWallet,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_ERROR' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed', code: 'LOGOUT_ERROR' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', ensureSession, (req, res) => {
  const { account, accountType } = req;

  if (accountType === 'user') {
    res.json({
      authenticated: true,
      type: 'user',
      user: {
        id: account._id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        oauthProvider: account.oauthProvider,
        solanaWallet: account.solanaWallet,
      },
    });
  } else {
    res.json({
      authenticated: false,
      type: 'guest',
      guest: { id: account._id, solanaWallet: account.solanaWallet },
    });
  }
});

router.post('/wallet/connect', ensureSession, validateInput(walletSchema), verifyWalletSignature, async (req, res) => {
  try {
    const { account } = req;
    const wallet = req.verifiedWallet;

    const existingUser = await User.findOne({ solanaWallet: wallet });
    const existingGuest = await Guest.findOne({ solanaWallet: wallet });

    if ((existingUser && existingUser._id.toString() !== account._id.toString()) ||
      (existingGuest && existingGuest._id.toString() !== account._id.toString())) {
      return res.status(409).json({ error: 'Wallet in use', code: 'WALLET_IN_USE' });
    }

    account.solanaWallet = wallet;
    await account.save();

    res.json({ message: 'Wallet connected', wallet });
  } catch (error) {
    console.error('Wallet connect error:', error);
    res.status(500).json({ error: 'Connection failed', code: 'WALLET_CONNECT_ERROR' });
  }
});

router.post('/wallet/disconnect', ensureSession, async (req, res) => {
  try {
    req.account.solanaWallet = null;
    req.account.tokenAccount = null;
    req.account.delegateAuthorized = false;
    req.account.delegateAmount = 0;
    await req.account.save();
    res.json({ message: 'Wallet disconnected' });
  } catch (error) {
    console.error('Wallet disconnect error:', error);
    res.status(500).json({ error: 'Disconnect failed', code: 'WALLET_DISCONNECT_ERROR' });
  }
});

// Simple wallet connect (no signature required)
router.post('/wallet/connect-simple', ensureSession, async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet || typeof wallet !== 'string' || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address', code: 'INVALID_WALLET' });
    }

    req.account.solanaWallet = wallet;
    await req.account.save();

    res.json({ message: 'Wallet connected', wallet });
  } catch (error) {
    console.error('Simple wallet connect error:', error);
    res.status(500).json({ error: 'Connection failed', code: 'WALLET_CONNECT_ERROR' });
  }
});

// Google OAuth
router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured', code: 'OAUTH_NOT_CONFIGURED' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return res.redirect(`${env.FRONTEND_URL}/auth/error?provider=google`);
    req.session.userId = user._id;
    res.redirect(`${env.FRONTEND_URL}/auth/success`);
  })(req, res, next);
});

module.exports = router;
