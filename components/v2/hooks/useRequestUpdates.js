'use client'

import { useCallback, useEffect, useState } from 'react'

// Loads + mutates a request's Updates feed for one viewer side.
export function useRequestUpdates(requestId, side) {
  const [updates, setUpdates] = useState([])
  const [lastReadAt, setLastReadAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!requestId) return
    try {
      const res = await fetch(`/api/requests/${requestId}/updates?side=${side}`)
      const data = await res.json()
      if (!data.error) {
        setUpdates(data.updates || [])
        setLastReadAt(data.lastReadAt || null)
      }
    } finally {
      setLoading(false)
    }
  }, [requestId, side])

  useEffect(() => {
    refresh()
  }, [refresh])

  const postUpdate = useCallback(
    async ({ kind, body, links = [], files = [], actor }) => {
      const res = await fetch(`/api/requests/${requestId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, body, links, files, actor }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await refresh()
      return data.update
    },
    [requestId, refresh]
  )

  const markRead = useCallback(async () => {
    if (!requestId) return
    try {
      await fetch(`/api/requests/${requestId}/updates/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      })
    } catch {
      /* non-fatal */
    }
  }, [requestId, side])

  return { updates, lastReadAt, loading, refresh, postUpdate, markRead }
}
