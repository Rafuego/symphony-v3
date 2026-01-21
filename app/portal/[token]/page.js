'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ClientPortal from '@/components/ClientPortal'
import PasswordGate from '@/components/PasswordGate'

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token
  
  const [status, setStatus] = useState('loading') // loading, password, verified, error
  const [clientId, setClientId] = useState(null)
  const [client, setClient] = useState(null)
  const [clientPreview, setClientPreview] = useState(null)
  const [error, setError] = useState(null)

  // Verify token on mount
  useEffect(() => {
    verifyAccess()
  }, [token])

  const verifyAccess = async (password = null) => {
    try {
      const res = await fetch('/api/client/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      
      const data = await res.json()
      
      if (data.error) {
        if (res.status === 401) {
          setError('Incorrect password')
          return false
        }
        throw new Error(data.error)
      }
      
      if (data.requiresPassword) {
        setClientPreview({
          name: data.clientName,
          logo: data.clientLogo
        })
        setStatus('password')
        return false
      }
      
      if (data.verified) {
        setClientId(data.clientId)
        await fetchClientData(data.clientId)
        setStatus('verified')
        return true
      }
    } catch (err) {
      setError(err.message)
      setStatus('error')
      return false
    }
  }

  const fetchClientData = async (id) => {
    try {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setClient(data.client)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handlePasswordSubmit = async (password) => {
    setError(null)
    const success = await verifyAccess(password)
    return success
  }

  const handleRefresh = () => {
    if (clientId) {
      fetchClientData(clientId)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-serif mb-4">Access Denied</h2>
          <p className="text-gray-600">{error || 'This link is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  if (status === 'password') {
    return (
      <PasswordGate
        clientName={clientPreview?.name}
        clientLogo={clientPreview?.logo}
        onSubmit={handlePasswordSubmit}
        error={error}
      />
    )
  }

  if (status === 'verified' && client) {
    return (
      <ClientPortal 
        client={client}
        onRefresh={handleRefresh}
      />
    )
  }

  return null
}
