'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import type { AnalysisJob, RunStatus } from '@/types'

interface AnalyzeButtonProps {
  runId: string
  currentStatus: RunStatus
  hasFiles: boolean
  latestJob: AnalysisJob | null
}

export function AnalyzeButton({ runId, currentStatus, hasFiles, latestJob }: AnalyzeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(
    latestJob?.status === 'queued' || latestJob?.status === 'processing'
  )

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      const data = await res.json()
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        setPolling(false)
        router.refresh()
      }
    } catch {
      setPolling(false)
    }
  }, [router])

  useEffect(() => {
    if (!polling || !latestJob?.id) return
    const interval = setInterval(() => pollJobStatus(latestJob.id), 3000)
    return () => clearInterval(interval)
  }, [polling, latestJob?.id, pollJobStatus])

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/runs/${runId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to start analysis')
      } else {
        setPolling(true)
        router.refresh()
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isProcessing = latestJob?.status === 'queued' || latestJob?.status === 'processing'
  const canAnalyze = hasFiles && !isProcessing && currentStatus !== 'archived'

  return (
    <div className="flex items-center gap-2">
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
      {polling && (
        <span className="text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing…
        </span>
      )}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze || loading || polling}
        className="btn-primary btn-sm"
        title={!hasFiles ? 'Upload files first' : ''}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : latestJob?.status === 'completed' ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        {latestJob?.status === 'completed' ? 'Re-analyze' : 'Analyze'}
      </button>
    </div>
  )
}
