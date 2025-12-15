const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = res.headers.get('content-type')
  const data = contentType && contentType.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export { API_BASE_URL, apiFetch }
