import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SeverityLevel, JobStatus, RunStatus, ProjectStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${meters.toFixed(1)} m`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const diffMs = end.getTime() - start.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return `${diffSec}s`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`
  return `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`
}

export function severityColor(level: SeverityLevel): string {
  const map: Record<SeverityLevel, string> = {
    low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    critical: 'text-red-700 bg-red-50 border-red-200',
  }
  return map[level]
}

export function severityDot(level: SeverityLevel): string {
  const map: Record<SeverityLevel, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  }
  return map[level]
}

export function jobStatusColor(status: JobStatus): string {
  const map: Record<JobStatus, string> = {
    queued: 'text-slate-600 bg-slate-100 border-slate-200',
    processing: 'text-blue-700 bg-blue-50 border-blue-200',
    completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    cancelled: 'text-slate-500 bg-slate-100 border-slate-200',
  }
  return map[status]
}

export function runStatusColor(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    draft: 'text-slate-600 bg-slate-100 border-slate-200',
    files_uploaded: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    queued: 'text-amber-700 bg-amber-50 border-amber-200',
    processing: 'text-blue-700 bg-blue-50 border-blue-200',
    completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    archived: 'text-slate-500 bg-slate-100 border-slate-200',
  }
  return map[status]
}

export function projectStatusColor(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    completed: 'text-slate-600 bg-slate-100 border-slate-200',
    on_hold: 'text-amber-700 bg-amber-50 border-amber-200',
    cancelled: 'text-red-700 bg-red-50 border-red-200',
  }
  return map[status]
}

export function riskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-700'
  if (score >= 60) return 'text-orange-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-emerald-600'
}

export function riskScoreBar(score: number): string {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function labelSeverity(level: SeverityLevel): string {
  const map: Record<SeverityLevel, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }
  return map[level]
}

export function labelJobStatus(status: JobStatus): string {
  const map: Record<JobStatus, string> = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return map[status]
}

export function labelRunStatus(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    draft: 'Draft',
    files_uploaded: 'Files Uploaded',
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    archived: 'Archived',
  }
  return map[status]
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') ? `"${str}"` : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
