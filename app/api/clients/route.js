import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { v4 as uuidv4 } from 'uuid'

// GET /api/clients - Get all clients (admin only)
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    
    // In production, verify admin auth here
    // const authHeader = request.headers.get('authorization')
    // if (!isValidAdmin(authHeader)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        requests (id, status)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Calculate request counts
    const clientsWithCounts = clients.map(client => ({
      ...client,
      activeCount: client.requests?.filter(r => 
        r.status === 'in-progress' || r.status === 'in-review'
      ).length || 0,
      queuedCount: client.requests?.filter(r => r.status === 'in-queue').length || 0,
      completedCount: client.requests?.filter(r => r.status === 'completed').length || 0,
      requests: undefined // Don't send full requests array
    }))
    
    return NextResponse.json({ clients: clientsWithCounts })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/clients - Create new client (admin only)
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    
    const { name, plan, password, passwordEnabled, customPlan } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Hash password if provided
    let passwordHash = null
    if (password && passwordEnabled) {
      passwordHash = await hashPassword(password)
    }
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name,
        slug,
        plan: plan || 'growth',
        password_hash: passwordHash,
        password_enabled: passwordEnabled && !!password,
        custom_price: customPlan?.price ? parseInt(customPlan.price) : null,
        custom_max_active: customPlan?.maxActive ? parseInt(customPlan.maxActive) : null,
        custom_designers: customPlan?.designers || null,
        access_token: uuidv4()
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
