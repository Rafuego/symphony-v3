import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/requests/[id]/updates?side=client|admin
// Returns the request's updates feed (newest first) plus the requesting side's
// last_read_at so the client can compute unread state.
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const side = new URL(request.url).searchParams.get('side')

    const { data: updates, error } = await supabase
      .from('request_updates')
      .select('*')
      .eq('request_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    let lastReadAt = null
    if (side === 'client' || side === 'admin') {
      const { data: read } = await supabase
        .from('request_update_reads')
        .select('last_read_at')
        .eq('request_id', id)
        .eq('viewer_side', side)
        .maybeSingle()
      lastReadAt = read?.last_read_at || null
    }

    return NextResponse.json({ updates: updates || [], lastReadAt })
  } catch (error) {
    console.error('Error fetching request updates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/requests/[id]/updates
// Creates a typed user post: { kind, body, links, files, actor: { type, name } }
const POST_KINDS = ['comment', 'new_requirement', 'changes']

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const { kind = 'comment', body, links = [], files = [], actor } = await request.json()

    if (!POST_KINDS.includes(kind)) {
      return NextResponse.json({ error: `Invalid kind "${kind}"` }, { status: 400 })
    }
    if (!body && (!files || files.length === 0) && (!links || links.length === 0)) {
      return NextResponse.json({ error: 'Update is empty' }, { status: 400 })
    }

    const { data: update, error } = await supabase
      .from('request_updates')
      .insert({
        request_id: id,
        kind,
        body: body || null,
        links: links || [],
        files: files || [],
        author_type: actor?.type || 'client',
        author_name: actor?.name || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ update })
  } catch (error) {
    console.error('Error creating request update:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
