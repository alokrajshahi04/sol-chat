import { apiFetch } from './config'

export function signup({ email, password, name }) {
  return apiFetch('/auth/signup', { method: 'POST', body: { email, password, name } })
}

export function login({ email, password }) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } })
}

export function logout() {
  return apiFetch('/auth/logout', { method: 'POST' })
}

export function fetchSession() {
  return apiFetch('/auth/me')
}

export function connectWallet({ wallet, signature, message }) {
  return apiFetch('/auth/wallet/connect', {
    method: 'POST',
    body: { wallet, signature, message },
  })
}

export function connectWalletSimple({ wallet }) {
  return apiFetch('/auth/wallet/connect-simple', {
    method: 'POST',
    body: { wallet },
  })
}

export function disconnectWallet() {
  return apiFetch('/auth/wallet/disconnect', { method: 'POST' })
}
