'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TypeBadge from '@/components/v2/primitives/TypeBadge'
import StatusBadge from '@/components/v2/primitives/StatusBadge'
import PriorityLabelPicker from '@/components/v2/primitives/PriorityLabelPicker'
import { shortDate, timeAgo } from '@/components/v2/lib/dateUtils'
import { GripIcon, PencilIcon, ArrowRightIcon, TrashIcon } from '@/components/v2/primitives/icons'
import IconButton from '@/components/v2/primitives/IconButton'
import DeleteRequestModal from '@/components/v2/modals/DeleteRequestModal'

// One request row in the task-board table. Clicking the row (or the → cell) opens
// the detail drawer. Status, title and priority are inline-editable.
export default function RequestTableRow({
  request,
  role,
  onOpen,
  onStatusChange,
  onRefresh,
  unread = false,
  // Drag props (queue tab only)
  draggable = false,
  isDragging = false,
  isOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const isAdmin = role === 'admin'

  // Inline title editing
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(request.title || '')
  const [titleSaving, setTitleSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  // Inline due-date editing
  const [dueEditing, setDueEditing] = useState(false)
  const [dueDraft, setDueDraft] = useState(request.requested_due_date || '')
  useEffect(() => { setDueDraft(request.requested_due_date || '') }, [request.requested_due_date])

  const saveDueDate = async (nextValue) => {
    const normalized = nextValue || null
    if (normalized === (request.requested_due_date || null)) {
      setDueEditing(false)
      return
    }
    try {
      await patchRequest({ requestedDueDate: normalized })
      setDueEditing(false)
      onRefresh?.()
    } catch (err) {
      alert('Error saving due date: ' + err.message)
      setDueDraft(request.requested_due_date || '')
      setDueEditing(false)
    }
  }

  useEffect(() => {
    setTitleDraft(request.title || '')
  }, [request.title])

  const patchRequest = async (patch) => {
    const res = await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) throw new Error(data.error || res.statusText)
    return data
  }

  const saveTitle = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === request.title) {
      setTitleDraft(request.title || '')
      setTitleEditing(false)
      return
    }
    setTitleSaving(true)
    try {
      await patchRequest({ title: trimmed })
      setTitleEditing(false)
      onRefresh?.()
    } catch (err) {
      alert('Error saving title: ' + err.message)
      setTitleDraft(request.title || '')
      setTitleEditing(false)
    } finally {
      setTitleSaving(false)
    }
  }

  const setPriority = async (label) => {
    try {
      await patchRequest({ priorityLabel: label || null })
      onRefresh?.()
    } catch (err) {
      alert('Error updating priority: ' + err.message)
    }
  }

  const rowClass = [
    'group border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
    isDragging ? 'opacity-40' : '',
    isOver ? 'bg-[#8B7355]/5 outline outline-2 outline-[#8B7355]' : '',
  ].filter(Boolean).join(' ')

  return (
    <tr
      draggable={draggable && !titleEditing}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={draggable ? onDragOver : undefined}
      onDrop={draggable ? onDrop : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={() => !titleEditing && onOpen?.(request)}
      className={rowClass}
    >
      {/* Drag handle */}
      <td className="pl-2 pr-0 py-3 align-middle w-6" onClick={(e) => e.stopPropagation()}>
        {draggable ? (
          <span
            className="inline-flex items-center justify-center w-6 h-6 text-gray-300 hover:text-gray-700 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing select-none"
            title="Drag to reorder"
          >
            <GripIcon size={14} />
          </span>
        ) : null}
      </td>

      {/* Task (with unread dot + inline-editable title) */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2">
          {unread && (
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8B7355] flex-shrink-0"
              title="Unread updates"
            />
          )}
          <div className="min-w-0 flex-1">
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
                onClick={(e) => e.stopPropagation()}
                disabled={titleSaving}
                className="w-full text-sm font-medium text-gray-900 border border-[#8B7355] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
              />
            ) : (
              <div className="group/title flex items-center gap-1.5">
                <span
                  className="text-sm font-medium text-gray-900 truncate hover:bg-gray-100 rounded px-1 -mx-1 cursor-text"
                  onClick={(e) => { e.stopPropagation(); setTitleEditing(true) }}
                  title="Click to edit title"
                >
                  {request.title}
                </span>
                <span
                  className="text-gray-300 opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                  aria-hidden="true"
                >
                  <PencilIcon size={12} />
                </span>
              </div>
            )}
            {request.description && !titleEditing && (
              <div className="text-xs text-gray-500 truncate max-w-md">{request.description}</div>
            )}
          </div>
        </div>
      </td>

      {/* Priority label */}
      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <PriorityLabelPicker value={request.priority_label} onChange={setPriority} />
      </td>

      {/* Type */}
      <td className="px-4 py-3 align-middle whitespace-nowrap">
        <TypeBadge type={request.request_type} />
      </td>

      {/* Status */}
      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => isAdmin && e.stopPropagation()}>
        <StatusBadge
          status={request.status}
          editable={isAdmin}
          onChange={(next) => onStatusChange?.(request, next)}
        />
      </td>

      {/* Submitted */}
      <td className="px-4 py-3 align-middle text-sm text-gray-500 whitespace-nowrap">
        {shortDate(request.created_at)}
      </td>

      {/* Started */}
      <td className="px-4 py-3 align-middle text-sm text-gray-500 whitespace-nowrap">
        {shortDate(request.started_at)}
      </td>

      {/* Due date (click to edit) */}
      <td className="px-4 py-3 align-middle text-sm text-gray-500 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {dueEditing ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              type="date"
              value={dueDraft || ''}
              onChange={(e) => setDueDraft(e.target.value)}
              onBlur={() => saveDueDate(dueDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveDueDate(dueDraft) }
                if (e.key === 'Escape') { setDueDraft(request.requested_due_date || ''); setDueEditing(false) }
              }}
              className="text-sm border border-[#8B7355] rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
            {request.requested_due_date && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveDueDate('') }}
                className="text-xs text-gray-400 hover:text-red-600"
                title="Clear due date"
              >
                clear
              </button>
            )}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setDueEditing(true)}
            className={`inline-flex items-center rounded px-1.5 py-0.5 border border-transparent hover:border-gray-200 hover:bg-gray-50 ${
              request.requested_due_date ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Click to set due date"
          >
            {request.requested_due_date ? shortDate(request.requested_due_date) : '+ Set'}
          </button>
        )}
      </td>

      {/* Last update */}
      <td className="px-4 py-3 align-middle text-sm text-gray-400 whitespace-nowrap">
        {timeAgo(request.updated_at || request.created_at)}
      </td>

      {/* Actions (delete on hover) + open arrow */}
      <td className="px-4 py-3 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-2 justify-end">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            <IconButton
              icon={TrashIcon}
              label="Delete request"
              variant="destructive"
              size="sm"
              onClick={() => setShowDelete(true)}
            />
          </span>
          <span
            className="inline-flex items-center justify-center text-gray-300 group-hover:text-gray-600 transition-colors cursor-pointer"
            onClick={() => onOpen?.(request)}
            aria-hidden="true"
          >
            <ArrowRightIcon size={16} />
          </span>
        </div>
      </td>
      {typeof document !== 'undefined' && createPortal(
        <DeleteRequestModal
          open={showDelete}
          request={request}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false)
            onRefresh?.()
          }}
        />,
        document.body,
      )}
    </tr>
  )
}
