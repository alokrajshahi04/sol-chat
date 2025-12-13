/**
 * Environment configuration with validation
 */

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

module.exports = {
  // Server
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),
  
  // MongoDB
  MONGODB_URI: requireEnv('MONGODB_URI'),
  
  // Session
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  
  // LLM APIs
  OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
  GEMINI_API_KEY: requireEnv('GEMINI_API_KEY'),
  
  // Solana
  SOLANA_RPC_URL: optionalEnv('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
  SOLANA_NETWORK: optionalEnv('SOLANA_NETWORK', 'devnet'),
  
  // SPL Token - Credits token mint address
  CREDITS_TOKEN_MINT: requireEnv('CREDITS_TOKEN_MINT'),
  
  // Backend authority wallet (private key in base58 format)
  BACKEND_WALLET_PRIVATE_KEY: requireEnv('BACKEND_WALLET_PRIVATE_KEY'),
  
  // Treasury wallet to receive SOL payments
  TREASURY_WALLET: requireEnv('TREASURY_WALLET'),
  
  // OAuth - Google
  GOOGLE_CLIENT_ID: optionalEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optionalEnv('GOOGLE_CLIENT_SECRET'),
  GOOGLE_CALLBACK_URL: optionalEnv('GOOGLE_CALLBACK_URL', '/api/auth/google/callback'),
  
  // Frontend URL for redirects
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
};
