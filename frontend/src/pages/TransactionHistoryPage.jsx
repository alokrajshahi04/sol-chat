import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, ExternalLink, Coins, Zap, Calendar, DollarSign } from 'lucide-react'
import { listTransactions, getTransactionSummary } from '@/api/pay'
import { useChat } from '@/hooks/useChat'

export function TransactionHistoryPage() {
  const navigate = useNavigate()
  const { session, sessions, loadSession, startNewSession } = useChat()
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    listTransactions()
      .then((data) => setTransactions(data.transactions || []))
      .catch(() => setTransactions([]))
    getTransactionSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const explorerUrl = (tx) => tx?.solana?.explorerUrl

  return (
    <div className="bg-background text-foreground font-display h-screen w-full flex overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeSessionId={session?.chatSessionId}
        onNewSession={() => {
          startNewSession()
          navigate('/chat')
        }}
        onSelectSession={(id) => {
          loadSession(id)
          navigate('/chat')
        }}
      />
      <main className="flex-1 flex flex-col h-full">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Transaction History</h1>
              <p className="text-xs text-muted-foreground">Credits and usage</p>
            </div>
          </div>
          {summary ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                Credits: {summary.netCredits}
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                Purchases: {summary.purchases.totalCredits} • Used: {summary.usage.totalCreditsUsed}
              </Badge>
            </div>
          ) : null}
        </header>

        <ScrollArea className="flex-1 px-4 md:px-6 py-6">
          <div className="max-w-5xl mx-auto">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-sm text-muted-foreground">Your payment history will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <Card key={tx.id} className="p-4 border border-border hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700 border border-amber-200">
                          {tx.type === 'credit_purchase' ? <Coins className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1">
                            {tx.type === 'credit_purchase' ? 'Credit Purchase' : 'Usage'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(tx.createdAt)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {tx.creditsAmount}
                            </span>
                          </div>
                          {tx.usage ? (
                            <button
                              onClick={() => {
                                loadSession(tx.usage.chatSessionId)
                                navigate('/chat')
                              }}
                              className="text-xs text-primary hover:underline mt-1 text-left"
                            >
                              Chat: {tx.usage.chatSessionTitle} ({tx.usage.models.join(', ')})
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {tx.status}
                        </Badge>
                        {explorerUrl(tx) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => window.open(explorerUrl(tx), '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
