import { Sidebar } from '@/components/layout/Sidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MessageList } from '@/components/chat/MessageList'
import { Composer } from '@/components/chat/Composer'
import { useChat } from '@/hooks/useChat'

export function ChatPage() {
  const { activeChat, addMessage } = useChat()

  const handleSendMessage = (text) => {
    if (activeChat) {
      addMessage(activeChat, { role: 'user', text })
      // Simulate AI response
      setTimeout(() => {
        addMessage(activeChat, { role: 'assistant', text: `Echo: ${text}` })
      }, 1000)
    }
  }

  return (
    <div className="bg-background text-foreground font-display h-screen w-full flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full">
        <AppHeader />
        <MessageList />
        <Composer onSendMessage={handleSendMessage} />
      </main>
    </div>
  )
}