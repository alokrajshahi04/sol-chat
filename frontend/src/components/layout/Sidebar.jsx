import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useNavigate } from 'react-router-dom'
import { currentUser } from '@/data/mock'
import { cn } from '@/lib/utils'
import { LogOut, Plus, Home, Library, MessageSquare, History } from 'lucide-react'

const nav = [
  { label: 'Discover Agents', icon: Home, path: '/marketplace' },
  { label: 'Transaction History', icon: History, path: '/history' },
]

const groupChatsByDate = (chats) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const groups = { Today: [], Yesterday: [], Older: [] }

  chats.forEach(chat => {
    const chatDate = new Date(chat.updatedAt)
    if (chatDate >= today) {
      groups.Today.push(chat)
    } else if (chatDate >= yesterday) {
      groups.Yesterday.push(chat)
    } else {
      groups.Older.push(chat)
    }
  })

  return groups
}

export function Sidebar() {
  const { logout } = useAuth()
  const { chats, activeChat, setActiveChat, createNewChat } = useChat()
  const navigate = useNavigate()

  const handleNewChat = () => {
    createNewChat()
    navigate('/chat')
  }

  const chatGroups = groupChatsByDate(chats)

  return (
    <aside className="hidden md:flex w-[280px] shrink-0 h-full flex-col border-r border-border bg-surface">
      <div className="p-4 flex flex-col gap-4">
        <Button onClick={handleNewChat} className="w-full h-12 rounded-lg shadow-primary" variant="default">
          <Plus className="h-5 w-5" />
          <span className="text-sm font-bold">New Chat</span>
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-3 text-text-secondary text-sm">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      <ScrollArea className="flex-1 px-3 mt-6">
        <div className="flex flex-col gap-4">
          {Object.entries(chatGroups).map(([section, sectionChats]) => {
            // Filter out empty chats (no messages)
            const chatsWithMessages = sectionChats.filter(chat => chat.messages && chat.messages.length > 0)
            if (chatsWithMessages.length === 0) return null
            return (
              <div key={section}>
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground px-3 mb-2">
                  {section}
                </div>
                <div className="flex flex-col gap-1">
                  {chatsWithMessages.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat.id)
                        navigate('/chat')
                      }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors text-left group relative',
                        activeChat === chat.id
                          ? 'bg-muted text-foreground'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="text-sm truncate">{chat.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <img src={currentUser.avatar} alt={currentUser.name} />
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{currentUser.name}</span>
              <span className="text-xs text-muted-foreground">{currentUser.plan}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
