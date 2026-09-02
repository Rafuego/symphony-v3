import { useMemo, useState } from 'react'

const TAB_TO_STATUS = {
  all: null,
  'in-queue': 'in-queue',
  'in-progress': 'in-progress',
  'in-review': 'in-review',
  paused: 'paused',
  completed: 'completed',
}

// Tab + search + sort state, plus the derived list. Extracts the getFilteredRequests
// logic shared by ClientPortal and AdminClientDashboard.
export function useRequestFilters(requests) {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest') // newest | oldest | due

  const filtered = useMemo(() => {
    let list = [...(requests || [])]

    const status = TAB_TO_STATUS[tab]
    if (status) list = list.filter((r) => r.status === status)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      // Completed items always sink to the bottom, regardless of sort mode,
      // so recent completions don't push in-progress work down.
      const aDone = a.status === 'completed' ? 1 : 0
      const bDone = b.status === 'completed' ? 1 : 0
      if (aDone !== bDone) return aDone - bDone

      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'due') {
        const da = a.requested_due_date ? new Date(a.requested_due_date).getTime() : Infinity
        const db = b.requested_due_date ? new Date(b.requested_due_date).getTime() : Infinity
        return da - db
      }
      // in-queue keeps priority order within the queue tab
      if (status === 'in-queue') return a.priority - b.priority
      return new Date(b.created_at) - new Date(a.created_at) // newest
    })

    return list
  }, [requests, tab, search, sort])

  return { tab, setTab, search, setSearch, sort, setSort, filtered }
}
