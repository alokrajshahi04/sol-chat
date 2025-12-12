const ChatSession = require("../models/ChatSession");
const ChatMessage = require("../models/ChatMessage");

module.exports.chatSessionValid = async function (req, res, next) {
  const chatSessionId = req.params.chatSessionId;
  const chatSession = await ChatSession.findById(chatSessionId);

  if (!chatSession) {
    return res.status(404).json({ error: "Chat Session does not exist" });
  }

  if (
    chatSession.userId &&
    (!req.session || req.session.userId !== chatSession.userId.toString())
  ) {
    return res.status(401).json({
      error: "User unauthorised in this chat session",
    });
  }

  req.chatSession = chatSession;
  next();
};

module.exports.queryMessageValid = async function (req, res, next) {
  const queryId = req.params.queryId;

  const queryMessage = await ChatMessage.findById(queryId);
  if (
    !queryMessage ||
    queryMessage.role !== "user" ||
    queryMessage.status === "completed"
  ) {
    return res.status(404).end();
  }

  const chatSession = await ChatSession.findById(queryMessage.chatSessionId);
  if (
    chatSession.userId &&
    (!req.session || req.session.userId !== chatSession.userId.toString())
  ) {
    return res.status(401).end();
  }

  req.queryMessage = queryMessage;
  req.chatSession = chatSession;
  next();
};
