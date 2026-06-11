// Normalizes file objects across the app.
//
// lib/uploadFile.js returns { url, filename, type, size }, but stored attachments /
// brand_assets / deliverables use { name, url, type, size }. Existing readers use `.name`.
// Every v2 file UI goes through normalizeFile so a filename never renders blank.

export function normalizeFile(file) {
  if (!file) return null
  return {
    name: file.name || file.filename || 'Untitled',
    url: file.url || '',
    type: file.type || '',
    size: typeof file.size === 'number' ? file.size : null,
    addedAt: file.addedAt || file.uploadedAt || null,
    uploadedBy: file.uploadedBy || null,
  }
}

export function normalizeFiles(files) {
  if (!Array.isArray(files)) return []
  return files.map(normalizeFile).filter(Boolean)
}

// Bytes -> "2.4 MB" / "18.7 KB". Returns '' when size is unknown.
export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

// "Uploaded Apr 22, 2026" style date for file rows.
export function formatUploadedDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function isImageFile(file) {
  return (file?.type || '').startsWith('image/')
}
