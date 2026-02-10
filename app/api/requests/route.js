import { NextResponse } from 'next/server'
import { createServerSupabaseClient, planConfig } from '@/lib/supabase'
import { sendSlackNotification, formatRequestType } from '@/lib/slack'

// POST /api/requests - Create new request
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    
    const { clientId, title, description, requestType, links, attachments } = body
    
    if (!clientId || !title) {
      return NextResponse.json({ error: 'Client ID and title are required' }, { status: 400 })
    }
    
    // Get client info for capacity check and notification
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, plan, custom_max_active')
      .eq('id', clientId)
      .single()
    
    // Get max active capacity for this client
    const maxActive = client?.custom_max_active || planConfig[client?.plan]?.defaultMaxActive || 1
    
    // Count current active requests
    const { count: activeCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .in('status', ['in-progress', 'in-review'])
    
    // Determine if we should auto-promote to in-progress
    const hasCapacity = (activeCount || 0) < maxActive
    const initialStatus = hasCapacity ? 'in-progress' : 'in-queue'
    const startedAt = hasCapacity ? new Date().toISOString() : null
    
    // Get the next priority number for this client's queue
    const { data: existingRequests } = await supabase
      .from('requests')
      .select('priority')
      .eq('client_id', clientId)
      .eq('status', 'in-queue')
      .order('priority', { ascending: false })
      .limit(1)
    
    const nextPriority = existingRequests?.length > 0 
      ? (existingRequests[0].priority || 0) + 1 
      : 1
    
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({
        client_id: clientId,
        title,
        description,
        request_type: requestType || 'misc',
        links: links || [],
        attachments: attachments || [],
        status: initialStatus,
        started_at: startedAt,
        priority: nextPriority
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Create notification in database
    const notificationMessage = `${title}${description ? ': ' + description.substring(0, 100) : ''}`
    await supabase
      .from('notifications')
      .insert({
        type: 'new_request',
        title: `New request from ${client?.name || 'Client'}`,
        message: notificationMessage,
        client_id: clientId,
        request_id: newRequest.id
      })
    
    // Send Slack notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    await sendSlackNotification({
      title: `New Request from ${client?.name || 'Client'}`,
      message: notificationMessage,
      clientName: client?.name || 'Unknown',
      requestType: formatRequestType(requestType || 'misc'),
      link: `${baseUrl}/admin`
    })
    
    return NextResponse.json({ request: newRequest })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
