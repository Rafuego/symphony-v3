'use client'

import { useState } from 'react'
import { planConfig } from '@/lib/supabase'

export default function AdminClientList({ clients, onSelectClient, onRefresh }) {
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    plan: 'growth',
    password: '',
    passwordEnabled: false
  })
  const [creating, setCreating] = useState(false)

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
      {/* Admin - Brown accent bar */}
      <div className="h-1.5 bg-[#8B7355]" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-10 py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-normal text-gray-900">Symphony</h1>
            <span className="px-3 py-1.5 bg-[#8B7355] text-white text-xs font-semibold uppercase tracking-wider rounded">
              Admin Console
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-10 py-10">
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
          {clients.map(client => {
            const plan = planConfig[client.plan]
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
                    </div>
                    <div className="text-sm text-gray-500">
                      {client.activeCount} active • {client.queuedCount} queued
                    </div>
                  </div>
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
      </div>
    </div>
  )
}
