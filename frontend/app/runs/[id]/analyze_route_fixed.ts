import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runId = params.id

  // Verify membership and get org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || !['admin', 'engineer'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Verify run belongs to org
  const { data: run } = await supabase
    .from('inspection_runs')
    .select('id, pipeline_id, status')
    .eq('id', runId)
    .eq('organization_id', membership.organization_id)
    .single()

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  // Check for uploaded files
  const { count: fileCount } = await supabase
    .from('uploaded_files')
    .select('*', { count: 'exact', head: true })
    .eq('run_id', runId)

  if (!fileCount || fileCount === 0) {
    return NextResponse.json({ error: 'No files uploaded. Upload inspection files before running analysis.' }, { status: 400 })
  }

  // Create analysis job record
  const { data: job, error: jobError } = await serviceClient
    .from('analysis_jobs')
    .insert({
      organization_id: membership.organization_id,
      run_id: runId,
      status: 'queued',
      progress_pct: 0,
      analyzer_version: 'mock-v1',
      created_by: user.id,
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 })
  }

  // Update run status
  await serviceClient
    .from('inspection_runs')
    .update({ status: 'queued' })
    .eq('id', runId)

  // Fire and forget – call FastAPI analysis service
  const analyzerUrl = (process.env.ANALYZER_SERVICE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

  try {
    fetch(`${analyzerUrl}/analyze-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.ANALYZER_SERVICE_KEY ?? '',
      },
      body: JSON.stringify({
        job_id: job.id,
        run_id: runId,
        organization_id: membership.organization_id,
        pipeline_id: run.pipeline_id,
      }),
    }).catch(err => {
      console.error('[analyze] Failed to reach analyzer service:', err)
    })
  } catch (e) {
    console.error('[analyze] Unexpected error calling analyzer:', e)
  }

  return NextResponse.json({
    job_id: job.id,
    status: 'queued',
    message: 'Analysis job queued successfully.',
  })
}
