const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    chatSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    queryId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ChatMessage',
      index: true,
    },
    role: { 
      type: String, 
      enum: ['user', 'assistant'],
      required: true,
    },
    model: { 
      type: String,
    },
    content: { 
      type: String, 
      default: '',
    },
    status: {
      type: String,
      enum: ['incomplete', 'completed', 'error'],
      default: 'incomplete',
    },
    tokenCount: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Compound index for efficient message retrieval
ChatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ queryId: 1 });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = ChatMessage;
