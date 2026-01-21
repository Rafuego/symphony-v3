import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// PATCH /api/requests/[id] - Update request
export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const body = await request.json()
    
    const updates = {}
    
    if (body.status !== undefined) {
      updates.status = body.status
      
      // Set started_at when moving to in-progress
      if (body.status === 'in-progress') {
        const { data: currentRequest } = await supabase
          .from('requests')
          .select('started_at')
          .eq('id', id)
          .single()
        
        if (!currentRequest?.started_at) {
          updates.started_at = new Date().toISOString()
        }
      }
      
      // Set completed_at when moving to completed
      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }
    
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.adminNotes !== undefined) updates.admin_notes = body.adminNotes
    if (body.extensionRequested !== undefined) updates.extension_requested = body.extensionRequested
    if (body.extensionNote !== undefined) updates.extension_note = body.extensionNote
    
    // Editable fields
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.requestType !== undefined) updates.request_type = body.requestType
    if (body.links !== undefined) updates.links = body.links
    if (body.attachments !== undefined) updates.attachments = body.attachments
    
    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        request_files (*)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ request: updatedRequest })
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/requests/[id] - Delete request (admin only)
export async function DELETE(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
