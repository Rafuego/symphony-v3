'use client'

import RequestTableRow from '@/components/v2/primitives/RequestTableRow'
import EmptyState from '@/components/v2/primitives/EmptyState'

const COLUMNS = ['Task', 'Type', 'Status', 'Submitted', 'Started', 'Due date', 'Last update', '']

// The dense request table. Horizontally scrollable on small screens.
export default function RequestTable({
  requests,
  role,
  onOpen,
  onStatusChange,
  unreadIds,
  emptyTitle = 'No requests',
  emptyHint,
}) {
  if (!requests || requests.length === 0) {
    return <EmptyState icon="🎯" title={emptyTitle} hint={emptyHint} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {COLUMNS.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-2.5 text-[11px] uppercase tracking-wider text-gray-400 font-medium ${
                  i === COLUMNS.length - 1 ? 'text-right' : 'text-left'
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <RequestTableRow
              key={request.id}
              request={request}
              role={role}
              onOpen={onOpen}
              onStatusChange={onStatusChange}
              unread={unreadIds?.has?.(request.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
