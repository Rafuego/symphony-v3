// Date helpers for the v2 task board.

// "4/29/26" style — matches the Figma table columns. Returns '—' when empty.
// Handles date-only strings ("YYYY-MM-DD" from a Supabase `date` column) as
// calendar dates in the user's local timezone. `new Date("2026-09-16")` parses
// the string as UTC midnight, so West-of-UTC viewers previously saw "9/15".
export function shortDate(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y.slice(-2)}`
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
}

// "2 days ago" / "4 hours ago" / "just now". Returns '—' when empty.
export function timeAgo(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  const sec = Math.round((Date.now() - d.getTime()) / 1000)
  if (sec < 45) return 'just now'
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.round(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

// "Apr 30, 10:45 AM" style for the drawer activity timestamps.
export function timestamp(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
