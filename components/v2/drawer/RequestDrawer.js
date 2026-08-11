'use client'

import { useEffect, useState } from 'react'
import TypeBadge from '@/components/v2/primitives/TypeBadge'
import StatusBadge from '@/components/v2/primitives/StatusBadge'
import LinkList from '@/components/v2/primitives/LinkList'
import FileList from '@/components/v2/primitives/FileList'
import FileDropzone from '@/components/v2/primitives/FileDropzone'
import UpdatesFeed from '@/components/v2/drawer/UpdatesFeed'
import UpdateComposer from '@/components/v2/drawer/UpdateComposer'
import DeleteRequestModal from '@/components/v2/modals/DeleteRequestModal'
import { useRequestUpdates } from '@/components/v2/hooks/useRequestUpdates'
import { shortDate, timeAgo } from '@/components/v2/lib/dateUtils'

// Request detail drawer with the full Updates feed, composer, inline brief/link/file
// editing, and (admin) delete.
export default function RequestDrawer({ request, role, client, onClose, onStatusChange, onRefresh, onDeleted }) {
  const isAdmin = role === 'admin'
  const side = isAdmin ? 'admin' : 'client'
  const actor = isAdmin
    ? { type: 'admin', name: 'Interlude Team' }
    : { type: 'client', name: client?.name || 'Client' }

  const { updates, lastReadAt, loading, postUpdate, markRead } = useRequestUpdates(request.id, side)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  // Inline title editing
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(request.title || '')
  const [titleSaving, setTitleSaving] = useState(false)
  useEffect(() => { setTitleDraft(request.title || '') }, [request.title])

  const saveTitle = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === request.title) {
      setTitleDraft(request.title || '')
      setTitleEditing(false)
      return
    }
    setTitleSaving(true)
    try {
      await patch({ title: trimmed })
      setTitleEditing(false)
    } catch (err) {
      alert('Error saving title: ' + err.message)
      setTitleDraft(request.title || '')
      setTitleEditing(false)
    } finally {
      setTitleSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Mark read shortly after open, so the unread highlight is visible first.
  useEffect(() => {
    if (loading) return
    const t = setTimeout(markRead, 1200)
    return () => clearTimeout(t)
  }, [loading, markRead])

  const patch = async (partial) => {
    const res = await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...partial, actor }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    onRefresh?.()
  }

  const links = request.links || []
  const attachments = request.attachments || []
  const workingFiles = (request.request_files || []).map((f) => ({ name: f.name, url: f.url, type: f.file_type }))

  const addLink = async () => {
    const v = linkDraft.trim()
    if (!v) return
    await patch({ links: [...links, v] })
    setLinkDraft('')
    setShowLinkInput(false)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <TypeBadge type={request.request_type} />
            <div className="flex items-center gap-3 text-gray-400">
              {isAdmin && (
                <button onClick={() => setShowDelete(true)} className="hover:text-red-600" title="Delete request">
                  🗑
                </button>
              )}
              <button onClick={onClose} className="hover:text-gray-700 text-xl leading-none" aria-label="Close">
                ×
              </button>
            </div>
          </div>
          {titleEditing ? (
            <input
              autoFocus
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveTitle() }
                if (e.key === 'Escape') { setTitleDraft(request.title || ''); setTitleEditing(false) }
              }}
              disabled={titleSaving}
              className="font-serif text-2xl text-gray-900 mt-2 w-full border border-[#8B7355] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          ) : (
            <h2
              className="font-serif text-2xl text-gray-900 mt-2 cursor-text hover:bg-gray-50 rounded px-2 -mx-2 py-0.5 group inline-flex items-center gap-2"
              onClick={() => setTitleEditing(true)}
              title="Click to edit"
            >
              <span>{request.title}</span>
              <span className="text-sm text-gray-300 group-hover:text-gray-500 transition-colors">✎</span>
            </h2>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <StatusBadge status={request.status} editable={isAdmin} onChange={(next) => onStatusChange?.(request, next)} />
            <span>Submitted {shortDate(request.created_at)}</span>
            <span>· Last updated {timeAgo(request.updated_at || request.created_at)}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Design Brief</h3>
            {request.description ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{request.description}</p>
            ) : (
              <p className="text-sm text-gray-400">No brief provided.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Brief links</h3>
              <button onClick={() => setShowLinkInput((s) => !s)} className="text-gray-400 hover:text-gray-700" title="Add link">
                ✎
              </button>
            </div>
            <LinkList links={links} editable onRemove={(i) => patch({ links: links.filter((_, idx) => idx !== i) })} />
            {showLinkInput && (
              <div className="flex gap-2 mt-2">
                <input
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  placeholder="Paste a link and press Enter"
                />
                <button onClick={addLink} className="px-3 py-1.5 text-sm text-[#8B7355]">
                  Add
                </button>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Brand assets and working files</h3>
            <p className="text-xs text-gray-400 mb-2">
              Files designers reference for every request — guidelines, logos, fonts, photos.
            </p>
            <FileList
              files={attachments}
              editable
              onRemove={(i) => patch({ attachments: attachments.filter((_, idx) => idx !== i) })}
            />
            {workingFiles.length > 0 && <div className="mt-2"><FileList files={workingFiles} /></div>}
            <div className="mt-3">
              <FileDropzone
                clientId={request.client_id}
                onUploaded={(files) => patch({ attachments: [...attachments, ...files] })}
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Updates {updates.length > 0 && <span className="text-gray-400">{updates.length}</span>}
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <UpdatesFeed updates={updates} lastReadAt={lastReadAt} />
            )}
          </section>
        </div>

        {/* Composer */}
        <UpdateComposer
          clientId={request.client_id}
          onSubmit={({ kind, body, links: l, files }) => postUpdate({ kind, body, links: l, files, actor })}
        />
      </div>

      <DeleteRequestModal
        open={showDelete}
        request={request}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          setShowDelete(false)
          onDeleted?.()
        }}
      />
    </div>
  )
}
