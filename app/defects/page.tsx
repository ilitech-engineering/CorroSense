import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { SeverityBadge, RiskScoreBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function DefectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: defects } = await supabase
    .from('defects')
    .select(`
      id, distance_from_start_m, defect_type, depth_percent, severity_level,
      corrosion_probability, risk_score, segment_label, created_at,
      inspection_runs(name, id),
      pipelines(code)
    `)
    .eq('organization_id', membership?.organization_id)
    .order('risk_score', { ascending: false })
    .limit(500)

  return (
    <AppShell>
      <Header breadcrumbs={[{ label: 'Defects Explorer' }]} />

      <div className="page-header">
        <h1 className="page-title">Defects Explorer</h1>
        <p className="page-subtitle">
          {defects?.length ?? 0} defects · sorted by risk score
        </p>
      </div>

      {/* Summary by severity */}
      {defects && defects.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['critical', 'high', 'medium', 'low'] as const).map(s => {
            const count = defects.filter(d => d.severity_level === s).length
            const colors = {
              critical: 'border-red-200 bg-red-50',
              high: 'border-orange-200 bg-orange-50',
              medium: 'border-amber-200 bg-amber-50',
              low: 'border-emerald-200 bg-emerald-50',
            }
            const textColors = {
              critical: 'text-red-700',
              high: 'text-orange-700',
              medium: 'text-amber-700',
              low: 'text-emerald-700',
            }
            return (
              <div key={s} className={`kpi-card border ${colors[s]}`}>
                <p className={`kpi-label ${textColors[s]}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</p>
                <p className={`kpi-value ${textColors[s]}`}>{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {defects && defects.length > 0 ? (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Pipeline</th>
                <th>Distance</th>
                <th>Type</th>
                <th>Depth %</th>
                <th>Corr. Prob.</th>
                <th>Severity</th>
                <th>Risk Score</th>
                <th>Segment</th>
              </tr>
            </thead>
            <tbody>
              {defects.map(defect => (
                <tr key={defect.id}>
                  <td>
                    <Link
                      href={`/runs/${(defect.inspection_runs as any)?.id}`}
                      className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {(defect.inspection_runs as any)?.name}
                    </Link>
                  </td>
                  <td>
                    <span className="text-xs font-mono text-slate-400">{(defect.pipelines as any)?.code}</span>
                  </td>
                  <td className="font-mono text-xs">{defect.distance_from_start_m.toFixed(1)} m</td>
                  <td>
                    <span className="text-xs capitalize text-slate-500">{defect.defect_type.replace('_', ' ')}</span>
                  </td>
                  <td className="font-mono text-xs">
                    {defect.depth_percent != null ? `${defect.depth_percent.toFixed(1)}%` : '—'}
                  </td>
                  <td className="font-mono text-xs">
                    {defect.corrosion_probability != null
                      ? `${(defect.corrosion_probability * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td><SeverityBadge level={defect.severity_level} /></td>
                  <td>
                    {defect.risk_score != null ? <RiskScoreBadge score={defect.risk_score} /> : '—'}
                  </td>
                  <td className="text-xs font-mono text-slate-400">{defect.segment_label ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={AlertTriangle}
            title="No defects found"
            description="Defects appear here after analysis jobs are completed."
          />
        </div>
      )}
    </AppShell>
  )
}
