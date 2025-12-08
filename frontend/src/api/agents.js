import { API_BASE_URL, getAuthHeaders } from './config'

/**
 * Get list of all available agents
 */
export async function getAgents() {
  const response = await fetch(`${API_BASE_URL}/agents`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch agents')
  }

  return response.json()
}

/**
 * Unlock an agent - handles x402 payment flow
 */
export async function unlockAgent(agentId, paymentProof = null) {
  const headers = getAuthHeaders()
  
  // Add payment proof if provided (for retry after payment)
  if (paymentProof) {
    headers['X-Payment-Proof'] = paymentProof
  }

  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/unlock`, {
    method: 'POST',
    headers
  })

  // Handle 402 Payment Required
  if (response.status === 402) {
    const data = await response.json()
    return {
      requiresPayment: true,
      payment: data.payment
    }
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to unlock agent')
  }

  return {
    requiresPayment: false,
    data: await response.json()
  }
}

/**
 * Get user's unlocked agents with usage stats
 */
export async function getMyAgents() {
  const response = await fetch(`${API_BASE_URL}/my-agents`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch unlocked agents')
  }

  return response.json()
}
