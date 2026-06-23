import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { RunStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatDistance } from '@/lib/utils'
import { Activity, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function RunsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: runs } = await supabase
    .from('inspection_runs')
    .select(`
      id, name, inspection_date, tool_type, status, inspected_length_m, created_at,
      pipelines(name, code),
      projects(name, code)
    `)
    .eq('organization_id', membership?.organization_id)
    .order('inspection_date', { ascending: false })

  const canEdit = ['admin', 'engineer'].includes(membership?.role ?? '')

  return (
    <AppShell>
      <Header
        breadcrumbs={[{ label: 'Inspection Runs' }]}
        actions={
          canEdit && (
            <Link href="/runs/new" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              New Run
            </Link>
          )
        }
      />

      <div className="page-header">
        <h1 className="page-title">Inspection Runs</h1>
        <p className="page-subtitle">{runs?.length ?? 0} total runs across all projects</p>
      </div>

      {runs && runs.length > 0 ? (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run Name</th>
                <th>Pipeline</th>
                <th>Project</th>
                <th>Tool</th>
                <th>Date</th>
                <th>Length</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td>
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-medium text-slate-800 hover:text-slate-900 hover:underline"
                    >
                      {run.name}
                    </Link>
                  </td>
                  <td>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {(run.pipelines as any)?.code}
                    </span>
                  </td>
                  <td className="text-slate-500 text-xs">{(run.projects as any)?.code}</td>
                  <td>
                    <span className="text-xs font-medium text-slate-600">{run.tool_type}</span>
                  </td>
                  <td className="text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(run.inspection_date)}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {run.inspected_length_m ? formatDistance(run.inspected_length_m) : '—'}
                  </td>
                  <td><RunStatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Activity}
            title="No inspection runs"
            description="Create your first inspection run within a project to begin uploading and analyzing ILI data."
            action={
              canEdit && (
                <Link href="/runs/new" className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Create run
                </Link>
              )
            }
          />
        </div>
      )}
    </AppShell>
  )
}
