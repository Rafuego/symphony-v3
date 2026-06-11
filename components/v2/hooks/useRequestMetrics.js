import { useMemo } from 'react'

// Derives the 6 metric-bar values + capacity from a requests array.
// Replaces the duplicated count logic in ClientPortal.js / AdminClientDashboard.js.
export function useRequestMetrics(requests, maxActive) {
  return useMemo(() => {
    const list = requests || []
    const countOf = (status) => list.filter((r) => r.status === status).length
    const inProgress = countOf('in-progress')
    const inReview = countOf('in-review')
    const active = inProgress + inReview
    const max = maxActive || 0
    return {
      total: list.length,
      inQueue: countOf('in-queue'),
      inProgress,
      inReview,
      completed: countOf('completed'),
      active,
      maxActive: max,
      remaining: Math.max(0, max - active),
    }
  }, [requests, maxActive])
}
