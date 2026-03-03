'use client'

import { useState, useEffect } from 'react'

export default function AdminPasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if already authenticated in this session
    if (sessionStorage.getItem('symphony_admin_auth') === 'true') {
      setAuthenticated(true)
    }
    setChecking(false)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        sessionStorage.setItem('symphony_admin_auth', 'true')
        setAuthenticated(true)
      } else {
        setError(data.error || 'Incorrect password')
        setPassword('')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while checking sessionStorage
  if (checking) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // If authenticated, render the admin dashboard
  if (authenticated) {
    return children
  }

  // Password form
  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
      <div className="h-1.5 bg-[#8B7355] absolute top-0 left-0 right-0" />

      <div className="bg-white rounded-xl p-12 shadow-lg max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-3xl mx-auto mb-6">
          🔐
        </div>
        <h2 className="font-serif text-2xl text-gray-900 mb-2">Symphony Admin</h2>
        <p className="text-gray-500 mb-8">Enter admin password to continue</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            placeholder="Enter password"
            className={`input mb-3 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full"
          >
            {loading ? 'Verifying...' : 'Access Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
