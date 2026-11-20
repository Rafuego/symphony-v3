'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import AdminClientListV2 from '@/components/v2/AdminClientListV2'
import AdminClientDashboardV2 from '@/components/v2/AdminClientDashboardV2'
import AdminPasswordGate from '@/components/AdminPasswordGate'
import { useUrlParam, setUrlParams } from '@/components/v2/hooks/useUrlParam'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function AdminPage() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The open client lives in the address bar (/admin?client=<slug>), so every
  // client board has its own link and Back/Forward move between screens.
  // An id works too (/admin?client=<uuid>), which is what older links use.
  const [clientKey, , urlReady] = useUrlParam('client')

  const selectedClientId = useMemo(() => {
    if (!clientKey) return null
    const match = clients.find((c) => c.slug === clientKey || c.id === clientKey)
    if (match) return match.id
    return UUID.test(clientKey) ? clientKey : null
  }, [clientKey, clients])

  // Fetch all clients
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

  // Fetch single client with requests
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

  const hadClientOpen = useRef(false)
  useEffect(() => {
    if (selectedClientId) {
      hadClientOpen.current = true
      fetchClient(selectedClientId)
    } else {
      setSelectedClient(null)
      // Coming back from a client board (button or browser Back): refresh the list.
      if (hadClientOpen.current) {
        hadClientOpen.current = false
        fetchClients()
      }
    }
  }, [selectedClientId])

  // Open a client's board, optionally straight onto one request.
  const handleSelectClient = (clientId, requestId = null) => {
    const client = clients.find((c) => c.id === clientId)
    setUrlParams({ client: client?.slug || clientId, request: requestId || null })
  }

  const goToList = (options) => {
    setUrlParams({ client: null, request: null }, options)
  }

  const handleBack = () => {
    goToList() // the effect above refreshes the list
  }

  const handleRefresh = () => {
    if (selectedClientId) {
      fetchClient(selectedClientId)
    }
  }

  // A link to a client is "in flight" until that client's board has loaded.
  const waitingForClient =
    !!clientKey &&
    !error &&
    (selectedClientId ? selectedClient?.id !== selectedClientId : loading && clients.length === 0)

  const showLoading =
    !urlReady || waitingForClient || (loading && !selectedClient && clients.length === 0)

  return (
    <AdminPasswordGate>
      {showLoading && !error ? (
        <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : error ? (
        <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-sm max-w-md">
            <h2 className="text-xl font-serif mb-4 text-red-600">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Retry
              </button>
              {clientKey && (
                <button
                  onClick={() => {
                    setError(null)
                    goToList({ replace: true })
                    fetchClients()
                  }}
                  className="btn-secondary"
                >
                  Back to clients
                </button>
              )}
            </div>
          </div>
        </div>
      ) : selectedClient ? (
        <AdminClientDashboardV2
          key={selectedClient.id}
          client={selectedClient}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      ) : (
        <AdminClientListV2
          clients={clients}
          onSelectClient={handleSelectClient}
          onRefresh={fetchClients}
        />
      )}
    </AdminPasswordGate>
  )
}
