import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ProjectStatusBadge, RunStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatDistance } from '@/lib/utils'
import { Activity, GitBranch, Plus, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function ProjectDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = await createServiceClient()

  const { data: membership } = await db
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) redirect('/dashboard')

  const { data: project } = await db
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .single()

  if (!project) notFound()

  const [{ data: pipelines }, { data: runs }] = await Promise.all([
    db.from('pipelines')
      .select('id, name, code, diameter_mm, total_length_m, material')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false }),
    db.from('inspection_runs')
      .select('id, name, inspection_date, tool_type, status, pipelines(name, code)')
      .eq('project_id', params.id)
      .order('inspection_date', { ascending: false }),
  ])

  const canEdit = ['admin', 'engineer'].includes(membership.role ?? '')

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        actions={
          canEdit ? (
            <Link href="/runs/new" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              New Run
            </Link>
          ) : undefined
        }
      />

      <div className="page-header">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="page-title">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="page-subtitle font-mono text-xs">{project.code}</p>
      </div>

      {project.description && (
        <div className="card p-5 mb-6">
          <p className="text-sm text-slate-600">{project.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
            {project.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Created {formatDate(project.created_at)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pipelines in this project */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> Pipelines
            </h2>
            <span className="text-xs text-slate-400">{pipelines?.length ?? 0}</span>
          </div>
          {pipelines && pipelines.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pipelines.map(p => (
                <Link key={p.id} href={`/pipelines/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.code}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {p.diameter_mm && <div>{p.diameter_mm} mm</div>}
                    {p.total_length_m && <div className="font-mono">{formatDistance(p.total_length_m)}</div>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="No pipelines yet"
              description="Add a pipeline to this project to start creating inspection runs."
              action={canEdit ? <Link href="/pipelines/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />Add pipeline</Link> : undefined}
            />
          )}
        </div>

        {/* Inspection runs in this project */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2">
              <Activity className="w-4 h-4" /> Inspection Runs
            </h2>
            <span className="text-xs text-slate-400">{runs?.length ?? 0}</span>
          </div>
          {runs && runs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {runs.map(run => (
                <Link key={run.id} href={`/runs/${run.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{run.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(run.pipelines as any)?.code} · {run.tool_type} · {formatDate(run.inspection_date)}
                    </p>
                  </div>
                  <RunStatusBadge status={run.status as any} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No inspection runs yet"
              description="Create a run to start uploading and analyzing ILI data."
              action={canEdit ? <Link href="/runs/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />New run</Link> : undefined}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
