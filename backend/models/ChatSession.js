const mongoose = require("mongoose");

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String },
    models: [String],
  },
  { timestamps: true }
);

const ChatSession = mongoose.model("ChatSession", ChatSessionSchema);

module.exports = ChatSession;
