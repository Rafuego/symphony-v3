import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'

// GET /api/clients/[id] - Get single client with requests
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        requests (
          *,
          request_files (*)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    // Sort requests by priority and status
    if (client.requests) {
      client.requests.sort((a, b) => {
        const statusOrder = { 'in-progress': 0, 'in-review': 1, 'in-queue': 2, 'completed': 3 }
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        return a.priority - b.priority
      })
    }
    
    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/clients/[id] - Update client (admin only)
export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const body = await request.json()
    
    const updates = {}
    
    if (body.name !== undefined) updates.name = body.name
    if (body.plan !== undefined) updates.plan = body.plan
    if (body.logo !== undefined) updates.logo = body.logo
    
    // Handle custom plan config
    if (body.customPlan !== undefined) {
      updates.custom_price = body.customPlan?.price ? parseInt(body.customPlan.price) : null
      updates.custom_max_active = body.customPlan?.maxActive ? parseInt(body.customPlan.maxActive) : null
      updates.custom_designers = body.customPlan?.designers || null
    }
    
    // Handle brand assets
    if (body.brandAssets !== undefined) {
      updates.brand_assets = body.brandAssets
    }

    // Account profile fields (redesign Settings > Account)
    if (body.website !== undefined) updates.website = body.website || null
    if (body.description !== undefined) updates.description = body.description || null
    if (body.pointOfContact !== undefined) updates.point_of_contact = body.pointOfContact || {}
    if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl || null

    // Handle client tag (symphony / legacy_drip)
    if (body.clientTag !== undefined) {
      updates.client_tag = body.clientTag || null
    }

    // Handle client status (active / paused)
    if (body.clientStatus !== undefined) {
      updates.client_status = body.clientStatus || 'active'
    }

    // Handle Notion database ID
    if (body.notionDatabaseId !== undefined) {
      updates.notion_database_id = body.notionDatabaseId || null
    }

    // Handle Notion project page ID (maps this client to a Notion project for the Client relation)
    if (body.notionProjectId !== undefined) {
      updates.notion_project_id = body.notionProjectId || null
    }

    // Handle Notion template page ID (per-client template for new task pages)
    if (body.notionTemplateId !== undefined) {
      updates.notion_template_id = body.notionTemplateId || null
    }

    // Handle password updates
    if (body.password !== undefined) {
      if (body.password && body.passwordEnabled) {
        updates.password_hash = await hashPassword(body.password)
        updates.password_enabled = true
      } else {
        updates.password_enabled = false
      }
    } else if (body.passwordEnabled !== undefined) {
      updates.password_enabled = body.passwordEnabled
    }
    
    const { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/clients/[id] - Delete client (admin only)
export async function DELETE(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
