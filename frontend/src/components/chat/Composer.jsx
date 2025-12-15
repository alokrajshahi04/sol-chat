import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send } from 'lucide-react'

export function Composer({ onSendMessage, isStreaming }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await onSendMessage?.(input.trim())
      setInput('')
    } catch (err) {
      setError(err.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-border bg-background px-3 md:px-6 py-4">
      <div className="max-w-3xl mx-auto w-full">
        <div className="rounded-2xl border border-border bg-surface shadow-xl p-3 focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type your message..."
            className="bg-transparent text-[16px] min-h-[56px] max-h-[200px]"
            disabled={sending || isStreaming}
          />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Button variant="secondary" size="sm" className="h-8 px-3 gap-2">
                <Sparkles className="h-4 w-4" />
                Multi-model
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                className="h-10 w-10 shadow-primary"
                onClick={handleSubmit}
                disabled={!input.trim() || sending}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          LLMs can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
