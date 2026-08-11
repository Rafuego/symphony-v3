'use client'

import { useState, useEffect } from 'react'
import RequestCard from '@/components/RequestCard'

export default function QueueList({ requests, activeFilter, queuedCount, clientId, isAdmin = false, onRefresh }) {
  const isQueue = activeFilter === 'in-queue'
  const [order, setOrder] = useState(requests)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  useEffect(() => {
    setOrder(requests)
  }, [requests])

  const handleDragStart = (id) => (e) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', id) } catch {}
  }

  const handleDragOver = (id) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== overId) setOverId(id)
  }

  const handleDrop = (targetId) => async (e) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }
    const fromIndex = order.findIndex(r => r.id === dragId)
    const toIndex = order.findIndex(r => r.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const next = [...order]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setOrder(next)
    setDragId(null)
    setOverId(null)

    try {
      const res = await fetch('/api/requests/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, orderedIds: next.map(r => r.id) }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      onRefresh()
    } catch (err) {
      alert('Failed to save new order: ' + err.message)
      setOrder(requests) // revert
    }
  }

  return (
    <div className="space-y-4">
      {order.map((request, index) => {
        const isDragging = dragId === request.id
        const isOver = overId === request.id && dragId && dragId !== request.id
        return (
          <div
            key={request.id}
            id={`request-${request.id}`}
            draggable={isQueue}
            onDragStart={isQueue ? handleDragStart(request.id) : undefined}
            onDragOver={isQueue ? handleDragOver(request.id) : undefined}
            onDrop={isQueue ? handleDrop(request.id) : undefined}
            onDragEnd={() => { setDragId(null); setOverId(null) }}
            className={`transition-all ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-[#8B7355] ring-offset-2 rounded-lg' : ''}`}
          >
            <RequestCard
              request={request}
              isAdmin={isAdmin}
              showPriorityControls={isQueue}
              showPriorityBadge={true}
              queuePosition={isQueue ? index + 1 : request.priority || null}
              totalQueued={queuedCount}
              clientId={clientId}
              onRefresh={onRefresh}
            />
          </div>
        )
      })}
    </div>
  )
}
