'use client'

import { useCallback, useEffect, useState } from 'react'

// Keeps what is on screen in the address bar, so every client board and every
// opened request has its own link:
//   /admin?client=<slug>                    a client's board
//   /admin?client=<slug>&request=<id>       one request, opened
//   /portal/<token>?request=<id>            the same request in the client's portal
// Links survive a reload, can be shared or bookmarked, and Back/Forward work.

const CHANGE_EVENT = 'symphony:urlchange'

// Pure helper: the URL after applying a patch of query params.
// A null, undefined or empty value removes that param.
export function urlWithParams(pathname, search, patch) {
  const query = new URLSearchParams(search)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') query.delete(key)
    else query.set(key, String(value))
  }
  const qs = query.toString()
  return pathname + (qs ? `?${qs}` : '')
}

export function getUrlParam(key) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

// Change query params without loading a page. By default this adds a history
// entry (so Back undoes it); pass { replace: true } to overwrite the current one.
export function setUrlParams(patch, { replace = false } = {}) {
  if (typeof window === 'undefined') return
  const current = window.location.pathname + window.location.search
  const next = urlWithParams(window.location.pathname, window.location.search, patch)
  if (next === current) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', next)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// One query param as React state: [value, setValue, ready].
// `value` is null when the param is absent. `ready` is false until the first
// read on the client, so callers can avoid flashing the wrong screen.
export function useUrlParam(key) {
  const [value, setValue] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const read = () => setValue(getUrlParam(key))
    read()
    setReady(true)
    window.addEventListener('popstate', read)
    window.addEventListener(CHANGE_EVENT, read)
    return () => {
      window.removeEventListener('popstate', read)
      window.removeEventListener(CHANGE_EVENT, read)
    }
  }, [key])

  const set = useCallback((next, options) => setUrlParams({ [key]: next }, options), [key])

  return [value, set, ready]
}
