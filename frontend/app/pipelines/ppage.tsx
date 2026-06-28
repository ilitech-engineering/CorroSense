'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { Loader2 } from 'lucide-react'

export default function NewPipelinePage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    total_length_m: '',
    diameter_mm: '',
    nominal_wall_thickness_mm: '',
    material: 'carbon_steel',
    transported_fluid: 'crude_oil',
    nominal_pressure_bar: '',
    commissioned_at: '',
    operator: '',
    notes: '',
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

    const { error: insertError } = await supabase.from('pipelines').insert({
      organization_id:           membership.organization_id,
      name:                      form.name,
      code:                      form.code.toUpperCase(),
      location:                  form.location || null,
      total_length_m:            form.total_length_m ? parseFloat(form.total_length_m) : null,
      diameter_mm:               form.diameter_mm ? parseFloat(form.diameter_mm) : null,
      nominal_wall_thickness_mm: form.nominal_wall_thickness_mm ? parseFloat(form.nominal_wall_thickness_mm) : null,
      material:                  form.material,
      transported_fluid:         form.transported_fluid,
      nominal_pressure_bar:      form.nominal_pressure_bar ? parseFloat(form.nominal_pressure_bar) : null,
      commissioned_at:           form.commissioned_at || null,
      operator:                  form.operator || null,
      notes:                     form.notes || null,
      created_by:                user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/pipelines')
    router.refresh()
  }

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Pipelines', href: '/pipelines' },
          { label: 'New Pipeline' },
        ]}
      />

      <div className="page-header">
        <h1 className="page-title">New Pipeline</h1>
        <p className="page-subtitle">Register a pipeline asset for inspection management</p>
      </div>

      <div className="max-w-2xl">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Pipeline name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="form-input" placeholder="GK3 Main Trunk Line" required />
              </div>
              <div>
                <label className="form-label">Pipeline code *</label>
                <input name="code" value={form.code} onChange={handleChange} className="form-input" placeholder="GK3-MTL" required />
                <p className="form-hint">Unique identifier. Will be uppercased.</p>
              </div>
            </div>

            <div>
              <label className="form-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="form-input" placeholder="Hassi Messaoud to Bejaia" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Total length (m)</label>
                <input name="total_length_m" type="number" value={form.total_length_m} onChange={handleChange} className="form-input" placeholder="680000" />
              </div>
              <div>
                <label className="form-label">Diameter (mm)</label>
                <input name="diameter_mm" type="number" value={form.diameter_mm} onChange={handleChange} className="form-input" placeholder="711.2" />
              </div>
              <div>
                <label className="form-label">Wall thickness (mm)</label>
                <input name="nominal_wall_thickness_mm" type="number" step="0.001" value={form.nominal_wall_thickness_mm} onChange={handleChange} className="form-input" placeholder="9.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Material</label>
                <select name="material" value={form.material} onChange={handleChange} className="form-select">
                  <option value="carbon_steel">Carbon Steel</option>
                  <option value="stainless_steel">Stainless Steel</option>
                  <option value="duplex_steel">Duplex Steel</option>
                  <option value="hdpe">HDPE</option>
                  <option value="frp">FRP</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Transported fluid</label>
                <select name="transported_fluid" value={form.transported_fluid} onChange={handleChange} className="form-select">
                  <option value="crude_oil">Crude Oil</option>
                  <option value="natural_gas">Natural Gas</option>
                  <option value="refined_product">Refined Product</option>
                  <option value="water">Water</option>
                  <option value="multiphase">Multiphase</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Max pressure (bar)</label>
                <input name="nominal_pressure_bar" type="number" value={form.nominal_pressure_bar} onChange={handleChange} className="form-input" placeholder="72" />
              </div>
              <div>
                <label className="form-label">Commissioned</label>
                <input name="commissioned_at" type="date" value={form.commissioned_at} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Operator</label>
                <input name="operator" value={form.operator} onChange={handleChange} className="form-input" placeholder="Sonatrach" />
              </div>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} className="form-textarea" rows={2} placeholder="Additional technical information..." />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create pipeline
              </button>
              <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
