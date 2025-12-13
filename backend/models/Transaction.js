const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    // User or Guest reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' },
    
    // Transaction type
    type: {
      type: String,
      enum: ['credit_purchase', 'query_usage', 'refund'],
      required: true,
    },
    
    // Credit amounts
    creditsAmount: { type: Number, required: true }, // Positive for purchase, negative for usage
    creditsBalanceAfter: { type: Number }, // Balance after transaction
    
    // Solana transaction details (for credit purchases)
    solana: {
      signature: { type: String }, // Transaction signature
      payerWallet: { type: String }, // Wallet that paid
      recipientWallet: { type: String }, // Treasury wallet
      amountLamports: { type: Number }, // Amount paid in lamports
      network: { type: String, enum: ['mainnet-beta', 'devnet', 'testnet'] },
      slot: { type: Number }, // Block slot
      confirmedAt: { type: Date },
    },
    
    // Query usage details (for query_usage type)
    usage: {
      chatSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession' },
      queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
      models: [{ type: String }], // Models used in the query
      costPerModel: { type: Number }, // Cost per model (usually 1)
    },
    
    // x402 payment reference
    paymentReference: { type: String },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    
    // Error info if failed
    error: { type: String },
    
    // Refund reference if refunded
    refundTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

// Indexes for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ guestId: 1, createdAt: -1 });
TransactionSchema.index({ 'solana.signature': 1 }, { sparse: true });
TransactionSchema.index({ paymentReference: 1 }, { sparse: true });
TransactionSchema.index({ type: 1, status: 1 });

// Virtual for Solana Explorer URL
TransactionSchema.virtual('explorerUrl').get(function() {
  if (!this.solana?.signature) return null;
  const network = this.solana.network === 'mainnet-beta' ? '' : `?cluster=${this.solana.network}`;
  return `https://explorer.solana.com/tx/${this.solana.signature}${network}`;
});

// Ensure virtuals are included in JSON
TransactionSchema.set('toJSON', { virtuals: true });
TransactionSchema.set('toObject', { virtuals: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;
