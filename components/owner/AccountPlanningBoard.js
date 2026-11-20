'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PLAN_LABEL = { launch: 'Launch', growth: 'Growth', scale: 'Scale' }
const TAG_LABEL = { symphony: 'Symphony', legacy_drip: 'Legacy Drip' }
const NOTE_SAVE_DELAY = 700

const money = (n) => '$' + Math.round(n || 0).toLocaleString('en-US')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
// Dates arrive as YYYY-MM-DD. Format from the parts so no timezone can shift the day.
const dayLabel = (iso) => {
  const [, m, d] = iso.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`
}
const monthLabel = (iso) => {
  const [y, m] = iso.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}
const bucket = (a) => a.decision || 'none'

const SORTS = {
  mrr: (a, b) => b.mrr - a.mrr || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => (b.lastSubmitted || '').localeCompare(a.lastSubmitted || '') || b.mrr - a.mrr,
  quiet: (a, b) => (a.lastSubmitted || '').localeCompare(b.lastSubmitted || '') || b.mrr - a.mrr,
}

function totalsFor(accounts) {
  const empty = () => ({ keep: { n: 0, mrr: 0 }, part: { n: 0, mrr: 0 }, none: { n: 0, mrr: 0 }, n: 0, mrr: 0 })
  const t = { active: empty(), paused: empty() }
  for (const a of accounts) {
    const g = a.status === 'paused' ? t.paused : t.active
    const b = bucket(a)
    g[b].n += 1
    g[b].mrr += a.mrr
    g.n += 1
    g.mrr += a.mrr
  }
  return t
}

function planText(accounts) {
  const A = totalsFor(accounts).active
  const lines = [
    'Account plan',
    `Active MRR today: ${money(A.mrr)} across ${plural(A.n, 'account', 'accounts')}`,
    `Keeping: ${money(A.keep.mrr)} /mo, Undecided: ${money(A.none.mrr)} /mo, Parting ways: ${money(A.part.mrr)} /mo`,
  ]
  for (const [key, title] of [['keep', 'KEEPING'], ['part', 'PARTING WAYS'], ['none', 'UNDECIDED']]) {
    const list = accounts.filter((a) => bucket(a) === key).sort(SORTS.mrr)
    lines.push('', `${title} (${list.length})`)
    for (const a of list) {
      const note = (a.note || '').replace(/\s+/g, ' ').trim()
      lines.push(`- ${a.name}: ${money(a.mrr)} /mo, ${a.status}${note ? '. ' + note : ''}`)
    }
  }
  return lines.join('\n')
}

// Owner-only board: mark each account Keep / Undecided / Part ways with a note.
// Every change is saved through PUT /api/owner/plan; nothing here touches the
// client, request, Notion or Slack data.
export default function AccountPlanningBoard({ initialAccounts, onLock, onSessionExpired }) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('mrr')
  const [query, setQuery] = useState('')
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const [sticky, setSticky] = useState(() => new Set())
  const [copyState, setCopyState] = useState(null) // null | 'copied' | 'manual'

  // Latest accounts, readable synchronously by the save queue.
  const accountsRef = useRef(initialAccounts)
  const chains = useRef({}) // per-account promise chain so saves land in order
  const timers = useRef({}) // per-account note debounce
  const failed = useRef(new Set())
  const inFlight = useRef(0)

  const send = useCallback(async (id) => {
    const a = accountsRef.current.find((x) => x.id === id)
    if (!a) return
    inFlight.current += 1
    setSaveState('saving')
    try {
      const res = await fetch('/api/owner/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id, decision: a.decision, note: a.note }),
        keepalive: true, // let a save finish even if the tab is closing
      })
      if (res.status === 401) {
        onSessionExpired?.()
        return
      }
      if (!res.ok) throw new Error('Save failed')
      failed.current.delete(id)
    } catch (err) {
      failed.current.add(id)
    } finally {
      inFlight.current -= 1
      if (inFlight.current === 0) {
        // A note still waiting on its debounce counts as unsaved.
        const waiting = Object.keys(timers.current).length > 0
        setSaveState(failed.current.size ? 'error' : waiting ? 'saving' : 'saved')
      }
    }
  }, [onSessionExpired])

  // Queue a save. Each one reads the newest value when it runs, so the last
  // write always wins even if earlier requests are slow.
  const save = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    chains.current[id] = (chains.current[id] || Promise.resolve()).then(() => send(id))
  }, [send])

  const update = useCallback((id, patch) => {
    const next = accountsRef.current.map((a) => (a.id === id ? { ...a, ...patch } : a))
    accountsRef.current = next
    setAccounts(next)
    // Keep the row on screen under the current filter until the filter changes.
    setSticky((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  const setDecision = (id, decision) => {
    update(id, { decision })
    save(id)
  }
  const setNote = (id, note) => {
    update(id, { note })
    setSaveState('saving')
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => save(id), NOTE_SAVE_DELAY)
  }
  const flushNote = (id) => {
    if (timers.current[id]) save(id)
  }
  const retryFailed = () => {
    for (const id of Array.from(failed.current)) save(id)
  }

  // Flush pending notes if the tab is hidden or closed mid-typing.
  useEffect(() => {
    const flushAll = () => {
      for (const id of Object.keys(timers.current)) save(id)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushAll)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushAll)
    }
  }, [save])

  const changeFilter = (next) => {
    setFilter(next)
    setSticky(new Set())
  }

  const totals = useMemo(() => totalsFor(accounts), [accounts])
  const A = totals.active
  const P = totals.paused
  const pct = (v) => (A.mrr ? (v / A.mrr) * 100 : 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return accounts
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .filter((a) => filter === 'all' || bucket(a) === filter || sticky.has(a.id))
      .sort(SORTS[sort] || SORTS.mrr)
  }, [accounts, filter, sort, query, sticky])

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(planText(accountsRef.current))
      setCopyState('copied')
      setTimeout(() => setCopyState(null), 1600)
    } catch (err) {
      setCopyState('manual')
    }
  }

  let range
  if (A.n === 0) {
    range = 'There are no active accounts right now.'
  } else if (A.none.n === 0 && A.part.n === 0) {
    range = <>Every active account is marked as keeping. MRR stays at <strong className="text-gray-900 font-semibold">{money(A.mrr)}</strong>.</>
  } else if (A.none.n === 0) {
    range = <>After this plan, active MRR is <strong className="text-gray-900 font-semibold">{money(A.keep.mrr)}</strong>, down {money(A.part.mrr)} from today.</>
  } else if (A.keep.n === 0 && A.part.n === 0) {
    range = 'No active account is decided yet. Each choice below moves this bar.'
  } else {
    range = <>After this plan, active MRR lands between <strong className="text-gray-900 font-semibold">{money(A.keep.mrr)}</strong> if every undecided account goes and <strong className="text-gray-900 font-semibold">{money(A.keep.mrr + A.none.mrr)}</strong> if they all stay.</>
  }

  const filters = [
    { id: 'all', label: 'All', count: accounts.length },
    { id: 'none', label: 'Undecided', count: A.none.n + P.none.n },
    { id: 'keep', label: 'Keeping', count: A.keep.n + P.keep.n },
    { id: 'part', label: 'Parting ways', count: A.part.n + P.part.n },
  ]

  const tiles = [
    { key: 'keep', label: 'Keeping', stripe: 'border-l-emerald-600' },
    { key: 'none', label: 'Undecided', stripe: 'border-l-gray-300' },
    { key: 'part', label: 'Parting ways', stripe: 'border-l-rose-600' },
  ]

  const activeRows = visible.filter((a) => a.status !== 'paused')
  const pausedRows = visible.filter((a) => a.status === 'paused')

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3 border-b border-gray-100">
        <a
          href="/admin"
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          ← Admin
        </a>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} onRetry={retryFailed} />
          <button
            type="button"
            onClick={onLock}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Lock
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-7">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8B7355] mb-2">
            Private to you
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-gray-900">Account Planning</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Mark each account as one you are keeping or one you are parting ways with. Account figures are live from
            Symphony. Your choices are saved here only and never appear in the admin view, a client portal, Notion or Slack.
          </p>
        </div>

        {/* Summary */}
        <section className="border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-5" aria-label="Summary">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active MRR today</div>
              <div className="font-serif text-4xl sm:text-5xl text-gray-900 tabular-nums">{money(A.mrr)}</div>
              <div className="text-sm text-gray-500">
                {plural(A.n, 'active account', 'active accounts')}, {P.n} paused
              </div>
            </div>
            <p className="text-sm text-gray-500 max-w-md">{range}</p>
          </div>

          <div
            className="flex h-3.5 rounded-full overflow-hidden bg-gray-100"
            role="img"
            aria-label={`Active MRR: ${money(A.keep.mrr)} keeping, ${money(A.none.mrr)} undecided, ${money(A.part.mrr)} parting ways`}
          >
            <span className="bg-emerald-600 transition-[width] duration-200" style={{ width: `${pct(A.keep.mrr)}%` }} />
            <span className="bg-gray-300 transition-[width] duration-200" style={{ width: `${pct(A.none.mrr)}%` }} />
            <span className="bg-rose-600 transition-[width] duration-200" style={{ width: `${pct(A.part.mrr)}%` }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiles.map((t) => (
              <div key={t.key} className={`border border-gray-200 border-l-4 ${t.stripe} rounded-lg px-4 py-3`}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t.label}</div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {money(A[t.key].mrr)} <span className="text-sm font-normal text-gray-400">/mo</span>
                </div>
                <div className="text-sm text-gray-500">
                  {A[t.key].n} active, {P[t.key].n} paused
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show accounts by decision">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => changeFilter(f.id)}
                className={`px-3 py-1.5 text-sm rounded-full border ${
                  filter === f.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'text-gray-500 border-gray-200 hover:text-gray-900 hover:border-gray-400'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts"
              aria-label="Search accounts"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B7355] w-full sm:w-48"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort accounts"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600"
            >
              <option value="mrr">MRR, high to low</option>
              <option value="name">Name, A to Z</option>
              <option value="recent">Latest request first</option>
              <option value="quiet">Quietest first</option>
            </select>
          </div>
        </div>

        <Ledger
          title="Active accounts"
          meta={`${plural(A.n, 'account', 'accounts')}, ${money(A.mrr)} /mo`}
          rows={activeRows}
          onDecision={setDecision}
          onNote={setNote}
          onNoteBlur={flushNote}
        />
        <Ledger
          title="Paused accounts"
          meta={`${plural(P.n, 'account', 'accounts')}, not billing today`}
          rows={pausedRows}
          onDecision={setDecision}
          onNote={setNote}
          onNoteBlur={flushNote}
        />

        <footer className="space-y-3 text-sm text-gray-500">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyPlan}
              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {copyState === 'copied' ? 'Copied' : 'Copy plan as text'}
            </button>
          </div>
          {copyState === 'manual' && (
            <textarea
              readOnly
              value={planText(accounts)}
              onFocus={(e) => e.target.select()}
              aria-label="Plan as text"
              className="w-full h-40 p-3 text-xs font-mono border border-gray-200 rounded-lg"
            />
          )}
          <p className="max-w-3xl">
            MRR counts active accounts only, the same way the admin view does. A paused account shows the rate it had
            when it was paused. Request counts come from Symphony, so an account that sends work by email or Slack
            shows none. The internal accounts, Demo and Interlude Studio, are left out.
          </p>
        </footer>
      </div>
    </div>
  )
}

