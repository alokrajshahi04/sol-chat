import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModelSelector({ options = [], selected = [], onChange, disabled }) {
  const [open, setOpen] = useState(false)

  // Close dropdown if disabled becomes true
  if (disabled && open) {
    setOpen(false)
  }

  const toggleModel = (id) => {
    const next = selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]
    onChange?.(next)
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border border-border",
          disabled ? "opacity-50 cursor-not-allowed bg-muted" : "hover:bg-surface cursor-pointer"
        )}
      >
        <span className="text-lg font-bold tracking-tight">
          {selected.length ? selected.join(', ') : 'Select models'}
        </span>
        {!disabled && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open ? (
        <div className="absolute mt-2 w-64 rounded-xl border border-border bg-background shadow-lg z-20 py-2">
          {options.map((option) => {
            const active = selected.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleModel(option.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    option.status === 'online' ? 'bg-green-500' : 'bg-amber-400'
                  )}
                />
                <div className="flex-1">
                  <div className="font-semibold leading-tight">{option.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Context {option.context} • {option.cost || 1} credit{(option.cost || 1) > 1 ? 's' : ''}
                  </div>
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
