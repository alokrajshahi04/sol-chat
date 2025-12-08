# Backend Implementation Guide - MongoDB + Express + x402

## Architecture Overview

```
Frontend → Express API → x402 Middleware → MongoDB → LLM Service
```

**Key Points:**
- ❌ NO wallet connection needed in frontend
- ✅ Backend generates payment requests (402 responses)
- ✅ Backend validates x402 payment proofs
- ✅ MongoDB stores users, chats, agents, transactions

---

## Database Schema (MongoDB)

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  passwordHash: String,
  credits: Number,  // Available credits
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Agents Collection
```javascript
{
  _id: ObjectId,
  agentId: String,  // "brand-researcher"
  name: String,
  provider: String,
  description: String,
  systemPrompt: String,  // Agent's personality/instructions
  pricing: {
    type: String,  // "unlock" | "per-message" | "subscription"
    unlockPrice: Number,  // One-time unlock fee
    messagePrice: Number,  // Price per message
    messageLimit: Number,  // Messages included in unlock (e.g., 10)
  },
  tags: [String],
  status: String,  // "online" | "offline"
  createdAt: Date
}
```

### 3. UserAgents Collection (Unlocked Agents)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  agentId: String,
  unlockedAt: Date,
  messagesUsed: Number,  // Track usage
  messagesLimit: Number,  // Total allowed
  expiresAt: Date  // Optional expiry
}
```

### 4. Chats Collection
```javascript
{
  _id: ObjectId,
  chatId: String,  // "chat_123..."
  userId: ObjectId,
  agentId: String,  // null for regular chats
  title: String,
  messages: [{
    role: String,  // "user" | "assistant"
    content: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Transactions Collection (x402 Payments)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  txSignature: String,  // Solana transaction signature
  amount: Number,
  currency: String,  // "USDC"
  purpose: String,  // "agent_unlock" | "credit_purchase" | "message_request"
  metadata: {
    agentId: String,  // if agent unlock
    credits: Number,  // if credit purchase
    chatId: String  // if message request
  },
  status: String,  // "pending" | "confirmed" | "failed"
  timestamp: Date
}
```

---

## Backend File Structure

```
backend/
├── server.js              # Express app entry
├── .env                   # Environment variables
├── package.json
├── models/
│   ├── User.js
│   ├── Agent.js
│   ├── UserAgent.js
│   ├── Chat.js
│   └── Transaction.js
├── routes/
│   ├── auth.js           # Login/signup
│   ├── agents.js         # List agents, unlock agent
│   ├── chat.js           # Send message, get chats
│   └── transactions.js   # Transaction history
├── middleware/
│   ├── auth.js           # JWT verification
│   └── x402.js           # Payment validation
├── services/
│   ├── llm.js            # OpenAI/Anthropic integration
│   ├── payment.js        # Solana validation
│   └── agent.js          # Agent logic
└── config/
    └── db.js             # MongoDB connection
```

---

## Installation & Setup

```bash
cd backend
npm init -y
npm install express mongoose dotenv cors jsonwebtoken bcryptjs
npm install @solana/web3.js  # For payment verification
npm install openai @anthropic-ai/sdk  # LLM APIs
```

**.env file:**
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/solchat
# or MongoDB Atlas
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/solchat

# JWT
JWT_SECRET=your_super_secret_key_change_this

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_ADDRESS=ByXBwWq4foap21XvzUCAU1E4RTfU5FQSV7tjQSpump1

# LLM APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Server
PORT=3000
FRONTEND_URL=http://localhost:5174
```

---

## Core Implementation

### 1. MongoDB Connection (`config/db.js`)

```javascript
const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

module.exports = connectDB
```

### 2. Agent Model (`models/Agent.js`)

```javascript
const mongoose = require('mongoose')

const agentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  provider: String,
  description: String,
  systemPrompt: { type: String, required: true },
  pricing: {
    type: { type: String, enum: ['unlock', 'per-message', 'subscription'] },
    unlockPrice: Number,
    messagePrice: Number,
    messageLimit: Number,
  },
  tags: [String],
  status: { type: String, default: 'online' }
}, { timestamps: true })

module.exports = mongoose.model('Agent', agentSchema)
```

### 3. x402 Middleware (`middleware/x402.js`)

```javascript
const { Connection, PublicKey } = require('@solana/web3.js')
const Transaction = require('../models/Transaction')

const validatePayment = async (txSignature, expectedAmount) => {
  const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed')
  
  try {
    // Get transaction from Solana
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    })

    if (!tx) {
      return { valid: false, error: 'Transaction not found' }
    }

    // Check if transaction is recent (within last 10 minutes)
    const txTime = tx.blockTime * 1000
    const now = Date.now()
    if (now - txTime > 10 * 60 * 1000) {
      return { valid: false, error: 'Transaction too old' }
    }

    // Validate recipient and amount
    // (This depends on your SPL token transfer format)
    const recipientPubkey = new PublicKey(process.env.SOLANA_WALLET_ADDRESS)
    
    // TODO: Parse transaction to verify:
    // 1. Recipient is correct
    // 2. Amount matches expectedAmount
    // 3. Token is USDC

    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

const x402Middleware = (requiredAmount = null) => {
  return async (req, res, next) => {
    const paymentProof = req.headers['x-payment-proof']
    const paymentMode = req.headers['x-payment-mode']

    // If credits mode, skip payment validation (handle in route)
    if (paymentMode === 'credits') {
      return next()
    }

    // Pay-per-request mode
    if (paymentMode === 'pay-per-request') {
      // No payment proof - return 402
      if (!paymentProof) {
        return res.status(402).json({
          error: 'payment_required',
          payment: {
            amount: requiredAmount || 0.01,
            currency: 'USDC',
            recipient: process.env.SOLANA_WALLET_ADDRESS,
            network: 'solana-devnet',
            purpose: req.body.purpose || 'service_payment'
          }
        })
      }

      // Validate payment proof
      const result = await validatePayment(paymentProof, requiredAmount || 0.01)
      if (!result.valid) {
        return res.status(401).json({ error: 'Invalid payment proof', details: result.error })
      }

      // Store transaction
      await Transaction.create({
        userId: req.user.id,
        txSignature: paymentProof,
        amount: requiredAmount || 0.01,
        currency: 'USDC',
        purpose: req.body.purpose || 'message_request',
        status: 'confirmed',
        timestamp: new Date()
      })
    }

    next()
  }
}

module.exports = { x402Middleware, validatePayment }
```

### 4. Chat Route (`routes/chat.js`)

```javascript
const express = require('express')
const router = express.Router()
const Chat = require('../models/Chat')
const Agent = require('../models/Agent')
const UserAgent = require('../models/UserAgent')
const User = require('../models/User')
const { x402Middleware } = require('../middleware/x402')
const { authMiddleware } = require('../middleware/auth')
const { streamLLMResponse } = require('../services/llm')

// Send message
router.post('/chat', authMiddleware, x402Middleware(0.01), async (req, res) => {
  try {
    const { message, chatId, agentId } = req.body
    const userId = req.user.id
    const paymentMode = req.headers['x-payment-mode']

    // Get or create chat
    let chat = await Chat.findOne({ chatId, userId })
    if (!chat) {
      chat = await Chat.create({
        chatId,
        userId,
        agentId,
        title: 'New Chat',
        messages: []
      })
    }

    // If using agent, check unlock status and message limit
    if (agentId) {
      const agent = await Agent.findOne({ agentId })
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' })
      }

      const userAgent = await UserAgent.findOne({ userId, agentId })
      if (!userAgent) {
        // Agent not unlocked - return 402
        return res.status(402).json({
          error: 'agent_not_unlocked',
          payment: {
            amount: agent.pricing.unlockPrice,
            currency: 'USDC',
            recipient: process.env.SOLANA_WALLET_ADDRESS,
            network: 'solana-devnet',
            purpose: 'agent_unlock',
            agentId: agentId
          }
        })
      }

      // Check message limit
      if (userAgent.messagesUsed >= userAgent.messagesLimit) {
        return res.status(402).json({
          error: 'message_limit_reached',
          payment: {
            amount: agent.pricing.messagePrice,
            currency: 'USDC',
            recipient: process.env.SOLANA_WALLET_ADDRESS,
            network: 'solana-devnet',
            purpose: 'agent_message_extension',
            agentId: agentId,
            messagesAdded: 10
          }
        })
      }

      // Increment message count
      userAgent.messagesUsed += 1
      await userAgent.save()
    }

    // Handle credits mode
    if (paymentMode === 'credits') {
      const user = await User.findById(userId)
      if (user.credits < 1) {
        return res.status(402).json({
          error: 'insufficient_credits',
          message: 'Please top up your credits'
        })
      }
      user.credits -= 1
      await user.save()
    }

    // Add user message to chat
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    })

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Get agent system prompt if applicable
    let systemPrompt = null
    if (agentId) {
      const agent = await Agent.findOne({ agentId })
      systemPrompt = agent.systemPrompt
    }

    // Stream LLM response
    res.write(`data: ${JSON.stringify({ type: 'start', messageId: chatId })}\n\n`)

    let fullResponse = ''
    const stream = await streamLLMResponse(message, chat.messages, systemPrompt)

    for await (const chunk of stream) {
      fullResponse += chunk
      res.write(`data: ${JSON.stringify({ type: 'content', delta: chunk })}\n\n`)
    }

    // Save assistant message
    chat.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date()
    })
    await chat.save()

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: chatId })}\n\n`)
    res.end()

  } catch (error) {
    console.error('Chat error:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
    res.end()
  }
})

