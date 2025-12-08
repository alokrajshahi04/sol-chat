# Quick Start for Backend Developer

Hey! This is everything you need to integrate with the frontend.

## 🎯 What Frontend Expects

The frontend is **READY** and waiting for these API endpoints:

### Base URL
```
http://localhost:3000/api
```

## 📋 Must-Have Endpoints

### 1. **POST /api/chat** (Most Important!)

**What it does:** Sends a chat message, handles x402 payment

**Request:**
```javascript
POST /api/chat
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "X-Payment-Mode": "pay-per-request" | "credits",
  "X-Payment-Proof": "<solana_tx_signature>" // only after payment
}
Body: {
  "message": "User's message",
  "chatId": "chat_123",
  "agentId": "brand-researcher", // optional
  "purpose": "message_request"
}
```

**Response if no payment (402):**
```javascript
Status: 402
{
  "error": "payment_required",
  "payment": {
    "amount": 0.01,
    "currency": "USDC",
    "recipient": "YOUR_SOLANA_WALLET",
    "network": "solana-devnet",
    "purpose": "message_request"
  }
}
```

**Response if paid (200 - Server-Sent Events):**
```javascript
Status: 200
Content-Type: text/event-stream

data: {"type":"start","messageId":"chat_123"}

data: {"type":"content","delta":"Based on"}

data: {"type":"content","delta":" your query"}

data: {"type":"done","messageId":"chat_123"}
```

### 2. **GET /api/agents**

**What it does:** List all available agents

**Response:**
```javascript
[
  {
    "_id": "...",
    "agentId": "brand-researcher",
    "name": "Brand Researcher",
    "description": "...",
    "systemPrompt": "You are a brand researcher...",
    "pricing": {
      "type": "unlock",
      "unlockPrice": 5,
      "messageLimit": 10
    },
    "tags": ["Marketing", "Research"],
    "status": "online"
  }
]
```

### 3. **POST /api/agents/:agentId/unlock**

**What it does:** Unlock an agent (x402)

**Request:**
```javascript
POST /api/agents/brand-researcher/unlock
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "X-Payment-Proof": "<solana_tx>" // only after payment
}
```

**Response if no payment (402):**
```javascript
Status: 402
{
  "error": "payment_required",
  "payment": {
    "amount": 5,
    "currency": "USDC",
    "recipient": "YOUR_WALLET",
    "purpose": "agent_unlock",
    "agentId": "brand-researcher"
  }
}
```

**Response if paid (200):**
```javascript
{
  "success": true,
  "agent": { /* agent object */ }
}
```

### 4. **GET /api/my-agents**

**What it does:** Get user's unlocked agents with usage

**Response:**
```javascript
[
  {
    "agentId": "brand-researcher",
    "name": "Brand Researcher",
    "messagesUsed": 3,
    "messagesLimit": 10,
    ...
  }
]
```

### 5. **GET /api/chats**

**What it does:** Get user's chat history

**Response:**
```javascript
[
  {
    "chatId": "chat_123",
    "userId": "user_id",
    "agentId": "brand-researcher",
    "title": "Chat with Brand Researcher",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-12-08T..."
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

## 🗄️ MongoDB Collections You Need

### Users
```javascript
{
  email, password, name, credits, createdAt
}
```

### Agents
```javascript
{
  agentId, name, description, systemPrompt,
  pricing: { type, unlockPrice, messageLimit },
  tags, status
}
```

### UserAgents (tracking unlocks)
```javascript
{
  userId, agentId, messagesUsed, messagesLimit, unlockedAt
}
```

### Chats
```javascript
{
  chatId, userId, agentId, title,
  messages: [{ role, content, timestamp }],
  createdAt, updatedAt
}
```

### Transactions
```javascript
{
  userId, txSignature, amount, currency,
  purpose, metadata, status, timestamp
}
```

## 🔐 x402 Payment Flow

**This is the key concept!**

1. User tries to send message → No payment proof
2. **You return 402** with payment details
3. Frontend shows payment modal
4. User pays with their Solana wallet app
5. User pastes transaction signature
6. Frontend retries with `X-Payment-Proof` header
7. **You validate transaction** on Solana blockchain
8. If valid → proceed with request
9. If invalid → return 401

**Validating Solana Transaction:**
```javascript
const { Connection } = require('@solana/web3.js')

