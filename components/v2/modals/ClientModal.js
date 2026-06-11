'use client'

import { useState } from 'react'
import Modal from '@/components/v2/primitives/Modal'

// Create or edit a client. mode = 'create' | 'edit'.
export default function ClientModal({ open, mode = 'create', client, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(() => ({
    name: client?.name || '',
    plan: client?.plan || 'growth',
    customPrice: client?.custom_price ? String(client.custom_price) : '',
    status: client?.client_status || 'active',
    clientTag: client?.client_tag || '',
    password: '',
    passwordEnabled: client?.password_enabled || false,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        const body = {
          name: form.name,
          plan: form.plan,
          clientStatus: form.status,
          clientTag: form.clientTag,
          customPlan: form.customPrice ? { price: form.customPrice } : undefined,
        }
        if (form.password) { body.password = form.password; body.passwordEnabled = true }
        else body.passwordEnabled = form.passwordEnabled
        const res = await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            plan: form.plan,
            password: form.password,
            passwordEnabled: form.passwordEnabled,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      }
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'Create Client'}
      subtitle={isEdit ? client?.name : undefined}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-accent">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Client name</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={form.plan} onChange={set('plan')}>
              <option value="launch">Launch</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
          </div>
        </div>

        {isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Custom price (USD)</label>
              <input className="input" value={form.customPrice} onChange={set('customPrice')} placeholder="optional" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label className="label">Tag</label>
              <select className="input" value={form.clientTag} onChange={set('clientTag')}>
                <option value="">None</option>
                <option value="symphony">Symphony</option>
                <option value="legacy_drip">Legacy Drip</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label">Access password {isEdit && '(leave blank to keep)'}</label>
            <input className="input" value={form.password} onChange={set('password')} placeholder="optional" />
          </div>
          <label className="flex items-center gap-2 pb-3 cursor-pointer">
            <input type="checkbox" checked={form.passwordEnabled} onChange={set('passwordEnabled')} className="w-4 h-4" />
            <span className="text-sm text-gray-600">Require password</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  )
}
