import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { RunStatusBadge, SeverityBadge, JobStatusBadge, RiskScoreBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnalyzeButton } from '@/components/runs/AnalyzeButton'
import { FileUploadZone } from '@/components/runs/FileUploadZone'
import { DefectCharts } from '@/components/charts/DefectCharts'
import { formatDate, formatDateTime, formatDistance, formatFileSize, formatDuration } from '@/lib/utils'
import { FileText, Activity, AlertTriangle, Clock, Download, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function RunDetailPage({ params }: Props) {
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

  const { data: run } = await db
    .from('inspection_runs')
    .select('*, pipelines(id, name, code, total_length_m, nominal_wall_thickness_mm, material, transported_fluid, nominal_pressure_bar), projects(id, name, code)')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .single()

  if (!run) notFound()

  const [{ data: files }, { data: jobs }, { data: defects }, { data: segments }] = await Promise.all([
    db.from('uploaded_files').select('*').eq('run_id', params.id).order('created_at'),
    db.from('analysis_jobs').select('*').eq('run_id', params.id).order('queued_at', { ascending: false }),
    db.from('defects').select('*').eq('run_id', params.id).order('risk_score', { ascending: false }),
    db.from('segment_risk_scores').select('*').eq('run_id', params.id).order('aggregated_risk_score', { ascending: false }),
  ])

  const latestJob = jobs?.[0] ?? null
  const pipeline  = run.pipelines as any
  const project   = run.projects as any
  const canEdit   = ['admin', 'engineer'].includes(membership.role ?? '')
  const criticalCount = defects?.filter(d => d.severity_level === 'critical').length ?? 0
  const highCount     = defects?.filter(d => d.severity_level === 'high').length ?? 0
  const maxRisk       = defects?.reduce((m, d) => Math.max(m, d.risk_score ?? 0), 0) ?? 0

  return (
    <AppShell>
      <Header
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project?.name, href: `/projects/${project?.id}` },
          { label: run.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {defects && defects.length > 0 && (
              <a href={`/api/runs/${params.id}/results?format=csv`} className="btn-secondary btn-sm">
                <Download className="w-3.5 h-3.5" />Export CSV
              </a>
            )}
            {canEdit && (
              <AnalyzeButton
                runId={params.id}
                currentStatus={run.status}
                hasFiles={(files?.length ?? 0) > 0}
                latestJob={latestJob}
              />
            )}
          </div>
        }
      />

      <div className="page-header flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title">{run.name}</h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="page-subtitle">{pipeline?.code} · {run.tool_type} · {formatDate(run.inspection_date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card"><p className="kpi-label">Inspected Length</p><p className="kpi-value">{run.inspected_length_m ? formatDistance(run.inspected_length_m) : '—'}</p></div>
        <div className="kpi-card"><p className="kpi-label">Total Defects</p><p className="kpi-value">{defects?.length ?? 0}</p><p className="kpi-sub">{criticalCount} critical · {highCount} high</p></div>
        <div className={`kpi-card ${criticalCount > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <p className={`kpi-label ${criticalCount > 0 ? 'text-red-500' : ''}`}>Critical Defects</p>
          <p className={`kpi-value ${criticalCount > 0 ? 'text-red-700' : ''}`}>{criticalCount}</p>
        </div>
        <div className="kpi-card"><p className="kpi-label">Max Risk Score</p><p className="kpi-value">{maxRisk.toFixed(1)}</p><p className="kpi-sub">out of 100</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {defects && defects.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 className="card-title flex items-center gap-2"><BarChart3 className="w-4 h-4" />Analysis Overview</h2></div>
              <div className="p-5"><DefectCharts defects={defects} segments={segments ?? []} /></div>
            </div>
          )}

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Detected Defects</h2>
              <span className="text-xs text-slate-400">{defects?.length ?? 0} total</span>
            </div>
            {defects && defects.length > 0 ? (
              <div className="table-container rounded-t-none border-0 border-t border-slate-100">
                <table className="data-table">
                  <thead><tr><th>Distance</th><th>Type</th><th>Depth %</th><th>Severity</th><th>Corr. Prob.</th><th>Risk Score</th><th>Segment</th></tr></thead>
                  <tbody>
                    {defects.slice(0, 50).map(defect => (
                      <tr key={defect.id}>
                        <td className="font-mono text-xs">{defect.distance_from_start_m.toFixed(1)} m</td>
                        <td><span className="capitalize text-xs text-slate-500">{defect.defect_type.replace('_', ' ')}</span></td>
                        <td className="font-mono text-xs">{defect.depth_percent != null ? `${defect.depth_percent.toFixed(1)}%` : '—'}</td>
                        <td><SeverityBadge level={defect.severity_level} /></td>
                        <td className="font-mono text-xs">{defect.corrosion_probability != null ? `${(defect.corrosion_probability * 100).toFixed(0)}%` : '—'}</td>
                        <td>{defect.risk_score != null ? <RiskScoreBadge score={defect.risk_score} /> : '—'}</td>
                        <td className="text-xs text-slate-400 font-mono">{defect.segment_label ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(defects?.length ?? 0) > 50 && (
                  <div className="px-4 py-2 text-xs text-slate-400 text-center bg-slate-50 border-t">
                    Showing 50 of {defects?.length}. Export CSV for full dataset.
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={AlertTriangle} title="No defects detected"
                description={run.status === 'completed' ? 'Analysis completed — no defects found.' : 'Upload a file and run analysis to detect defects.'} />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="card-header"><h2 className="card-title flex items-center gap-2"><Activity className="w-4 h-4" />Analysis Job</h2></div>
            <div className="p-4 space-y-3">
              {latestJob ? (
                <>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Status</span><JobStatusBadge status={latestJob.status} /></div>
                  {latestJob.status === 'processing' && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progress</span><span>{latestJob.progress_pct}%</span></div>
                      <div className="risk-bar"><div className="risk-bar-fill bg-blue-500" style={{ width: `${latestJob.progress_pct}%` }} /></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Defects found</span><span className="text-sm font-medium">{latestJob.defects_found}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Segments</span><span className="text-sm font-medium">{latestJob.segments_analyzed}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Analyzer</span><span className="text-xs font-mono text-slate-400">{latestJob.analyzer_version}</span></div>
                  {latestJob.started_at && latestJob.completed_at && (
                    <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Duration</span><span className="text-xs font-mono text-slate-600">{formatDuration(latestJob.started_at, latestJob.completed_at)}</span></div>
                  )}
                  {latestJob.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{latestJob.error_message}</div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 py-2">No analysis jobs yet.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Pipeline Details</h2></div>
            <dl className="p-4 space-y-2.5">
              {[['Code', pipeline?.code], ['Name', pipeline?.name], ['Material', pipeline?.material?.replace('_', ' ')], ['Fluid', pipeline?.transported_fluid?.replace('_', ' ')], ['Length', pipeline?.total_length_m ? formatDistance(pipeline.total_length_m) : null], ['Wall thickness', pipeline?.nominal_wall_thickness_mm ? `${pipeline.nominal_wall_thickness_mm} mm` : null], ['Max pressure', pipeline?.nominal_pressure_bar ? `${pipeline.nominal_pressure_bar} bar` : null]]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-slate-400 flex-shrink-0">{label}</dt>
                    <dd className="text-xs text-slate-700 font-medium text-right capitalize">{value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title flex items-center gap-2"><FileText className="w-4 h-4" />Uploaded Files</h2></div>
            {canEdit && (
              <div className="p-4 border-b border-slate-100">
                <FileUploadZone runId={params.id} orgId={membership.organization_id ?? ''} projectId={run.project_id} />
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {files && files.length > 0 ? files.map(file => (
                <div key={file.id} className="px-4 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{file.original_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{file.file_size_bytes ? formatFileSize(file.file_size_bytes) : ''} · {file.processing_state}</p>
                  </div>
                </div>
              )) : (
                <div className="px-4 py-6 text-center text-sm text-slate-400">No files uploaded yet.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Run Information</h2></div>
            <dl className="p-4 space-y-2.5">
              {[['Tool type', run.tool_type], ['Vendor', run.tool_vendor], ['Date', formatDate(run.inspection_date)], ['Created', formatDateTime(run.created_at)]]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <dt className="text-xs text-slate-400">{label}</dt>
                    <dd className="text-xs text-slate-700 font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
            {run.comment && <div className="px-4 pb-4"><p className="text-xs text-slate-500 italic">{run.comment}</p></div>}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
