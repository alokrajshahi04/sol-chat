/**
 * Chat routes for managing chat sessions, queries, and streaming
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Models
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Transaction = require('../models/Transaction');

// Middlewares
const { isAuthenticated, ensureSession } = require('../middlewares/authMiddlewares');
const { chatSessionValid, queryMessageValid } = require('../middlewares/chatMiddlewares');
const { checkCredits, deductCredits } = require('../middlewares/paymentMiddlewares');
const { validateInput } = require('../middlewares/inputValidationMiddlewares');

// Lib
const { streamFromModel } = require('../lib/streamFromModel');
const { titleFromModel } = require('../lib/titleFromModel');
const streamManager = require('../lib/streamManager');
const { MODELS } = require('../config/constants');

// Validation schemas
const createSessionSchema = Joi.object({
  models: Joi.array()
    .items(Joi.string().valid(...MODELS))
    .min(1)
    .required(),
}).required();

const querySchema = Joi.object({
  query: Joi.string().min(1).max(10000).required(),
}).required();

/**
 * POST /sessions - Create a new chat session
 */
router.post(
  '/sessions',
  validateInput(createSessionSchema),
  async (req, res) => {
    try {
      const { models } = req.body;
      
      const chatSession = new ChatSession({
        models,
        userId: req.session?.userId || null,
      });
      await chatSession.save();
      
      res.status(201).json({
        chatSessionId: chatSession._id,
        models: chatSession.models,
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ 
        error: 'Failed to create chat session',
        code: 'CREATE_SESSION_ERROR',
      });
    }
  }
);

/**
 * GET /sessions - Get all chat sessions for authenticated user
 */
