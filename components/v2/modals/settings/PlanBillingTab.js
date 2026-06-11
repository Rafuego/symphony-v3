'use client'

import { useState } from 'react'
import { planConfig } from '@/lib/supabase'
import { resolvePlan, formatPrice } from '@/components/v2/lib/plan'

// Plan & billing tab. No payment/Stripe (cut). Clients can request a change;
// admins get an inline "Edit Plan" → Configure form (the old PlanModal fields).
export default function PlanBillingTab({ client, role, onRefresh }) {
  const isAdmin = role === 'admin'
  const plan = resolvePlan(client)
  const requests = client.requests || []
  const active = requests.filter((r) => r.status === 'in-progress' || r.status === 'in-review').length

  const [editing, setEditing] = useState(false)

  if (editing && isAdmin) {
    return <ConfigureForm client={client} onClose={() => setEditing(false)} onRefresh={onRefresh} />
  }

  const planChangeMailto = `mailto:hello@interlude.studio?subject=${encodeURIComponent(
    `Symphony Plan Change Request - ${client.name}`
  )}`

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900">Your Plan</h3>
      <div className="border border-gray-200 rounded-xl p-5">
        <span className="inline-block px-2.5 py-1 rounded-md bg-[#8B7355] text-white text-xs font-medium">
          {plan.name}
        </span>
        <div className="font-serif text-3xl text-gray-900 mt-3">
          {formatPrice(plan.price)} <span className="text-sm text-gray-400 font-sans">/ month</span>
        </div>
        <dl className="mt-4 divide-y divide-gray-100 text-sm">
          <Row label="Plan usage" value={`${active}/${plan.maxActive} requests`} />
          <Row label="Dedicated designers" value={plan.designers} />
          <Row label="Request queue" value="Unlimited" />
        </dl>
        <div className="mt-4 flex justify-end">
          {isAdmin ? (
            <button onClick={() => setEditing(true)} className="btn-accent">
              Edit Plan
            </button>
          ) : (
            <a href={planChangeMailto} className="btn-accent">
              Request Plan Change →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  )
}

function ConfigureForm({ client, onClose, onRefresh }) {
  const plan = resolvePlan(client)
  const [type, setType] = useState(plan.key)
  const [price, setPrice] = useState(String(plan.price))
  const [maxActive, setMaxActive] = useState(String(plan.maxActive))
  const [designers, setDesigners] = useState(String(plan.designers))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: type, customPlan: { price, maxActive, designers } }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onRefresh?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Configure your Plan</h3>
        <p className="text-xs text-gray-400">Set up custom pricing and capacity for {client.name}.</p>
      </div>
      <div>
        <label className="label">Plan Type</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(planConfig).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize ${
                type === key
                  ? 'bg-[#8B7355] text-white border-[#8B7355]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {planConfig[key].name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Monthly Price</label>
        <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Max Active Requests</label>
          <input className="input" value={maxActive} onChange={(e) => setMaxActive(e.target.value)} />
        </div>
        <div>
          <label className="label">Dedicated Designers</label>
          <input className="input" value={designers} onChange={(e) => setDesigners(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-accent">
          {saving ? 'Saving…' : 'Save Plan'}
        </button>
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
