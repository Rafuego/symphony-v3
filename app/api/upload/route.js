import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST /api/upload - Generate a signed upload URL for direct-to-Supabase uploads
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { filename, contentType, clientId } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 })
    }

    // Generate unique storage path
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = filename.split('.').pop() || 'file'
    const path = `${clientId || 'general'}/${timestamp}-${randomString}.${extension}`

    const bucket = 'request-files'

    // Create signed upload URL
    let { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    // If bucket doesn't exist, create it and retry
    if (error && (error.message?.includes('not found') || error.statusCode === 404 || error.message?.includes('Bucket'))) {
      await supabase.storage.createBucket(bucket, { public: true })
      const retry = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path)
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    // Build the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl
    })
  } catch (error) {
    console.error('Error creating upload URL:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
