import { API_BASE_URL, getAuthHeaders } from './config'

/**
 * Send a chat message - handles x402 payment flow
 */
export async function sendChatMessage({ 
  message, 
  chatId, 
  agentId = null,
  paymentMode,
  paymentProof = null 
}) {
  const headers = {
    ...getAuthHeaders(),
    'X-Payment-Mode': paymentMode,
  }

  // Add payment proof if provided (for retry after payment)
  if (paymentProof) {
    headers['X-Payment-Proof'] = paymentProof
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      message, 
      chatId, 
      agentId,
      purpose: 'message_request' 
    })
  })

  // Handle 402 Payment Required
  if (response.status === 402) {
    const data = await response.json()
    return {
      requiresPayment: true,
      payment: data.payment,
      error: data.error
    }
  }

  // Handle other errors
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send message')
  }

  // Return stream for SSE
  return {
    requiresPayment: false,
    stream: response.body
  }
}

/**
 * Parse Server-Sent Events stream
 */
export async function* streamChatResponse(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            yield data
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Get chat history for current user
 */
export async function getChatHistory() {
  const response = await fetch(`${API_BASE_URL}/chats`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch chat history')
  }

  return response.json()
}
