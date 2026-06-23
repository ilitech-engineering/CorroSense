import { cn, severityColor, jobStatusColor, runStatusColor, projectStatusColor, labelSeverity, labelJobStatus, labelRunStatus } from '@/lib/utils'
import type { SeverityLevel, JobStatus, RunStatus, ProjectStatus } from '@/types'

interface SeverityBadgeProps {
  level: SeverityLevel
  className?: string
}

export function SeverityBadge({ level, className }: SeverityBadgeProps) {
  return (
    <span className={cn('badge', severityColor(level), className)}>
      {labelSeverity(level)}
    </span>
  )
}

interface JobStatusBadgeProps {
  status: JobStatus
  className?: string
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  return (
    <span className={cn('badge', jobStatusColor(status), className)}>
      {labelJobStatus(status)}
    </span>
  )
}

interface RunStatusBadgeProps {
  status: RunStatus
  className?: string
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  return (
    <span className={cn('badge', runStatusColor(status), className)}>
      {labelRunStatus(status)}
    </span>
  )
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const labels: Record<ProjectStatus, string> = {
    active: 'Active',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  }
  return (
    <span className={cn('badge', projectStatusColor(status), className)}>
      {labels[status]}
    </span>
  )
}

interface RiskScoreBadgeProps {
  score: number
  className?: string
}

export function RiskScoreBadge({ score, className }: RiskScoreBadgeProps) {
  const color =
    score >= 80 ? 'text-red-700 bg-red-50 border-red-200'
    : score >= 60 ? 'text-orange-700 bg-orange-50 border-orange-200'
    : score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  return (
    <span className={cn('badge font-mono', color, className)}>
      {score.toFixed(1)}
    </span>
  )
}
