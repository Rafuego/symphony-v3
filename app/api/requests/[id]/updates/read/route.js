import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST /api/requests/[id]/updates/read  body: { side: 'client' | 'admin' }
// Marks the feed read for one side by upserting last_read_at = now().
export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const { side } = await request.json()

    if (side !== 'client' && side !== 'admin') {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }

    const { error } = await supabase
      .from('request_update_reads')
      .upsert(
        { request_id: id, viewer_side: side, last_read_at: new Date().toISOString() },
        { onConflict: 'request_id,viewer_side' }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking updates read:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
