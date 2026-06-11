'use client'

import TypeBadge from '@/components/v2/primitives/TypeBadge'
import { getTypeMeta } from '@/components/v2/lib/typeDisplay'
import { shortDate, timeAgo } from '@/components/v2/lib/dateUtils'

// A draggable request card for the Kanban board.
export default function KanbanCard({ request, onOpen, onDragStart, onDragEnd, dragging }) {
  const { emoji } = getTypeMeta(request.request_type)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', request.id)
        onDragStart?.(request)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen?.(request)}
      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <TypeBadge type={request.request_type} />
        <span className="text-gray-300" aria-hidden="true">⋯</span>
      </div>
      <div className="flex items-start gap-1.5 mb-2">
        <span aria-hidden="true">{emoji}</span>
        <span className="text-sm font-medium text-gray-900">{request.title}</span>
      </div>
      {request.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{request.description}</p>
      )}
      <dl className="text-xs text-gray-400 space-y-1">
        <Row label="Submitted" value={shortDate(request.created_at)} />
        <Row label="Started" value={shortDate(request.started_at)} />
        <Row label="Due date" value={shortDate(request.requested_due_date)} />
        <Row label="Last update" value={timeAgo(request.updated_at || request.created_at)} />
      </dl>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="text-gray-600">{value}</dd>
    </div>
  )
}
