import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/notifications - Fetch all notifications
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabase
      .from('notifications')
      .select(`
        *,
        clients (name),
        requests (title)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (unreadOnly) {
      query = query.eq('read', false)
    }
    
    const { data: notifications, error } = await query
    
    if (error) throw error
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    
    return NextResponse.json({ 
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const { ids, markAllRead } = body
    
    if (markAllRead) {
      // Mark all as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
      
      if (error) throw error
    } else if (ids && ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids)
      
      if (error) throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/notifications - Clear old notifications
export async function DELETE(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const olderThanDays = parseInt(searchParams.get('days') || '30')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('read', true)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
