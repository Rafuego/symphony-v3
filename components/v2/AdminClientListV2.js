'use client'

import { useEffect, useMemo, useState } from 'react'
import AlertsPanel from '@/components/AlertsPanel'
import Tabs from '@/components/v2/primitives/Tabs'
import LoadMore from '@/components/v2/primitives/LoadMore'
import ClientTable from '@/components/v2/admin/ClientTable'
import ClientGrid from '@/components/v2/admin/ClientGrid'
import PendingTab from '@/components/v2/admin/PendingTab'
import ClientModal from '@/components/v2/modals/ClientModal'
import { clientMRR } from '@/components/v2/admin/clientBadges'

const PAGE_SIZE = 12

// v2 admin client list (Section 3). Paused clients are merged into the table with a
// status badge and excluded from MRR. Section-4 sort/filter/inline-edit is deferred.
export default function AdminClientListV2({ clients, onSelectClient, onRefresh }) {
  const [tab, setTab] = useState('clients') // clients | pending | alerts
  const [view, setView] = useState('table') // table | grid
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name') // name | mrr
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [dealsCount, setDealsCount] = useState(0)

  useEffect(() => {
    fetch('/api/notifications?unread=true').then((r) => r.json()).then((d) => setUnreadCount(d.unreadCount || 0)).catch(() => {})
    fetch('/api/deals').then((r) => r.json()).then((d) => setDealsCount((d.deals || []).length)).catch(() => {})
  }, [])

  const activeClients = clients.filter((c) => (c.client_status || 'active') !== 'paused')
  const pausedCount = clients.length - activeClients.length
  const mrr = activeClients.reduce((t, c) => t + clientMRR(c), 0)

  const filtered = useMemo(() => {
    const isPaused = (c) => (c.client_status || 'active') === 'paused'
    // Clients tab → active only; Paused tab → paused only.
    let list = clients.filter((c) => (tab === 'paused' ? isPaused(c) : !isPaused(c)))
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) => (c.name || '').toLowerCase().includes(q))
    list.sort((a, b) => (sort === 'mrr' ? clientMRR(b) - clientMRR(a) : (a.name || '').localeCompare(b.name || '')))
    return list
  }, [clients, tab, search, sort])

  const visibleClients = filtered.slice(0, visible)

  const copyLink = (client) => {
    const url = `${window.location.origin}/portal/${client.access_token}`
    navigator.clipboard?.writeText(url)
    alert(`Client link copied!\n\n${url}\n\n${client.password_enabled ? 'Password protected' : 'No password required'}`)
  }

  const tabs = [
    { id: 'clients', label: 'Clients', count: activeClients.length },
    { id: 'paused', label: 'Paused', count: pausedCount },
    { id: 'pending', label: 'Pending', count: dealsCount },
    { id: 'alerts', label: 'Alerts', count: unreadCount },
  ]

  const isClientList = tab === 'clients' || tab === 'paused'
  const emptyTitle = search
    ? 'No matching clients'
    : tab === 'paused'
      ? 'No paused clients'
      : 'No clients yet'

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-gray-100">
        <div className="flex-1" />
        <div className="text-center flex-1">
          <div className="font-serif text-xl text-[#8B7355] leading-none">Symphony</div>
          <div className="text-[10px] text-gray-400 tracking-wide">by Interlude</div>
        </div>
        <div className="flex items-center justify-end flex-1">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            + New Client
          </button>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-4 sm:px-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Monthly Revenue (USD)</div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl text-gray-900">${mrr.toLocaleString()}</span>
            {pausedCount > 0 && <span className="text-xs text-gray-400 italic">{pausedCount} paused excluded</span>}
          </div>
        </div>
        <div className="px-4 py-4 sm:px-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Active Clients</div>
          <span className="font-serif text-3xl text-gray-900">{activeClients.length}</span>
        </div>
      </div>

      {/* Board */}
      <div className="px-4 sm:px-8 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-3xl text-gray-900">Client Accounts</h1>
          {isClientList && (
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button onClick={() => setView('table')} className={`px-3 py-1.5 ${view === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>▦ Table</button>
              <button onClick={() => setView('grid')} className={`px-3 py-1.5 ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>▥ Grid</button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <Tabs tabs={tabs} active={tab} onChange={(id) => { setTab(id); setVisible(PAGE_SIZE) }} />
          {isClientList && (
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              />
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600">
                <option value="name">Name A–Z</option>
                <option value="mrr">MRR high–low</option>
              </select>
            </div>
          )}
        </div>

        {isClientList && (
          <>
            {view === 'table' ? (
              <ClientTable clients={visibleClients} onOpen={onSelectClient} onEdit={setEditClient} onCopyLink={copyLink} emptyTitle={emptyTitle} />
            ) : (
              <ClientGrid clients={visibleClients} onOpen={onSelectClient} onCopyLink={copyLink} emptyTitle={emptyTitle} />
            )}
            <LoadMore hasMore={filtered.length > visible} remaining={filtered.length - visible} onLoadMore={() => setVisible((v) => v + PAGE_SIZE)} />
          </>
        )}

        {tab === 'pending' && <PendingTab onConverted={() => { setTab('clients'); onRefresh?.() }} />}

        {tab === 'alerts' && <AlertsPanel onSelectClient={onSelectClient} />}
      </div>

      <ClientModal
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); onRefresh?.() }}
      />
      {editClient && (
        <ClientModal
          open
          mode="edit"
          client={editClient}
          onClose={() => setEditClient(null)}
          onSaved={() => { setEditClient(null); onRefresh?.() }}
        />
      )}
    </div>
  )
}
