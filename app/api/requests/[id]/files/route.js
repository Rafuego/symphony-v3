import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST /api/requests/[id]/files - Add file to request (admin only)
export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params
    const { name, url, fileType } = await request.json()
    
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL required' }, { status: 400 })
    }
    
    const { data: file, error } = await supabase
      .from('request_files')
      .insert({
        request_id: id,
        name,
        url,
        file_type: fileType || 'file'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ file })
  } catch (error) {
    console.error('Error adding file:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/requests/[id]/files - Delete file from request (admin only)
export async function DELETE(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('request_files')
      .delete()
      .eq('id', fileId)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
