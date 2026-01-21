'use client'

import { useState, useEffect } from 'react'
import { statusConfig, requestTypes } from '@/lib/supabase'

export default function RequestCard({ 
  request, 
  isAdmin, 
  showPriorityControls, 
  queuePosition,
  totalQueued,
  clientId,
  onRefresh 
}) {
  const [showAddFile, setShowAddFile] = useState(false)
  const [newFile, setNewFile] = useState({ name: '', url: '', type: 'figma' })
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(request.admin_notes || '')
  const [showExtension, setShowExtension] = useState(false)
  const [extensionNote, setExtensionNote] = useState('')
  const [extensionHours, setExtensionHours] = useState(24)
  const [now, setNow] = useState(new Date())
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: request.title || '',
    description: request.description || '',
    requestType: request.request_type || 'misc',
    links: request.links?.length > 0 ? request.links : [''],
    attachments: request.attachments || []
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Reset edit data when request changes
  useEffect(() => {
    setEditData({
      title: request.title || '',
      description: request.description || '',
      requestType: request.request_type || 'misc',
      links: request.links?.length > 0 ? request.links : [''],
      attachments: request.attachments || []
    })
  }, [request])

  const files = request.request_files || []
  const isFirstInQueue = queuePosition === 1
  const isLastInQueue = queuePosition === totalQueued

  // Calculate 48hr timer (plus any extensions)
  const getTimeRemaining = () => {
    if (!request.started_at) return null
    
    const started = new Date(request.started_at)
    const baseHours = 48
    const extendedHours = request.extension_hours || 0
    const totalHours = baseHours + extendedHours
    const deadline = new Date(started.getTime() + totalHours * 60 * 60 * 1000)
    const remaining = deadline - now
    
    if (remaining <= 0) return { expired: true, hours: 0, minutes: 0, percentRemaining: 0, totalHours }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    return { expired: false, hours, minutes, percentRemaining: (remaining / (totalHours * 60 * 60 * 1000)) * 100, totalHours }
  }

  const timeRemaining = getTimeRemaining()
  const showTimer = (request.status === 'in-progress' || request.status === 'in-review') && timeRemaining

  const handleStatusChange = async (newStatus) => {
    try {
      await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      onRefresh()
    } catch (err) {
      alert('Error updating status: ' + err.message)
    }
  }

  const handlePriorityMove = async (direction) => {
    try {
      await fetch('/api/requests/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, requestId: request.id, direction })
      })
      onRefresh()
    } catch (err) {
      alert('Error reordering: ' + err.message)
    }
  }

  const handleAddFile = async () => {
    if (!newFile.name || !newFile.url) return
    try {
      await fetch(`/api/requests/${request.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFile.name, url: newFile.url, fileType: newFile.type })
      })
      setNewFile({ name: '', url: '', type: 'figma' })
      setShowAddFile(false)
      onRefresh()
    } catch (err) {
      alert('Error adding file: ' + err.message)
    }
  }

  const handleSaveNotes = async () => {
    try {
      await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes })
      })
      setEditingNotes(false)
      onRefresh()
    } catch (err) {
      alert('Error saving notes: ' + err.message)
    }
  }

  const handleExtensionRequest = async () => {
    try {
      await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          extensionRequested: true, 
          extensionNote,
          extensionHours: (request.extension_hours || 0) + extensionHours
        })
      })
      setShowExtension(false)
      setExtensionNote('')
      setExtensionHours(24)
      onRefresh()
    } catch (err) {
      alert('Error requesting extension: ' + err.message)
    }
  }

  const handleDeleteRequest = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setShowDeleteModal(false)
      onRefresh()
    } catch (err) {
      alert('Error deleting request: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Edit mode handlers
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    if (editData.attachments.length + files.length > 4) {
      alert('Maximum 4 files allowed per request')
      return
    }
    
    setUploading(true)
    try {
      const uploadedFiles = []
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('clientId', clientId)
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        
        uploadedFiles.push({
          url: data.url,
          name: data.filename,
          type: data.type,
          size: data.size
        })
      }
      
      setEditData({
        ...editData,
        attachments: [...editData.attachments, ...uploadedFiles]
      })
    } catch (err) {
      alert('Error uploading file: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = (index) => {
    const updated = editData.attachments.filter((_, i) => i !== index)
    setEditData({ ...editData, attachments: updated })
  }

  const handleSaveEdit = async () => {
    if (!editData.title) {
      alert('Title is required')
      return
    }
    
    setSaving(true)
    try {
      const filteredLinks = editData.links.filter(link => link.trim() !== '')
      
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          requestType: editData.requestType,
          links: filteredLinks,
          attachments: editData.attachments
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setIsEditing(false)
      onRefresh()
    } catch (err) {
      alert('Error saving changes: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditData({
      title: request.title || '',
      description: request.description || '',
      requestType: request.request_type || 'misc',
      links: request.links?.length > 0 ? request.links : [''],
      attachments: request.attachments || []
    })
    setIsEditing(false)
  }

  // Edit Mode UI
  if (isEditing) {
    return (
      <div className={`card ${showPriorityControls && isFirstInQueue ? 'ring-2 ring-[#8B7355]' : ''}`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-serif text-xl">Edit Request</h2>
          <span 
            className="px-3 py-1 rounded-lg text-xs font-medium"
            style={{ 
              backgroundColor: statusConfig[request.status]?.bg,
              color: statusConfig[request.status]?.color 
            }}
          >
            {statusConfig[request.status]?.label}
          </span>
        </div>
        
        <div className="mb-4">
          <label className="label">Title</label>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder="e.g., Landing page redesign"
            className="input"
          />
        </div>
        
        <div className="mb-4">
          <label className="label">Project Type</label>
          <div className="flex flex-wrap gap-2">
            {requestTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setEditData({ ...editData, requestType: type.id })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  editData.requestType === type.id
                    ? 'bg-[#8B7355] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="label">Description</label>
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Describe what you need in detail..."
            rows={4}
            className="input resize-y"
          />
        </div>
        
        <div className="mb-5">
          <label className="label">Links (Figma, Google Docs, references, etc.)</label>
          {editData.links.map((link, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={link}
                onChange={(e) => {
                  const updatedLinks = [...editData.links]
                  updatedLinks[index] = e.target.value
                  setEditData({ ...editData, links: updatedLinks })
                }}
                placeholder="https://..."
                className="input flex-1"
              />
              {editData.links.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const updatedLinks = editData.links.filter((_, i) => i !== index)
                    setEditData({ ...editData, links: updatedLinks })
                  }}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEditData({ ...editData, links: [...editData.links, ''] })}
            className="text-sm text-[#8B7355] hover:underline"
          >
            + Add another link
          </button>
        </div>
        
        <div className="mb-5">
          <label className="label">Attachments (Images, PDFs - max 4 files)</label>
          {editData.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {editData.attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                  {file.type?.startsWith('image/') ? '🖼️' : '📄'}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {editData.attachments.length < 4 && (
            <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-[#8B7355] hover:bg-[#8B7355]/5'
            }`}>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <span className="text-gray-500">Uploading...</span>
              ) : (
                <>
                  <span className="text-gray-500">📎</span>
                  <span className="text-sm text-gray-600">Click to upload files</span>
                </>
              )}
            </label>
          )}
          <p className="text-xs text-gray-400 mt-2">Supported: JPG, PNG, GIF, WebP, PDF (max 10MB each)</p>
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSaveEdit} disabled={saving || uploading} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={handleCancelEdit} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Normal View Mode
  return (
    <div className={`card ${showPriorityControls && isFirstInQueue ? 'ring-2 ring-[#8B7355]' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4 flex-1">
          {/* Priority Controls */}
          {showPriorityControls && (
            <div className="flex flex-col items-center gap-1 pr-4 border-r border-gray-200">
              <span className="text-xs text-gray-500 font-medium mb-1">#{queuePosition}</span>
              <button
                onClick={() => handlePriorityMove('up')}
                disabled={isFirstInQueue}
                className={`w-7 h-7 flex items-center justify-center border rounded ${
                  isFirstInQueue ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                ↑
              </button>
              <button
                onClick={() => handlePriorityMove('down')}
                disabled={isLastInQueue}
                className={`w-7 h-7 flex items-center justify-center border rounded ${
                  isLastInQueue ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                ↓
              </button>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {request.request_type && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                  {requestTypes.find(t => t.id === request.request_type)?.emoji}{' '}
                  {requestTypes.find(t => t.id === request.request_type)?.label || request.request_type}
                </span>
              )}
              <h3 className="font-serif text-lg text-gray-900">{request.title}</h3>
              {showPriorityControls && isFirstInQueue && (
                <span className="px-2 py-0.5 bg-[#8B7355] text-white text-xs font-semibold uppercase rounded">
                  Up Next
                </span>
              )}
              {request.extension_requested && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold uppercase rounded">
                  Extended
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{request.description}</p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="ml-4 flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit request"
          >
            ✏️
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete request"
          >
            🗑️
          </button>
          {isAdmin ? (
            <select
              value={request.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 pr-8 rounded-lg border text-sm font-medium appearance-none cursor-pointer"
              style={{ 
                backgroundColor: statusConfig[request.status]?.bg,
                color: statusConfig[request.status]?.color,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '16px'
              }}
            >
              <option value="in-queue">In Queue</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          ) : (
            <span 
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ 
                backgroundColor: statusConfig[request.status]?.bg,
                color: statusConfig[request.status]?.color 
              }}
            >
              {statusConfig[request.status]?.label}
            </span>
          )}
        </div>
      </div>

      {/* 48hr Timer */}
      {showTimer && (
        <div className={`rounded-lg p-3 mb-4 ${timeRemaining.expired ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span>{timeRemaining.expired ? '⚠️' : '⏱️'}</span>
              <span className={`text-sm font-semibold ${timeRemaining.expired ? 'text-red-600' : 'text-emerald-600'}`}>
                {timeRemaining.expired 
                  ? 'Deadline Passed' 
                  : `${timeRemaining.hours}h ${timeRemaining.minutes}m remaining`}
              </span>
              {request.extension_hours > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  +{request.extension_hours}h extended
                </span>
              )}
            </div>
            <button
              onClick={() => setShowExtension(true)}
              className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-white"
            >
              {request.extension_hours > 0 ? 'Add More Time' : (isAdmin ? 'Add Extension' : 'Request Extension')}
            </button>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${timeRemaining.percentRemaining < 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(timeRemaining.percentRemaining, 100)}%` }}
            />
          </div>
          {request.extension_note && (
            <p className="text-xs text-gray-600 mt-2 italic">Extension note: {request.extension_note}</p>
          )}
        </div>
      )}

      {/* Extension Modal */}
      {showExtension && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="font-serif text-xl mb-4">{isAdmin ? 'Add Extension' : 'Request Extension'}</h3>
            
            <div className="mb-4">
              <label className="label">Extension Time</label>
              <div className="flex gap-2 items-center">
                <select
                  value={extensionHours}
                  onChange={(e) => setExtensionHours(parseInt(e.target.value))}
                  className="input flex-1"
                >
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours (1 day)</option>
                  <option value={48}>48 hours (2 days)</option>
                  <option value={72}>72 hours (3 days)</option>
                  <option value={96}>96 hours (4 days)</option>
                  <option value={120}>120 hours (5 days)</option>
                </select>
              </div>
              {request.extension_hours > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Already extended by {request.extension_hours}h — this will add {extensionHours}h more
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="label">Reason for Extension</label>
              <textarea
                value={extensionNote}
                onChange={(e) => setExtensionNote(e.target.value)}
                placeholder="Explain why more time is needed..."
                rows={3}
                className="input"
              />
            </div>
            
            <div className="flex gap-3">
              <button onClick={handleExtensionRequest} className="btn-primary flex-1">
                {isAdmin ? `Add +${extensionHours}h Extension` : `Request +${extensionHours}h`}
              </button>
              <button onClick={() => { setShowExtension(false); setExtensionHours(24); setExtensionNote(''); }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="font-serif text-xl text-gray-900">Delete Request</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                Are you sure you want to permanently delete "<strong>{request.title}</strong>"? 
                This will remove all associated files and data.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 mb-4 pt-4 border-t border-gray-100">
        Submitted {new Date(request.created_at).toLocaleDateString()}
        {request.started_at && ` • Started ${new Date(request.started_at).toLocaleDateString()}`}
      </div>

      {/* Brief Links */}
      {request.links && request.links.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Brief Links
          </div>
          <div className="flex flex-wrap gap-2">
            {request.links.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                🔗 {(() => {
                  try {
                    const url = new URL(link)
                    return url.hostname.replace('www.', '')
                  } catch {
                    return 'Link'
                  }
                })()}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {request.attachments && request.attachments.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Attachments
          </div>
          <div className="flex flex-wrap gap-2">
            {request.attachments.map((file, index) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-purple-50 text-purple-700 hover:bg-purple-100"
              >
                {file.type?.startsWith('image/') ? '🖼️' : '📄'} {file.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Working Files
        </div>
        {files.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {files.map(file => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                  file.file_type === 'figma' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {file.file_type === 'figma' ? '◈' : '📄'} {file.name}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No files uploaded yet</p>
        )}
        
        {isAdmin && (
          <div className="mt-3">
            {showAddFile ? (
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  value={newFile.name}
                  onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                  placeholder="filename.fig"
                  className="px-3 py-1.5 border rounded text-sm flex-1 min-w-[150px]"
                />
                <input
                  type="text"
                  value={newFile.url}
                  onChange={(e) => setNewFile({ ...newFile, url: e.target.value })}
                  placeholder="https://..."
                  className="px-3 py-1.5 border rounded text-sm flex-1 min-w-[150px]"
                />
                <select
                  value={newFile.type}
                  onChange={(e) => setNewFile({ ...newFile, type: e.target.value })}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  <option value="figma">Figma</option>
                  <option value="file">File</option>
                </select>
                <button onClick={handleAddFile} className="px-3 py-1.5 bg-[#8B7355] text-white rounded text-sm">
                  Add
                </button>
                <button onClick={() => setShowAddFile(false)} className="px-3 py-1.5 border rounded text-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddFile(true)}
                className="text-sm text-[#8B7355] border border-dashed border-[#8B7355] px-3 py-1.5 rounded hover:bg-[#8B7355]/5"
              >
                + Add File Link
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {(request.admin_notes || isAdmin) && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Notes from Interlude
          </div>
          {isAdmin && editingNotes ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input flex-1"
              />
              <button onClick={handleSaveNotes} className="btn-accent text-sm">Save</button>
            </div>
          ) : (
            <div
              onClick={() => isAdmin && setEditingNotes(true)}
              className={`bg-gray-50 p-3 rounded-lg text-sm ${
                request.admin_notes ? 'text-gray-700' : 'text-gray-400 italic'
              } ${isAdmin ? 'cursor-pointer hover:bg-gray-100' : ''}`}
            >
              {request.admin_notes || (isAdmin ? 'Click to add notes...' : 'No notes yet')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
