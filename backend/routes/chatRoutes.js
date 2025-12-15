// Chat routes

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Transaction = require('../models/Transaction');

const { isAuthenticated, ensureSession } = require('../middlewares/authMiddlewares');
const { chatSessionValid, queryMessageValid } = require('../middlewares/chatMiddlewares');
const { checkCredits, deductCredits } = require('../middlewares/paymentMiddlewares');
const { validateInput } = require('../middlewares/inputValidationMiddlewares');
const solanaService = require('../lib/solana');

const { streamFromModel } = require('../lib/streamFromModel');
const { titleFromModel } = require('../lib/titleFromModel');
const streamManager = require('../lib/streamManager');
const { MODELS } = require('../config/constants');

const createSessionSchema = Joi.object({
  models: Joi.array().items(Joi.string().valid(...MODELS)).min(1).required(),
});

const querySchema = Joi.object({
  query: Joi.string().min(1).max(10000).required(),
});

// Create session
router.post('/sessions', validateInput(createSessionSchema), async (req, res) => {
  try {
    const chatSession = new ChatSession({
      models: req.body.models,
      userId: req.session?.userId || null,
    });
    await chatSession.save();
    res.status(201).json({ chatSessionId: chatSession._id, models: chatSession.models });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session', code: 'CREATE_SESSION_ERROR' });
  }
});

