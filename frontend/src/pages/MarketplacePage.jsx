import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sparkles, Search, Lock } from 'lucide-react'
import { agents } from '@/data/mock'
import { PaymentModal } from '@/components/PaymentModal'

export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [paymentRequest, setPaymentRequest] = useState(null)
  const [unlockedAgents, setUnlockedAgents] = useState(() => {
    const stored = localStorage.getItem('sol-chat-unlocked-agents')
    return stored ? JSON.parse(stored) : []
  })
  const navigate = useNavigate()
  const { createNewChat } = useChat()

  const filteredAgents = agents.map((agent) => ({
    ...agent,
    unlocked: unlockedAgents.includes(agent.id),
  })).filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.description.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelectAgent = (agent) => {
    if (agent.unlocked) {
      navigate(`/chat?agent=${agent.id}`)
    } else {
      setPaymentRequest({
        amount: agent.pricing.amount,
        currency: agent.pricing.currency,
        recipient: 'SoLxxx...MockRecipient123',
        purpose: `Unlock ${agent.name} Agent`,
        agentId: agent.id,
      })
    }
  }

  const handlePaymentComplete = () => {
    const agentId = paymentRequest.agentId
    const updated = [...unlockedAgents, agentId]
    setUnlockedAgents(updated)
    localStorage.setItem('sol-chat-unlocked-agents', JSON.stringify(updated))
    
    // Find the agent and create a chat with it
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      createNewChat(agent)
    }
    
    setPaymentRequest(null)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-foreground text-secondary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold font-display">Agent Marketplace</h1>
          </div>
          <Button onClick={() => navigate('/chat')}>Go to Chat</Button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">
            Specialized AI Agents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock expert agents tailored for specific tasks. Pay once with Solana x402 and chat unlimited.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.provider}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      agent.status === 'online'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }
                  >
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {agent.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {agent.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {agent.pricing.type === 'unlock' ? 'One-time Unlock' : 
                       agent.pricing.type === 'session' ? 'Per Session' : 'Per Task'}
                    </span>
                    <span className="font-bold">
                      ${agent.pricing.amount} {agent.pricing.currency}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-green-500"></span>
                    {agent.pricing.includes}
                  </div>
                </div>
                <Button
                  onClick={() => handleSelectAgent(agent)}
                  disabled={agent.status === 'offline'}
                  variant={agent.unlocked ? 'default' : 'outline'}
                  className="w-full"
                >
                  {agent.unlocked ? (
                    'Start Chat'
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Unlock Agent
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={!!paymentRequest}
        onClose={() => setPaymentRequest(null)}
        paymentRequest={paymentRequest}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  )
}
