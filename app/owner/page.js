'use client'

import { useCallback, useEffect, useState } from 'react'
import OwnerGate from '@/components/owner/OwnerGate'
import AccountPlanningBoard from '@/components/owner/AccountPlanningBoard'

// /owner — private account planning. Nothing here is linked from the admin UI.
// The page is only a shell: data comes from /api/owner/plan, which refuses
// anyone without the owner session cookie.
export default function OwnerPage() {
  const [stage, setStage] = useState('checking') // checking | setup | locked | open | error
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)

  const loadPlan = useCallback(async () => {
    const res = await fetch('/api/owner/plan', { cache: 'no-store' })
    if (res.status === 401) {
      setPlan(null)
      setStage('locked')
      return
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Could not load accounts')
    setPlan(body)
    setStage('open')
  }, [])

  const check = useCallback(async () => {
    setError(null)
    setStage('checking')
    try {
      const res = await fetch('/api/owner/session', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not reach the server')
      if (!body.configured) setStage('setup')
      else if (!body.unlocked) setStage('locked')
      else await loadPlan()
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }, [loadPlan])

  useEffect(() => {
    check()
  }, [check])

  const handleUnlocked = useCallback(async () => {
    try {
      await loadPlan()
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }, [loadPlan])

  const handleLock = useCallback(async () => {
    try {
      await fetch('/api/owner/session', { method: 'DELETE' })
    } finally {
      setPlan(null)
      setStage('locked')
    }
  }, [])

  const handleExpired = useCallback(() => {
    setPlan(null)
    setStage('locked')
  }, [])

  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full">
          <h1 className="text-xl font-serif mb-3 text-gray-900">This page could not load</h1>
          <p className="text-gray-600 mb-5">{error}</p>
          <button onClick={check} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'setup' || stage === 'locked') {
    return <OwnerGate mode={stage === 'setup' ? 'setup' : 'unlock'} onUnlocked={handleUnlocked} />
  }

  return (
    <AccountPlanningBoard
      initialAccounts={plan?.accounts || []}
      onLock={handleLock}
      onSessionExpired={handleExpired}
    />
  )
}
