'use client'

import { useRef } from 'react'
import {
  normalizeFiles,
  formatFileSize,
  formatUploadedDate,
  isImageFile,
} from '@/components/v2/lib/fileAdapter'

// File rows with metadata (size · uploaded date · by) and per-row actions
// (download / replace / delete). Actions are shown only when `editable`.
// files: array of { name, url, type, size, addedAt, uploadedBy }
export default function FileList({
  files = [],
  editable = false,
  onRemove,
  onReplace,
  emptyLabel = 'None',
}) {
  const replaceInputRef = useRef(null)
  const replaceIndexRef = useRef(null)

  const items = normalizeFiles(files)
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">{emptyLabel}</p>
  }

  const triggerReplace = (index) => {
    replaceIndexRef.current = index
    replaceInputRef.current?.click()
  }

  const onReplacePicked = (e) => {
    const file = e.target.files?.[0]
    const index = replaceIndexRef.current
    if (file && index != null) onReplace?.(index, file)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
    replaceIndexRef.current = null
  }

  return (
    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
      {items.map((file, i) => {
        const meta = [formatFileSize(file.size), formatUploadedDate(file.addedAt), file.uploadedBy]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-lg flex-shrink-0" aria-hidden="true">
              {isImageFile(file) ? '🖼️' : '📄'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-800 truncate">{file.name}</div>
              {meta && <div className="text-xs text-gray-400 truncate">{meta}</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-gray-400">
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="hover:text-gray-700 transition-colors"
                  title="Download"
                >
                  ⤓
                </a>
              )}
              {editable && (
                <>
                  <button
                    type="button"
                    onClick={() => triggerReplace(i)}
                    className="hover:text-gray-700 transition-colors"
                    title="Replace"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove?.(i)}
                    className="hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
      {editable && (
        <input ref={replaceInputRef} type="file" className="hidden" onChange={onReplacePicked} />
      )}
    </div>
  )
}
