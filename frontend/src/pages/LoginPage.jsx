import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, Sparkles } from 'lucide-react'
import { API_BASE_URL } from '@/api/config'

export function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { login, signup, refresh } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const oauthError = searchParams.get('error') === 'oauth'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await signup({ email, password, name: email.split('@')[0] })
      }
      navigate('/chat')
    } catch (err) {
      setError(err.message || 'Unable to authenticate')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuest = async () => {
    setSubmitting(true)
    setError('')
    try {
      await refresh()
      navigate('/chat')
    } catch (err) {
      setError(err.message || 'Unable to start session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden lg:flex flex-1 flex-col justify-center relative bg-secondary/30 p-12 transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-lg mx-auto flex flex-col gap-8">
          <div className="w-16 h-16 bg-foreground text-secondary rounded-2xl flex items-center justify-center shadow-xl">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-5xl font-bold leading-tight font-display tracking-tight">
            Sol-Chat x402
          </h1>
          <p className="text-lg leading-relaxed opacity-80">
            Multi-model chat with pay-per-query credits. Connect your wallet, fund once, and compare answers side by side.
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border">
              <Sparkles className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Multi-LLM</span>
                <span className="text-xs opacity-70">GPT + Gemini</span>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border">
              <Sparkles className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Solana</span>
                <span className="text-xs opacity-70">x402 credits</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-12 text-xs font-medium opacity-50">
          © 2024 Sol Chat Inc.
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto bg-background p-6 lg:p-12">
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold font-display">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === 'login'
                ? 'Sign in to keep your chat history synced.'
                : 'Sign up to save chats and credit receipts.'}
            </p>
          </div>

          <div className="flex h-12 w-full items-center justify-center rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex h-full grow items-center justify-center rounded-lg px-2 text-sm font-bold transition-all ${mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex h-full grow items-center justify-center rounded-lg px-2 text-sm font-bold transition-all ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
            >
              Sign Up
            </button>
          </div>

          <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
            <label className="flex flex-col w-full gap-2">
              <span className="text-sm font-bold">Email address</span>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col w-full gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Password</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 px-4 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </label>

            {error || oauthError ? (
              <p className="text-sm text-destructive">
                {error || 'Google login failed. Please try again.'}
              </p>
            ) : null}

            <Button type="submit" className="w-full h-12 mt-2" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-4 text-muted-foreground text-xs font-medium">
              Or continue with
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          <Button variant="outline" className="w-full h-12 gap-2" onClick={handleGoogleLogin}>
            <img
              alt="Google"
              className="w-5 h-5"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC3uBFMLb1ewzgE4uFPgDnmo5LYzVSc4WhUkiBCYuYiPmtmsqB5JBKrRKyOnblaUz9ydarasscTG3uIhx95KLy4p-ypHDZNBjz9m3RR_U2KmLsn3oAv9CIAGcIHVt5uSHzvLtF6CD7Wu1HoAGPuakYB9t6bQ2XYy6Py_z1decVHwMMYaTXB0kapIWJ9eHk_TuPVJCp2uA5IrEw81fKxGXTSzFHhtLWwKjJnQ-RwJTa4_zTiKt_UpTShvLD00hBlIJaSgOuyZtJ5Uka"
            />
            Continue with Google
          </Button>

          <Button variant="secondary" className="w-full h-12" onClick={handleGuest} disabled={submitting}>
            Continue as guest
          </Button>
        </div>
      </div>
    </div>
  )
}
