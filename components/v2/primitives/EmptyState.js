// Centered empty state for tables / lists / drawer sections.
export default function EmptyState({ icon = '🎯', title, hint, className = '' }) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-4xl mb-3 opacity-50" aria-hidden="true">{icon}</div>
      {title && <p className="text-gray-600 text-sm font-medium">{title}</p>}
      {hint && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  )
}