function SaveBadge({ state, onRetry }) {
  if (state === 'error') {
    return (
      <span className="flex items-center gap-2 text-sm text-rose-700" role="alert">
        <span className="w-2 h-2 rounded-full bg-rose-600" />
        Some changes did not save.
        <button type="button" onClick={onRetry} className="underline">
          Retry
        </button>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2 text-sm text-gray-500" role="status">
      <span className={`w-2 h-2 rounded-full ${state === 'saving' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      {state === 'saving' ? 'Saving...' : 'All changes saved'}
    </span>
  )
}

function Ledger({ title, meta, rows, onDecision, onNote, onNoteBlur }) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500 tabular-nums">{meta}</span>
      </div>
      <ul className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
        {rows.length === 0 ? (
          <li className="px-4 py-5 text-gray-500">No accounts match this view.</li>
        ) : (
          rows.map((a) => (
            <AccountRow key={a.id} account={a} onDecision={onDecision} onNote={onNote} onNoteBlur={onNoteBlur} />
          ))
        )}
      </ul>
    </section>
  )
}

const DECISIONS = [
  { value: 'keep', label: 'Keep', on: 'bg-emerald-50 text-emerald-700 border-emerald-600 font-semibold' },
  { value: null, label: 'Undecided', on: 'bg-gray-100 text-gray-900 border-transparent' },
  { value: 'part', label: 'Part ways', on: 'bg-rose-50 text-rose-700 border-rose-600 font-semibold' },
]

function AccountRow({ account: a, onDecision, onNote, onNoteBlur }) {
  const meta = [PLAN_LABEL[a.plan] || a.plan]
  if (a.tag && TAG_LABEL[a.tag]) meta.push(TAG_LABEL[a.tag])
  if (a.since) meta.push(`since ${monthLabel(a.since)}`)

  const stripe =
    a.decision === 'keep' ? 'border-l-emerald-600' : a.decision === 'part' ? 'border-l-rose-600' : 'border-l-transparent'

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(170px,1.3fr)_96px_minmax(140px,1fr)_auto_minmax(160px,1.2fr)] gap-x-4 gap-y-2.5 items-center pl-3.5 pr-4 py-3.5 border-l-4 ${stripe}`}
    >
      <div className="min-w-0">
        <div
          className={`font-semibold text-gray-900 break-words ${
            a.decision === 'part' ? 'line-through decoration-rose-600 decoration-1' : ''
          }`}
        >
          {a.name}
        </div>
        <div className="text-[13px] text-gray-500">{meta.join(' · ')}</div>
      </div>

      <div className="text-right whitespace-nowrap">
        <span className="font-semibold text-gray-900 tabular-nums">{money(a.mrr)}</span>
        <span className="text-[13px] text-gray-500"> /mo</span>
      </div>

      <div className="col-span-2 lg:col-span-1 flex flex-wrap lg:flex-col gap-x-3 gap-y-0.5 min-w-0 text-sm text-gray-700">
        {a.requests ? (
          <>
            <span>{a.open} open, {a.completed} done</span>
            {a.lastSubmitted && <span className="text-[13px] text-gray-500">Last request {dayLabel(a.lastSubmitted)}</span>}
          </>
        ) : (
          <span>No requests in Symphony</span>
        )}
      </div>

      <div
        className="col-span-2 lg:col-span-1 inline-flex justify-self-start gap-0.5 p-0.5 border border-gray-200 rounded-[9px] bg-gray-50"
        role="group"
        aria-label={`Decision for ${a.name}`}
      >
        {DECISIONS.map((d) => {
          const on = (a.decision || null) === d.value
          return (
            <button
              key={d.label}
              type="button"
              aria-pressed={on}
              onClick={() => onDecision(a.id, d.value)}
              className={`px-2.5 py-1.5 text-[13px] rounded-[7px] border whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7355] ${
                on ? d.on : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      <NoteField
        value={a.note}
        label={`Note for ${a.name}`}
        onChange={(v) => onNote(a.id, v)}
        onBlur={() => onNoteBlur(a.id)}
      />
    </li>
  )
}

function NoteField({ value, label, onChange, onBlur }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="Add a note"
      aria-label={label}
      maxLength={4000}
      className="col-span-2 lg:col-span-1 w-full resize-none overflow-hidden min-h-[34px] px-2.5 py-1.5 text-sm leading-snug text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
    />
  )
}
