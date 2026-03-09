// Direct-to-Supabase file upload using signed URLs
// Bypasses Vercel's 4.5MB body limit by uploading directly from browser to Supabase Storage

export async function uploadFile(file, clientId) {
  // Validate file size (25MB max)
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum 25MB.')
  }

  // 1. Get signed upload URL from our API
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      clientId
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to get upload URL')
  }

  const { signedUrl, token, publicUrl } = await res.json()
  if (!signedUrl) throw new Error('No signed URL returned')

  // 2. Upload file directly to Supabase Storage (browser → Supabase, no server proxy)
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`Upload failed: ${text}`)
  }

  // 3. Return file metadata with public URL
  return {
    url: publicUrl,
    filename: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size
  }
}
