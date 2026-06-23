'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface FileUploadZoneProps {
  runId: string
  orgId: string
  projectId: string
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  file?: File
  progress: number
  error?: string
}

export function FileUploadZone({ runId, orgId, projectId }: FileUploadZoneProps) {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle', progress: 0 })
  const [dragging, setDragging] = useState(false)

  async function uploadFile(file: File) {
    setState({ status: 'uploading', file, progress: 10 })

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `${orgId}/${projectId}/${runId}/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('raw-inspections')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) {
      setState({ status: 'error', file, progress: 0, error: uploadError.message })
      return
    }

    setState(s => ({ ...s, progress: 70 }))

    // Record metadata in DB
    const { error: dbError } = await supabase.from('uploaded_files').insert({
      organization_id: orgId,
      run_id: runId,
      filename,
      original_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || 'text/csv',
      storage_path: storagePath,
      storage_bucket: 'raw-inspections',
      processing_state: 'pending',
    })

    if (dbError) {
      setState({ status: 'error', file, progress: 0, error: dbError.message })
      return
    }

    // Update run status
    await supabase
      .from('inspection_runs')
      .update({ status: 'files_uploaded' })
      .eq('id', runId)

    setState({ status: 'success', file, progress: 100 })
    setTimeout(() => {
      setState({ status: 'idle', progress: 0 })
      router.refresh()
    }, 2000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.zip,.txt"
        onChange={handleChange}
        className="hidden"
      />
      <div
        onClick={() => state.status === 'idle' && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-md px-4 py-5 text-center cursor-pointer transition-colors
          ${dragging ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}
          ${state.status !== 'idle' ? 'cursor-default' : ''}
        `}
      >
        {state.status === 'idle' && (
          <>
            <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Drop file or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">CSV, JSON, ZIP · max 100 MB</p>
          </>
        )}

        {state.status === 'uploading' && (
          <>
            <Loader2 className="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-slate-600">{state.file?.name}</p>
            <p className="text-xs text-slate-400 mt-1">{formatFileSize(state.file?.size ?? 0)} · uploading…</p>
            <div className="mt-3 risk-bar max-w-[200px] mx-auto">
              <div className="risk-bar-fill bg-blue-500 transition-all duration-300" style={{ width: `${state.progress}%` }} />
            </div>
          </>
        )}

        {state.status === 'success' && (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-emerald-700">Upload complete</p>
            <p className="text-xs text-slate-400 mt-1">{state.file?.name}</p>
          </>
        )}

        {state.status === 'error' && (
          <>
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700">Upload failed</p>
            <p className="text-xs text-slate-500 mt-1">{state.error}</p>
            <button onClick={() => setState({ status: 'idle', progress: 0 })} className="text-xs text-slate-600 underline mt-2">
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
