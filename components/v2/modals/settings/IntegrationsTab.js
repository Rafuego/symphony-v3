'use client'

import { useState } from 'react'
import IconButton from '@/components/v2/primitives/IconButton'
import { PencilIcon } from '@/components/v2/primitives/icons'

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

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

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

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseId: (form.notionDatabaseId || '24e866d074498154a2a2ca1cd1768b41').trim(),
          projectId: form.notionProjectId.trim() || undefined,
          templateId: form.notionTemplateId.trim() || undefined,
        }),
      })
      setTestResult(await res.json())
    } catch (err) {
      setTestResult({ ok: false, error: err.message })
    } finally {
      setTesting(false)
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
          <IconButton icon={PencilIcon} label="Edit" size="sm" onClick={() => setEditing(true)} />
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

      <div className="pt-2">
        <button
          onClick={test}
          disabled={testing}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          type="button"
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {testResult && (
        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm space-y-2">
          {testResult.error ? (
            <div className="text-red-600">
              <span className="font-medium">✗ Test failed:</span> {testResult.error}
            </div>
          ) : (
            <>
              <NotionTestRow label="Tasks Database" result={testResult.database} />
              <NotionTestRow label="Client Project Page" result={testResult.project} emptyLabel="(not set)" />
              <NotionTestRow label="Template Page" result={testResult.template} emptyLabel="(not set)" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NotionTestRow({ label, result, emptyLabel }) {
  if (!result) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <span>—</span>
        <span className="font-medium">{label}:</span>
        <span>{emptyLabel || 'not tested'}</span>
      </div>
    )
  }
  if (result.valid) {
    return (
      <div className="flex items-start gap-2 text-green-700">
        <span>✓</span>
        <div>
          <span className="font-medium">{label}:</span>{' '}
          <span>{result.name || 'OK'}</span>
          {result.missingProperties?.length > 0 && (
            <div className="text-amber-700 text-xs mt-1">⚠️ Missing columns: {result.missingProperties.join(', ')}</div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 text-red-600">
      <span>✗</span>
      <div>
        <span className="font-medium">{label}:</span>{' '}
        <span>{result.error || 'Failed'}</span>
        {result.hint && <div className="text-xs mt-1">{result.hint}</div>}
      </div>
    </div>
  )
}
