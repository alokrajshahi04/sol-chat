import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { models } from '@/data/mock'
import { ModelSelector } from './ModelSelector'

export function AppHeader() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 text-muted-foreground hover:text-foreground">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <ModelSelector options={models} />
        <Badge className="uppercase text-[10px] tracking-wide px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
          Online
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" title="History">
          <span className="material-symbols-outlined text-[20px]">history</span>
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-4">
          <span className="material-symbols-outlined text-[18px]">ios_share</span>
          Share
        </Button>
      </div>
    </header>
  )
}
