'use client'

import { useState } from 'react'
import { statusConfig } from '@/lib/supabase'
import KanbanCard from '@/components/v2/primitives/KanbanCard'

const COLUMNS = ['in-queue', 'in-progress', 'in-review', 'completed']

// 4-column status board. Dragging a card to a different column changes its status
// (cross-column move). Intra-column reordering is not drag-enabled — queue order
// still follows `priority`. Clicking a card opens the drawer.
export default function KanbanBoard({ requests, search, onOpen, onMove }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const q = (search || '').trim().toLowerCase()
  const visible = q
    ? requests.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q)
      )
    : requests

  const byStatus = (status) =>
    visible
      .filter((r) => r.status === status)
      .sort((a, b) => (status === 'in-queue' ? a.priority - b.priority : new Date(b.created_at) - new Date(a.created_at)))

  const handleDrop = (status) => {
    setOverCol(null)
    const req = requests.find((r) => r.id === dragId)
    setDragId(null)
    if (req && req.status !== status) onMove?.(req, status)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const cfg = statusConfig[status]
        const items = byStatus(status)
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(status)
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => handleDrop(status)}
            className={`rounded-lg p-2 transition-colors ${
              overCol === status ? 'bg-[#8B7355]/5 ring-1 ring-[#8B7355]/30' : 'bg-gray-50/60'
            }`}
          >
            <div className="flex items-center gap-2 px-1 py-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] uppercase tracking-wider text-gray-500">{cfg.label}</span>
              <span className="text-xs text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {items.map((req) => (
                <KanbanCard
                  key={req.id}
                  request={req}
                  onOpen={onOpen}
                  dragging={dragId === req.id}
                  onDragStart={(r) => setDragId(r.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
