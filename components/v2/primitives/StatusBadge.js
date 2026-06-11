'use client'

import { statusConfig } from '@/lib/supabase'

const STATUS_ORDER = ['in-queue', 'in-progress', 'in-review', 'completed']

// Status pill. Read-only by default (client view); when `editable` (admin view) it
// renders an inline dropdown that calls onChange(newStatus).
export default function StatusBadge({ status, editable = false, onChange, disabled = false }) {
  const cfg = statusConfig[status] || statusConfig['in-queue']

  if (!editable) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
        {cfg.label}
      </span>
    )
  }

  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="select-status border-transparent disabled:opacity-60"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s} style={{ backgroundColor: '#fff', color: '#111827' }}>
          {statusConfig[s].label}
        </option>
      ))}
    </select>
  )
}
