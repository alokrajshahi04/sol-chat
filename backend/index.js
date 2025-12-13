/**
 * Sol-Chat Backend
 * Pay-per-request multi LLM application with Solana x402 payments
 */

// Load environment variables first
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const passport = require('passport');

// Config
const env = require('./config/env');
const { SESSION_EXPIRY_DAYS } = require('./config/constants');

// Services
const solanaService = require('./lib/solana');
const { initializePassport } = require('./lib/passport');

// Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const payRoutes = require('./routes/payRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

/**
 * Initialize all services
 */
async function initializeServices() {
  // Connect to MongoDB
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Initialize Solana service
  try {
    solanaService.initialize({
      SOLANA_RPC_URL: env.SOLANA_RPC_URL,
      BACKEND_WALLET_PRIVATE_KEY: env.BACKEND_WALLET_PRIVATE_KEY,
      CREDITS_TOKEN_MINT: env.CREDITS_TOKEN_MINT,
      TREASURY_WALLET: env.TREASURY_WALLET,
    });
    console.log('Solana service initialized');
  } catch (error) {
    console.error('Solana service initialization failed:', error.message);
    // Continue without Solana - payments won't work but chat might
  }

  // Initialize Passport OAuth
  initializePassport(env);
  console.log('Passport OAuth initialized');
}

/**
 * Configure Express middleware
 */
function configureMiddleware() {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));

  // CORS for frontend
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', env.FRONTEND_URL);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Session configuration
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      },
      store: MongoStore.create({
        mongoUrl: env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
        touchAfter: 24 * 60 * 60,
      }),
    })
  );

  // Passport initialization
  app.use(passport.initialize());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}

/**
 * Configure routes
 */
function configureRoutes() {
  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoose.connection.readyState === 1,
        solana: solanaService.initialized,
      },
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/pay', payRoutes);
  app.use('/api/transactions', transactionRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    const message = env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message;

    res.status(err.status || 500).json({
      error: message,
      code: 'INTERNAL_ERROR',
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  });
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Start the server
 */
async function startServer() {
  try {
    await initializeServices();
    configureMiddleware();
    configureRoutes();
    setupGracefulShutdown();

    app.listen(env.PORT, () => {
      console.log(`\n  Sol-Chat backend running on port ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Solana Network: ${env.SOLANA_NETWORK}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();
