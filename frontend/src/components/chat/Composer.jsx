import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Paperclip, Globe2, Mic } from 'lucide-react'
import { models } from '@/data/mock'

export function Composer() {
  return (
    <div className="border-t border-border bg-background px-3 md:px-6 py-4">
      <div className="max-w-3xl mx-auto w-full">
        <div className="rounded-2xl border border-border bg-surface shadow-xl p-3 focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
          <Textarea
            rows={2}
            placeholder="Message GPT-4..."
            className="bg-transparent text-[16px] min-h-[56px] max-h-[200px]"
          />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Button variant="secondary" size="sm" className="h-8 px-3 gap-2">
                <Sparkles className="h-4 w-4" />
                {models[0].label}
              </Button>
              <IconButton title="Attach file">
                <Paperclip className="h-5 w-5" />
              </IconButton>
              <IconButton title="Search Web">
                <Globe2 className="h-5 w-5" />
              </IconButton>
              <IconButton title="Voice Input">
                <Mic className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="hidden sm:inline text-xs">Shift + Enter for newline</span>
              <Button size="icon" className="h-10 w-10 shadow-primary">
                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
              </Button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          LLMs can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}

function IconButton({ children, title }) {
  return (
    <button
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}
