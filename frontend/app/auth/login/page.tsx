'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Gauge, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleDemoLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@corrosense.dz',
      password: 'demo123456',
    })
    if (error) {
      setError('Demo account unavailable. Please set up the demo user.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-9 h-9 bg-slate-800 rounded">
            <Gauge className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-none">CorroSense</div>
            <div className="text-xs text-slate-400 leading-none mt-1 uppercase tracking-wide">Pipeline Integrity OS</div>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-base font-semibold text-slate-900 mb-5">Sign in to your account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">or</span>
            </div>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-secondary w-full justify-center"
          >
            Continue with demo account
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          No account?{' '}
          <Link href="/auth/signup" className="text-slate-800 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
