import { Sidebar } from '@/components/layout/Sidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MessageList } from '@/components/chat/MessageList'
import { Composer } from '@/components/chat/Composer'

export function ChatPage() {
  return (
    <div className="bg-background text-foreground font-display h-screen w-full flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full">
        <AppHeader />
        <MessageList />
        <Composer />
      </main>
    </div>
  )
}
