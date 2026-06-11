'use client'

// "↓ Load more" control shown under a paginated list. Renders nothing when there's
// nothing more to load.
export default function LoadMore({ hasMore, onLoadMore, remaining }) {
  if (!hasMore) return null
  return (
    <div className="flex items-center gap-3 py-4">
      <button
        type="button"
        onClick={onLoadMore}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span aria-hidden="true">↓</span>
        Load more
        {typeof remaining === 'number' && remaining > 0 && (
          <span className="text-gray-400">({remaining})</span>
        )}
      </button>
      <span className="text-gray-300" aria-hidden="true">···</span>
    </div>
  )
}
