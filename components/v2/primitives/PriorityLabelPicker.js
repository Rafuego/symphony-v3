'use client'

import { useEffect, useState } from 'react'

const OPTIONS = [
  { value: 'high',   label: 'High',   dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200 hover:bg-red-100' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { value: 'low',    label: 'Low',    dot: 'bg-gray-400',  text: 'text-gray-700',  bg: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
]

// Small colored badge that opens a picker for High / Medium / Low.
// Passing `null` clears the label.
export default function PriorityLabelPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (!e.target.closest('[data-priority-picker]')) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  return (
    <span className="relative inline-block" data-priority-picker>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${
          current ? `${current.bg} ${current.text}` : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
        }`}
        title="Set priority"
      >
        {current ? (
          <>
            <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
            {current.label}
          </>
        ) : (
          <>+ Priority</>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-50 ${value === opt.value ? 'font-semibold' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              <span className={opt.text}>{opt.label}</span>
            </button>
          ))}
          {value && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false) }}
                className="w-full px-3 py-1.5 text-xs text-left text-gray-500 hover:bg-gray-50"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </span>
  )
}
