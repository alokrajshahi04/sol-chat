import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MessageList } from '@/components/chat/MessageList'
import { Composer } from '@/components/chat/Composer'
import { TopUpModal } from '@/components/TopUpModal'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { getBalance } from '@/api/pay'

export function ChatPage() {
  const {
    session,
    sessions,
    fetchSessions,
    startNewSession,
    loadSession,
    turns,
    sendMessage,
    selectedModels,
    setSelectedModels,
    isStreaming,
    availableModels,
    retryPendingQuery,
    pendingQuery,
  } = useChat()
  const { wallet } = useAuth()
  const [balance, setBalance] = useState(null)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [paymentHint, setPaymentHint] = useState(null)
  const [prevStreaming, setPrevStreaming] = useState(false)

  const refreshBalance = useCallback(async () => {
    try {
      const res = await getBalance()
      setBalance(res.balance ?? 0)
    } catch {
      setBalance(null)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wallet) {
      refreshBalance()
    }
  }, [wallet, refreshBalance])

  // Refresh balance when streaming ends
  useEffect(() => {
    if (prevStreaming && !isStreaming && wallet) {
      refreshBalance()
    }
    setPrevStreaming(isStreaming)
  }, [isStreaming, prevStreaming, wallet, refreshBalance])

  const handleSendMessage = async (text) => {
    const result = await sendMessage(text)
    if (result?.paymentRequired) {
      setPaymentHint(result.data)
      setTopUpOpen(true)
    }
  }

  const handleModelChange = (models) => {
    setSelectedModels(models)
  }

  const handlePaymentComplete = async () => {
    setTopUpOpen(false)
    await refreshBalance()
    if (pendingQuery) {
      await retryPendingQuery()
    }
  }

  return (
    <div className="bg-background text-foreground font-display h-screen w-full flex overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeSessionId={session?.chatSessionId}
        onNewSession={startNewSession}
        onSelectSession={loadSession}
      />
      <main className="flex-1 flex flex-col h-full">
        <AppHeader
          balance={balance}
          onRefreshBalance={refreshBalance}
          onTopUp={() => setTopUpOpen(true)}
          selectedModels={selectedModels}
          onChangeModels={handleModelChange}
          availableModels={availableModels}
          modelsDisabled={!!session?.chatSessionId}
        />
        <MessageList turns={turns} models={selectedModels} isStreaming={isStreaming} />
        <Composer onSendMessage={handleSendMessage} isStreaming={isStreaming} selectedModels={selectedModels} />
      </main>

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onTopUpComplete={handlePaymentComplete}
        paymentHint={paymentHint}
      />
    </div>
  )
}