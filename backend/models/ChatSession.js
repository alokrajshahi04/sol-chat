const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      index: true,
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      index: true,
    },
    title: { 
      type: String,
      maxlength: 200,
    },
    models: [{ 
      type: String,
      required: true,
    }],
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for efficient user session queries
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ guestId: 1, updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);

module.exports = ChatSession;
