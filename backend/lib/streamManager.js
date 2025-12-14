// In-memory stream manager for LLM responses
// Accumulates tokens, saves to DB at intervals, handles SSE subscriptions

const { EventEmitter } = require("events");

const activeStreams = new Map();
const streamEvents = new EventEmitter();
streamEvents.setMaxListeners(100);

const {
  STREAM_SAVE_INTERVAL_MS,
  STREAM_TIMEOUT_MS,
} = require("../config/constants");

function initStream(
  queryId,
  { chatSessionId, models, creditsRequired, accountId, accountType }
) {
  const stream = {
    queryId,
    chatSessionId,
    models,
    creditsRequired,
    accountId,
    accountType,
    responses: {},
    completedModels: new Set(),
    status: "streaming",
    startedAt: Date.now(),
    saveInterval: null,
  };

  models.forEach((model) => (stream.responses[model] = ""));
  activeStreams.set(queryId, stream);

  stream.saveInterval = setInterval(
    () => emitSaveEvent(queryId),
    STREAM_SAVE_INTERVAL_MS
  );

  return stream;
}

function appendToken(queryId, model, token) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.responses[model] += token;
  streamEvents.emit(`chunk:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    model,
    token,
    isComplete: false,
  });
}

function completeModel(queryId, model) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.completedModels.add(model);
  streamEvents.emit(`chunk:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    model,
    token: "",
    isComplete: true,
    allComplete: stream.completedModels.size === stream.models.length,
  });

  if (stream.completedModels.size === stream.models.length) {
    completeStream(queryId);
  }
}

function completeStream(queryId) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;

  stream.status = "completed";
  if (stream.saveInterval) clearInterval(stream.saveInterval);

  emitSaveEvent(queryId);
  streamEvents.emit(`done:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    responses: stream.responses,
  });

  // Cleanup after 10s
  setTimeout(() => activeStreams.delete(queryId), 10000);
}

function errorModel(queryId, model, error) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;
  stream.responses[model] = `[Error: ${error}]`;
  completeModel(queryId, model);
}

function emitSaveEvent(queryId) {
  const stream = activeStreams.get(queryId);
  if (!stream) return;
  streamEvents.emit(`save:${queryId}`, {
    queryId,
    chatSessionId: stream.chatSessionId,
    responses: { ...stream.responses },
    isComplete: stream.status === "completed",
  });
}

function isStreamActive(queryId) {
  const stream = activeStreams.get(queryId);
  return stream?.status === "streaming";
}

function subscribe(queryId, { onChunk, onDone }) {
  const chunkHandler = (data) => onChunk?.(data);
  const doneHandler = (data) => onDone?.(data);

  streamEvents.on(`chunk:${queryId}`, chunkHandler);
  streamEvents.on(`done:${queryId}`, doneHandler);

  return () => {
    streamEvents.off(`chunk:${queryId}`, chunkHandler);
    streamEvents.off(`done:${queryId}`, doneHandler);
  };
}

function onSave(queryId, handler) {
  streamEvents.on(`save:${queryId}`, handler);
  return () => streamEvents.off(`save:${queryId}`, handler);
}

// Cleanup stale streams every minute
setInterval(() => {
  const now = Date.now();
  for (const [queryId, stream] of activeStreams.entries()) {
    if (now - stream.startedAt > STREAM_TIMEOUT_MS) {
      if (stream.saveInterval) clearInterval(stream.saveInterval);
      activeStreams.delete(queryId);
    }
  }
}, 60 * 1000);

module.exports = {
  initStream,
  appendToken,
  completeModel,
  completeStream,
  errorModel,
  isStreamActive,
  subscribe,
  onSave,
};
