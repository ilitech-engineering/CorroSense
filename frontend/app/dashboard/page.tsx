import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { RunStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { FolderOpen, GitBranch, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  // Auth check with regular client (reads session cookie)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Data fetching with service client (bypasses RLS — user is verified above)
  const db = await createServiceClient()

  const { data: membership } = await db
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return (
      <AppShell>
        <Header breadcrumbs={[{ label: 'Dashboard' }]} />
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="card p-8 text-center">
          <p className="text-slate-500 text-sm">Your account is not linked to any organization.</p>
          <p className="text-slate-400 text-xs mt-2">Contact your administrator or check the setup guide.</p>
        </div>
      </AppShell>
    )
  }

  const orgId = membership.organization_id

  const [
    { count: projectCount },
    { count: pipelineCount },
    { count: runCount },
    { count: criticalCount },
    { count: highCount },
    { data: recentRuns },
    { data: recentJobs },
  ] = await Promise.all([
    db.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    db.from('pipelines').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    db.from('inspection_runs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    db.from('defects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('severity_level', 'critical'),
    db.from('defects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('severity_level', 'high'),
    db.from('inspection_runs')
      .select('id, name, inspection_date, status, pipelines(name, code)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('analysis_jobs')
      .select('id, status, defects_found, queued_at, inspection_runs(name)')
      .eq('organization_id', orgId)
      .order('queued_at', { ascending: false })
      .limit(5),
  ])

  const orgName = (membership.organizations as any)?.name ?? 'Your Organization'

  return (
    <AppShell>
      <Header breadcrumbs={[{ label: 'Dashboard' }]} />

      <div className="page-header">
        <h1 className="page-title">Operations Overview</h1>
        <p className="page-subtitle">{orgName} · Pipeline Integrity Dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard label="Active Projects"  value={projectCount ?? 0}  icon={FolderOpen} />
        <KpiCard label="Pipelines"        value={pipelineCount ?? 0} icon={GitBranch} />
        <KpiCard label="Total Runs"       value={runCount ?? 0}      icon={Activity} />
        <KpiCard label="Critical Defects" value={criticalCount ?? 0} icon={AlertTriangle} iconColor="text-red-400" highlight={(criticalCount ?? 0) > 0} />
        <KpiCard label="High Severity"    value={highCount ?? 0}     icon={AlertTriangle} iconColor="text-orange-400" />
        <KpiCard label="Total Flagged"    value={(criticalCount ?? 0) + (highCount ?? 0)} sub="critical + high" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title">Recent Inspection Runs</h2>
            <Link href="/runs" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRuns && recentRuns.length > 0 ? recentRuns.map(run => (
              <Link key={run.id} href={`/runs/${run.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{run.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(run.pipelines as any)?.code} · {formatDate(run.inspection_date)}
                  </p>
                </div>
                <RunStatusBadge status={run.status as any} />
              </Link>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No runs yet. <Link href="/runs/new" className="text-slate-600 underline">Create one</Link>.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title">Recent Analysis Jobs</h2>
            <Clock className="w-4 h-4 text-slate-300" />
          </div>
          <div className="divide-y divide-slate-100">
            {recentJobs && recentJobs.length > 0 ? recentJobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {(job.inspection_runs as any)?.name ?? 'Unknown run'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {job.defects_found} defects · {formatDate(job.queued_at)}
                  </p>
                </div>
                <span className={`badge ${
                  job.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                  job.status === 'failed'    ? 'text-red-700 bg-red-50 border-red-200' :
                  'text-blue-700 bg-blue-50 border-blue-200'}`}>
                  {job.status}
                </span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No analysis jobs yet.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
