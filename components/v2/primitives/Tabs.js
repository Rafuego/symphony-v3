'use client'

// Underlined tab row with count chips, matching the Figma task-board tabs.
// tabs: [{ id, label, count }]
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-6 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={`relative flex items-center gap-2 pb-3 -mb-px text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-gray-900 border-b-2 border-[#8B7355]'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
