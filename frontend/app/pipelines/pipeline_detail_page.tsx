import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { RunStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatDistance } from '@/lib/utils'
import { Activity, Plus, GitBranch } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function PipelineDetailPage({ params }: Props) {
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

  const { data: pipeline } = await db
    .from('pipelines')
    .select('*, projects(id, name, code)')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .single()

  if (!pipeline) notFound()

  const { data: runs } = await db
    .from('inspection_runs')
    .select('id, name, inspection_date, tool_type, status')
    .eq('pipeline_id', params.id)
    .order('inspection_date', { ascending: false })

  const project = pipeline.projects as any
  const canEdit = ['admin', 'engineer'].includes(membership.role ?? '')

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Pipelines', href: '/pipelines' },
          { label: pipeline.name },
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
          <h1 className="page-title">{pipeline.name}</h1>
          <span className="badge text-slate-600 bg-slate-100 border-slate-200 font-mono">{pipeline.code}</span>
        </div>
        {project && (
          <p className="page-subtitle">
            Project: <Link href={`/projects/${project.id}`} className="text-slate-600 hover:underline">{project.code}</Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <p className="kpi-label">Length</p>
          <p className="kpi-value text-xl">{pipeline.total_length_m ? formatDistance(pipeline.total_length_m) : '—'}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Diameter</p>
          <p className="kpi-value text-xl">{pipeline.diameter_mm ? `${pipeline.diameter_mm} mm` : '—'}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Wall Thickness</p>
          <p className="kpi-value text-xl">{pipeline.nominal_wall_thickness_mm ? `${pipeline.nominal_wall_thickness_mm} mm` : '—'}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Max Pressure</p>
          <p className="kpi-value text-xl">{pipeline.nominal_pressure_bar ? `${pipeline.nominal_pressure_bar} bar` : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
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
                      <p className="text-xs text-slate-400 mt-0.5">{run.tool_type} · {formatDate(run.inspection_date)}</p>
                    </div>
                    <RunStatusBadge status={run.status as any} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No inspection runs yet"
                description="Create a run for this pipeline to start uploading ILI data."
                action={canEdit ? <Link href="/runs/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />New run</Link> : undefined}
              />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Pipeline Details</h2></div>
            <dl className="p-4 space-y-2.5">
              {[
                ['Location', pipeline.location],
                ['Material', pipeline.material?.replace(/_/g, ' ')],
                ['Fluid', pipeline.transported_fluid?.replace(/_/g, ' ')],
                ['Operator', pipeline.operator],
                ['Manufacturer', pipeline.manufacturer],
                ['Coating', pipeline.coating_type],
                ['Cathodic protection', pipeline.cathodic_protection ? 'Yes' : 'No'],
                ['Commissioned', pipeline.commissioned_at ? formatDate(pipeline.commissioned_at) : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-slate-400 flex-shrink-0">{label}</dt>
                  <dd className="text-xs text-slate-700 font-medium text-right capitalize">{value}</dd>
                </div>
              ))}
            </dl>
            {pipeline.notes && (
              <div className="px-4 pb-4">
                <p className="text-xs text-slate-500 italic">{pipeline.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
