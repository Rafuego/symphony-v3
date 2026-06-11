'use client'

import TypeBadge from '@/components/v2/primitives/TypeBadge'
import StatusBadge from '@/components/v2/primitives/StatusBadge'
import { shortDate, timeAgo } from '@/components/v2/lib/dateUtils'

// One request row in the task-board table. Clicking the row (or the → cell) opens
// the detail drawer. The status cell is an inline editable dropdown for admins.
export default function RequestTableRow({ request, role, onOpen, onStatusChange, unread = false }) {
  const isAdmin = role === 'admin'

  return (
    <tr
      onClick={() => onOpen?.(request)}
      className="group border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      {/* Task */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2">
          {unread && (
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8B7355] flex-shrink-0"
              title="Unread updates"
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{request.title}</div>
            {request.description && (
              <div className="text-xs text-gray-500 truncate max-w-md">{request.description}</div>
            )}
          </div>
        </div>
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
      {/* Due date */}
      <td className="px-4 py-3 align-middle text-sm text-gray-500 whitespace-nowrap">
        {shortDate(request.requested_due_date)}
      </td>
      {/* Last update */}
      <td className="px-4 py-3 align-middle text-sm text-gray-400 whitespace-nowrap">
        {timeAgo(request.updated_at || request.created_at)}
      </td>
      {/* Arrow */}
      <td className="px-4 py-3 align-middle text-right">
        <span className="text-gray-300 group-hover:text-gray-600 transition-colors" aria-hidden="true">→</span>
      </td>
    </tr>
  )
}
