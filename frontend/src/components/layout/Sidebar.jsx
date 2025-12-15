import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LogOut, Plus, MessageSquare, History, LogIn } from 'lucide-react'

export function Sidebar({ sessions = [], activeSessionId, onNewSession, onSelectSession }) {
  const { user, guest, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.name || 'Guest'
  const displayPlan = user ? 'Signed in' : 'Guest session'
  const avatar = user?.avatar

  return (
    <aside className="hidden md:flex w-[280px] shrink-0 h-full flex-col border-r border-border bg-surface">
      <div className="p-4 flex flex-col gap-4">
        <Button onClick={onNewSession} className="w-full h-12 rounded-lg shadow-primary" variant="default">
          <Plus className="h-5 w-5" />
          <span className="text-sm font-bold">New Chat</span>
        </Button>
        <Button variant="outline" onClick={() => navigate('/history')} className="w-full h-10 gap-2">
          <History className="h-4 w-4" />
          Transaction History
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 mt-2">
        <div className="flex flex-col gap-2">
          {sessions.length === 0 ? (
            <div className="text-xs text-muted-foreground px-3">No saved sessions yet</div>
          ) : (
            sessions.map((chat) => (
              <button
                key={chat.chatSessionId}
                onClick={() => onSelectSession(chat.chatSessionId)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors text-left group relative',
                  activeSessionId === chat.chatSessionId ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm truncate">{chat.title || 'New Chat'}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {chat.models?.join(', ')}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {avatar ? <img src={avatar} alt={displayName} /> : <span className="text-xs">🙂</span>}
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{displayName}</span>
              <span className="text-xs text-muted-foreground">{displayPlan}</span>
            </div>
          </div>
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-8 w-8 p-0"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="h-8 w-8 p-0"
              title="Sign in"
            >
              <LogIn className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
