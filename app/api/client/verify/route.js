import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// POST /api/client/verify - Verify client access token and optional password
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { token, password } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }
    
    // Find client by access token
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, logo, password_enabled, password_hash')
      .eq('access_token', token)
      .single()
    
    if (error || !client) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 })
    }
    
    // Check if password is required
    if (client.password_enabled) {
      if (!password) {
        return NextResponse.json({ 
          requiresPassword: true,
          clientName: client.name,
          clientLogo: client.logo
        })
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, client.password_hash)
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
    }
    
    // Return client ID for fetching full data
    return NextResponse.json({ 
      verified: true,
      clientId: client.id,
      clientName: client.name
    })
  } catch (error) {
    console.error('Error verifying client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
