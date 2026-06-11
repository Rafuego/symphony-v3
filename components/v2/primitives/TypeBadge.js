import { getTypeMeta } from '@/components/v2/lib/typeDisplay'

// Neutral request-type pill: emoji + display label (e.g. 'site' -> "Web").
export default function TypeBadge({ type, className = '' }) {
  const { label, emoji } = getTypeMeta(type)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap ${className}`}
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
    </span>
  )
}
