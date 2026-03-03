import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// PATCH /api/deals/[id] - Update a pending deal
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const updates = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.contactName !== undefined) updates.contact_name = body.contactName || null
    if (body.contactEmail !== undefined) updates.contact_email = body.contactEmail || null
    if (body.plan !== undefined) updates.plan = body.plan
    if (body.estimatedPrice !== undefined) updates.estimated_price = body.estimatedPrice ? parseInt(body.estimatedPrice) : null
    if (body.notes !== undefined) updates.notes = body.notes || null
    if (body.status !== undefined) updates.status = body.status

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('pending_deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/deals/[id] - Delete a pending deal
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('pending_deals')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
