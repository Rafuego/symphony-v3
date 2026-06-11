'use client'

import { useState } from 'react'
import Modal from '@/components/v2/primitives/Modal'
import { createableTypes } from '@/components/v2/lib/typeDisplay'

// New Design Request modal: Title, Due date, Type toggle, Design brief, Brief links.
// Attachments/working files are handled separately (drawer), matching the Figma flow.
export default function NewRequestModal({ open, clientId, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [type, setType] = useState('marketing')
  const [brief, setBrief] = useState('')
  const [links, setLinks] = useState([''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const reset = () => {
    setTitle('')
    setDueDate('')
    setType('marketing')
    setBrief('')
    setLinks([''])
    setError(null)
  }

  const close = () => {
    reset()
    onClose?.()
  }

  const submit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: title.trim(),
          description: brief,
          requestType: type,
          links: links.filter((l) => l.trim() !== ''),
          attachments: [],
          requestedDueDate: dueDate || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      reset()
      onCreated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Design Request"
      footer={
        <>
          <button onClick={close} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="btn-accent">
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investor Pitch Deck"
            />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Type</label>
          <div className="flex flex-wrap gap-2">
            {createableTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  type === t.id
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Design brief</label>
          <textarea
            className="input resize-y"
            rows={4}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="What needs to be designed? Goals, audience, tone, anything off-limits…"
          />
        </div>

        <div>
          <label className="label">Brief links</label>
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                className="input flex-1"
                value={link}
                onChange={(e) => {
                  const next = [...links]
                  next[i] = e.target.value
                  setLinks(next)
                }}
                placeholder="Insert link here"
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                  className="px-3 text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks([...links, ''])}
            className="text-sm text-[#8B7355] hover:underline"
          >
            + Add another link
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  )
}