// List user sessions
router.get('/sessions', isAuthenticated, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('_id title models createdAt updatedAt');

    res.json({
      sessions: sessions.map(s => ({
        chatSessionId: s._id,
        title: s.title,
        models: s.models,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions', code: 'GET_SESSIONS_ERROR' });
  }
});

// Submit query (returns 402 if no credits)
router.post('/session/:chatSessionId',
  validateInput(querySchema),
  chatSessionValid,
  ensureSession,
  checkCredits,
  async (req, res) => {
    try {
      const { chatSessionId } = req.params;
      const { chatSession, creditsRequired, account, accountType } = req;
      const { query } = req.body;

      // Generate title for first message
      if (!chatSession.title) {
        chatSession.title = await titleFromModel(query).catch(() => 'New Chat');
        await chatSession.save();
      }

      const queryMessage = new ChatMessage({
        chatSessionId,
        role: 'user',
        content: query,
        status: 'incomplete',
      });
      await queryMessage.save();

      // Deduct credits immediately (DB only) for UI responsiveness
      await deductCredits(account, creditsRequired);

      startBackgroundStream(queryMessage, chatSession, account, accountType, creditsRequired);

      res.status(202).json({
        queryId: queryMessage._id,
        chatSessionId,
        models: chatSession.models,
        creditsRequired,
      });
    } catch (error) {
      console.error('Submit query error:', error);
      res.status(500).json({ error: 'Failed to submit query', code: 'SUBMIT_QUERY_ERROR' });
    }
  }
);

// Get session history
router.get('/session/:chatSessionId', chatSessionValid, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ chatSessionId: req.params.chatSessionId })
      .sort({ createdAt: 1 })
      .select('role model content status createdAt');

    res.json({
      chatSessionId: req.params.chatSessionId,
      title: req.chatSession.title,
      models: req.chatSession.models,
      messages: messages.map(m => ({
        role: m.role,
        model: m.model || null,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session', code: 'GET_SESSION_ERROR' });
  }
});

// SSE stream
router.get('/sse/:queryId', queryMessageValid, async (req, res) => {
  const { queryId } = req.params;
  const { queryMessage, chatSession } = req;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  send('init', { queryId, chatSessionId: chatSession._id, models: chatSession.models });

  // Already completed - send cached
  if (queryMessage.status === 'completed') {
    const responses = await ChatMessage.find({ queryId });
    responses.forEach(r => send('chunk', { queryId, model: r.model, token: r.content, isComplete: true }));
    send('done', { message: 'Complete' });
    return res.end();
  }

  // Live stream
  if (streamManager.isStreamActive(queryId)) {
    const unsub = streamManager.subscribe(queryId, {
      onChunk: chunk => send('chunk', chunk),
      onDone: () => { send('done', { message: 'Complete' }); res.end(); },
    });
    req.on('close', unsub);
  } else {
    // Poll for completion
    const poll = setInterval(async () => {
      const msg = await ChatMessage.findById(queryId);
      if (msg?.status === 'completed') {
        clearInterval(poll);
        const responses = await ChatMessage.find({ queryId });
        responses.forEach(r => send('chunk', { queryId, model: r.model, token: r.content, isComplete: true }));
        send('done', { message: 'Complete' });
        res.end();
      }
    }, 1000);
    req.on('close', () => clearInterval(poll));
  }
});

// Delete session
router.delete('/session/:chatSessionId', isAuthenticated, chatSessionValid, async (req, res) => {
  try {
    await ChatMessage.deleteMany({ chatSessionId: req.params.chatSessionId });
    await ChatSession.findByIdAndDelete(req.params.chatSessionId);
    res.json({ message: 'Deleted', chatSessionId: req.params.chatSessionId });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete', code: 'DELETE_SESSION_ERROR' });
  }
});

// Background streaming - continues even if client disconnects
async function startBackgroundStream(queryMessage, chatSession, account, accountType, creditsRequired) {
  const queryId = queryMessage._id.toString();
  const chatSessionId = chatSession._id.toString();
  const { models } = chatSession;

  streamManager.initStream(queryId, {
    chatSessionId,
    models,
    creditsRequired,
    accountId: account._id.toString(),
    accountType,
  });

  const savedContent = {};
  models.forEach(m => savedContent[m] = '');

  // Save on interval
  const unsubSave = streamManager.onSave(queryId, async ({ responses, isComplete }) => {
    for (const model of models) {
      if (responses[model].length > savedContent[model].length) {
        await ChatMessage.findOneAndUpdate(
          { queryId, model, role: 'assistant' },
          {
            chatSessionId,
            queryId,
            role: 'assistant',
            model,
            content: responses[model],
            status: isComplete ? 'completed' : 'incomplete',
          },
          { upsert: true }
        );
        savedContent[model] = responses[model];
      }
    }
    if (isComplete) {
      queryMessage.status = 'completed';
      await queryMessage.save();
      unsubSave();
    }
  });

  // Get context
  const previousMessages = await ChatMessage.find({ chatSessionId }).sort({ createdAt: 1 }).limit(20);

  // Stream all models
  await Promise.all(models.map(async model => {
    try {
      const context = previousMessages
        .filter(m => !m.model || m.model === model)
        .map(m => ({ role: m.role, content: m.content }))
        .slice(-10);

      await streamFromModel(model, context, token => streamManager.appendToken(queryId, model, token));
      streamManager.completeModel(queryId, model);
    } catch (error) {
      console.error(`Stream error (${model}):`, error);
      streamManager.errorModel(queryId, model, `Failed: ${model}`);
    }
  }));

  // Deduct credits
  // Burn credits on-chain and log transaction
  if (account.solanaWallet) {
    let signature = null;
    try {
      signature = await solanaService.burnCredits(account.solanaWallet, creditsRequired);
    } catch (error) {
      console.error('Credit burn error:', error);
      // We already deducted from DB, so we don't rollback. User got the query.
    }

    // Log transaction (one single log)
    try {
      const env = require('../config/env');
      await new Transaction({
        [accountType === 'user' ? 'userId' : 'guestId']: account._id,
        type: 'query_usage',
        creditsAmount: creditsRequired, // Positive, UI adds '-'
        status: signature ? 'completed' : 'pending',
        usage: { chatSessionId, queryId, models, costPerModel: 1 },
        solana: signature ? {
          signature,
          payerWallet: account.solanaWallet,
          network: env.SOLANA_NETWORK,
          confirmedAt: new Date(),
        } : undefined,
      }).save();
    } catch (logErr) {
      console.error('Failed to log transaction:', logErr);
    }
  }
}

module.exports = router;
