'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Gauge, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    // Create profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
    })

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const { data: org } = await supabase.from('organizations').insert({
      name: orgName,
      slug: `${slug}-${Date.now()}`,
    }).select().single()

    if (org) {
      await supabase.from('organization_members').insert({
        organization_id: org.id,
        user_id: data.user.id,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      })
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
          <h1 className="text-base font-semibold text-slate-900 mb-5">Create your account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" placeholder="Ahmed Benali" required />
            </div>
            <div>
              <label className="form-label">Organization name</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="form-input" placeholder="Sonatrach Integrity Division" required />
              <p className="form-hint">You can add members later.</p>
            </div>
            <div>
              <label className="form-label">Work email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="you@company.com" required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" placeholder="Min. 8 characters" required minLength={8} />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-slate-800 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