// Get chat history
router.get('/chats', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(50)
    res.json(chats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

### 5. Agent Routes (`routes/agents.js`)

```javascript
const express = require('express')
const router = express.Router()
const Agent = require('../models/Agent')
const UserAgent = require('../models/UserAgent')
const Transaction = require('../models/Transaction')
const { authMiddleware } = require('../middleware/auth')
const { validatePayment } = require('../middleware/x402')

// List all agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.find({ status: 'online' })
    res.json(agents)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Unlock agent
router.post('/agents/:agentId/unlock', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params
    const paymentProof = req.headers['x-payment-proof']
    const userId = req.user.id

    const agent = await Agent.findOne({ agentId })
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // Check if already unlocked
    const existing = await UserAgent.findOne({ userId, agentId })
    if (existing) {
      return res.json({ success: true, message: 'Already unlocked' })
    }

    // No payment proof - return 402
    if (!paymentProof) {
      return res.status(402).json({
        error: 'payment_required',
        payment: {
          amount: agent.pricing.unlockPrice,
          currency: 'USDC',
          recipient: process.env.SOLANA_WALLET_ADDRESS,
          network: 'solana-devnet',
          purpose: 'agent_unlock',
          agentId: agentId
        }
      })
    }

    // Validate payment
    const result = await validatePayment(paymentProof, agent.pricing.unlockPrice)
    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid payment', details: result.error })
    }

    // Store transaction
    await Transaction.create({
      userId,
      txSignature: paymentProof,
      amount: agent.pricing.unlockPrice,
      currency: 'USDC',
      purpose: 'agent_unlock',
      metadata: { agentId },
      status: 'confirmed'
    })

    // Unlock agent for user
    await UserAgent.create({
      userId,
      agentId,
      messagesUsed: 0,
      messagesLimit: agent.pricing.messageLimit || 10,
      unlockedAt: new Date()
    })

    res.json({ success: true, agent })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's unlocked agents
router.get('/my-agents', authMiddleware, async (req, res) => {
  try {
    const userAgents = await UserAgent.find({ userId: req.user.id })
    const agentIds = userAgents.map(ua => ua.agentId)
    const agents = await Agent.find({ agentId: { $in: agentIds } })
    
    // Merge with usage data
    const result = agents.map(agent => {
      const usage = userAgents.find(ua => ua.agentId === agent.agentId)
      return {
        ...agent.toObject(),
        messagesUsed: usage.messagesUsed,
        messagesLimit: usage.messagesLimit
      }
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

### 6. LLM Service (`services/llm.js`)

```javascript
const OpenAI = require('openai')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function* streamLLMResponse(message, history = [], systemPrompt = null) {
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    stream: true,
    temperature: 0.7,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}

module.exports = { streamLLMResponse }
```

### 7. Main Server (`server.js`)

```javascript
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
require('dotenv').config()

const app = express()

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

// Routes
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/agents'))
app.use('/api', require('./routes/chat'))
app.use('/api', require('./routes/transactions'))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

---

## Frontend Integration

Update `src/api/chat.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export async function sendChatMessage({ message, chatId, agentId, paymentMode, paymentProof = null }) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Payment-Mode': paymentMode,
    'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
  }

  if (paymentProof) {
    headers['X-Payment-Proof'] = paymentProof
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, chatId, agentId, purpose: 'message_request' })
  })

  // Handle 402 Payment Required
  if (response.status === 402) {
    const data = await response.json()
    return { requiresPayment: true, payment: data.payment }
  }

  if (!response.ok) {
    throw new Error('Failed to send message')
  }

  return { requiresPayment: false, stream: response.body }
}
```

---

## Seeding Agents

Create `scripts/seedAgents.js`:

```javascript
const mongoose = require('mongoose')
const Agent = require('../models/Agent')
require('dotenv').config()

const agents = [
  {
    agentId: 'brand-researcher',
    name: 'Brand Researcher',
    provider: 'Specialized Agent',
    description: 'Conducts comprehensive brand analysis and market research',
    systemPrompt: 'You are a professional brand researcher with expertise in market analysis, competitor research, and brand positioning. Provide detailed, actionable insights with data-driven recommendations.',
    pricing: {
      type: 'unlock',
      unlockPrice: 5,
      messageLimit: 10
    },
    tags: ['Marketing', 'Research', 'Strategy']
  },
  // Add more agents...
]

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  await Agent.deleteMany({})
  await Agent.insertMany(agents)
  console.log('Agents seeded!')
  process.exit(0)
}

seed()
```

Run: `node scripts/seedAgents.js`

---

## Testing the Flow

1. **Start backend:** `npm run dev`
2. **Frontend makes request without payment**
3. **Backend returns 402 with payment details**
4. **Frontend shows payment modal (mock for now)**
5. **User "pays" → gets tx signature**
6. **Frontend retries with `X-Payment-Proof: tx_signature`**
7. **Backend validates & streams response**

---

## Key Differences from Wallet Approach

❌ **NOT doing this:**
- Frontend wallet connection
- Frontend transaction signing
- Frontend payment submission

✅ **x402 Approach:**
- Frontend receives 402 → shows payment info
- User pays externally (via their wallet app)
- User pastes tx signature back into frontend
- Backend validates the transaction

This keeps the frontend simple and secure!
