'use client'

import { useState, useEffect } from 'react'
import AdminClientList from '@/components/AdminClientList'
import AdminClientDashboard from '@/components/AdminClientDashboard'
import AdminPasswordGate from '@/components/AdminPasswordGate'

export default function AdminPage() {
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

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

  // Check if already authenticated (stored in sessionStorage)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuthenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchClients()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedClientId) {
      fetchClient(selectedClientId)
    }
  }, [selectedClientId])

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId)
  }

  const handleBack = () => {
    setSelectedClientId(null)
    setSelectedClient(null)
    fetchClients() // Refresh list
  }

  const handleRefresh = () => {
    if (selectedClientId) {
      fetchClient(selectedClientId)
    }
  }

  const handlePasswordSubmit = async (password) => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (data.verified) {
        sessionStorage.setItem('adminAuthenticated', 'true')
        setIsAuthenticated(true)
        return true
      }

      return false
    } catch (err) {
      console.error('Error verifying password:', err)
      return false
    }
  }

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return <AdminPasswordGate onSubmit={handlePasswordSubmit} />
  }

  if (loading && !selectedClient && clients.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md">
          <h2 className="text-xl font-serif mb-4 text-red-600">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (selectedClient) {
    return (
      <AdminClientDashboard 
        client={selectedClient}
        onBack={handleBack}
        onRefresh={handleRefresh}
      />
    )
  }

  return (
    <AdminClientList 
      clients={clients}
      onSelectClient={handleSelectClient}
      onRefresh={fetchClients}
    />
  )
}
