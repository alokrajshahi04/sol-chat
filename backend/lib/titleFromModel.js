/**
 * Title generation utility
 * Generates concise titles for chat sessions
 */

const { OpenAI } = require('openai');

let openAI = null;

function getOpenAI() {
  if (!openAI) {
    openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openAI;
}

/**
 * Generate a title from a query
 * @param {string} query - The user's query
 * @returns {Promise<string>} - Generated title (3-8 words)
 */
async function titleFromModel(query) {
  if (!query || typeof query !== 'string') {
    return 'New Chat';
  }

  try {
    const client = getOpenAI();
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You generate short, clear titles. Respond with only the title, nothing else.',
        },
        {
          role: 'user',
          content: `Generate a concise 3-8 word title for this query:\n\n"${query.slice(0, 500)}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const title = response.choices[0]?.message?.content?.trim();
    
    // Validate and sanitize title
    if (!title || title.length < 2) {
      return 'New Chat';
    }
    
    // Remove quotes if present
    return title.replace(/^["']|["']$/g, '').slice(0, 100);
  } catch (error) {
    console.error('Title generation error:', error.message);
    return 'New Chat';
  }
}

module.exports = { titleFromModel };
