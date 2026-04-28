'use client'

import { useState, useEffect } from 'react'
import { planConfig } from '@/lib/supabase'
import AlertsPanel from './AlertsPanel'

const dealStages = {
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  proposal: { label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  negotiation: { label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  verbal: { label: 'Verbal', color: 'bg-green-100 text-green-700' }
}

export default function AdminClientList({ clients, onSelectClient, onRefresh }) {
  const [activeTab, setActiveTab] = useState('clients')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    plan: 'growth',
    password: '',
    passwordEnabled: false
  })
  const [creating, setCreating] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [cadRate, setCadRate] = useState(null)

  // Pending deals state
  const [deals, setDeals] = useState([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newDeal, setNewDeal] = useState({
    name: '', contactName: '', contactEmail: '', plan: 'growth', estimatedPrice: '', notes: '', status: 'lead'
  })
  const [creatingDeal, setCreatingDeal] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [converting, setConverting] = useState(null)

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications?unread=true')
      const data = await res.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }

  // Fetch USD to CAD exchange rate
  const fetchCadRate = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      const data = await res.json()
      if (data.rates?.CAD) setCadRate(data.rates.CAD)
    } catch (err) {
      console.error('Error fetching CAD rate:', err)
    }
  }

  // Fetch pending deals
  const fetchDeals = async () => {
    setDealsLoading(true)
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDeals(data.deals || [])
    } catch (err) {
      console.error('Error fetching deals:', err)
    } finally {
      setDealsLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    fetchCadRate()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch deals when switching to pending tab
  useEffect(() => {
    if (activeTab === 'pending') fetchDeals()
  }, [activeTab])

  const handleCreateClient = async () => {
    if (!newClient.name) return

    setCreating(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setNewClient({ name: '', plan: 'growth', password: '', passwordEnabled: false })
      setShowNewClient(false)
      onRefresh()
    } catch (err) {
      alert('Error creating client: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleCreateDeal = async () => {
    if (!newDeal.name) return

    setCreatingDeal(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setNewDeal({ name: '', contactName: '', contactEmail: '', plan: 'growth', estimatedPrice: '', notes: '', status: 'lead' })
      setShowNewDeal(false)
      fetchDeals()
    } catch (err) {
      alert('Error creating deal: ' + err.message)
    } finally {
      setCreatingDeal(false)
    }
  }

  const handleUpdateDeal = async (dealId, updates) => {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchDeals()
    } catch (err) {
      alert('Error updating deal: ' + err.message)
    }
  }

  const handleConvertDeal = async (deal) => {
    setConverting(deal.id)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deal.name,
          plan: deal.plan || 'growth',
          customPlan: deal.estimated_price ? { price: String(deal.estimated_price) } : undefined
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Remove the deal after successful conversion
      await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
      setEditingDeal(null)
      fetchDeals()
      onRefresh()
      setActiveTab('clients')
    } catch (err) {
      alert('Error converting deal: ' + err.message)
    } finally {
      setConverting(null)
    }
  }

  const handleDeleteDeal = async (dealId) => {
    if (!confirm('Remove this deal?')) return
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditingDeal(null)
      fetchDeals()
    } catch (err) {
      alert('Error deleting deal: ' + err.message)
    }
  }

  const copyClientLink = (client) => {
    const url = `${window.location.origin}/portal/${client.access_token}`
    navigator.clipboard.writeText(url)
    alert(`Client link copied!\n\n${url}\n\n${client.password_enabled ? 'Password protected' : 'No password required'}`)
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Top accent bar */}
      <div className="h-1.5 bg-[#8B7355]" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-10 py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-normal text-gray-900">Symphony</h1>
            <span className="text-xs text-[#8B7355] font-medium uppercase tracking-wider">
              Admin Console
            </span>
          </div>
          <a
            href="/demo"
            target="_blank"
            className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            Demo Environment
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-10">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'clients'
                  ? 'border-[#8B7355] text-[#8B7355]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveTab('paused')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'paused'
                  ? 'border-[#8B7355] text-[#8B7355]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Paused
              {clients.filter(c => c.client_status === 'paused').length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  {clients.filter(c => c.client_status === 'paused').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-[#8B7355] text-[#8B7355]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending
              {deals.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                  {deals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('alerts'); fetchUnreadCount(); }}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'alerts'
                  ? 'border-[#8B7355] text-[#8B7355]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Alerts
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-10 py-10">
        {activeTab === 'alerts' ? (
          <AlertsPanel onSelectClient={(clientId) => {
            onSelectClient(clientId)
          }} />

        ) : activeTab === 'pending' ? (
          /* ===== PENDING DEALS TAB ===== */
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-2xl font-normal text-gray-900">
                Pending Deals
              </h2>
              <button
                onClick={() => setShowNewDeal(true)}
                className="btn-primary"
              >
                + New Deal
              </button>
            </div>

            {/* New Deal Form */}
            {showNewDeal && (
              <div className="card mb-6">
                <h3 className="font-serif text-xl mb-5">Add Pending Deal</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Company Name</label>
                    <input
                      type="text"
                      value={newDeal.name}
                      onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                      placeholder="e.g., Acme Corp"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Stage</label>
                    <select
                      value={newDeal.status}
                      onChange={(e) => setNewDeal({ ...newDeal, status: e.target.value })}
                      className="input"
                    >
                      <option value="lead">Lead</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="verbal">Verbal</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Contact Name</label>
                    <input
                      type="text"
                      value={newDeal.contactName}
                      onChange={(e) => setNewDeal({ ...newDeal, contactName: e.target.value })}
                      placeholder="e.g., John Smith"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Email</label>
                    <input
                      type="email"
                      value={newDeal.contactEmail}
                      onChange={(e) => setNewDeal({ ...newDeal, contactEmail: e.target.value })}
                      placeholder="e.g., john@acme.com"
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Likely Plan</label>
                    <select
                      value={newDeal.plan}
                      onChange={(e) => setNewDeal({ ...newDeal, plan: e.target.value })}
                      className="input"
                    >
                      <option value="launch">Launch</option>
                      <option value="growth">Growth</option>
                      <option value="scale">Scale</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Estimated Price (USD)</label>
                    <input
                      type="number"
                      value={newDeal.estimatedPrice}
                      onChange={(e) => setNewDeal({ ...newDeal, estimatedPrice: e.target.value })}
                      placeholder="e.g., 3500"
                      className="input"
                    />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="label">Notes</label>
                  <textarea
                    value={newDeal.notes}
                    onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                    placeholder="Any notes about this deal..."
                    rows={2}
                    className="input resize-y"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreateDeal} disabled={creatingDeal} className="btn-primary">
                    {creatingDeal ? 'Adding...' : 'Add Deal'}
                  </button>
                  <button onClick={() => setShowNewDeal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Deals List */}
            {dealsLoading ? (
              <div className="card text-center py-12">
                <p className="text-gray-500">Loading deals...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deals.map(deal => {
                  const stage = dealStages[deal.status] || dealStages.lead
                  const isEditing = editingDeal === deal.id
                  return (
                    <div key={deal.id} className="card">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                          💼
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-serif text-lg text-gray-900">{deal.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${stage.color}`}>
                              {stage.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {deal.contact_name && <span>{deal.contact_name}</span>}
                            {deal.contact_name && deal.contact_email && <span> • </span>}
                            {deal.contact_email && <span>{deal.contact_email}</span>}
                            {!deal.contact_name && !deal.contact_email && <span className="text-gray-400">No contact info</span>}
                          </div>
                        </div>
                        {deal.estimated_price && (
                          <div className="text-right mr-2">
                            <div className="text-lg font-semibold text-gray-900">
                              ${parseInt(deal.estimated_price).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">/month est.</div>
                          </div>
                        )}
                        <div className={`px-3 py-1.5 rounded text-xs font-semibold uppercase ${
                          deal.plan === 'scale' ? 'bg-gray-900 text-white' : 'bg-[#8B7355] text-white'
                        }`}>
                          {planConfig[deal.plan]?.name || deal.plan}
                        </div>
                        <button
                          onClick={() => setEditingDeal(isEditing ? null : deal.id)}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                        >
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                      </div>

                      {/* Expanded edit area */}
                      {isEditing && (
                        <div className="mt-5 pt-5 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="label">Stage</label>
                              <select
                                value={deal.status}
                                onChange={(e) => handleUpdateDeal(deal.id, { status: e.target.value })}
                                className="input"
                              >
                                <option value="lead">Lead</option>
                                <option value="proposal">Proposal</option>
                                <option value="negotiation">Negotiation</option>
                                <option value="verbal">Verbal</option>
                              </select>
                            </div>
                            <div>
                              <label className="label">Contact Name</label>
                              <input
                                type="text"
                                defaultValue={deal.contact_name || ''}
                                onBlur={(e) => handleUpdateDeal(deal.id, { contactName: e.target.value })}
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="label">Contact Email</label>
                              <input
                                type="email"
                                defaultValue={deal.contact_email || ''}
                                onBlur={(e) => handleUpdateDeal(deal.id, { contactEmail: e.target.value })}
                                className="input"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="label">Likely Plan</label>
                              <select
                                value={deal.plan}
                                onChange={(e) => handleUpdateDeal(deal.id, { plan: e.target.value })}
                                className="input"
                              >
                                <option value="launch">Launch</option>
                                <option value="growth">Growth</option>
                                <option value="scale">Scale</option>
                              </select>
                            </div>
                            <div>
                              <label className="label">Estimated Price (USD)</label>
                              <input
                                type="number"
                                defaultValue={deal.estimated_price || ''}
                                onBlur={(e) => handleUpdateDeal(deal.id, { estimatedPrice: e.target.value })}
                                className="input"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={() => handleConvertDeal(deal)}
                                disabled={converting === deal.id}
                                className="px-4 py-2 text-sm text-white bg-[#8B7355] hover:bg-[#7A6548] rounded-lg transition-colors disabled:opacity-50"
                              >
                                {converting === deal.id ? 'Converting...' : 'Convert to Client'}
                              </button>
                              <button
                                onClick={() => handleDeleteDeal(deal.id)}
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="label">Notes</label>
                            <textarea
                              defaultValue={deal.notes || ''}
                              onBlur={(e) => handleUpdateDeal(deal.id, { notes: e.target.value })}
                              rows={2}
                              placeholder="Notes about this deal..."
                              className="input resize-y"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {deals.length === 0 && !dealsLoading && (
                  <div className="card text-center py-12">
                    <div className="text-5xl mb-4 opacity-50">🤝</div>
                    <p className="text-gray-500">No pending deals. Add one to start tracking prospects.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Summary */}
            {deals.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Pipeline Value (USD)</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      ${deals.reduce((total, d) => total + (parseInt(d.estimated_price) || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  {cadRate && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Pipeline Value (CAD)<span className="text-xs text-gray-400 ml-1">@ {cadRate.toFixed(2)}</span>
                      </div>
                      <div className="text-2xl font-semibold text-gray-900">
                        C${Math.round(deals.reduce((total, d) => total + (parseInt(d.estimated_price) || 0), 0) * cadRate).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Deals in Pipeline</div>
                    <div className="text-2xl font-semibold text-gray-900">{deals.length}</div>
                  </div>
                </div>
              </div>
            )}
          </>

        ) : activeTab === 'paused' ? (
          /* ===== PAUSED CLIENTS TAB ===== */
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-2xl font-normal text-gray-900">
                Paused Clients
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Clients on hold. They are excluded from monthly revenue totals and the main client list. Resume them anytime from their settings.
            </p>

            <div className="space-y-3">
              {[...clients]
                .filter(c => c.client_status === 'paused')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(client => {
                  const plan = planConfig[client.plan]
                  const clientPrice = client.custom_price || plan?.defaultPrice
                  return (
                    <div
                      key={client.id}
                      className="card flex items-center gap-5 hover:shadow-md transition-shadow opacity-75"
                    >
                      <div
                        className="flex items-center gap-5 flex-1 cursor-pointer"
                        onClick={() => onSelectClient(client.id)}
                      >
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-2xl">
                          {client.logo || '⏸️'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-serif text-lg text-gray-900">{client.name}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              Paused
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.activeCount} active • {client.queuedCount} queued
                          </div>
                        </div>
                        {clientPrice && (
                          <div className="text-right mr-2">
                            <div className="text-lg font-semibold text-gray-400">
                              ${parseInt(clientPrice).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">/month (paused)</div>
                          </div>
                        )}
                        <div className="px-3 py-1.5 rounded text-xs font-semibold uppercase bg-gray-200 text-gray-500">
                          {plan?.name}
                        </div>
                      </div>
                      <div
                        className="text-gray-400 cursor-pointer"
                        onClick={() => onSelectClient(client.id)}
                      >
                        →
                      </div>
                    </div>
                  )
                })}

              {clients.filter(c => c.client_status === 'paused').length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-5xl mb-4 opacity-50">⏸️</div>
                  <p className="text-gray-500">No paused clients.</p>
                </div>
              )}
            </div>
          </>

        ) : (
          /* ===== CLIENTS TAB ===== */
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-2xl font-normal text-gray-900">
                Client Accounts
              </h2>
              <button
                onClick={() => setShowNewClient(true)}
                className="btn-primary"
              >
                + New Client
              </button>
            </div>

            {/* New Client Form */}
            {showNewClient && (
              <div className="card mb-6">
                <h3 className="font-serif text-xl mb-5">Create New Client</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Client Name</label>
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="e.g., Acme Corp"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Plan</label>
                    <select
                      value={newClient.plan}
                      onChange={(e) => setNewClient({ ...newClient, plan: e.target.value })}
                      className="input"
                    >
                      <option value="launch">Launch</option>
                      <option value="growth">Growth</option>
                      <option value="scale">Scale</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5 items-end">
                  <div>
                    <label className="label">Access Password (optional)</label>
                    <input
                      type="text"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      placeholder="Set a client access password"
                      className="input"
                    />
                  </div>
                  <div className="pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newClient.passwordEnabled}
                        onChange={(e) => setNewClient({ ...newClient, passwordEnabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">Require password</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreateClient} disabled={creating} className="btn-primary">
                    {creating ? 'Creating...' : 'Create Client'}
                  </button>
                  <button onClick={() => setShowNewClient(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Client List */}
            <div className="space-y-3">
              {[...clients]
                .filter(c => c.client_status !== 'paused')
                .sort((a, b) => {
                const tagOrder = { symphony: 0, '': 1, legacy_drip: 2 }
                const aOrder = tagOrder[a.client_tag || ''] ?? 1
                const bOrder = tagOrder[b.client_tag || ''] ?? 1
                if (aOrder !== bOrder) return aOrder - bOrder
                return (a.name || '').localeCompare(b.name || '')
              }).map(client => {
                const plan = planConfig[client.plan]
                const clientPrice = client.custom_price || plan?.defaultPrice
                return (
                  <div
                    key={client.id}
                    className="card flex items-center gap-5 hover:shadow-md transition-shadow"
                  >
                    <div
                      className="flex items-center gap-5 flex-1 cursor-pointer"
                      onClick={() => onSelectClient(client.id)}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {client.logo}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-serif text-lg text-gray-900">{client.name}</h3>
                          {client.password_enabled && (
                            <span title="Password protected">🔒</span>
                          )}
                          {client.client_tag && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              client.client_tag === 'symphony'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {client.client_tag === 'symphony' ? 'Symphony' : 'Legacy Drip'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>{client.activeCount} active • {client.queuedCount} queued</span>
                          <span className="text-xs">•</span>
                          {client.notion_project_id ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                              Notion configured
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
                              No project ID
                            </span>
                          )}
                        </div>
                      </div>
                      {clientPrice && (
                        <div className="text-right mr-2">
                          <div className="text-lg font-semibold text-gray-900">
                            ${parseInt(clientPrice).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">/month</div>
                        </div>
                      )}
                      <div className={`px-3 py-1.5 rounded text-xs font-semibold uppercase ${
                        client.plan === 'scale' ? 'bg-gray-900 text-white' : 'bg-[#8B7355] text-white'
                      }`}>
                        {plan?.name}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyClientLink(client)
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                    >
                      🔗 Copy Link
                    </button>
                    <div
                      className="text-gray-400 cursor-pointer"
                      onClick={() => onSelectClient(client.id)}
                    >
                      →
                    </div>
                  </div>
                )
              })}

              {clients.filter(c => c.client_status !== 'paused').length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-5xl mb-4 opacity-50">📋</div>
                  <p className="text-gray-500">No active clients. Create one or check the Paused tab.</p>
                </div>
              )}
            </div>

            {/* Monthly Revenue Summary */}
            {(() => {
              const activeClients = clients.filter(c => c.client_status !== 'paused')
              const pausedCount = clients.length - activeClients.length
              const mrrUsd = activeClients.reduce((total, c) => {
                const price = c.custom_price || planConfig[c.plan]?.defaultPrice || 0
                return total + parseInt(price)
              }, 0)
              return clients.length > 0 && (
                <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Monthly Revenue (USD)</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        ${mrrUsd.toLocaleString()}
                      </div>
                      {pausedCount > 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          {pausedCount} paused client{pausedCount === 1 ? '' : 's'} excluded
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Monthly Revenue (CAD){cadRate && <span className="text-xs text-gray-400 ml-1">@ {cadRate.toFixed(2)}</span>}
                      </div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {cadRate
                          ? `C$${Math.round(mrrUsd * cadRate).toLocaleString()}`
                          : '...'
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Active Clients</div>
                      <div className="text-2xl font-semibold text-gray-900">{activeClients.length}</div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
