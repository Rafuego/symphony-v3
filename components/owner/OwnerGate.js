'use client'

import { useState } from 'react'

const MIN_PASSCODE_LENGTH = 10

function timeLabel(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'a few minutes'
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Lock screen for /owner.
//   mode="setup"  first visit: prove you know the admin password, then choose
//                 the owner passcode (set once; the server refuses a second setup)
//   mode="unlock" every later visit: enter the owner passcode
export default function OwnerGate({ mode, onUnlocked }) {
  const isSetup = mode === 'setup'
  const [adminPassword, setAdminPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)

    if (isSetup) {
      if (passcode.length < MIN_PASSCODE_LENGTH) {
        setError(`Use at least ${MIN_PASSCODE_LENGTH} characters for your passcode.`)
        return
      }
      if (passcode !== confirm) {
        setError('The two passcodes do not match.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch(isSetup ? '/api/owner/setup' : '/api/owner/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSetup ? { adminPassword, passcode } : { passcode }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok && body.success) {
        setAdminPassword('')
        setPasscode('')
        setConfirm('')
        await onUnlocked?.()
        return
      }

      if (body.lockedUntil) {
        setError(`Too many wrong tries. Try again after ${timeLabel(body.lockedUntil)}.`)
      } else if (typeof body.attemptsLeft === 'number') {
        setError(`Wrong passcode. ${body.attemptsLeft} ${body.attemptsLeft === 1 ? 'try' : 'tries'} left before a 15 minute lock.`)
      } else if (res.status === 409 && isSetup) {
        setError('A passcode has already been set. Reload this page to unlock it.')
      } else {
        setError(body.error || 'That did not work. Try again.')
      }
      if (!isSetup) setPasscode('')
    } catch (err) {
      setError('Connection error. Check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4 py-10">
      <div className="h-1.5 bg-[#8B7355] absolute top-0 left-0 right-0" />

      <div className="bg-white rounded-xl p-8 sm:p-10 shadow-lg max-w-md w-full">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8B7355] mb-3">
          Private
        </div>
        <h1 className="font-serif text-2xl text-gray-900 mb-2">Account Planning</h1>
        <p className="text-gray-500 text-sm mb-6">
          {isSetup
            ? 'Choose a passcode that only you know. It is separate from the admin password, and it is the only way into this page.'
            : 'Enter your passcode to open your account plan.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {isSetup && (
            <div>
              <label className="label" htmlFor="owner-admin-password">
                Symphony admin password
              </label>
              <input
                id="owner-admin-password"
                type="password"
                autoComplete="off"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setError(null) }}
                className="input"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Needed once, to confirm you are part of the team.</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="owner-passcode">
              {isSetup ? 'Your new passcode' : 'Passcode'}
            </label>
            <input
              id="owner-passcode"
              type="password"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setError(null) }}
              className="input"
              autoFocus={!isSetup}
            />
            {isSetup && (
              <p className="text-xs text-gray-400 mt-1">At least {MIN_PASSCODE_LENGTH} characters. A short phrase works well.</p>
            )}
          </div>

          {isSetup && (
            <div>
              <label className="label" htmlFor="owner-passcode-confirm">
                Type it again
              </label>
              <input
                id="owner-passcode-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                className="input"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading || !passcode || (isSetup && (!adminPassword || !confirm))}
            className="btn-primary w-full"
          >
            {loading ? 'Checking...' : isSetup ? 'Set passcode and open' : 'Unlock'}
          </button>
        </form>

        {isSetup && (
          <p className="text-xs text-gray-400 mt-5">
            Save the passcode somewhere safe. It cannot be shown again, only reset.
          </p>
        )}
      </div>
    </div>
  )
}
