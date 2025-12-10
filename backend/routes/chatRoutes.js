const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const ChatMessage = require("../models/ChatMessage");
const { isAuthenticated } = require("../middlewares/authMiddlewares");
const { streamFromModel } = require("../lib/streamFromModel");

router.post("/sessions", async (req, res) => {
  const { models, title } = req.body;
  const chatSession = new ChatSession({
    title: title || "New Chat",
    models,
    status: "active",
  });

  if (req.session && req.session.userId) {
    chatSession.userId = req.session.userId;
  }
  chatSession.save();

  res.status(200).json({ chatSessionId: chatSession._id });
});

router.get("/sessions", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const chatSessions = await ChatSession.find({ userId });

  res.status(200).json({
    chatSessions: chatSessions.map((chatSession) => ({
      chatSessionId: chatSession._id,
      title: chatSession.title,
    })),
  });
});

router.post("/session/:chatSessionId", async (req, res) => {
  const chatSessionId = req.params.chatSessionId;
  const { query } = req.body;

  const chatSession = await ChatSession.findById(chatSessionId);

  if (!chatSession) {
    return res.status(404).json({ error: "Chat Session does not exist" });
  }
  if (
    chatSession.userId &&
    (!req.session || req.session.userId !== chatSession.userId.toString())
  ) {
    return res.status(401).json({
      error: "User not authorised to post query in this chat session",
    });
  }

  const queryMessage = new ChatMessage({
    chatSessionId,
    role: "user",
    content: query,
  });
  await queryMessage.save();

  res.status(202).json({ queryId: queryMessage._id });
});

router.get("/session/:chatSessionId", async (req, res) => {
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
      error: "User not authorised to view chat",
    });
  }

  const chatMessages = await ChatMessage.find({ chatSessionId }).sort({
    createdAt: 1,
  });
  const messages = chatMessages.map((message) => ({
    role: message.role,
    model: message.model || "",
    content: message.content,
  }));

  res.status(200).json({ messages });
});

router.get("/sse/:queryId", async (req, res) => {
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`event: init\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  function sendChunk(payload) {
    res.write(`event: chunk\ndata: ${JSON.stringify(payload)}\n\n`);
  }
  function sendDone(payload) {
    res.write(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
    res.end();
  }

  const models = chatSession.models;
  const query = queryMessage.content;
  let activeStreams = models.length;
  const assistantMessages = {};

  for (const model of models) {
    assistantMessages[model] = "";
    (async () => {
      try {
        await streamFromModel(model, query, (token) => {
          assistantMessages[model] += token;

          sendChunk({
            chatSessionId: chatSession._id,
            queryId,
            model,
            token,
          });
        });
      } catch (err) {
        console.error("Stream error:", err);
      }

      activeStreams--;

      if (activeStreams === 0) {
        queryMessage.status = "completed";
        queryMessage.save();
        for (const model of chatSession.models) {
          const assistantMessage = new ChatMessage({
            chatSessionId: chatSession._id,
            role: "assistant",
            model,
            content: assistantMessages[model],
            status: "completed",
          });
          await assistantMessage.save();
        }
        sendDone({ message: "Stream Completed" });
      }
    })();
  }
});

module.exports = router;