async function validatePayment(txSig, expectedAmount) {
  const connection = new Connection('https://api.devnet.solana.com')
  const tx = await connection.getTransaction(txSig)
  
  // Check:
  // 1. Transaction exists
  // 2. Sent to your wallet
  // 3. Amount matches
  // 4. Recent (< 10 min old)
  
  return true/false
}
```

## 🚦 Testing Without Real Payments

For development, accept ANY transaction signature:

```javascript
if (process.env.NODE_ENV === 'development') {
  // Skip validation, accept any string
  if (paymentProof) {
    return next()
  }
}
```

## 🎨 Agent System Prompts

Each agent has a `systemPrompt` that defines its personality:

**Example:**
```javascript
{
  agentId: 'brand-researcher',
  systemPrompt: `You are a professional brand researcher with 15 years of experience. 
  Provide detailed market analysis, competitor insights, and actionable recommendations. 
  Always cite sources and use data-driven approaches. Be concise but thorough.`
}
```

When user chats with agent:
1. Get agent's systemPrompt from MongoDB
2. Add to LLM messages as first message with `role: "system"`
3. This guides the AI's responses

## 📦 Installation Commands

```bash
npm install express mongoose dotenv cors jsonwebtoken bcryptjs
npm install @solana/web3.js
npm install openai  # for ChatGPT
```

## 🔧 Essential Middleware

### 1. Auth Middleware
```javascript
// Verify JWT token
const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### 2. x402 Middleware
```javascript
function x402Middleware(amount) {
  return async (req, res, next) => {
    const proof = req.headers['x-payment-proof']
    const mode = req.headers['x-payment-mode']
    
    if (mode === 'credits') {
      // Check user credits in next()
      return next()
    }
    
    if (!proof) {
      return res.status(402).json({
        error: 'payment_required',
        payment: {
          amount,
          currency: 'USDC',
          recipient: process.env.SOLANA_WALLET,
          network: 'solana-devnet',
          purpose: req.body.purpose
        }
      })
    }
    
    // Validate payment
    const valid = await validatePayment(proof, amount)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid payment' })
    }
    
    next()
  }
}
```

## 🌊 Streaming LLM Responses

```javascript
const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

router.post('/chat', authMiddleware, x402Middleware(0.01), async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: agentSystemPrompt },
      ...chatHistory,
      { role: 'user', content: req.body.message }
    ],
    stream: true
  })
  
  res.write(`data: ${JSON.stringify({type:'start'})}\n\n`)
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      res.write(`data: ${JSON.stringify({type:'content',delta:content})}\n\n`)
    }
  }
  
  res.write(`data: ${JSON.stringify({type:'done'})}\n\n`)
  res.end()
})
```

## ⚡ Priority Order

**Week 1 - Core Chat:**
1. MongoDB setup + User model
2. Auth endpoints (login/register)
3. Basic chat endpoint (no agents, no payment)
4. Test chat works with frontend

**Week 2 - x402 Payments:**
1. Add x402 middleware
2. Test 402 responses
3. Add payment validation
4. Test full payment flow

**Week 3 - Agents:**
1. Agent model + seed script
2. Agent unlock endpoint
3. Agent-specific system prompts
4. Message limits tracking

## 📞 Need Help?

Check these files in the frontend repo:
- `BACKEND_MONGODB_GUIDE.md` - Full implementation
- `STRUCTURE.md` - Frontend structure
- `src/api/` - API client code (see what frontend sends)

**Common Issues:**

1. **CORS Error** → Add frontend URL to CORS config
2. **402 not working** → Check headers, test with Postman
3. **Streaming not working** → Check SSE headers
4. **Payment validation** → Use mock mode for dev

## 🎯 Minimal Working Backend (1 hour)

```javascript
// server.js
const express = require('express')
const app = express()

app.use(express.json())
app.use(require('cors')({ origin: 'http://localhost:5174' }))

// Mock chat endpoint
app.post('/api/chat', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.write(`data: ${JSON.stringify({type:'content',delta:'Hello from backend!'})}\n\n`)
  res.write(`data: ${JSON.stringify({type:'done'})}\n\n`)
  res.end()
})

// Mock agents
app.get('/api/agents', (req, res) => {
  res.json([{
    agentId: 'test',
    name: 'Test Agent',
    description: 'Test',
    pricing: { unlockPrice: 5 }
  }])
})

app.listen(3000, () => console.log('Backend ready on :3000'))
```

Test it:
```bash
node server.js
# Frontend should connect automatically!
```

---

Good luck! The frontend is ready and waiting for your backend 🚀
