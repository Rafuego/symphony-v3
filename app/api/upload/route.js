import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Allow larger file uploads (up to 25MB)
export const config = {
  api: {
    bodyParser: false,
  },
}

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/upload - Upload a file to Supabase Storage
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const formData = await request.formData()
    
    const file = formData.get('file')
    const clientId = formData.get('clientId')
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum 25MB.' }, { status: 400 })
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'file'
    const filename = `${clientId}/${timestamp}-${randomString}.${extension}`
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Supabase Storage
    // Try 'request-files' bucket first, create it if it doesn't exist
    let bucket = 'request-files'
    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    // If bucket doesn't exist, create it and retry
    if (error && (error.message?.includes('not found') || error.statusCode === 404 || error.message?.includes('Bucket'))) {
      console.log('Creating storage bucket:', bucket)
      await supabase.storage.createBucket(bucket, { public: true })
      const retry = await supabase.storage
        .from(bucket)
        .upload(filename, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        })
      data = retry.data
      error = retry.error
    }

    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('request-files')
      .getPublicUrl(filename)
    
    return NextResponse.json({ 
      url: publicUrl,
      filename: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
