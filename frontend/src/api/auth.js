import { API_BASE_URL, getAuthHeaders } from './config'

/**
 * Login user
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  const data = await response.json()
  // Store token
  if (data.token) {
    localStorage.setItem('auth-token', data.token)
  }

  return data
}

/**
 * Register new user
 */
export async function register(email, password, name) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Registration failed')
  }

  const data = await response.json()
  // Store token
  if (data.token) {
    localStorage.setItem('auth-token', data.token)
  }

  return data
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem('auth-token')
}

/**
 * Get current user profile
 */
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }

  return response.json()
}