router.get('/sessions', isAuthenticated, async (req, res) => {
  try {
    const chatSessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('_id title models createdAt updatedAt');
    
    res.status(200).json({
      sessions: chatSessions.map(session => ({
        chatSessionId: session._id,
        title: session.title,
        models: session.models,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to get chat sessions',
      code: 'GET_SESSIONS_ERROR',
    });
  }
});

/**
 * POST /session/:chatSessionId - Submit a query to the chat session
 * Returns 402 if insufficient credits
 */
router.post(
  '/session/:chatSessionId',
  validateInput(querySchema),
  chatSessionValid,
  ensureSession,
  checkCredits,
  async (req, res) => {
    try {
      const { chatSessionId } = req.params;
      const chatSession = req.chatSession;
      const { query } = req.body;
      const creditsRequired = req.creditsRequired;
      const account = req.account;
      const accountType = req.accountType;
      
      // Generate title if first message
      if (!chatSession.title) {
        try {
          chatSession.title = await titleFromModel(query);
          await chatSession.save();
        } catch (titleError) {
          console.error('Title generation error:', titleError);
        }
      }
      
      // Create query message
      const queryMessage = new ChatMessage({
        chatSessionId,
        role: 'user',
        content: query,
        status: 'incomplete',
      });
      await queryMessage.save();
      
      // Start background streaming
      startBackgroundStream(queryMessage, chatSession, account, accountType, creditsRequired);
      
      res.status(202).json({
        queryId: queryMessage._id,
        chatSessionId,
        models: chatSession.models,
        creditsRequired,
      });
    } catch (error) {
      console.error('Submit query error:', error);
      res.status(500).json({ 
        error: 'Failed to submit query',
        code: 'SUBMIT_QUERY_ERROR',
      });
    }
  }
);

/**
 * GET /session/:chatSessionId - Get chat session history
 */
router.get('/session/:chatSessionId', chatSessionValid, async (req, res) => {
  try {
    const chatSessionId = req.params.chatSessionId;
    const chatSession = req.chatSession;
    
    const messages = await ChatMessage.find({ chatSessionId })
      .sort({ createdAt: 1 })
      .select('role model content status createdAt');
    
    res.status(200).json({
      chatSessionId,
      title: chatSession.title,
      models: chatSession.models,
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
    res.status(500).json({ 
      error: 'Failed to get chat session',
      code: 'GET_SESSION_ERROR',
    });
  }
});

/**
 * GET /sse/:queryId - Stream responses for a query via Server-Sent Events
 */
router.get('/sse/:queryId', queryMessageValid, async (req, res) => {
  const queryId = req.params.queryId;
  const queryMessage = req.queryMessage;
  const chatSession = req.chatSession;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  // Helper functions
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  // Send init event
  sendEvent('init', { 
    queryId,
    chatSessionId: chatSession._id,
    models: chatSession.models,
  });
  
  // If query is already completed, send cached responses
  if (queryMessage.status === 'completed') {
    const responses = await ChatMessage.find({ queryId });
    
    for (const response of responses) {
      sendEvent('chunk', {
        queryId,
        model: response.model,
        token: response.content,
        isComplete: true,
      });
    }
    
    sendEvent('done', { message: 'Stream completed' });
    res.end();
    return;
  }
  
  // Check if stream is active in memory
  if (streamManager.isStreamActive(queryId)) {
    // Subscribe to live stream
    const unsubscribe = streamManager.subscribe(queryId, {
      onChunk: (chunk) => {
        sendEvent('chunk', chunk);
      },
      onDone: () => {
        sendEvent('done', { message: 'Stream completed' });
        res.end();
      },
    });
    
    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  } else {
    // Stream not active, poll database for completion
    const pollInterval = setInterval(async () => {
      try {
        const msg = await ChatMessage.findById(queryId);
        if (msg?.status === 'completed') {
          clearInterval(pollInterval);
          
          const responses = await ChatMessage.find({ queryId });
          for (const response of responses) {
            sendEvent('chunk', {
              queryId,
              model: response.model,
              token: response.content,
              isComplete: true,
            });
          }
          
          sendEvent('done', { message: 'Stream completed' });
          res.end();
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 1000);
    
    req.on('close', () => {
      clearInterval(pollInterval);
    });
  }
});

/**
 * DELETE /session/:chatSessionId - Delete a chat session
 */
router.delete('/session/:chatSessionId', isAuthenticated, chatSessionValid, async (req, res) => {
  try {
    const chatSessionId = req.params.chatSessionId;
    
    // Delete all messages in the session
    await ChatMessage.deleteMany({ chatSessionId });
    
    // Delete the session
    await ChatSession.findByIdAndDelete(chatSessionId);
    
    res.status(200).json({ 
      message: 'Chat session deleted',
      chatSessionId,
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ 
      error: 'Failed to delete chat session',
      code: 'DELETE_SESSION_ERROR',
    });
  }
});

/**
 * Background streaming function
 * Continues even if client disconnects, saves to DB at intervals
 */
async function startBackgroundStream(queryMessage, chatSession, account, accountType, creditsRequired) {
  const queryId = queryMessage._id.toString();
  const chatSessionId = chatSession._id.toString();
  const models = chatSession.models;
  
  // Initialize stream in memory
  streamManager.initStream(queryId, {
    chatSessionId,
    models,
    creditsRequired,
    accountId: account._id.toString(),
    accountType,
  });
  
  // Track partial saves for each model
  const savedContent = {};
  for (const model of models) {
    savedContent[model] = '';
  }
  
  // Set up interval-based saving
  const unsubscribeSave = streamManager.onSave(queryId, async ({ responses, isComplete }) => {
    try {
      // Save or update partial responses for each model
      for (const model of models) {
        const currentContent = responses[model];
        
        // Only save if there's new content
        if (currentContent.length > savedContent[model].length) {
          // Find or create the assistant message
          let assistantMessage = await ChatMessage.findOne({
            queryId,
            model,
            role: 'assistant',
          });
          
          if (assistantMessage) {
            // Update existing message
            assistantMessage.content = currentContent;
            assistantMessage.status = isComplete ? 'completed' : 'incomplete';
            await assistantMessage.save();
          } else {
            // Create new message
            assistantMessage = new ChatMessage({
              chatSessionId,
              queryId,
              role: 'assistant',
              model,
              content: currentContent,
              status: isComplete ? 'completed' : 'incomplete',
            });
            await assistantMessage.save();
          }
          
          savedContent[model] = currentContent;
        }
      }
      
      // If complete, mark query as completed
      if (isComplete) {
        queryMessage.status = 'completed';
        await queryMessage.save();
        unsubscribeSave();
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  });
  
  // Get previous messages for context
  const previousMessages = await ChatMessage.find({ chatSessionId })
    .sort({ createdAt: 1 })
    .limit(20);
  
  // Process each model in parallel
  const streamPromises = models.map(async (model) => {
    try {
      // Build messages for this model
      const contextMessages = previousMessages
        .filter(msg => !msg.model || msg.model === model)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }))
        .slice(-10);
      
      await streamFromModel(model, contextMessages, (token) => {
        streamManager.appendToken(queryId, model, token);
      });
      
      // Mark model as completed
      streamManager.completeModel(queryId, model);
    } catch (error) {
      console.error(`Stream error for model ${model}:`, error);
      streamManager.errorModel(queryId, model, `Failed to get response from ${model}`);
    }
  });
  
  // Wait for all streams to complete
  await Promise.all(streamPromises);
  
  // Deduct credits after completion
  try {
    if (account.solanaWallet) {
      const deductResult = await deductCredits(account, creditsRequired, {
        chatSessionId,
        queryId,
        models,
      });
      
      // Record transaction
      const transaction = new Transaction({
        [accountType === 'user' ? 'userId' : 'guestId']: account._id,
        type: 'query_usage',
        creditsAmount: -creditsRequired,
        status: 'completed',
        usage: {
          chatSessionId,
          queryId,
          models,
          costPerModel: 1,
        },
        solana: deductResult.signature ? {
          signature: deductResult.signature,
        } : undefined,
      });
      await transaction.save();
    }
  } catch (deductError) {
    console.error('Credit deduction error:', deductError);
  }
}

module.exports = router;
