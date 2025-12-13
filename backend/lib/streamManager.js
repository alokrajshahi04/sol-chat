/**
 * Stream Manager
 * 
 * Manages active LLM streams in memory with:
 * - Real-time token accumulation
 * - Interval-based database saves (every few seconds)
 * - Final save on stream completion
 * - Client subscription for SSE updates
 */

const { EventEmitter } = require('events');

// Store for active streams
const activeStreams = new Map();

// Event emitter for stream updates
const streamEvents = new EventEmitter();
streamEvents.setMaxListeners(100); // Allow many concurrent listeners

// Configuration
const SAVE_INTERVAL_MS = 3000; // Save to DB every 3 seconds
const STREAM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for stale streams

/**
 * Initialize a new stream for a query
 * @param {string} queryId - Query message ID
 * @param {Object} options - Stream options
 */
function initStream(queryId, { chatSessionId, models, creditsRequired, accountId, accountType }) {
  const stream = {
    queryId,
    chatSessionId,
    models,
    creditsRequired,
    accountId,
    accountType,
    responses: {}, // { model: accumulated content }
    completedModels: new Set(),
    status: 'streaming',
    startedAt: Date.now(),
    lastSavedAt: null,
    saveInterval: null,
  };

  // Initialize response accumulators for each model
  for (const model of models) {
    stream.responses[model] = '';
  }

  activeStreams.set(queryId, stream);

  // Start periodic save interval
  stream.saveInterval = setInterval(() => {
    emitSaveEvent(queryId);
  }, SAVE_INTERVAL_MS);

  return stream;
}

/**
 * Append a token to a model's response
 * @param {string} queryId - Query message ID
 * @param {string} model - Model name
 * @param {string} token - Token to append
 */
function appendToken(queryId, model, token) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.responses[model] += token;

  // Emit event for SSE subscribers
  streamEvents.emit(`chunk:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    model,
    token,
    isComplete: false,
  });
}

/**
 * Mark a model as completed
 * @param {string} queryId - Query message ID
 * @param {string} model - Model name
 */
function completeModel(queryId, model) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.completedModels.add(model);

  // Emit completion event for this model
  streamEvents.emit(`chunk:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    model,
    token: '',
    isComplete: true,
    allComplete: stream.completedModels.size === stream.models.length,
  });

  // Check if all models are done
  if (stream.completedModels.size === stream.models.length) {
    completeStream(queryId);
  }
}

/**
 * Mark the entire stream as completed
 * @param {string} queryId - Query message ID
 */
function completeStream(queryId) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.status = 'completed';

  // Clear the save interval
  if (stream.saveInterval) {
    clearInterval(stream.saveInterval);
    stream.saveInterval = null;
  }

  // Emit final save event
  emitSaveEvent(queryId);

  // Emit done event
  streamEvents.emit(`done:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    responses: stream.responses,
  });

  // Clean up after a short delay (allow clients to receive final events)
  setTimeout(() => {
    activeStreams.delete(queryId);
  }, 10000);
}

/**
 * Mark stream as errored
 * @param {string} queryId - Query message ID
 * @param {string} model - Model that errored
 * @param {string} error - Error message
 */
function errorModel(queryId, model, error) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.responses[model] = `[Error: ${error}]`;
  completeModel(queryId, model);
}

/**
 * Emit save event for interval-based saving
 * @param {string} queryId - Query message ID
 */
function emitSaveEvent(queryId) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.lastSavedAt = Date.now();

  streamEvents.emit(`save:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    responses: { ...stream.responses },
    isComplete: stream.status === 'completed',
  });
}

/**
 * Get current stream state
 * @param {string} queryId - Query message ID
 * @returns {Object|null} - Stream state or null
 */
function getStream(queryId) {
  return activeStreams.get(queryId) || null;
}

/**
 * Check if a stream is active
 * @param {string} queryId - Query message ID
 * @returns {boolean}
 */
function isStreamActive(queryId) {
  const stream = activeStreams.get(queryId);
  return stream && stream.status === 'streaming';
}

/**
 * Subscribe to stream events for a query
 * @param {string} queryId - Query message ID
 * @param {Object} handlers - Event handlers
 * @param {Function} handlers.onChunk - Called for each token
 * @param {Function} handlers.onDone - Called when stream completes
 * @returns {Function} - Unsubscribe function
 */
function subscribe(queryId, { onChunk, onDone }) {
  const chunkHandler = (data) => onChunk?.(data);
  const doneHandler = (data) => onDone?.(data);

  streamEvents.on(`chunk:${queryId}`, chunkHandler);
  streamEvents.on(`done:${queryId}`, doneHandler);

  // Return unsubscribe function
  return () => {
    streamEvents.off(`chunk:${queryId}`, chunkHandler);
    streamEvents.off(`done:${queryId}`, doneHandler);
  };
}

/**
 * Subscribe to save events for a query (for database writes)
 * @param {string} queryId - Query message ID
 * @param {Function} handler - Called when save is triggered
 * @returns {Function} - Unsubscribe function
 */
function onSave(queryId, handler) {
  streamEvents.on(`save:${queryId}`, handler);
  return () => streamEvents.off(`save:${queryId}`, handler);
}

/**
 * Clean up stale streams (call periodically)
 */
function cleanupStaleStreams() {
  const now = Date.now();
  
  for (const [queryId, stream] of activeStreams.entries()) {
    if (now - stream.startedAt > STREAM_TIMEOUT_MS) {
      console.warn(`Cleaning up stale stream: ${queryId}`);
      
      if (stream.saveInterval) {
        clearInterval(stream.saveInterval);
      }
      
      activeStreams.delete(queryId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupStaleStreams, 60 * 1000);

module.exports = {
  initStream,
  appendToken,
  completeModel,
  completeStream,
  errorModel,
  getStream,
  isStreamActive,
  subscribe,
  onSave,
  SAVE_INTERVAL_MS,
};

