import { useState } from 'react'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('sol-chat-user') : null
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null)
  const loading = false

  const login = (email) => {
    const mockUser = {
      email,
      name: email.split('@')[0],
      plan: 'Pro Plan',
      credits: 100,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuvsMuLKu8mcJaNVHMzUYabcuPUCqzUtvlFr8tYTdClaTIXg8zsRrd2j-NWf-iVKUqda4RljsBYU-WDV1V7wjpQDhUI-Eo0t8hImPG3PJH8Gf5SUr4qpsHFQWby4rryYr5VFm5gwwfToTBvOBhgDDov7fBP4SZ_Yr4yWHWEWoPu00JWlWcKTgKr8cEAZ-V-9Lnq2mmhjHZfOt88njLHPYal-4NJfPtefyPylYfl3EjTjrRDC2gseHqbeiS4cDnCtigCszFPtQO24Kv',
    }
    setUser(mockUser)
    localStorage.setItem('sol-chat-user', JSON.stringify(mockUser))
    return mockUser
  }

  const signup = (email, password) => {
    return login(email, password)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('sol-chat-user')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook moved to src/hooks/useAuth.js to support fast refresh
