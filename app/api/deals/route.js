import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/deals - Get all pending deals
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: deals, error } = await supabase
      .from('pending_deals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ deals: deals || [] })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/deals - Create a new pending deal
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { name, contactName, contactEmail, plan, estimatedPrice, notes, status } = body

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const { data: deal, error } = await supabase
      .from('pending_deals')
      .insert({
        name,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        plan: plan || 'growth',
        estimated_price: estimatedPrice ? parseInt(estimatedPrice) : null,
        notes: notes || null,
        status: status || 'lead'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
