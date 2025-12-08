import { createContext, useState, useEffect } from 'react'

const ChatContext = createContext()

export { ChatContext }

const generateId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export function ChatProvider({ children }) {
  // Initialize chats from localStorage
  const [chats, setChats] = useState(() => {
    const stored = localStorage.getItem('sol-chat-threads')
    if (stored) {
      return JSON.parse(stored)
    }
    return []
  })

  // Initialize activeChat from stored chats
  const [activeChat, setActiveChat] = useState(() => {
    const stored = localStorage.getItem('sol-chat-threads')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.length > 0 ? parsed[0].id : null
    }
    return null
  })

  // Initialize payment mode from localStorage
  const [paymentMode, setPaymentMode] = useState(() => {
    const stored = localStorage.getItem('sol-chat-payment-mode')
    return stored || 'pay-per-request'
  })

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('sol-chat-threads', JSON.stringify(chats))
    }
  }, [chats])

  const createNewChat = (agent = null, model = 'gpt-4') => {
    const newChat = {
      id: generateId(),
      title: agent ? `Chat with ${agent.name}` : 'New Chat',
      agent: agent,
      model: model,
      messages: [],
      messagesRemaining: agent ? agent.messagesIncluded : null, // Track remaining messages for agent
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setChats([newChat, ...chats])
    setActiveChat(newChat.id)
    return newChat.id
  }

  const addMessage = (chatId, message) => {
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId) {
          const updatedMessages = [...chat.messages, { ...message, id: `msg_${Date.now()}`, timestamp: new Date().toISOString() }]
          
          // Deduct message count for agent chats when assistant responds
          let newMessagesRemaining = chat.messagesRemaining
          if (chat.agent && message.role === 'assistant' && !message.typing && newMessagesRemaining !== null) {
            newMessagesRemaining = Math.max(0, newMessagesRemaining - 1)
          }
          
          // Auto-generate title from first user message
          let title = chat.title
          if (chat.title === 'New Chat' && message.role === 'user') {
            title = message.text.slice(0, 50) + (message.text.length > 50 ? '...' : '')
          }
          
          return {
            ...chat,
            messages: updatedMessages,
            messagesRemaining: newMessagesRemaining,
            title,
            updatedAt: new Date().toISOString(),
          }
        }
        return chat
      })
    )
  }

  const updateLastMessage = (chatId, updates) => {
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId && chat.messages.length > 0) {
          const messages = [...chat.messages]
          messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates }
          return { ...chat, messages, updatedAt: new Date().toISOString() }
        }
        return chat
      })
    )
  }

  const deleteChat = (chatId) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId))
    if (activeChat === chatId) {
      const remaining = chats.filter(chat => chat.id !== chatId)
      setActiveChat(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const updatePaymentMode = (mode) => {
    setPaymentMode(mode)
    localStorage.setItem('sol-chat-payment-mode', mode)
  }

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === activeChat)
  }

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        createNewChat,
        addMessage,
        updateLastMessage,
        deleteChat,
        getCurrentChat,
        paymentMode,
        updatePaymentMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
