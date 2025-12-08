import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { models, paymentModes } from '@/data/mock'
import { ModelSelector } from './ModelSelector'
import { TopUpModal } from '../TopUpModal'
import { useChat } from '@/hooks/useChat'
import { Coins, Zap, History } from 'lucide-react'

export function AppHeader() {
  const navigate = useNavigate()
  const { paymentMode, updatePaymentMode, getCurrentChat } = useChat()
  const [credits, setCredits] = useState(() => {
    const stored = localStorage.getItem('sol-chat-credits')
    return stored ? parseInt(stored) : 0
  })
  const [showTopUp, setShowTopUp] = useState(false)
  
  const currentChat = getCurrentChat()
  const chatAgent = currentChat?.agent

  // Listen for credits changes
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem('sol-chat-credits')
      const newCredits = stored ? parseInt(stored) : 0
      if (newCredits !== credits) {
        setCredits(newCredits)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [credits])

  const handleTopUp = (amount) => {
    const newBalance = credits + amount
    setCredits(newBalance)
    localStorage.setItem('sol-chat-credits', newBalance.toString())
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 text-muted-foreground hover:text-foreground">
          <span className="material-symbols-outlined">menu</span>
        </button>
        {chatAgent ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{chatAgent.name.charAt(0)}</span>
            </div>
            <div>
              <div className="text-sm font-semibold">{chatAgent.name}</div>
              <div className="text-xs text-muted-foreground">{chatAgent.provider}</div>
            </div>
          </div>
        ) : (
          <ModelSelector options={models} />
        )}
        <Badge className="uppercase text-[10px] tracking-wide px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
          Online
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        {/* Credits Display */}
        <button
          onClick={() => setShowTopUp(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-surface transition-colors"
        >
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold">{credits}</span>
          <span className="text-xs text-muted-foreground">credits</span>
        </button>

        {/* Payment Mode Toggle */}
        <div className="hidden md:flex items-center gap-1 px-1 py-1 rounded-lg bg-muted">
          {paymentModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => updatePaymentMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                paymentMode === mode.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode.id === 'pay-per-request' ? (
                <Zap className="h-3 w-3" />
              ) : (
                <Coins className="h-3 w-3" />
              )}
              {mode.label}
              {mode.price && (
                <span className="text-[10px] opacity-70">${mode.price}</span>
              )}
            </button>
          ))}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9" 
          title="Transaction History"
          onClick={() => navigate('/history')}
        >
          <History className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-4">
          <span className="material-symbols-outlined text-[18px]">ios_share</span>
          Share
        </Button>
      </div>

      {/* Top Up Modal */}
      <TopUpModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        onTopUpComplete={handleTopUp}
      />
    </header>
  )
}
