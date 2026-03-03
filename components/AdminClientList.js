'use client'

import { useState, useEffect } from 'react'
import { planConfig } from '@/lib/supabase'
import AlertsPanel from './AlertsPanel'

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

  useEffect(() => {
    fetchUnreadCount()
    fetchCadRate()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

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
        ) : (
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
              {[...clients].sort((a, b) => {
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
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                            Notion linked
                          </span>
                          {!client.notion_project_id && (
                            <>
                              <span className="text-xs">•</span>
                              <span className="text-xs text-amber-500">No project ID</span>
                            </>
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

              {clients.length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-5xl mb-4 opacity-50">📋</div>
                  <p className="text-gray-500">No clients yet. Create your first client to get started.</p>
                </div>
              )}
            </div>

            {/* Monthly Revenue Summary */}
            {clients.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Monthly Revenue (USD)</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      ${clients.reduce((total, c) => {
                        const price = c.custom_price || planConfig[c.plan]?.defaultPrice || 0
                        return total + parseInt(price)
                      }, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      Monthly Revenue (CAD){cadRate && <span className="text-xs text-gray-400 ml-1">@ {cadRate.toFixed(2)}</span>}
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {cadRate
                        ? `C$${Math.round(clients.reduce((total, c) => {
                            const price = c.custom_price || planConfig[c.plan]?.defaultPrice || 0
                            return total + parseInt(price)
                          }, 0) * cadRate).toLocaleString()}`
                        : '...'
                      }
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Active Clients</div>
                    <div className="text-2xl font-semibold text-gray-900">{clients.length}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
