import { API_BASE_URL, apiFetch } from './config'

export function createSession(models) {
  return apiFetch('/chat/sessions', { method: 'POST', body: { models } })
}

export function listSessions() {
  return apiFetch('/chat/sessions')
}

export function fetchSession(chatSessionId) {
  return apiFetch(`/chat/session/${chatSessionId}`)
}

export function deleteSession(chatSessionId) {
  return apiFetch(`/chat/session/${chatSessionId}`, { method: 'DELETE' })
}

export async function sendQuery(chatSessionId, query) {
  const res = await fetch(`${API_BASE_URL}/chat/session/${chatSessionId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  const data = await res.json().catch(() => null)

  if (res.status === 402) {
    const err = new Error(data?.message || data?.error || 'Payment required')
    err.status = 402
    err.data = data
    throw err
  }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Failed to submit query')
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export function openQueryStream(queryId) {
  const url = `${API_BASE_URL}/chat/sse/${queryId}`
  const source = new EventSource(url, { withCredentials: true })
  return source
}
