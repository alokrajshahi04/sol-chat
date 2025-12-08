import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, Github, Sparkles } from 'lucide-react'

export function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'login') {
      login(email, password)
    } else {
      signup(email, password)
    }
    navigate('/chat')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex flex-1 flex-col justify-center relative bg-secondary/30 p-12 transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-lg mx-auto flex flex-col gap-8">
          <div className="w-16 h-16 bg-foreground text-secondary rounded-2xl flex items-center justify-center shadow-xl">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-5xl font-bold leading-tight font-display tracking-tight">
            Access the world's best AI Agents
          </h1>
          <p className="text-lg leading-relaxed opacity-80">
            Join thousands of developers querying smarter with our unified agent marketplace. Pay per query or top up credits with Solana x402.
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border">
              <Sparkles className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Enterprise Ready</span>
                <span className="text-xs opacity-70">SOC2 Compliant</span>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border">
              <Sparkles className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Low Latency</span>
                <span className="text-xs opacity-70">Global Edge Network</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-12 text-xs font-medium opacity-50">
          © 2024 Sol Chat Inc.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto bg-background p-6 lg:p-12">
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold font-display">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === 'login'
                ? 'Enter your details to access your agent dashboard.'
                : 'Create an account to start querying AI agents.'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex h-12 w-full items-center justify-center rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex h-full grow items-center justify-center rounded-lg px-2 text-sm font-bold transition-all ${
                mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex h-full grow items-center justify-center rounded-lg px-2 text-sm font-bold transition-all ${
                mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
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
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </button>
                )}
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

            <Button type="submit" className="w-full h-12 mt-2">
              {mode === 'login' ? 'Log In' : 'Sign Up'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-4 text-muted-foreground text-xs font-medium">
              Or continue with
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 gap-2">
              <img
                alt="Google"
                className="w-5 h-5"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC3uBFMLb1ewzgE4uFPgDnmo5LYzVSc4WhUkiBCYuYiPmtmsqB5JBKrRKyOnblaUz9ydarasscTG3uIhx95KLy4p-ypHDZNBjz9m3RR_U2KmLsn3oAv9CIAGcIHVt5uSHzvLtF6CD7Wu1HoAGPuakYB9t6bQ2XYy6Py_z1decVHwMMYaTXB0kapIWJ9eHk_TuPVJCp2uA5IrEw81fKxGXTSzFHhtLWwKjJnQ-RwJTa4_zTiKt_UpTShvLD00hBlIJaSgOuyZtJ5Uka"
              />
              Google
            </Button>
            <Button variant="outline" className="h-12 gap-2">
              <Github className="h-5 w-5" />
              GitHub
            </Button>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="font-bold hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-bold hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
