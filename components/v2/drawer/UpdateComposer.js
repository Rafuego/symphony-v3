'use client'

import { useState } from 'react'
import FileDropzone from '@/components/v2/primitives/FileDropzone'
import FileList from '@/components/v2/primitives/FileList'

const KINDS = [
  { id: 'new_requirement', label: 'New requirement' },
  { id: 'changes', label: 'Changes' },
  { id: 'comment', label: 'Comment' },
]

// Footer composer: textarea + kind dropdown + Add links + Add files + Add update.
export default function UpdateComposer({ clientId, onSubmit }) {
  const [kind, setKind] = useState('new_requirement')
  const [body, setBody] = useState('')
  const [links, setLinks] = useState([])
  const [files, setFiles] = useState([])
  const [showLink, setShowLink] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = body.trim() || links.length > 0 || files.length > 0

  const addLink = () => {
    const v = linkDraft.trim()
    if (v) {
      setLinks([...links, v])
      setLinkDraft('')
    }
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ kind, body: body.trim(), links, files })
      setBody('')
      setLinks([])
      setFiles([])
      setShowLink(false)
      setShowFiles(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-gray-100 p-4 space-y-3 flex-shrink-0">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Add a new requirement, change, or clarification…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
      />

      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((l, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
              {l.replace(/^https?:\/\//, '').slice(0, 40)}
              <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {showLink && (
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
            placeholder="Paste a link and press Enter"
          />
          <button onClick={addLink} className="px-3 py-1.5 text-sm text-[#8B7355]">Add</button>
        </div>
      )}
      {files.length > 0 && <FileList files={files} editable onRemove={(i) => setFiles(files.filter((_, idx) => idx !== i))} />}
      {showFiles && (
        <FileDropzone clientId={clientId} onUploaded={(f) => setFiles([...files, ...f])} />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600"
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
          <button onClick={() => setShowLink((s) => !s)} className="text-sm text-gray-500 hover:text-gray-800">
            🔗 Add links
          </button>
          <button onClick={() => setShowFiles((s) => !s)} className="text-sm text-gray-500 hover:text-gray-800">
            📎 Add files
          </button>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Add update'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
