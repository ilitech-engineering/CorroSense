import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const format = request.nextUrl.searchParams.get('format') ?? 'json'

  const { data: defects } = await supabase
    .from('defects')
    .select('*')
    .eq('run_id', params.id)
    .order('distance_from_start_m')

  if (!defects) return NextResponse.json({ error: 'No results found' }, { status: 404 })

  if (format === 'csv') {
    const headers = [
      'id', 'distance_from_start_m', 'segment_label', 'defect_type',
      'depth_mm', 'depth_percent', 'length_mm', 'width_mm',
      'corrosion_probability', 'severity_level', 'confidence_score', 'risk_score',
      'wall_thickness_mm', 'nominal_thickness_mm', 'signal_strength', 'anomaly_index',
      'created_at',
    ]
    const rows = defects.map(d =>
      headers.map(h => {
        const val = (d as any)[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') ? `"${str}"` : str
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="defects_run_${params.id}.csv"`,
      },
    })
  }

  return NextResponse.json({ defects, count: defects.length })
}
