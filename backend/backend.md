# Sol-Chat Backend

Pay-per-request multi-LLM application with Solana x402 payments.

## Features

- **Multi-LLM Chat**: Query multiple AI models (OpenAI GPT, Google Gemini) in parallel
- **Solana Payments**: Pay-per-query using SPL tokens via x402 protocol
- **OAuth Authentication**: Google login support
- **Resilient Streaming**: LLM streams continue even if client disconnects, with interval-based DB saves
- **Transaction History**: Full history of credit purchases and usage

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register with email/password |
| POST | `/login` | Login with email/password |
| POST | `/logout` | End session |
| GET | `/me` | Get current user info |
| POST | `/wallet/connect` | Connect Solana wallet |
| POST | `/wallet/disconnect` | Disconnect wallet |
| GET | `/google` | Initiate Google OAuth |
| GET | `/google/callback` | Google OAuth callback |

### Chat (`/api/chat`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create new chat session |
| GET | `/sessions` | List user's chat sessions |
| POST | `/session/:id` | Submit query (returns 402 if insufficient credits) |
| GET | `/session/:id` | Get chat history |
| DELETE | `/session/:id` | Delete chat session |
| GET | `/sse/:queryId` | Stream responses via SSE |

### Payments (`/api/pay`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance` | Get credit balance |
| POST | `/purchase` | Initiate credit purchase |
| POST | `/verify/:reference` | Verify payment and mint credits |
| GET | `/verify/:reference` | Check payment status |
| GET | `/pricing` | Get credit pricing info |

### Transactions (`/api/transactions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List transactions (paginated) |
| GET | `/summary` | Get transaction statistics |
| GET | `/:id` | Get transaction details |

## x402 Payment Flow

1. User submits query to `/api/chat/session/:id`
2. If insufficient credits, server returns `402 Payment Required` with:
   - Payment reference
   - Treasury wallet address
   - Amount in lamports
   - Expiry time
3. User sends SOL payment on Solana
4. User calls `/api/pay/verify/:reference` with transaction signature
5. Server verifies payment and mints credits to user's wallet
6. User retries original query

## Architecture

```
├── config/           # Configuration files
│   ├── constants.js  # App constants
│   └── env.js        # Environment validation
├── lib/              # Core utilities
│   ├── passport.js   # OAuth strategies
│   ├── solana.js     # Solana/SPL token service
│   ├── streamManager.js    # In-memory stream management
│   ├── streamFromModel.js  # LLM streaming
│   ├── titleFromModel.js   # Title generation
│   └── x402.js       # x402 payment facilitator
├── middlewares/      # Express middlewares
│   ├── authMiddlewares.js
│   ├── chatMiddlewares.js
│   ├── inputValidationMiddlewares.js
│   └── paymentMiddlewares.js
├── models/           # MongoDB schemas
│   ├── ChatMessage.js
│   ├── ChatSession.js
│   ├── Guest.js
│   ├── Transaction.js
│   └── User.js
├── routes/           # API routes
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   ├── payRoutes.js
│   └── transactionRoutes.js
└── index.js          # Application entry point
```

## Stream Management

The application uses an in-memory stream manager for resilient LLM streaming:

- **Background Processing**: Streams continue even if client disconnects
- **Interval Saves**: Partial responses saved to MongoDB every 3 seconds
- **Event-Based SSE**: Real-time updates via EventEmitter
- **Auto Cleanup**: Stale streams cleaned up after 5 minutes

```
┌─────────────────────────────────────────────────────────────────┐
│                    Stream Flow                                   │
└─────────────────────────────────────────────────────────────────┘

User submits query
        │
        ▼
┌───────────────────┐
│  Create Query     │
│  Message in DB    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     Token    ┌─────────────────┐
│  Stream Manager   │ ───────────► │  SSE to Client  │
│  (in-memory)      │              │  (if connected) │
└─────────┬─────────┘              └─────────────────┘
          │
          │ Every 3 seconds
          ▼
┌───────────────────┐
│  Save to MongoDB  │
│  (partial content)│
└─────────┬─────────┘
          │
          │ On completion
          ▼
┌───────────────────┐
│  Final DB save    │
│  + Deduct credits │
└───────────────────┘
```

## Solana Setup

### Creating a Credits Token

1. Install Solana CLI and create a wallet
2. Create SPL token:
```bash
spl-token create-token --decimals 0
# Note the mint address
```

3. Create token account for your backend wallet:
```bash
spl-token create-account <MINT_ADDRESS>
```

4. Grant mint authority to backend wallet

### Setting Up Backend Wallet

```bash
# Generate new keypair
solana-keygen new --outfile backend-wallet.json

# Convert to base58 for .env
node -e "console.log(require('bs58').encode(Buffer.from(JSON.parse(require('fs').readFileSync('backend-wallet.json', 'utf8')))))"
```

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `SESSION_SECRET` - Session encryption key
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `CREDITS_TOKEN_MINT` - SPL token mint address
- `BACKEND_WALLET_PRIVATE_KEY` - Backend wallet (base58)
- `TREASURY_WALLET` - Treasury wallet public key

Optional:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `SOLANA_NETWORK` - Network name (devnet/mainnet-beta)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FRONTEND_URL` - Frontend URL for CORS

## Development

```bash
# Install dependencies
npm install

# Start with hot reload
npm run dev

# Start production
npm start
```
