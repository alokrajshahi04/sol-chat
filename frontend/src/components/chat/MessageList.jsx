import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { Sparkles } from 'lucide-react'

export function MessageList() {
  const { getCurrentChat } = useChat()
  const currentChat = getCurrentChat()

  if (!currentChat || currentChat.messages.length === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center px-4">
        <div className="max-w-2xl text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Start a new conversation</h2>
          <p className="text-muted-foreground">
            Choose a payment mode and send your first message to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-12 px-3 md:px-0">
        <div className="flex justify-center pt-4">
          <span className="text-xs font-medium text-muted-foreground bg-surface px-3 py-1 rounded-full border border-border">
            {new Date(currentChat.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </span>
        </div>
        <div className="flex flex-col gap-5">
          {currentChat.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
