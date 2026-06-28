'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { Loader2 } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    location: '',
    start_date: '',
    status: 'active',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get user org
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      setError('You are not linked to any organization. Contact your administrator.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('projects').insert({
      organization_id: membership.organization_id,
      name:        form.name,
      code:        form.code.toUpperCase(),
      description: form.description || null,
      location:    form.location || null,
      start_date:  form.start_date || null,
      status:      form.status,
      created_by:  user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/projects')
    router.refresh()
  }

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'New Project' },
        ]}
      />

      <div className="page-header">
        <h1 className="page-title">New Project</h1>
        <p className="page-subtitle">Create a new pipeline inspection project</p>
      </div>

      <div className="max-w-2xl">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Project name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="GK3 Trunk Line Assessment"
                  required
                />
              </div>
              <div>
                <label className="form-label">Project code *</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="GK3-2024"
                  required
                />
                <p className="form-hint">Short unique identifier. Will be uppercased.</p>
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="form-textarea"
                rows={3}
                placeholder="Describe the scope of this inspection project..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Hassi Messaoud – Bejaia, Algeria"
                />
              </div>
              <div>
                <label className="form-label">Start date</label>
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="form-select">
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create project
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
