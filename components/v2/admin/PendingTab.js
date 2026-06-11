'use client'

import { useEffect, useState } from 'react'
import { planConfig } from '@/lib/supabase'
import Modal from '@/components/v2/primitives/Modal'
import EmptyState from '@/components/v2/primitives/EmptyState'

const STAGES = {
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  proposal: { label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  negotiation: { label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  verbal: { label: 'Verbal', color: 'bg-green-100 text-green-700' },
}

const EMPTY_DEAL = { name: '', contactName: '', contactEmail: '', plan: 'growth', estimatedPrice: '', notes: '', status: 'lead' }

// Pending deals pipeline (the Pending tab). Reuses the /api/deals endpoints.
export default function PendingTab({ onConverted }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // deal object or {} for new
  const [busy, setBusy] = useState(false)

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (!data.error) setDeals(data.deals || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeals() }, [])

  const saveDeal = async (form) => {
    setBusy(true)
    try {
      const isEdit = !!form.id
      const res = await fetch(isEdit ? `/api/deals/${form.id}` : '/api/deals', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditing(null)
      fetchDeals()
    } catch (err) {
      alert('Error saving deal: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const convertDeal = async (deal) => {
    setBusy(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deal.name,
          plan: deal.plan || 'growth',
          customPlan: deal.estimated_price ? { price: String(deal.estimated_price) } : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
      setEditing(null)
      fetchDeals()
      onConverted?.()
    } catch (err) {
      alert('Error converting deal: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const deleteDeal = async (deal) => {
    if (!confirm('Remove this deal?')) return
    await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
    setEditing(null)
    fetchDeals()
  }

  const pipeline = deals.reduce((t, d) => t + (parseInt(d.estimated_price) || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {deals.length} deal{deals.length === 1 ? '' : 's'} · pipeline{' '}
          <span className="font-semibold text-gray-900">${pipeline.toLocaleString()}</span>
        </div>
        <button onClick={() => setEditing({ ...EMPTY_DEAL })} className="btn-accent">+ New Deal</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading deals…</p>
      ) : deals.length === 0 ? (
        <EmptyState icon="🤝" title="No pending deals" hint="Add one to start tracking prospects." />
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
          {deals.map((deal) => {
            const stage = STAGES[deal.status] || STAGES.lead
            return (
              <div key={deal.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">💼</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{deal.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${stage.color}`}>{stage.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {deal.contact_name || deal.contact_email || 'No contact info'}
                  </div>
                </div>
                {deal.estimated_price && (
                  <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    ${parseInt(deal.estimated_price).toLocaleString()}
                  </div>
                )}
                <span className="px-2 py-1 rounded text-xs font-semibold uppercase bg-[#8B7355] text-white">
                  {planConfig[deal.plan]?.name || deal.plan}
                </span>
                <button onClick={() => setEditing(deal)} className="text-sm text-gray-500 hover:text-gray-800">Edit</button>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <DealModal
          deal={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={saveDeal}
          onConvert={editing.id ? () => convertDeal(editing) : null}
          onDelete={editing.id ? () => deleteDeal(editing) : null}
        />
      )}
    </div>
  )
}

function DealModal({ deal, busy, onClose, onSave, onConvert, onDelete }) {
  const [form, setForm] = useState({
    id: deal.id,
    name: deal.name || '',
    contactName: deal.contact_name ?? deal.contactName ?? '',
    contactEmail: deal.contact_email ?? deal.contactEmail ?? '',
    plan: deal.plan || 'growth',
    estimatedPrice: deal.estimated_price ?? deal.estimatedPrice ?? '',
    notes: deal.notes || '',
    status: deal.status || 'lead',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal
      open
      onClose={onClose}
      title={deal.id ? 'Edit Deal' : 'Add Pending Deal'}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            {onConvert && <button onClick={onConvert} disabled={busy} className="text-sm px-3 py-2 text-white bg-[#8B7355] rounded-lg hover:bg-[#7A6548] disabled:opacity-50">Convert to Client</button>}
            {onDelete && <button onClick={onDelete} className="text-sm px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Remove</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => onSave(form)} disabled={busy || !form.name.trim()} className="btn-accent">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Company name</label><input className="input" value={form.name} onChange={set('name')} /></div>
          <div>
            <label className="label">Stage</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="lead">Lead</option><option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option><option value="verbal">Verbal</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Contact name</label><input className="input" value={form.contactName} onChange={set('contactName')} /></div>
          <div><label className="label">Contact email</label><input className="input" value={form.contactEmail} onChange={set('contactEmail')} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Likely plan</label>
            <select className="input" value={form.plan} onChange={set('plan')}>
              <option value="launch">Launch</option><option value="growth">Growth</option><option value="scale">Scale</option>
            </select>
          </div>
          <div><label className="label">Estimated price (USD)</label><input className="input" value={form.estimatedPrice} onChange={set('estimatedPrice')} /></div>
        </div>
        <div><label className="label">Notes</label><textarea className="input resize-y" rows={2} value={form.notes} onChange={set('notes')} /></div>
      </div>
    </Modal>
  )
}
