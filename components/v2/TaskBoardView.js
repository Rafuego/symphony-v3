'use client'

import { useState } from 'react'
import MetricsBar from '@/components/v2/primitives/MetricsBar'
import Tabs from '@/components/v2/primitives/Tabs'
import Toolbar from '@/components/v2/primitives/Toolbar'
import RequestTable from '@/components/v2/primitives/RequestTable'
import KanbanBoard from '@/components/v2/primitives/KanbanBoard'
import LoadMore from '@/components/v2/primitives/LoadMore'
import RequestDrawer from '@/components/v2/drawer/RequestDrawer'
import NewRequestModal from '@/components/v2/modals/NewRequestModal'
import SettingsModal from '@/components/v2/modals/SettingsModal'
import { useRequestMetrics } from '@/components/v2/hooks/useRequestMetrics'
import { useRequestFilters } from '@/components/v2/hooks/useRequestFilters'
import { resolvePlan } from '@/components/v2/lib/plan'

const PAGE_SIZE = 12

// Shared task-board shell used by both the client portal and the admin dashboard.
// Role differences (editable status, back button, settings tabs) are derived here,
// not threaded into the leaf primitives.
export default function TaskBoardView({ client, role, onBack, onRefresh }) {
  const isAdmin = role === 'admin'
  const requests = client.requests || []
  const plan = resolvePlan(client)

  const metrics = useRequestMetrics(requests, plan.maxActive)
  const { tab, setTab, search, setSearch, sort, setSort, filtered } = useRequestFilters(requests)

  const [view, setView] = useState('table') // 'table' | 'kanban' (kanban: Phase 5)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  // Derive the open request from the (possibly refreshed) list so drawer edits
  // reflect live after onRefresh re-fetches the client.
  const selectedRequest = selectedId ? requests.find((r) => r.id === selectedId) || null : null
  const openRequest = (req) => setSelectedId(req.id)

  const tabs = [
    { id: 'all', label: 'All', count: metrics.total },
    { id: 'in-queue', label: 'Queue', count: metrics.inQueue },
    { id: 'in-progress', label: 'In Progress', count: metrics.inProgress },
    { id: 'in-review', label: 'In Review', count: metrics.inReview },
    { id: 'completed', label: 'Completed', count: metrics.completed },
  ]

  const onTabChange = (id) => {
    setTab(id)
    setVisible(PAGE_SIZE)
  }

  const visibleRequests = filtered.slice(0, visible)

  const handleStatusChange = async (request, nextStatus) => {
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          actor: { type: 'admin', name: 'Interlude Team' },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onRefresh?.()
    } catch (err) {
      alert('Could not update status: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1">
          {isAdmin && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ⚙ Settings
          </button>
        </div>
        <div className="text-center flex-1">
          <div className="font-serif text-xl text-[#8B7355] leading-none">Symphony</div>
          <div className="text-[10px] text-gray-400 tracking-wide">by Interlude</div>
        </div>
        <div className="flex items-center justify-end flex-1">
          <button
            onClick={() => setShowNewRequest(true)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
          >
            + New Request
          </button>
        </div>
      </header>

      {/* Metrics */}
      <MetricsBar metrics={metrics} />

      {/* Board */}
      <div className="px-4 sm:px-8 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-3xl text-gray-900">{client.name}</h1>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 ${view === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
            >
              ▦ Table
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 ${view === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
            >
              ▥ Kanban
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          {view === 'table' ? (
            <Tabs tabs={tabs} active={tab} onChange={onTabChange} />
          ) : (
            <div />
          )}
          <Toolbar search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
        </div>

        {view === 'table' ? (
          <>
            <RequestTable
              requests={visibleRequests}
              role={role}
              activeTab={tab}
              clientId={client.id}
              onOpen={openRequest}
              onStatusChange={handleStatusChange}
              onRefresh={onRefresh}
              emptyTitle={search ? 'No matching requests' : 'No requests yet'}
            />
            <LoadMore
              hasMore={filtered.length > visible}
              remaining={filtered.length - visible}
              onLoadMore={() => setVisible((v) => v + PAGE_SIZE)}
            />
          </>
        ) : (
          <KanbanBoard
            requests={requests}
            search={search}
            onOpen={openRequest}
            onMove={handleStatusChange}
          />
        )}
      </div>

      {/* Modals + drawer */}
      <NewRequestModal
        open={showNewRequest}
        clientId={client.id}
        onClose={() => setShowNewRequest(false)}
        onCreated={() => {
          setShowNewRequest(false)
          onRefresh?.()
        }}
      />
      <SettingsModal
        open={showSettings}
        client={client}
        role={role}
        onClose={() => setShowSettings(false)}
        onRefresh={onRefresh}
      />
      {selectedRequest && (
        <RequestDrawer
          request={selectedRequest}
          role={role}
          client={client}
          onClose={() => setSelectedId(null)}
          onRefresh={onRefresh}
          onStatusChange={(req, next) => handleStatusChange(req, next)}
          onDeleted={() => {
            setSelectedId(null)
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
