import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatDistance } from '@/lib/utils'
import { GitBranch, Plus, Ruler } from 'lucide-react'
import Link from 'next/link'

export default async function PipelinesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('*, projects(name, code)')
    .eq('organization_id', membership?.organization_id)
    .order('created_at', { ascending: false })

  const canEdit = ['admin', 'engineer'].includes(membership?.role ?? '')

  return (
    <AppShell>
      <Header
        breadcrumbs={[{ label: 'Pipelines' }]}
        actions={
          canEdit && (
            <Link href="/pipelines/new" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              New Pipeline
            </Link>
          )
        }
      />

      <div className="page-header">
        <h1 className="page-title">Pipelines</h1>
        <p className="page-subtitle">{pipelines?.length ?? 0} pipelines registered</p>
      </div>

      {pipelines && pipelines.length > 0 ? (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Project</th>
                <th>Diameter</th>
                <th>Length</th>
                <th>Material</th>
                <th>Fluid</th>
                <th>Commissioned</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pipelines/${p.id}`} className="font-mono text-xs text-slate-600 hover:text-slate-900 hover:underline bg-slate-100 px-1.5 py-0.5 rounded">
                      {p.code}
                    </Link>
                  </td>
                  <td className="font-medium text-slate-800">{p.name}</td>
                  <td className="text-xs text-slate-500">{(p.projects as any)?.code ?? '—'}</td>
                  <td className="font-mono text-xs text-slate-500">
                    {p.diameter_mm ? `${p.diameter_mm} mm` : '—'}
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {p.total_length_m ? formatDistance(p.total_length_m) : '—'}
                  </td>
                  <td className="text-xs capitalize text-slate-500">
                    {p.material?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="text-xs capitalize text-slate-500">
                    {p.transported_fluid?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="text-xs text-slate-400">
                    {p.commissioned_at ? formatDate(p.commissioned_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={GitBranch}
            title="No pipelines registered"
            description="Register your pipeline assets to start associating inspection runs and analysis results."
            action={
              canEdit && (
                <Link href="/pipelines/new" className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Add pipeline
                </Link>
              )
            }
          />
        </div>
      )}
    </AppShell>
  )
}
