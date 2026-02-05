'use client'

import { useState } from 'react'

export default function AdminPasswordGate({ onSubmit, error }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(error)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLocalError(null)

    const success = await onSubmit(password)

    if (!success) {
      setLocalError('Incorrect password. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
      <div className="h-1.5 bg-[#8B7355] absolute top-0 left-0 right-0" />

      <div className="bg-white rounded-xl p-12 shadow-lg max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-[#8B7355] rounded-xl flex items-center justify-center text-3xl mx-auto mb-6">
          <span className="text-white text-2xl">S</span>
        </div>
        <h2 className="font-serif text-2xl text-gray-900 mb-2">Symphony Admin</h2>
        <p className="text-gray-500 mb-8">Enter the admin password to continue</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setLocalError(null)
            }}
            placeholder="Enter admin password"
            className={`input mb-3 ${localError ? 'border-red-500 focus:ring-red-500' : ''}`}
            autoFocus
          />

          {localError && (
            <p className="text-sm text-red-500 mb-3">{localError}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full"
          >
            {loading ? 'Verifying...' : 'Access Admin Console'}
          </button>
        </form>
      </div>
    </div>
  )
}
