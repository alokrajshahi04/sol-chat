// App constants

const MODELS = ['gpt-5-mini', 'gpt-5.1', 'gemini-2.5-flash'];

module.exports = {
  MODELS,

  // Pricing: 0.001 SOL per credit
  CREDIT_PRICE_LAMPORTS: 1_000_000,
  MIN_CREDIT_PURCHASE: 1,

  // 15 min payment expiry
  PAYMENT_EXPIRY_MS: 15 * 60 * 1000,

  // 3 day session expiry
  SESSION_EXPIRY_DAYS: 3,

  // Credits per model query
  MODEL_COSTS: {
    'gpt-5-mini': 1,
    'gpt-5.1': 2,
    'gemini-2.5-flash': 1,
  },

  // Stream saves every 500ms, times out after 5min
  STREAM_SAVE_INTERVAL_MS: 500,
  STREAM_TIMEOUT_MS: 5 * 60 * 1000,
};
