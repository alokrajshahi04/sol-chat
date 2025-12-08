import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { currentUser, chats } from '@/data/mock'
import { cn } from '@/lib/utils'
import { LogOut } from 'lucide-react'

const sections = ['Today', 'Yesterday']

const nav = [
  { label: 'Discover Agents', icon: 'explore', path: '/marketplace' },
  { label: 'Library', icon: 'folder_open', path: '/library' },
]

export function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <aside className="hidden md:flex w-[280px] shrink-0 h-full flex-col border-r border-border bg-surface">
      <div className="p-4 flex flex-col gap-4">
        <Button className="w-full h-12 rounded-lg shadow-primary" variant="default">
          <span className="material-symbols-outlined text-base">add</span>
          <span className="text-sm font-bold">New Chat</span>
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-3 text-text-secondary text-sm">
        {nav.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            placeholder="Search chats..."
            className="w-full rounded-lg bg-muted/60 border border-input pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 pb-4">
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <div className="px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              {section}
            </div>
            <div className="flex flex-col gap-1">
              {chats
                .filter((c) => c.date === section)
                .map((chat) => (
                  <button
                    key={chat.id}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                      chat.active ? 'bg-secondary text-foreground shadow-secondary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {chat.active ? 'chat_bubble' : 'chat_bubble_outline'}
                    </span>
                    <span className="text-sm font-medium truncate flex-1">{chat.title}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors">
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.avatar} alt={currentUser.name} size="md" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-none">{currentUser.name}</span>
              <span className="text-xs text-green-600 font-semibold mt-1">{currentUser.plan}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
