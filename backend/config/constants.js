/**
 * Application-wide constants
 */

// Supported LLM models
const MODELS = [
  'gpt-5-mini',
  'gpt-5.1',
  'gemini-2.5-flash',
];

module.exports = {
  // Supported LLM models
  MODELS,
  
  // Credit pricing in lamports
  CREDIT_PRICE_LAMPORTS: 1_000_000, // 0.001 SOL per credit
  
  // Minimum credits to purchase
  MIN_CREDIT_PURCHASE: 1,
  
  // Payment expiry time in milliseconds (15 minutes)
  PAYMENT_EXPIRY_MS: 15 * 60 * 1000,
  
  // Session expiry in days
  SESSION_EXPIRY_DAYS: 3,
  
  // Supported models cost (credits per query)
  MODEL_COSTS: {
    'gpt-5-mini': 1,
    'gpt-5.1': 2,
    'gemini-2.5-flash': 1,
  },
  
  // Transaction types
  TX_TYPES: {
    CREDIT_PURCHASE: 'credit_purchase',
    QUERY_USAGE: 'query_usage',
    REFUND: 'refund',
  },
  
  // OAuth providers
  OAUTH_PROVIDERS: {
    GOOGLE: 'google',
  },
  
  // Stream settings
  STREAM_SAVE_INTERVAL_MS: 3000, // Save to DB every 3 seconds
  STREAM_TIMEOUT_MS: 5 * 60 * 1000, // 5 minute timeout for stale streams
};
