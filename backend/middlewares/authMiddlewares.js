/**
 * Authentication middlewares for session and guest management
 */

const User = require('../models/User');
const Guest = require('../models/Guest');

/**
 * Require authenticated user session
 */
async function isAuthenticated(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Ensure session exists, create guest if needed
 * Attaches user or guest to req.account
 */
async function ensureSession(req, res, next) {
  if (!req.session) {
    return res.status(500).json({ 
      error: 'Session not available',
      code: 'SESSION_ERROR',
    });
  }
  
  try {
    // Authenticated user
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.account = user;
        req.accountType = 'user';
        return next();
      }
      // User not found, clear session
      delete req.session.userId;
    }
    
    // Existing guest
    if (req.session.guestId) {
      const guest = await Guest.findById(req.session.guestId);
      if (guest) {
        req.account = guest;
        req.accountType = 'guest';
        return next();
      }
      // Guest not found, create new one
      delete req.session.guestId;
    }
    
    // Create new guest
    const guest = new Guest({
      sessionId: req.sessionID,
    });
    await guest.save();
    
    req.session.guestId = guest._id;
    req.account = guest;
    req.accountType = 'guest';
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    return res.status(500).json({ 
      error: 'Session error',
      code: 'SESSION_ERROR',
    });
  }
}

/**
 * Optional authentication - attaches user/guest if available, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    if (req.session?.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.account = user;
        req.accountType = 'user';
      }
    } else if (req.session?.guestId) {
      const guest = await Guest.findById(req.session.guestId);
      if (guest) {
        req.account = guest;
        req.accountType = 'guest';
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Require wallet connection
 */
function requireWallet(req, res, next) {
  if (!req.account?.solanaWallet) {
    return res.status(400).json({
      error: 'Wallet connection required',
      code: 'WALLET_REQUIRED',
      message: 'Please connect your Solana wallet to continue',
    });
  }
  next();
}

module.exports = {
  isAuthenticated,
  ensureSession,
  optionalAuth,
  requireWallet,
  // Backwards compatibility
  checkGuest: ensureSession,
};
