const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const ChatMessage = require("../models/ChatMessage");
const { isAuthenticated } = require("../middlewares/authMiddlewares");
const {
  chatSessionValid,
  queryMessageValid,
} = require("../middlewares/chatMiddlewares");
const { checkCredits } = require("../models/paymentMiddlewares");
const { streamFromModel } = require("../lib/streamFromModel");
const Joi = require("joi");
const { validateInput } = require("../middlewares/inputValidationMiddlewares");

const MODELS = ["gpt-5.1", "gpt-5-mini"];

const sessionJoiSchema = Joi.object({
  models: Joi.array()
    .items(Joi.string.valid(...MODELS))
    .min(1),
  title: Joi.string(),
}).required();
const queryJoiSchema = Joi.object({
  query: Joi.string().required(),
}).required();

router.post("/sessions", validateInput(sessionJoiSchema), async (req, res) => {
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

router.post(
  "/session/:chatSessionId",
  validateInput(queryJoiSchema),
  chatSessionValid,
  checkGuest,
  checkCredits,
  async (req, res) => {
    const chatSessionId = req.params.chatSessionId;
    const chatSession = req.chatSession;
    const creditsRequired = chatSession.models.length;
    const { query } = req.body;

    const queryMessage = new ChatMessage({
      chatSessionId,
      role: "user",
      content: query,
    });
    await queryMessage.save();

    req.user.credits -= creditsRequired;
    await req.user.save();

    res.status(202).json({ queryId: queryMessage._id });
  }
);

router.get("/session/:chatSessionId", chatSessionValid, async (req, res) => {
  const chatSessionId = req.params.chatSessionId;

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

router.get("/sse/:queryId", queryMessageValid, async (req, res) => {
  const queryId = req.params.queryId;
  const queryMessage = req.queryMessage;
  const chatSession = req.chatSession;

  const chatMessages = await ChatMessage.find({
    chatSessionId: chatSession._id,
  }).sort({ createdAt: 1 });

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
  let activeStreams = models.length;
  const assistantMessages = {};

  for (const model of models) {
    assistantMessages[model] = "";
    (async () => {
      try {
        const messages = chatMessages
          .filter((message) => !message.model || message.model === model)
          .map((message) => ({
            role: message.role,
            content: message.content,
          }));
        if (messages.length > 10) {
          messages = messages.slice(-10);
        }
        await streamFromModel(model, messages, (token) => {
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
        await queryMessage.save();
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
