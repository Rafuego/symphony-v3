import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { updateNotionPage } from '@/lib/notion'

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
    if (body.extensionHours !== undefined) updates.extension_hours = body.extensionHours
    if (body.started_at !== undefined) updates.started_at = body.started_at
    if (body.extension_hours !== undefined) updates.extension_hours = body.extension_hours
    if (body.extension_note !== undefined) updates.extension_note = body.extension_note
    if (body.extension_requested !== undefined) updates.extension_requested = body.extension_requested
    
    // Editable fields
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.requestType !== undefined) updates.request_type = body.requestType
    if (body.links !== undefined) updates.links = body.links
    if (body.attachments !== undefined) updates.attachments = body.attachments
    if (body.deliverables !== undefined) updates.deliverables = body.deliverables
    
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

    // Sync changes to Notion if this request has a linked Notion page
    if (updatedRequest.notion_page_id) {
      const notionUpdates = { notionPageId: updatedRequest.notion_page_id }

      if (body.status !== undefined) notionUpdates.status = body.status
      if (body.priority !== undefined) notionUpdates.priority = body.priority
      if (body.extensionHours !== undefined || body.extension_hours !== undefined) {
        notionUpdates.extensionHours = body.extensionHours ?? body.extension_hours
      }
      if (updates.started_at !== undefined) notionUpdates.startedAt = updates.started_at
      if (updates.completed_at !== undefined) notionUpdates.completedAt = updates.completed_at

      // If title changed, look up client name for "ClientName: Title" format
      if (body.title !== undefined) {
        notionUpdates.title = body.title
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', updatedRequest.client_id)
          .single()
        if (client) notionUpdates.clientName = client.name
      }

      await updateNotionPage(notionUpdates)
    }

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
