const { OpenAI } = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function streamFromModel(model, query, callback) {
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [{ role: "user", content: query }],
  });

  for await (chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) {
      callback(token);
    }
  }
}

module.exports.streamFromModel = streamFromModel;
