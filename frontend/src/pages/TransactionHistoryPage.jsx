import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, ExternalLink, Coins, Unlock, Zap, Calendar, DollarSign } from 'lucide-react'

export function TransactionHistoryPage() {
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem('sol-chat-receipts')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Sort by timestamp descending (newest first)
      const sorted = parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setReceipts(sorted)
    }
  }, [])

  const getPurposeIcon = (purpose) => {
    if (purpose.includes('unlock')) return <Unlock className="h-4 w-4" />
    if (purpose.includes('credit')) return <Coins className="h-4 w-4" />
    if (purpose.includes('request')) return <Zap className="h-4 w-4" />
    return <DollarSign className="h-4 w-4" />
  }

  const getPurposeColor = (purpose) => {
    if (purpose.includes('unlock')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (purpose.includes('credit')) return 'bg-amber-100 text-amber-700 border-amber-200'
    if (purpose.includes('request')) return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    })
  }

  const getExplorerUrl = (txSignature) => {
    return `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
  }

  const getTotalSpent = () => {
    return receipts.reduce((sum, receipt) => sum + receipt.amount, 0).toFixed(2)
  }

  return (
    <div className="bg-background text-foreground font-display h-screen w-full flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full">
        {/* Header */}
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
              <p className="text-xs text-muted-foreground">All your x402 payments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold">
              Total: ${getTotalSpent()} USDC
            </Badge>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="px-4 md:px-6 pt-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border border-border bg-gradient-to-br from-purple-50 to-background">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent Unlocks</p>
                  <p className="text-2xl font-bold">
                    {receipts.filter(r => r.purpose.includes('unlock')).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border bg-gradient-to-br from-amber-50 to-background">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Credit Purchases</p>
                  <p className="text-2xl font-bold">
                    {receipts.filter(r => r.purpose.includes('credit')).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border bg-gradient-to-br from-blue-50 to-background">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pay-per-request</p>
                  <p className="text-2xl font-bold">
                    {receipts.filter(r => r.purpose.includes('request')).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Transactions List */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-6">
          <div className="max-w-5xl mx-auto">
            {receipts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map((receipt, index) => (
                  <Card 
                    key={index}
                    className="p-4 border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getPurposeColor(receipt.purpose)}`}>
                          {getPurposeIcon(receipt.purpose)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1">
                            {receipt.purpose.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(receipt.timestamp)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {receipt.amount} {receipt.currency}
                            </span>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">Recipient:</span>{' '}
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {receipt.recipient.slice(0, 8)}...{receipt.recipient.slice(-8)}
                            </code>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`text-xs ${getPurposeColor(receipt.purpose)}`}>
                          Success
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => window.open(getExplorerUrl(receipt.txSignature), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>TX Signature:</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded flex-1 truncate">
                          {receipt.txSignature}
                        </code>
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
