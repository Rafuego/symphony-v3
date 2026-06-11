import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { updateNotionPage } from '@/lib/notion'
import { logSystemEvent } from '@/lib/requestEvents'

// PATCH /api/requests/[id] - Update request
export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const body = await request.json()

    const updates = {}

    // v2 clients pass an actor ({ type, name }) to attribute the change in the
    // Updates feed. Legacy UI omits it, so no events are logged for prod paths.
    const actor = body.actor
    let before = null
    if (actor && (body.status !== undefined || body.assigneeName !== undefined)) {
      const { data } = await supabase
        .from('requests')
        .select('status, assignee_name')
        .eq('id', id)
        .single()
      before = data
    }

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
    if (body.requestedDueDate !== undefined) updates.requested_due_date = body.requestedDueDate || null

    // Assignment (designer) — denormalized snapshot
    if (body.assigneeName !== undefined) updates.assignee_name = body.assigneeName || null
    if (body.assigneeId !== undefined) updates.assignee_id = body.assigneeId || null

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
      if (updates.requested_due_date !== undefined) notionUpdates.requestedDueDate = updates.requested_due_date

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

    // Log system events to the Updates feed (v2 only — gated on `actor`).
    if (actor && before) {
      if (body.status !== undefined && before.status !== body.status) {
        await logSystemEvent(supabase, {
          requestId: id,
          eventType: 'status_changed',
          eventMeta: { from: before.status, to: body.status, assignee: updatedRequest.assignee_name || null },
          actor,
        })
      }
      if (body.assigneeName !== undefined && (before.assignee_name || null) !== (body.assigneeName || null)) {
        await logSystemEvent(supabase, {
          requestId: id,
          eventType: 'assigned',
          eventMeta: { assignee: body.assigneeName || null },
          actor,
        })
      }
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
