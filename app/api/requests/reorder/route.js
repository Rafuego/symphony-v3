import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST /api/requests/reorder - Reorder queue priorities.
// Accepts either:
//   { clientId, orderedIds: [id1, id2, ...] } — full reorder (drag-and-drop)
//   { clientId, requestId, direction: 'up'|'down' } — single step (legacy)
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const { clientId, requestId, direction, orderedIds } = body

    // Full reorder mode
    if (clientId && Array.isArray(orderedIds)) {
      // Assign priorities 1..N in the given order
      const updates = orderedIds.map((id, i) =>
        supabase
          .from('requests')
          .update({ priority: i + 1 })
          .eq('id', id)
          .eq('client_id', clientId)
          .eq('status', 'in-queue')
      )
      const results = await Promise.all(updates)
      const firstError = results.find(r => r.error)?.error
      if (firstError) throw firstError
      return NextResponse.json({ success: true, count: orderedIds.length })
    }

    if (!clientId || !requestId || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Get all queued requests for this client
    const { data: queuedRequests, error: fetchError } = await supabase
      .from('requests')
      .select('id, priority')
      .eq('client_id', clientId)
      .eq('status', 'in-queue')
      .order('priority', { ascending: true })
    
    if (fetchError) throw fetchError
    
    const currentIndex = queuedRequests.findIndex(r => r.id === requestId)
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Request not in queue' }, { status: 400 })
    }
    
    let swapIndex
    if (direction === 'up' && currentIndex > 0) {
      swapIndex = currentIndex - 1
    } else if (direction === 'down' && currentIndex < queuedRequests.length - 1) {
      swapIndex = currentIndex + 1
    } else {
      return NextResponse.json({ success: true, message: 'No change needed' })
    }
    
    // Swap priorities
    const currentRequest = queuedRequests[currentIndex]
    const swapRequest = queuedRequests[swapIndex]
    
    const { error: updateError } = await supabase.rpc('swap_priorities', {
      request_id_1: currentRequest.id,
      priority_1: swapRequest.priority,
      request_id_2: swapRequest.id,
      priority_2: currentRequest.priority
    })
    
    // Fallback if RPC doesn't exist - do two updates
    if (updateError) {
      await supabase
        .from('requests')
        .update({ priority: -1 })
        .eq('id', currentRequest.id)
      
      await supabase
        .from('requests')
        .update({ priority: currentRequest.priority })
        .eq('id', swapRequest.id)
      
      await supabase
        .from('requests')
        .update({ priority: swapRequest.priority })
        .eq('id', currentRequest.id)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
