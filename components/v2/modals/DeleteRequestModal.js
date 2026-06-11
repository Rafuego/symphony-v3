'use client'

import { useState } from 'react'
import Modal from '@/components/v2/primitives/Modal'

// Confirmation dialog before hard-deleting a request (admin only).
export default function DeleteRequestModal({ open, request, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onDeleted?.()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete This Request?"
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete request'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">&ldquo;{request?.title}&rdquo;</span> will be removed from the
        task board. Working files and deliverables already attached will be deleted. This cannot be undone.
      </p>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </Modal>
  )
}
