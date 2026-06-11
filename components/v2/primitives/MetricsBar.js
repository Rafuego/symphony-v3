import { statusConfig } from '@/lib/supabase'

// The 6-card metrics row at the top of the task board.
export default function MetricsBar({ metrics }) {
  const cards = [
    { key: 'total', label: 'Total Requests', value: metrics.total },
    {
      key: 'usage',
      label: 'Plan Usage',
      value: metrics.active,
      suffix: metrics.maxActive ? `/${metrics.maxActive} active` : null,
    },
    { key: 'in-queue', label: 'In Queue', value: metrics.inQueue, color: statusConfig['in-queue'].color },
    { key: 'in-progress', label: 'In Progress', value: metrics.inProgress, color: statusConfig['in-progress'].color },
    { key: 'in-review', label: 'In Review', value: metrics.inReview, color: statusConfig['in-review'].color },
    { key: 'completed', label: 'Completed', value: metrics.completed, color: statusConfig['completed'].color },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-y border-gray-100">
      {cards.map((card) => (
        <div key={card.key} className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-1.5 mb-1">
            {card.color && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
            )}
            <span className="text-[11px] uppercase tracking-wider text-gray-500">{card.label}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-3xl text-gray-900 leading-none">{card.value}</span>
            {card.suffix && <span className="text-xs text-gray-400 italic">{card.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
