'use client'

import { useState, useEffect } from 'react'
import { planConfig, statusConfig, requestTypes } from '@/lib/supabase'
import { uploadFile } from '@/lib/uploadFile'
import RequestCard from '@/components/RequestCard'
import PlanModal from '@/components/PlanModal'

export default function AdminClientDashboard({ client, onBack, onRefresh }) {
  const [activeFilter, setActiveFilter] = useState('in-progress')
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    requestType: 'misc',
    links: [''],
    attachments: [],
    requestedDueDate: ''
  })
  const [uploading, setUploading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordEnabled, setPasswordEnabled] = useState(client.password_enabled)
  const [submitting, setSubmitting] = useState(false)

  // Client name state
  const [clientName, setClientName] = useState(client.name || '')

  // Client tag state
  const [clientTag, setClientTag] = useState(client.client_tag || '')

  // Notion integration state
  const [notionDatabaseId, setNotionDatabaseId] = useState(client.notion_database_id || '')
  const [notionProjectId, setNotionProjectId] = useState(client.notion_project_id || '')
  const [notionTemplateId, setNotionTemplateId] = useState(client.notion_template_id || '')
  const [notionSaving, setNotionSaving] = useState(false)
  const [notionTestResult, setNotionTestResult] = useState(null)

  // Brand assets state
  const [brandAssets, setBrandAssets] = useState(client.brand_assets || [])
  const [uploadingAsset, setUploadingAsset] = useState(false)

  const currentPlan = client.custom_price 
    ? {
        ...planConfig[client.plan],
        price: `$${parseInt(client.custom_price).toLocaleString()}`,
        maxActive: parseInt(client.custom_max_active) || planConfig[client.plan].defaultMaxActive,
        designers: client.custom_designers || planConfig[client.plan].defaultDesigners
      }
    : {
        ...planConfig[client.plan],
        price: `$${planConfig[client.plan].defaultPrice.toLocaleString()}`,
        maxActive: planConfig[client.plan].defaultMaxActive,
        designers: planConfig[client.plan].defaultDesigners
      }

  const requests = client.requests || []
  
  const getFilteredRequests = () => {
    switch (activeFilter) {
      case 'active':
        return requests.filter(r => r.status === 'in-progress' || r.status === 'in-review')
      case 'in-progress':
        return requests.filter(r => r.status === 'in-progress')
      case 'in-review':
        return requests.filter(r => r.status === 'in-review')
      case 'in-queue':
        return requests.filter(r => r.status === 'in-queue').sort((a, b) => a.priority - b.priority)
      case 'completed':
        return requests.filter(r => r.status === 'completed')
      default:
        return requests
    }
  }

  const inProgressCount = requests.filter(r => r.status === 'in-progress').length
  const inReviewCount = requests.filter(r => r.status === 'in-review').length
  const activeCount = requests.filter(r => r.status === 'in-progress' || r.status === 'in-review').length
  const queuedCount = requests.filter(r => r.status === 'in-queue').length
  const completedCount = requests.filter(r => r.status === 'completed').length

  const tabs = [
    { id: 'in-queue', label: 'Queue', count: queuedCount },
    { id: 'in-progress', label: 'In Progress', count: inProgressCount },
    { id: 'in-review', label: 'In Review', count: inReviewCount },
    { id: 'completed', label: 'Completed', count: completedCount }
  ]

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    // Check limit
    if (newRequest.attachments.length + files.length > 4) {
      alert('Maximum 4 files allowed per request')
      return
    }
    
    setUploading(true)
    try {
      const uploadedFiles = []
      
      for (const file of files) {
        const data = await uploadFile(file, client.id)
        uploadedFiles.push(data)
      }

      setNewRequest({
        ...newRequest,
        attachments: [...newRequest.attachments, ...uploadedFiles]
      })
    } catch (err) {
      alert('Error uploading file: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = (index) => {
    const updated = newRequest.attachments.filter((_, i) => i !== index)
    setNewRequest({ ...newRequest, attachments: updated })
  }

  const handleSubmitRequest = async () => {
    if (!newRequest.title) return
    
    setSubmitting(true)
    try {
      // Filter out empty links
      const filteredLinks = newRequest.links.filter(link => link.trim() !== '')
      
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: newRequest.title,
          description: newRequest.description,
          requestType: newRequest.requestType,
          links: filteredLinks,
          attachments: newRequest.attachments,
          requestedDueDate: newRequest.requestedDueDate || null
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Show Notion sync status for debugging
      if (data.notionResult && !data.notionResult.success) {
        console.warn('Notion sync failed:', data.notionResult)
        alert('Request created! But Notion sync failed: ' + (data.notionResult.error || data.notionResult.reason || 'Unknown error'))
      } else if (data.notionResult?.templateError) {
        alert('Request created in Notion, but template failed to load: ' + data.notionResult.templateError)
      }

      setNewRequest({ title: '', description: '', requestType: 'misc', links: [''], attachments: [], requestedDueDate: '' })
      setShowNewRequest(false)
      onRefresh()
    } catch (err) {
      alert('Error creating request: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSavePassword = async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput || undefined,
          passwordEnabled: passwordEnabled && !!passwordInput
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      alert('Password settings saved')
      setPasswordInput('')
      onRefresh()
    } catch (err) {
      alert('Error saving password: ' + err.message)
    }
  }

  const handleSaveNotion = async () => {
    setNotionSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionDatabaseId: notionDatabaseId || '24e866d074498154a2a2ca1cd1768b41',
          notionProjectId: notionProjectId.trim() || null,
          notionTemplateId: notionTemplateId.trim() || null
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert('Notion settings saved')
      onRefresh()
    } catch (err) {
      alert('Error saving Notion settings: ' + err.message)
    } finally {
      setNotionSaving(false)
    }
  }

  const handleTestNotion = async () => {
    if (!notionDatabaseId.trim()) return
    setNotionTestResult(null)
    try {
      const res = await fetch('/api/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: notionDatabaseId.trim() })
      })
      const result = await res.json()
      setNotionTestResult(result)
    } catch (err) {
      setNotionTestResult({ valid: false, error: err.message })
    }
  }

  const handlePlanUpdate = async (planType, customConfig) => {
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planType,
          customPlan: customConfig
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setShowPlanModal(false)
      onRefresh()
    } catch (err) {
      alert('Error updating plan: ' + err.message)
    }
  }

  const copyClientLink = () => {
    const url = `${window.location.origin}/portal/${client.access_token}`
    navigator.clipboard.writeText(url)
    alert(`Client link copied!\n\n${url}`)
  }

  const handleDeleteClient = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setShowDeleteModal(false)
      onBack() // Return to client list
    } catch (err) {
      alert('Error deleting client: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Brand assets handlers
  const handleBrandAssetUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    setUploadingAsset(true)
    try {
      const uploadedFiles = []
      
      for (const file of files) {
        const data = await uploadFile(file, client.id)
        uploadedFiles.push({ ...data, addedAt: new Date().toISOString() })
      }

      const newAssets = [...brandAssets, ...uploadedFiles]
      
      await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAssets: newAssets })
      })
      
      setBrandAssets(newAssets)
      onRefresh()
    } catch (err) {
      alert('Error uploading brand asset: ' + err.message)
    } finally {
      setUploadingAsset(false)
    }
  }

  const handleRemoveBrandAsset = async (index) => {
    try {
      const newAssets = brandAssets.filter((_, i) => i !== index)
      
      await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAssets: newAssets })
      })
      
      setBrandAssets(newAssets)
      onRefresh()
    } catch (err) {
      alert('Error removing brand asset: ' + err.message)
    }
  }

  const filteredRequests = getFilteredRequests()

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <div className="h-1.5 bg-[#8B7355]" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-10 py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-xl hover:bg-gray-100 p-2 rounded">
              ←
            </button>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
              {client.logo}
            </div>
            <div>
              <h1 className="font-serif text-xl text-gray-900">{client.name}</h1>
              <span className="text-xs text-gray-500">
                symphony.interlude.studio/{client.slug}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={copyClientLink} className="btn-accent text-sm">
              🔗 Copy Client Link
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-4 py-2 rounded-lg text-sm ${showSettings ? 'bg-gray-100' : 'bg-transparent border border-gray-200'}`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-10 py-6">
          <div className="max-w-6xl mx-auto grid grid-cols-4 gap-8">
            <div>
              <label className="label">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onBlur={async () => {
                  if (clientName.trim() && clientName !== client.name) {
                    try {
                      const res = await fetch(`/api/clients/${client.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: clientName.trim() })
                      })
                      const data = await res.json()
                      if (data.error) throw new Error(data.error)
                      onRefresh()
                    } catch (err) {
                      alert('Error updating name: ' + err.message)
                      setClientName(client.name)
                    }
                  }
                }}
                className="input"
              />
            </div>
            <div>
              <label className="label">Plan</label>
              <select
                value={client.plan}
                onChange={() => setShowPlanModal(true)}
                className="input"
              >
                <option value="launch">Launch</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
              </select>
              <button
                onClick={() => setShowPlanModal(true)}
                className="mt-2 text-sm text-[#8B7355] hover:underline"
              >
                Edit Plan Configuration
              </button>
            </div>
            <div>
              <label className="label">Client Type</label>
              <select
                value={clientTag}
                onChange={async (e) => {
                  const newTag = e.target.value
                  setClientTag(newTag)
                  try {
                    const res = await fetch(`/api/clients/${client.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientTag: newTag || null })
                    })
                    const data = await res.json()
                    if (data.error) throw new Error(data.error)
                    onRefresh()
                  } catch (err) {
                    alert('Error saving client type: ' + err.message)
                  }
                }}
                className="input"
              >
                <option value="">No tag</option>
                <option value="symphony">Symphony</option>
                <option value="legacy_drip">Legacy Drip</option>
              </select>
            </div>
            <div>
              <label className="label">Access Password</label>
              <input
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="input"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer pb-3">
                <input
                  type="checkbox"
                  checked={passwordEnabled}
                  onChange={(e) => setPasswordEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Require password</span>
              </label>
              <button onClick={handleSavePassword} className="btn-accent text-sm">
                Save
              </button>
            </div>
          </div>
          
          {/* Notion Integration */}
          <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Notion Integration</h4>

            {/* Tasks Database ID — locked global default */}
            <div className="mb-4">
              <label className="label">Tasks Database ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={notionDatabaseId || '24e866d074498154a2a2ca1cd1768b41'}
                  readOnly
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <span className="text-xs text-green-600 whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  Linked
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Global Tasks database — shared across all clients. This is locked and set automatically.
              </p>
            </div>

            {/* Client Project Page ID */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Client Project Page ID (Optional)</label>
                <input
                  type="text"
                  value={notionProjectId}
                  onChange={(e) => setNotionProjectId(e.target.value)}
                  placeholder="e.g., 24e866d0-7449-818d-bb45-000bf166f22e"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Links this client to their project in the Notion Projects database. Fills the "Client" relation column.
                </p>
              </div>
              <div>
                <label className="label">Template Page ID (Optional)</label>
                <input
                  type="text"
                  value={notionTemplateId}
                  onChange={(e) => setNotionTemplateId(e.target.value)}
                  placeholder="e.g., 269866d07449808e9370f201b9cc1fd1"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Copy the template page ID from its Notion URL. New tasks will include this template's content.
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveNotion}
              disabled={notionSaving}
              className="btn-accent text-sm"
            >
              {notionSaving ? 'Saving...' : 'Save Notion Settings'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-red-600">Danger Zone</h4>
                <p className="text-xs text-gray-500 mt-1">Permanently delete this client and all their requests</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-10 py-10 grid grid-cols-[1fr_340px] gap-10">
        <div>
          {/* New Request */}
          <div className="mb-8">
            {showNewRequest ? (
              <div className="card">
                <h2 className="font-serif text-xl mb-5">New Request</h2>
                <div className="mb-4">
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
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
                        onClick={() => setNewRequest({ ...newRequest, requestType: type.id })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          newRequest.requestType === type.id
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
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Describe what you need in detail..."
                    rows={4}
                    className="input resize-y"
                  />
                </div>
                <div className="mb-5">
                  <label className="label">Links (Figma, Google Docs, references, etc.)</label>
                  {newRequest.links.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={link}
                        onChange={(e) => {
                          const updatedLinks = [...newRequest.links]
                          updatedLinks[index] = e.target.value
                          setNewRequest({ ...newRequest, links: updatedLinks })
                        }}
                        placeholder="https://..."
                        className="input flex-1"
                      />
                      {newRequest.links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedLinks = newRequest.links.filter((_, i) => i !== index)
                            setNewRequest({ ...newRequest, links: updatedLinks })
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
                    onClick={() => setNewRequest({ ...newRequest, links: [...newRequest.links, ''] })}
                    className="text-sm text-[#8B7355] hover:underline"
                  >
                    + Add another link
                  </button>
                </div>
                <div className="mb-5">
                  <label className="label">Attachments (Images, PDFs - max 4 files)</label>
                  {newRequest.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {newRequest.attachments.map((file, index) => (
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
                  {newRequest.attachments.length < 4 && (
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-[#8B7355] hover:bg-[#8B7355]/5'
                    }`}>
                      <input
                        type="file"
                        accept="*"
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
                  <p className="text-xs text-gray-400 mt-2">All file types supported (max 25MB each)</p>
                </div>
                <div className="mb-5">
                  <label className="label">Tentative Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newRequest.requestedDueDate}
                    onChange={(e) => setNewRequest({ ...newRequest, requestedDueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-2">Target delivery date — syncs to Notion Timeline.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSubmitRequest} disabled={submitting || uploading} className="btn-primary">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button onClick={() => setShowNewRequest(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewRequest(true)}
                className="w-full py-5 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl mr-2">+</span>
                Submit New Request
              </button>
            )}
          </div>

          {/* Requests */}
          <div>
            <h2 className="font-serif text-xl mb-5">Requests</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-5 bg-white p-1.5 rounded-lg shadow-sm">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeFilter === tab.id ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Capacity Indicator */}
            {activeFilter === 'active' && (
              <div className="card flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">Active Capacity</div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        activeCount >= currentPlan.maxActive ? 'bg-[#8B7355]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(activeCount / currentPlan.maxActive) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {activeCount}/{currentPlan.maxActive}
                </div>
              </div>
            )}

            {/* Queue Info */}
            {activeFilter === 'in-queue' && queuedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                <span className="text-xl">💡</span>
                <span className="text-sm text-amber-800">
                  Use the arrows to reorder priority. The #1 item will automatically start when capacity opens up.
                </span>
              </div>
            )}

            {/* Request List */}
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <div key={request.id} id={`request-${request.id}`}>
                  <RequestCard
                    request={request}
                    isAdmin={true}
                    showPriorityControls={activeFilter === 'in-queue'}
                    queuePosition={activeFilter === 'in-queue' ? index + 1 : null}
                    totalQueued={queuedCount}
                    clientId={client.id}
                    onRefresh={onRefresh}
                  />
                </div>
              ))}

              {filteredRequests.length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-5xl mb-4 opacity-50">
                    {activeFilter === 'completed' ? '✓' : activeFilter === 'in-queue' ? '📋' : '🎯'}
                  </div>
                  <p className="text-gray-500">
                    {activeFilter === 'in-progress' && 'No requests in progress'}
                    {activeFilter === 'in-review' && 'No requests in review'}
                    {activeFilter === 'in-queue' && 'Queue is empty'}
                    {activeFilter === 'completed' && 'No completed requests yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Plan Card */}
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[#8B7355] p-5 text-white">
              <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
                {planConfig[client.plan]?.tier}
              </div>
              <div className="font-serif text-3xl">{planConfig[client.plan]?.name}</div>
              <div className="text-2xl mt-2">
                {currentPlan.price}
                <span className="text-sm opacity-80">/month</span>
              </div>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#8B7355]">✓</span>
                  {currentPlan.maxActive} active request{currentPlan.maxActive > 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#8B7355]">✓</span>
                  {currentPlan.designers} dedicated designer{currentPlan.designers !== '1' ? 's' : ''}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#8B7355]">✓</span>
                  Custom Notion Project Board
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#8B7355]">✓</span>
                  Slack Channel
                </li>
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="card mt-5">
            <h3 className="font-serif text-lg mb-4">This Month</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-semibold text-gray-900">{activeCount}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{queuedCount}</div>
                <div className="text-xs text-gray-500">Queued</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{completedCount}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
            </div>
          </div>

          {/* Brand Assets */}
          <div className="card mt-5">
            <h3 className="font-serif text-lg mb-4">Brand Assets</h3>
            
            {/* Upload */}
            <label className={`flex items-center justify-center gap-2 px-3 py-2 mb-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm ${
              uploadingAsset ? 'border-gray-200 bg-gray-50' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
            }`}>
              <input
                type="file"
                accept="*"
                multiple
                onChange={handleBrandAssetUpload}
                disabled={uploadingAsset}
                className="hidden"
              />
              {uploadingAsset ? 'Uploading...' : '📦 Upload Asset'}
            </label>
            
            {/* Asset List */}
            {brandAssets.length > 0 ? (
              <div className="space-y-2">
                {brandAssets.map((asset, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded group"
                  >
                    <span className="text-lg">{asset.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
                    <a 
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 truncate flex-1 hover:text-purple-700"
                    >
                      {asset.name}
                    </a>
                    <button
                      onClick={() => handleRemoveBrandAsset(index)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No assets uploaded</p>
            )}
          </div>

          {/* Contact */}
          <div className="bg-gray-900 rounded-lg p-5 mt-5">
            <h3 className="font-serif text-lg text-white mb-3">Need help?</h3>
            <p className="text-sm text-gray-400 mb-4">Reach out via email or schedule a call.</p>
            <a
              href={`mailto:hello@interlude.studio?subject=Symphony Support - ${client.name}`}
              className="block w-full py-3 bg-white text-gray-900 text-center rounded-lg text-sm font-medium"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          currentPlan={client.plan}
          customConfig={{
            price: client.custom_price?.toString() || '',
            maxActive: client.custom_max_active?.toString() || '',
            designers: client.custom_designers || ''
          }}
          clientName={client.name}
          onSave={handlePlanUpdate}
          onClose={() => setShowPlanModal(false)}
        />
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
                <h3 className="font-serif text-xl text-gray-900">Delete Client</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                Are you sure you want to permanently delete <strong>{client.name}</strong>? 
                This will also delete all {requests.length} request{requests.length !== 1 ? 's' : ''} 
                and any associated files.
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
                onClick={handleDeleteClient}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
