'use client'

import { useState, useEffect } from 'react'
import AdminClientListV2 from '@/components/v2/AdminClientListV2'
import AdminClientDashboardV2 from '@/components/v2/AdminClientDashboardV2'
import AdminPasswordGate from '@/components/AdminPasswordGate'

// v2 admin. Both the client list (Section 3) and the single-client dashboard
// (Sections 1-2) are the redesigned v2 views.
export default function AdminV2Page() {
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setClients(data.clients || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchClient = async (id) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSelectedClient(data.client)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClientId) fetchClient(selectedClientId)
  }, [selectedClientId])

  const handleBack = () => {
    setSelectedClientId(null)
    setSelectedClient(null)
    fetchClients()
  }

  const handleRefresh = () => {
    if (selectedClientId) fetchClient(selectedClientId)
  }

  return (
    <AdminPasswordGate>
      {loading && !selectedClient && clients.length === 0 ? (
        <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
          <div className="text-gray-500">Loading…</div>
        </div>
      ) : error ? (
        <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-sm max-w-md">
            <h2 className="text-xl font-serif mb-4 text-red-600">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      ) : selectedClient ? (
        <AdminClientDashboardV2
          client={selectedClient}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      ) : (
        <AdminClientListV2
          clients={clients}
          onSelectClient={setSelectedClientId}
          onRefresh={fetchClients}
        />
      )}
    </AdminPasswordGate>
  )
}
