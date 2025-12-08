import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModelSelector({ options }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(options[0])

  const toggle = () => setOpen((o) => !o)
  const handleSelect = (option) => {
    setSelected(option)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface cursor-pointer transition-colors border border-transparent"
      >
        <span className="text-lg font-bold tracking-tight">{selected.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute mt-2 w-56 rounded-xl border border-border bg-background shadow-lg z-20 py-2">
          {options.map((option) => {
            const active = option.id === selected.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    option.status === 'online' ? 'bg-green-500' : 'bg-amber-400',
                  )}
                />
                <div className="flex-1">
                  <div className="font-semibold leading-tight">{option.label}</div>
                  <div className="text-[11px] text-muted-foreground">Context {option.context}</div>
                </div>
                {active ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
