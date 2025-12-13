/**
 * LLM streaming utility
 * Supports OpenAI and Google Gemini models
 */

const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');

// Initialize clients lazily to avoid errors if API keys are not set
let openAI = null;
let genAI = null;

function getOpenAI() {
  if (!openAI) {
    openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openAI;
}

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

/**
 * Stream response from an LLM model
 * @param {string} model - Model identifier (e.g., 'gpt-5-mini', 'gemini-2.5-flash')
 * @param {Array} messages - Array of message objects with role and content
 * @param {Function} callback - Called for each token with (token: string)
 * @returns {Promise<void>}
 */
async function streamFromModel(model, messages, callback) {
  if (!model || !messages || !callback) {
    throw new Error('Missing required parameters: model, messages, and callback are required');
  }

  if (model.startsWith('gpt')) {
    await streamFromOpenAI(model, messages, callback);
  } else if (model.startsWith('gemini')) {
    await streamFromGemini(model, messages, callback);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Stream from OpenAI models
 */
async function streamFromOpenAI(model, messages, callback) {
  const client = getOpenAI();
  
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) {
      callback(token);
    }
  }
}

/**
 * Stream from Google Gemini models
 */
async function streamFromGemini(model, messages, callback) {
  const client = getGenAI();
  
  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const stream = await client.models.generateContentStream({
    model,
    contents,
  });

  for await (const chunk of stream) {
    const parts = chunk?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.text) {
        callback(part.text);
      }
    }
  }
}

module.exports = { 
  streamFromModel,
  streamFromOpenAI,
  streamFromGemini,
};
