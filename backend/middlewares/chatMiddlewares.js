/**
 * Chat-related middlewares for session and message validation
 */

const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');

/**
 * Validate chat session exists and user has access
 */
async function chatSessionValid(req, res, next) {
  const chatSessionId = req.params.chatSessionId;
  
  if (!chatSessionId) {
    return res.status(400).json({ 
      error: 'Chat session ID required',
      code: 'MISSING_SESSION_ID',
    });
  }
  
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    
    if (!chatSession) {
      return res.status(404).json({ 
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    // Check ownership if session belongs to a user
    if (chatSession.userId) {
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId || sessionUserId !== chatSession.userId.toString()) {
        return res.status(403).json({
          error: 'Access denied to this chat session',
          code: 'ACCESS_DENIED',
        });
      }
    }
    
    req.chatSession = chatSession;
    next();
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid chat session ID format',
        code: 'INVALID_SESSION_ID',
      });
    }
    console.error('Chat session validation error:', error);
    return res.status(500).json({ 
      error: 'Failed to validate chat session',
      code: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Validate query message exists and user has access
 */
async function queryMessageValid(req, res, next) {
  const queryId = req.params.queryId;
  
  if (!queryId) {
    return res.status(400).json({ 
      error: 'Query ID required',
      code: 'MISSING_QUERY_ID',
    });
  }
  
  try {
    const queryMessage = await ChatMessage.findById(queryId);
    
    if (!queryMessage) {
      return res.status(404).json({ 
        error: 'Query message not found',
        code: 'QUERY_NOT_FOUND',
      });
    }
    
    if (queryMessage.role !== 'user') {
      return res.status(400).json({ 
        error: 'Invalid query message',
        code: 'INVALID_QUERY',
      });
    }
    
    const chatSession = await ChatSession.findById(queryMessage.chatSessionId);
    
    if (!chatSession) {
      return res.status(404).json({ 
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    // Check ownership if session belongs to a user
    if (chatSession.userId) {
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId || sessionUserId !== chatSession.userId.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }
    }
    
    req.queryMessage = queryMessage;
    req.chatSession = chatSession;
    next();
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid query ID format',
        code: 'INVALID_QUERY_ID',
      });
    }
    console.error('Query validation error:', error);
    return res.status(500).json({ 
      error: 'Failed to validate query',
      code: 'VALIDATION_ERROR',
    });
  }
}

module.exports = {
  chatSessionValid,
  queryMessageValid,
};
