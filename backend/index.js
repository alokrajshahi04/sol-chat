// Sol-Chat Backend - Pay-per-request multi-LLM with Solana payments

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const helmet = require("helmet");
const passport = require("passport");

const env = require("./config/env");
const { SESSION_EXPIRY_DAYS } = require("./config/constants");
const solanaService = require("./lib/solana");
const { initializePassport } = require("./lib/passport");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const payRoutes = require("./routes/payRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

async function init() {
  // MongoDB
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB failed:", err.message);
    process.exit(1);
  }

  // Solana
  try {
    solanaService.initialize({
      SOLANA_RPC_URL: env.SOLANA_RPC_URL,
      BACKEND_WALLET_PRIVATE_KEY: env.BACKEND_WALLET_PRIVATE_KEY,
      CREDITS_TOKEN_MINT: env.CREDITS_TOKEN_MINT,
      TREASURY_WALLET: env.TREASURY_WALLET,
    });
    console.log("Solana initialized");
  } catch (err) {
    console.error("Solana failed:", err.message);
  }

  // Passport
  initializePassport(env);
}

function setupMiddleware() {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })
  );

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", env.FRONTEND_URL);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // Session
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      },
      store: MongoStore.create({
        mongoUrl: env.MONGODB_URI,
        collectionName: "sessions",
        ttl: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
      }),
    })
  );

  app.use(passport.initialize());
  app.use(express.json({ limit: "1mb" }));
}

function setupRoutes() {
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      mongodb: mongoose.connection.readyState === 1,
      solana: solanaService.initialized,
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/pay", payRoutes);
  app.use("/api/transactions", transactionRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({
      error: env.NODE_ENV === "production" ? "Server error" : err.message,
    });
  });
}

async function start() {
  await init();
  setupMiddleware();
  setupRoutes();

  process.on("SIGTERM", async () => {
    await mongoose.connection.close();
    process.exit(0);
  });

  app.listen(env.PORT, () => {
    console.log(`\nSol-Chat running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Solana: ${env.SOLANA_NETWORK}`);
  });
}

start().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
