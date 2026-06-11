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
  const [error, setError] = useState(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const uploaded = []
      for (const file of files) {
        const data = await uploadFile(file, clientId)
        uploaded.push(normalizeFile({ ...data, addedAt: new Date().toISOString() }))
      }
      onUploaded?.(uploaded)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
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
          <span className="text-sm text-gray-500">Uploading…</span>
        ) : (
          <>
            <span className="text-sm text-gray-600">
              Drag and drop or <span className="text-[#8B7355] font-medium">choose a file</span> to upload
            </span>
            <span className="text-xs text-gray-400">{acceptHint}</span>
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
