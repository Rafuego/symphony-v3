'use client'

import { useState } from 'react'

// Integrations tab (admin only) — Notion IDs. Read mode with a pencil to edit,
// mirroring the existing inline Notion panel in AdminClientDashboard.
export default function IntegrationsTab({ client, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    notionDatabaseId: client.notion_database_id || '',
    notionProjectId: client.notion_project_id || '',
    notionTemplateId: client.notion_template_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onRefresh?.()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const rows = [
    { key: 'notionDatabaseId', label: 'Task Database ID' },
    { key: 'notionProjectId', label: 'Client Page ID' },
    { key: 'notionTemplateId', label: 'Template Page ID' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Notion</h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-700" title="Edit">
            ✎
          </button>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.key} className="px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">{row.label}</div>
            {editing ? (
              <input className="input" value={form[row.key]} onChange={set(row.key)} />
            ) : (
              <div className="text-sm text-gray-700 font-mono truncate">
                {form[row.key] || <span className="text-gray-400 font-sans">Not set</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-accent">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary">
            Cancel
          </button>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      )}
    </div>
  )
}
