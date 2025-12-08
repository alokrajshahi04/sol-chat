# Sol-Chat Frontend Structure

Clean, organized React application with Vite + Tailwind + shadcn/ui

## 📁 Project Structure

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── api/                # Backend API integration (NEW ✨)
│   │   ├── config.js       # API base URL, auth headers
│   │   ├── auth.js         # Login, register, logout
│   │   ├── chat.js         # Send messages, stream responses
│   │   └── agents.js       # List/unlock agents
│   │
│   ├── components/         # React components
│   │   ├── ui/            # shadcn components (button, card, etc)
│   │   ├── chat/          # Chat-specific components
│   │   │   ├── Composer.jsx       # Message input
│   │   │   ├── MessageList.jsx    # Chat messages
│   │   │   └── MessageBubble.jsx  # Individual message
│   │   ├── layout/        # Layout components
│   │   │   ├── Sidebar.jsx       # Navigation + chat list
│   │   │   ├── AppHeader.jsx     # Top bar with credits/payment toggle
│   │   │   └── ModelSelector.jsx # Model dropdown
│   │   ├── PaymentModal.jsx     # x402 payment modal
│   │   ├── TopUpModal.jsx       # Credits purchase modal
│   │   └── ProtectedRoute.jsx   # Auth guard
│   │
│   ├── contexts/          # React Context providers
│   │   ├── AuthContext.jsx      # Authentication state
│   │   └── ChatContext.jsx      # Chat state management
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.js           # Access auth context
│   │   └── useChat.js           # Access chat context
│   │
│   ├── pages/             # Route pages
│   │   ├── LoginPage.jsx        # Login/signup
│   │   ├── MarketplacePage.jsx  # Browse agents
│   │   ├── ChatPage.jsx         # Main chat interface
│   │   └── TransactionHistoryPage.jsx  # Payment receipts
│   │
│   ├── data/              # Mock data & constants
│   │   └── mock.js             # Agents, models, payment modes
│   │
│   ├── lib/               # Utilities
│   │   └── utils.js           # Helper functions (cn, etc)
│   │
│   ├── assets/            # Images, fonts
│   ├── App.jsx           # Main app with routes
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles + Tailwind
│
├── BACKEND_MONGODB_GUIDE.md  # Backend integration guide
├── BACKEND_INTEGRATION_GUIDE.md  # API specs
├── components.json       # shadcn config
├── tailwind.config.js    # Tailwind config
├── vite.config.js        # Vite config
└── package.json
```

## 🎯 Key Design Decisions

### API Layer (`src/api/`)
**NEW:** Centralized API calls instead of scattered fetch calls
- `config.js` - Single source for API URL and auth headers
- `auth.js` - All authentication endpoints
- `chat.js` - Chat operations + SSE streaming
- `agents.js` - Agent marketplace operations

**Benefits:**
- Easy to switch from mock to real backend
- Consistent error handling
- Type-safe (can add TypeScript later)
- Easy to test

### State Management
- **AuthContext** - User session, login/logout
- **ChatContext** - Chat threads, messages, payment mode
- **localStorage** - Persistence for offline use

### Payment Flow (x402)
1. User action requires payment
2. Backend returns 402 with payment details
3. PaymentModal/TopUpModal shows payment info
4. User pays (mock for now)
5. Frontend retries with transaction signature
6. Backend validates and proceeds

### Component Organization
- `ui/` - Pure shadcn components (no business logic)
- `layout/` - App structure components
- `chat/` - Chat-specific features
- `pages/` - Top-level route components

## 🔌 Connecting to Real Backend

### 1. Update Environment Variables

Create `.env`:
```bash
VITE_API_URL=http://localhost:3000/api
```

### 2. Backend Running Checklist
- [ ] MongoDB connected
- [ ] Agents seeded (`node scripts/seedAgents.js`)
- [ ] Server running (`npm run dev`)
- [ ] CORS configured for frontend URL

### 3. Replace Mock Data

**Current:** Using `src/data/mock.js`
**Production:** API calls in `src/api/` folder

No code changes needed! Just:
1. Start backend server
2. Set `VITE_API_URL` in `.env`
3. API calls automatically work

### 4. Test Real Payments

For x402 integration:
1. User triggers payment
2. Frontend shows modal with payment details
3. User copies Solana tx signature
4. Frontend includes it in `X-Payment-Proof` header
5. Backend validates transaction

## 🚀 Development Workflow

### Starting Development
```bash
npm run dev  # Start Vite dev server (port 5174)
```

### Adding New Features

**New API endpoint:**
1. Add function to appropriate `src/api/*.js` file
2. Use in components via import

**New page:**
1. Create in `src/pages/`
2. Add route in `App.jsx`
3. Add navigation link in `Sidebar.jsx`

**New component:**
1. Create in appropriate folder
2. Follow existing patterns (props, hooks)

### Code Style
- Components use PascalCase: `ChatPage.jsx`
- Hooks use camelCase: `useAuth.js`
- Constants use UPPER_SNAKE_CASE
- CSS classes use Tailwind utilities

## 📦 Key Dependencies

- **React 19.2.0** - UI library
- **Vite 7.2.7** - Build tool
- **Tailwind CSS 3.4.14** - Styling
- **shadcn/ui** - Component library
- **React Router** - Navigation
- **Lucide Icons** - Icon set

## 🎨 Design System

**Colors:**
- Primary: Pink (#F7C6D2)
- Secondary: Green (#CFF6E1)
- Defined in `tailwind.config.js`

**Fonts:**
- Display: Space Grotesk
- Body: Noto Sans

**Components:**
- Installed via `npx shadcn@latest add [component]`
- Located in `src/components/ui/`

## 🔒 Security Notes

- Auth tokens in localStorage (consider httpOnly cookies for production)
- No sensitive data in frontend code
- Backend validates all payments
- Frontend only shows UI - backend enforces rules

## 📝 TODOs

- [ ] Replace mock auth with real JWT
- [ ] Add real Solana payment integration
- [ ] Implement SSE streaming from backend
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Mobile responsive improvements
- [ ] Add tests

## 🤝 Backend Communication

Frontend expects these endpoints:

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents/:id/unlock` - Unlock agent (x402)
- `GET /api/my-agents` - Get unlocked agents

### Chat
- `POST /api/chat` - Send message (x402, SSE response)
- `GET /api/chats` - Get chat history

### Transactions
- `GET /api/transactions` - Get payment history

See `BACKEND_MONGODB_GUIDE.md` for implementation details.

## 📖 Further Reading

- [Backend Integration Guide](./BACKEND_INTEGRATION_GUIDE.md)
- [MongoDB Backend Guide](./BACKEND_MONGODB_GUIDE.md)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
