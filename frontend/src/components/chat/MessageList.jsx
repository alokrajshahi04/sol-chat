import { ScrollArea } from '@/components/ui/scroll-area'
import { messages } from '@/data/mock'
import { MessageBubble } from './MessageBubble'

export function MessageList() {
  return (
    <ScrollArea className="flex-1 w-full">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-12 px-3 md:px-0">
        <div className="flex justify-center pt-4">
          <span className="text-xs font-medium text-muted-foreground bg-surface px-3 py-1 rounded-full border border-border">
            Today, 10:23 AM
          </span>
        </div>
        <div className="flex flex-col gap-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
