const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    chatSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
    },
    role: { type: String, enum: ["user", "assistant"] },
    model: { type: String },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed", "incomplete"],
      default: "incomplete",
    },
  },
  { timestamps: true }
);

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

module.exports = ChatMessage;
