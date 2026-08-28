'use client'

import { useRef, useState } from 'react'
import { uploadFile } from '@/lib/uploadFile'
import { normalizeFile } from '@/components/v2/lib/fileAdapter'

const DEFAULT_ACCEPT_HINT = 'Accepts PDF, ZIP, AI, PNG, JPG, SVG · Max 25 MB per file'

// Drag-and-drop + click-to-upload zone. Uploads each file directly to Supabase via
// the shared uploadFile helper, then calls onUploaded(normalizedFiles).
export default function FileDropzone({
  clientId,
  onUploaded,
  multiple = true,
  acceptHint = DEFAULT_ACCEPT_HINT,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    setProgress({ done: 0, total: files.length })
    try {
      // Upload in parallel so 5 files don't take 5× the time. Individual
      // failures don't block the rest — they surface in the error line.
      const results = await Promise.allSettled(
        files.map((file) =>
          uploadFile(file, clientId).then((data) => {
            setProgress((p) => ({ ...p, done: p.done + 1 }))
            return normalizeFile({ ...data, addedAt: new Date().toISOString() })
          })
        )
      )
      const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
      const failed = results.filter((r) => r.status === 'rejected')
      if (uploaded.length > 0) onUploaded?.(uploaded)
      if (failed.length > 0) {
        const first = failed[0].reason?.message || 'Upload failed'
        setError(failed.length === 1 ? first : `${failed.length} of ${files.length} files failed: ${first}`)
      }
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress({ done: 0, total: 0 })
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!disabled && !uploading) handleFiles(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-1 px-4 py-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#8B7355] bg-[#8B7355]/5'
            : 'border-gray-300 hover:border-[#8B7355] hover:bg-gray-50'
        } ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className="text-gray-400 text-lg" aria-hidden="true">⬆</span>
        {uploading ? (
          <>
            <span className="text-sm text-gray-500">
              Uploading {progress.done} of {progress.total}…
            </span>
            {progress.total > 1 && (
              <div className="w-40 h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8B7355] transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-sm text-gray-600">
              Drag and drop files or <span className="text-[#8B7355] font-medium">choose files</span> to upload
            </span>
            <span className="text-xs text-gray-400">
              {multiple ? 'Select multiple at once · ' : ''}{acceptHint}
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
