import { API_BASE_URL, apiFetch } from './config'

export function getBalance() {
  return apiFetch('/pay/balance')
}

export function getPricing() {
  return apiFetch('/pay/pricing')
}

export function purchaseCredits(credits) {
  return apiFetch('/pay/purchase', { method: 'POST', body: { credits } })
}

export function verifyPayment(reference, { signature, payerWallet }) {
  return apiFetch(`/pay/verify/${reference}`, {
    method: 'POST',
    body: { signature, payerWallet },
  })
}

export function getPaymentStatus(reference) {
  return apiFetch(`/pay/verify/${reference}`)
}

export function listTransactions(params = {}) {
  const query = new URLSearchParams(params).toString()
  const path = query ? `/transactions?${query}` : '/transactions'
  return apiFetch(path)
}

export function getTransactionSummary() {
  return apiFetch('/transactions/summary')
}

