'use client'

import { useState } from 'react'
import { uploadFile } from '@/lib/uploadFile'

// Account tab. Editable for clients; read-only view for admins (matches Figma).
export default function AccountTab({ client, role, onRefresh }) {
  const editable = role === 'client'
  const poc = client.point_of_contact || {}
  const [logoUrl, setLogoUrl] = useState(client.logo_url || '')
  const [logoUploading, setLogoUploading] = useState(false)

  const [form, setForm] = useState({
    name: client.name || '',
    website: client.website || '',
    description: client.description || '',
    pocName: poc.name || '',
    pocTitle: poc.title || '',
    pocEmail: poc.email || '',
    pocPhone: poc.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const onLogoPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setError(null)
    try {
      const uploaded = await uploadFile(file, client.id)
      setLogoUrl(uploaded.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          website: form.website,
          description: form.description,
          logoUrl,
          pointOfContact: {
            name: form.pocName,
            title: form.pocTitle,
            email: form.pocEmail,
            phone: form.pocPhone,
          },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      onRefresh?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return (
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company" value={client.name} />
          <Field label="Website" value={client.website} />
        </div>
        <Field label="Description" value={client.description} />
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Point of Contact</div>
          {poc.name ? (
            <div className="text-gray-700">
              <div className="font-medium">
                {poc.name} {poc.title && <span className="text-gray-400 font-normal">· {poc.title}</span>}
              </div>
              <div className="text-gray-500">{poc.email}</div>
              <div className="text-gray-500">{poc.phone}</div>
            </div>
          ) : (
            <p className="text-gray-400">No contact set.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden text-2xl flex-shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            client.logo || '🏢'
          )}
        </div>
        <label className="text-sm text-[#8B7355] font-medium cursor-pointer hover:underline">
          {logoUploading ? 'Uploading…' : 'Upload logo'}
          <input type="file" accept="image/*" className="hidden" onChange={onLogoPick} disabled={logoUploading} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Company name</label>
          <input className="input" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={set('website')} placeholder="acme.com" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-y" rows={3} value={form.description} onChange={set('description')} />
      </div>
      <div>
        <div className="label">Point of Contact</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" value={form.pocName} onChange={set('pocName')} placeholder="Name" />
          <input className="input" value={form.pocTitle} onChange={set('pocTitle')} placeholder="Title" />
          <input className="input" value={form.pocEmail} onChange={set('pocEmail')} placeholder="Email" />
          <input className="input" value={form.pocPhone} onChange={set('pocPhone')} placeholder="Phone" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-accent">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
      <div className="text-gray-700">{value || <span className="text-gray-400">—</span>}</div>
    </div>
  )
}
