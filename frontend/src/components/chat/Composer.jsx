import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Paperclip, Globe2, Mic, Send } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { PaymentModal } from '../PaymentModal'
import { TopUpModal } from '../TopUpModal'
import { paymentModes } from '@/data/mock'

export function Composer() {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [paymentRequest, setPaymentRequest] = useState(null)
  
  const { getCurrentChat, addMessage, updateLastMessage, paymentMode, createNewChat, activeChat } = useChat()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const getCredits = () => {
    const stored = localStorage.getItem('sol-chat-credits')
    return stored ? parseInt(stored) : 0
  }

  const deductCredit = () => {
    const credits = getCredits()
    if (credits > 0) {
      localStorage.setItem('sol-chat-credits', (credits - 1).toString())
      // Trigger storage event for header to update
      window.dispatchEvent(new Event('storage'))
      return true
    }
    return false
  }

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return

    // Create new chat if none exists
    let chatId = activeChat
    if (!chatId) {
      chatId = createNewChat()
    }

    const currentChat = getCurrentChat()
    
    // Check if agent chat has messages remaining
    if (currentChat?.agent && currentChat.messagesRemaining !== null) {
      if (currentChat.messagesRemaining <= 0) {
        alert(`You've used all ${currentChat.agent.messagesIncluded} messages included with ${currentChat.agent.name}. Please start a new session or unlock the agent again.`)
        return
      }
    }

    const userMessage = input.trim()
    setInput('')
    setIsSubmitting(true)

    // Add user message
    addMessage(chatId, {
      role: 'user',
      text: userMessage,
      name: 'You',
    })

    // For agent chats, always send (messages are deducted on response)
    if (currentChat?.agent) {
      await sendMessageToAPI(chatId, userMessage)
      return
    }

    // For regular chats, handle payment based on mode
    if (paymentMode === 'pay-per-request') {
      // PAY-PER-REQUEST: Show payment modal BEFORE sending to backend
      const mode = paymentModes.find(m => m.id === 'pay-per-request')
      setPaymentRequest({
        amount: mode.price,
        currency: mode.currency,
        purpose: 'Chat message request',
        message: userMessage,
        chatId: chatId,
      })
      setShowPayment(true)
      setIsSubmitting(false)
    } else {
      // CREDITS MODE: Check if user has credits
      const credits = getCredits()
      if (credits < 1) {
        // No credits - show top up modal
        setShowTopUp(true)
        setIsSubmitting(false)
        return
      }

      // Has credits - deduct and send
      if (deductCredit()) {
        await sendMessageToAPI(chatId, userMessage)
      }
    }
  }

  const handlePaymentComplete = async () => {
    setShowPayment(false)
    // After payment, send message to backend with payment proof
    if (paymentRequest) {
      await sendMessageToAPI(paymentRequest.chatId, paymentRequest.message, true)
    }
    setPaymentRequest(null)
  }

  const handleTopUpComplete = () => {
    setShowTopUp(false)
    // After topping up, user can send message
    const chat = getCurrentChat()
    if (chat && chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1]
      if (lastMessage.role === 'user') {
        // Deduct credit and send
        if (deductCredit()) {
          sendMessageToAPI(chat.id, lastMessage.text)
        }
      }
    }
  }

  const sendMessageToAPI = async (chatId, text) => {
    // Add typing indicator
    addMessage(chatId, {
      role: 'assistant',
      text: '...',
      typing: true,
    })

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...(hasPaidPerRequest && { 'X-Payment-Proof': 'tx_signature_here' })
      //   },
      //   body: JSON.stringify({
      //     message: text,
      //     chatId: chatId,
      //     paymentMode: paymentMode
      //   })
      // })
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock AI response
      const responses = [
        "Based on your query, here's what I found...",
        "Let me help you with that. The key points are...",
        "That's an interesting question. From my understanding...",
        "I can assist with that. Here's a detailed explanation...",
      ]
      const mockResponse = responses[Math.floor(Math.random() * responses.length)]

      // Update last message with actual response
      updateLastMessage(chatId, {
        text: mockResponse,
        typing: false,
      })
    } catch {
      // Handle error
      updateLastMessage(chatId, {
        text: 'Sorry, there was an error processing your request.',
        typing: false,
        error: true,
      })
    }

    setIsSubmitting(false)
  }

  const currentMode = paymentModes.find(m => m.id === paymentMode)
  const credits = getCredits()
  const currentChat = getCurrentChat()

  return (
    <>
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
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Button variant="secondary" size="sm" className="h-8 px-3 gap-2">
                  <Sparkles className="h-4 w-4" />
                  {currentChat?.agent ? currentChat.agent.name : 'GPT-4'}
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
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-xs">
                  {currentChat?.agent && currentChat.messagesRemaining !== null ? (
                    <>
                      <span className="text-muted-foreground">Agent Session</span>
                      <span className={currentChat.messagesRemaining <= 2 ? 'text-red-600 font-semibold' : 'text-purple-600 font-semibold'}>
                        {currentChat.messagesRemaining} messages left
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        {currentMode?.label}
                        {currentMode?.price && ` ($${currentMode.price})`}
                      </span>
                      {paymentMode === 'credits' && (
                        <span className={credits < 1 ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
                          {credits} credits remaining
                        </span>
                      )}
                    </>
                  )}
                </div>
                <Button 
                  size="icon" 
                  className="h-10 w-10 shadow-primary"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isSubmitting}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            LLMs can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* Pay-per-request Payment Modal */}
      {showPayment && paymentRequest && (
        <PaymentModal
          open={showPayment}
          onClose={() => {
            setShowPayment(false)
            setIsSubmitting(false)
          }}
          paymentRequest={paymentRequest}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Credits Top-Up Modal */}
      <TopUpModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        onTopUpComplete={handleTopUpComplete}
      />
    </>
  )
}

function IconButton({ children, title }) {
  return (
    <button
      title={title}
      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
    >
      {children}
    </button>
  )
}

