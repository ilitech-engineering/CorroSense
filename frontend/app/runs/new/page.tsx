'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { Loader2 } from 'lucide-react'
// Partial types matching the select query columns only
type ProjectOption  = { id: string; name: string; code: string }
type PipelineOption = { id: string; name: string; code: string; total_length_m: number | null }

export default function NewRunPage() {
  const router = useRouter()
  const supabase = createClient()

  const [projects, setProjects]   = useState<ProjectOption[]>([])
  const [pipelines, setPipelines] = useState<PipelineOption[]>([])
  const [form, setForm] = useState({
    project_id:       '',
    pipeline_id:      '',
    name:             '',
    inspection_date:  '',
    tool_type:        'MFL',
    tool_vendor:      '',
    inspected_length_m: '',
    operator_name:    '',
    comment:          '',
  })
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) return

      const [{ data: p }, { data: pl }] = await Promise.all([
        supabase.from('projects').select('id, name, code').eq('organization_id', membership.organization_id).eq('status', 'active').order('name'),
        supabase.from('pipelines').select('id, name, code, total_length_m').eq('organization_id', membership.organization_id).order('name'),
      ])

      setProjects(p ?? [])
      setPipelines(pl ?? [])
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      setError('No organization found for your account.')
      setLoading(false)
      return
    }

    if (!form.project_id || !form.pipeline_id) {
      setError('Please select both a project and a pipeline.')
      setLoading(false)
      return
    }

    const { data: run, error: insertError } = await supabase.from('inspection_runs').insert({
      organization_id:    membership.organization_id,
      project_id:         form.project_id,
      pipeline_id:        form.pipeline_id,
      name:               form.name,
      inspection_date:    form.inspection_date,
      tool_type:          form.tool_type,
      tool_vendor:        form.tool_vendor || null,
      inspected_length_m: form.inspected_length_m ? parseFloat(form.inspected_length_m) : null,
      operator_name:      form.operator_name || null,
      comment:            form.comment || null,
      status:             'draft',
      created_by:         user.id,
    }).select().single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/runs/${run.id}`)
    router.refresh()
  }

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Inspection Runs', href: '/runs' },
          { label: 'New Run' },
        ]}
      />

      <div className="page-header">
        <h1 className="page-title">New Inspection Run</h1>
        <p className="page-subtitle">Create a new ILI inspection run record</p>
      </div>

      <div className="max-w-2xl">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Project *</label>
                <select name="project_id" value={form.project_id} onChange={handleChange} className="form-select" required>
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="form-hint text-amber-600">No projects yet. <a href="/projects/new" className="underline">Create one first.</a></p>
                )}
              </div>
              <div>
                <label className="form-label">Pipeline *</label>
                <select name="pipeline_id" value={form.pipeline_id} onChange={handleChange} className="form-select" required>
                  <option value="">Select a pipeline...</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
                {pipelines.length === 0 && (
                  <p className="form-hint text-amber-600">No pipelines yet. <a href="/pipelines/new" className="underline">Create one first.</a></p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Run name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="form-input" placeholder="GK3 MFL Run — March 2024" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Inspection date *</label>
                <input name="inspection_date" type="date" value={form.inspection_date} onChange={handleChange} className="form-input" required />
              </div>
              <div>
                <label className="form-label">Tool type *</label>
                <select name="tool_type" value={form.tool_type} onChange={handleChange} className="form-select">
                  <option value="MFL">MFL — Magnetic Flux Leakage</option>
                  <option value="UT">UT — Ultrasonic Testing</option>
                  <option value="combo">Combo (MFL + UT)</option>
                  <option value="EMAT">EMAT</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Tool vendor</label>
                <input name="tool_vendor" value={form.tool_vendor} onChange={handleChange} className="form-input" placeholder="PII / Baker Hughes" />
              </div>
              <div>
                <label className="form-label">Inspected length (m)</label>
                <input name="inspected_length_m" type="number" value={form.inspected_length_m} onChange={handleChange} className="form-input" placeholder="680000" />
              </div>
            </div>

            <div>
              <label className="form-label">Operator name</label>
              <input name="operator_name" value={form.operator_name} onChange={handleChange} className="form-input" placeholder="Name of field operator" />
            </div>

            <div>
              <label className="form-label">Comments</label>
              <textarea name="comment" value={form.comment} onChange={handleChange} className="form-textarea" rows={3} placeholder="Notes about inspection conditions, tool version, special observations..." />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create run
              </button>
              <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
