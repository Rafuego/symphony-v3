'use client'

import { useEffect, useState } from 'react'
import RequestTableRow from '@/components/v2/primitives/RequestTableRow'
import EmptyState from '@/components/v2/primitives/EmptyState'

const COLUMNS = ['', 'Task', 'Priority', 'Type', 'Status', 'Submitted', 'Started', 'Due date', 'Last update', '']

// The dense request table. Horizontally scrollable on small screens.
// When `activeTab === 'in-queue'`, rows become drag-and-drop reorderable.
export default function RequestTable({
  requests,
  role,
  activeTab,
  clientId,
  onOpen,
  onStatusChange,
  onRefresh,
  unreadIds,
  emptyTitle = 'No requests',
  emptyHint,
}) {
  const isQueue = activeTab === 'in-queue'
  const [order, setOrder] = useState(requests || [])
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  useEffect(() => {
    setOrder(requests || [])
  }, [requests])

  if (!order || order.length === 0) {
    return <EmptyState icon="🎯" title={emptyTitle} hint={emptyHint} />
  }

  const handleReorder = async (nextOrder) => {
    try {
      const res = await fetch('/api/requests/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, orderedIds: nextOrder.map((r) => r.id) }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      onRefresh?.()
    } catch (err) {
      alert('Failed to save new order: ' + err.message)
      setOrder(requests || []) // revert
    }
  }

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return
    const from = order.findIndex((r) => r.id === dragId)
    const to = order.findIndex((r) => r.id === targetId)
    if (from === -1 || to === -1) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrder(next)
    handleReorder(next)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse">
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
          {order.map((request) => (
            <RequestTableRow
              key={request.id}
              request={request}
              role={role}
              onOpen={onOpen}
              onStatusChange={onStatusChange}
              onRefresh={onRefresh}
              unread={unreadIds?.has?.(request.id)}
              draggable={isQueue}
              isDragging={dragId === request.id}
              isOver={overId === request.id && dragId && dragId !== request.id}
              onDragStart={(e) => {
                setDragId(request.id)
                e.dataTransfer.effectAllowed = 'move'
                try { e.dataTransfer.setData('text/plain', request.id) } catch {}
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (overId !== request.id) setOverId(request.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(request.id)
                setDragId(null)
                setOverId(null)
              }}
              onDragEnd={() => { setDragId(null); setOverId(null) }}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
