'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Legend, Cell
} from 'recharts'
import type { Defect, SegmentRiskScore } from '@/types'

interface DefectChartsProps {
  defects: Defect[]
  segments: SegmentRiskScore[]
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

export function DefectCharts({ defects, segments }: DefectChartsProps) {
  // Severity distribution
  const severityCounts = ['low', 'medium', 'high', 'critical'].map(s => ({
    severity: s.charAt(0).toUpperCase() + s.slice(1),
    count: defects.filter(d => d.severity_level === s).length,
    color: SEVERITY_COLORS[s],
  })).filter(d => d.count > 0)

  // Top 10 highest risk segments
  const topSegments = [...segments]
    .sort((a, b) => (b.aggregated_risk_score ?? 0) - (a.aggregated_risk_score ?? 0))
    .slice(0, 10)
    .map(s => ({
      label: s.segment_label,
      risk: s.aggregated_risk_score?.toFixed(1),
      defects: s.defect_count,
    }))

  // Depth profile (sample every N defects for readability)
  const sampleStep = Math.max(1, Math.floor(defects.length / 80))
  const depthProfile = defects
    .filter((_, i) => i % sampleStep === 0)
    .map(d => ({
      km: (d.distance_from_start_m / 1000).toFixed(2),
      depth: d.depth_percent?.toFixed(1) ?? 0,
      risk: d.risk_score?.toFixed(0) ?? 0,
    }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Severity distribution */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Defects by Severity
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={severityCounts} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderColor: '#e2e8f0', borderRadius: 6 }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {severityCounts.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top segments by risk */}
      {topSegments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Highest Risk Segments
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topSegments} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="label" width={60} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: '#e2e8f0', borderRadius: 6 }} />
              <Bar dataKey="risk" fill="#64748b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Depth profile */}
      {depthProfile.length > 0 && (
        <div className="md:col-span-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Wall Loss Profile (depth %)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={depthProfile} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="km" label={{ value: 'km', position: 'insideRight', offset: 10, fontSize: 10, fill: '#94a3b8' }} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: '#e2e8f0', borderRadius: 6 }}
                formatter={(val) => [`${val}%`, 'Depth']} />
              <Line
                type="monotone"
                dataKey="depth"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
