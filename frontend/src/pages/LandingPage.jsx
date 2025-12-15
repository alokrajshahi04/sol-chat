import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sparkles, Coins, History, Smartphone, Shield, Zap, User } from 'lucide-react'
import logo from '@/assets/logosol.png'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <img src={logo} alt="Sol-Chat Logo" className="w-24 h-24 mb-8 rounded-2xl shadow-xl object-contain" />
        <p className="text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
          A modern chat application exploring how AI, payments, and blockchain work together.
          Experience transparent, metered AI usage with Solana-based payments.
        </p>

        <div className="flex gap-4 mb-12">
          <Button size="lg" onClick={() => navigate('/login')} className="px-8">
            Get Started
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/chat')} className="px-8">
            Try as Guest
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mb-16">
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Sparkles className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">AI-Powered Chat</h3>
            <p className="text-sm text-muted-foreground">
              Multi-model AI conversations with metered usage via x402.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Coins className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Solana Payments</h3>
            <p className="text-sm text-muted-foreground">
              Pay for AI usage with SOL, transparent and decentralized.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Sparkles className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Real-time Chat</h3>
            <p className="text-sm text-muted-foreground">
              Fast, responsive chat experience with session management.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <User className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Guest Mode</h3>
            <p className="text-sm text-muted-foreground">
              Try the product without signing up to reduce onboarding friction.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <History className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Transaction History</h3>
            <p className="text-sm text-muted-foreground">
              View all Solana-based payments and credit usage.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Smartphone className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Responsive UI</h3>
            <p className="text-sm text-muted-foreground">
              Built with React and Tailwind for smooth experience across devices.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Shield className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Decentralized Auth</h3>
            <p className="text-sm text-muted-foreground">
              Login using Solana wallets or OAuth providers.
            </p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-xl border border-border">
            <Sparkles className="h-8 w-8 mb-4 text-primary" />
            <h3 className="text-lg font-bold mb-2">Metered AI (x402)</h3>
            <p className="text-sm text-muted-foreground">
              AI usage is tracked and backed by Solana-based credits.
            </p>
          </div>
        </div>

        {/* AI & x402 Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">AI & x402 Integration</h2>
          <p className="text-lg text-muted-foreground mb-4">
            Sol-chat uses x402 to power paid, session-based AI chat. Instead of unlimited AI access,
            the application treats AI as a metered resource where users pay for what they use.
          </p>
          <div className="bg-secondary/20 p-6 rounded-xl border border-border">
            <h3 className="text-xl font-bold mb-3">Why x402?</h3>
            <p className="text-muted-foreground">
              x402 fits naturally into this design because it supports controlled AI execution,
              session-based inference workflows, and clear separation between AI logic and payment logic.
            </p>
          </div>
        </div>

        {/* Why Solana Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">Why Solana?</h2>
          <p className="text-lg text-muted-foreground mb-4">
            Solana is used because it actually fits the product requirements with fast & low-cost payments,
            wallet-based authentication, and on-chain value tracking.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-secondary/20 p-6 rounded-xl border border-border">
              <Zap className="h-8 w-8 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-3">Fast Payments</h3>
              <p className="text-muted-foreground">
                Near-instant transactions make micro top-ups practical.
              </p>
            </div>
            <div className="bg-secondary/20 p-6 rounded-xl border border-border">
              <Shield className="h-8 w-8 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-3">Wallet Auth</h3>
              <p className="text-muted-foreground">
                Users can authenticate without centralized identity systems.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">Tech Stack</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-secondary/20 p-6 rounded-xl border border-border">
              <h3 className="text-xl font-bold mb-3">Backend</h3>
              <p className="text-muted-foreground">
                Node.js + Express, MongoDB, Passport.js, Solana Web3.js, x402 API
              </p>
            </div>
            <div className="bg-secondary/20 p-6 rounded-xl border border-border">
              <h3 className="text-xl font-bold mb-3">Frontend</h3>
              <p className="text-muted-foreground">
                React (Vite), Tailwind CSS, shadcn/ui, Axios
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-muted-foreground">
        © 2025 Sol Chat Inc.
        Made with ❤️ to explore AI, payments, and blockchain by Alok and Krishna      </div>
    </div>
  )
}