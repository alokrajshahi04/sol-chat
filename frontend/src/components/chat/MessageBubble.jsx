import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex items-start pt-1">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-text-on-primary shadow-secondary">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          </div>
        </div>
      )}

      <div className={cn('max-w-[85%] md:max-w-[75%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-text-primary">{message.name}</span>
          <span>{message.time}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm border border-border',
            isUser ? 'bg-foreground text-background rounded-tr-sm' : 'bg-surface text-text-primary rounded-tl-sm',
          )}
        >
          <p className="whitespace-pre-wrap mb-1">{message.text}</p>
          {message.code ? (
            <pre className="prose-pre text-sm font-mono text-indigo-600 whitespace-pre overflow-x-auto">
              {message.code}
            </pre>
          ) : null}
          {message.typing ? (
            <div className="flex items-center gap-1 mt-2">
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.15s]"></span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.3s]"></span>
            </div>
          ) : null}
        </div>
      </div>

      {isUser && <Avatar src={message.avatar} alt={message.name} size="sm" className="mt-1" />}
    </div>
  )
}
