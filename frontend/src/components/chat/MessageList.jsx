import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export function MessageList({ turns = [], models = [], isStreaming }) {
  if (!turns.length) {
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
            Pick one or more models and send a prompt to compare responses side by side.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="max-w-full mx-auto w-full flex flex-col gap-6 pb-12 px-3 md:px-6">
        {turns.map((turn) => {
          const responseModels = models.length ? models : Object.keys(turn.responses || {})
          return (
            <div key={turn.id} className="flex flex-col gap-3 border-b border-border pb-6">
              <div className="self-end max-w-3xl bg-foreground text-background rounded-2xl px-5 py-3.5 text-[15px] shadow-sm">
                {turn.query}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {responseModels.map((model) => {
                  const resp = turn.responses?.[model] || { text: '', status: 'pending' }
                  const isPending = resp.status === 'pending' || resp.status === 'streaming'
                  const modelCount = responseModels.length
                  const widthClass = modelCount === 1 ? 'w-full' : modelCount === 2 ? 'w-1/2 min-w-[320px]' : 'w-1/2 min-w-[300px] flex-shrink-0'
                  return (
                    <div
                      key={model}
                      className={cn(
                        'border border-border rounded-xl p-4 bg-surface min-h-[200px] flex flex-col gap-2',
                        widthClass
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold">{model}</span>
                        <span
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full',
                            resp.status === 'done'
                              ? 'bg-green-100 text-green-700'
                              : resp.status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {resp.status === 'done' ? 'Complete' : resp.status === 'error' ? 'Error' : 'Streaming'}
                        </span>
                      </div>
                      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none flex-1 overflow-auto">
                        {resp.text ? (
                          <ReactMarkdown>{resp.text}</ReactMarkdown>
                        ) : (
                          <span className="text-muted-foreground">
                            {isPending && isStreaming ? 'Waiting for tokens...' : 'No output yet'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
