import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './AuthContextValue'
import {
  connectWalletSimple as apiConnectWalletSimple,
  disconnectWallet as apiDisconnectWallet,
  fetchSession,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
} from '@/api/auth'

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const hydrateSession = useCallback(async () => {
    setLoading(true)
    try {
      const session = await fetchSession()
      setAccount(session)
      setError(null)
    } catch (err) {
      setAccount(null)
      setError(err.message || 'Unable to load session')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    hydrateSession()
  }, [hydrateSession])

  const login = async ({ email, password }) => {
    setLoading(true)
    try {
      await apiLogin({ email, password })
      await hydrateSession()
    } catch (err) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signup = async ({ email, password, name }) => {
    setLoading(true)
    try {
      await apiSignup({ email, password, name })
      await hydrateSession()
    } catch (err) {
      setError(err.message || 'Signup failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await apiLogout().catch(() => { })
    setAccount(null)
  }

  const linkWallet = async ({ wallet }) => {
    const result = await apiConnectWalletSimple({ wallet })
    await hydrateSession()
    return result
  }

  const unlinkWallet = async () => {
    await apiDisconnectWallet().catch(() => { })
    await hydrateSession()
  }

  const user = account?.user || null
  const guest = account?.guest || null
  const wallet = user?.solanaWallet || guest?.solanaWallet || null

  return (
    <AuthContext.Provider
      value={{
        account,
        user,
        guest,
        wallet,
        loading,
        error,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        linkWallet,
        unlinkWallet,
        refresh: hydrateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
