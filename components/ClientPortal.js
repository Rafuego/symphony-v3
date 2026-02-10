'use client'

import { useState } from 'react'
import { planConfig, statusConfig, requestTypes } from '@/lib/supabase'
import RequestCard from '@/components/RequestCard'

export default function ClientPortal({ client, onRefresh }) {
  const [activeFilter, setActiveFilter] = useState('active')
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [newRequest, setNewRequest] = useState({ 
    title: '', 
    description: '', 
    requestType: 'misc',
    links: [''],
    attachments: []
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

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
      case 'in-queue':
        return requests.filter(r => r.status === 'in-queue').sort((a, b) => a.priority - b.priority)
      case 'completed':
        return requests.filter(r => r.status === 'completed')
      default:
        return requests
    }
  }

  const activeCount = requests.filter(r => r.status === 'in-progress' || r.status === 'in-review').length
  const queuedCount = requests.filter(r => r.status === 'in-queue').length
  const completedCount = requests.filter(r => r.status === 'completed').length

  const tabs = [
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'in-queue', label: 'In Queue', count: queuedCount },
    { id: 'completed', label: 'Completed', count: completedCount },
    { id: 'all', label: 'All', count: requests.length }
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
        const formData = new FormData()
        formData.append('file', file)
        formData.append('clientId', client.id)
        
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
          attachments: newRequest.attachments
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setNewRequest({ title: '', description: '', requestType: 'misc', links: [''], attachments: [] })
      setShowNewRequest(false)
      onRefresh()
    } catch (err) {
      alert('Error creating request: ' + err.message)
    } finally {
      setSubmitting(false)
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
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
              {client.logo}
            </div>
            <div>
              <h1 className="font-serif text-xl text-gray-900">{client.name}</h1>
              <span className="text-xs text-gray-500">Symphony by Interlude</span>
            </div>
          </div>
        </div>
      </header>

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
                <RequestCard
                  key={request.id}
                  request={request}
                  isAdmin={false}
                  showPriorityControls={activeFilter === 'in-queue'}
                  queuePosition={activeFilter === 'in-queue' ? index + 1 : null}
                  totalQueued={queuedCount}
                  clientId={client.id}
                  onRefresh={onRefresh}
                />
              ))}

              {filteredRequests.length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-5xl mb-4 opacity-50">
                    {activeFilter === 'completed' ? '✓' : activeFilter === 'in-queue' ? '📋' : '🎯'}
                  </div>
                  <p className="text-gray-500">
                    {activeFilter === 'active' && 'No active requests'}
                    {activeFilter === 'in-queue' && 'Queue is empty'}
                    {activeFilter === 'completed' && 'No completed requests yet'}
                    {activeFilter === 'all' && 'No requests yet'}
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
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#8B7355]">✓</span>
                  Avg. {planConfig[client.plan]?.turnaround || '24-48hr'} turnaround
                </li>
              </ul>
              <div className="mt-5 pt-5 border-t border-gray-200">
                <a
                  href={`mailto:hello@interlude.studio?subject=Symphony Plan Change Request - ${client.name}&body=Hi Interlude team,%0D%0A%0D%0AI'd like to discuss changing our Symphony plan.%0D%0A%0D%0ACurrent plan: ${planConfig[client.plan]?.name}%0D%0A%0D%0APlease let me know the next steps.%0D%0A%0D%0AThanks!`}
                  className="block text-center py-3 border border-gray-900 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Request Plan Change
                </a>
              </div>
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

          {/* Contact */}
          <div className="bg-gray-900 rounded-lg p-5 mt-5">
            <h3 className="font-serif text-lg text-white mb-3">Need help?</h3>
            <p className="text-sm text-gray-400 mb-4">Reach out via email or schedule a call.</p>
            <a
              href={`mailto:hello@interlude.studio?subject=Symphony Support - ${client.name}&body=Hi Interlude team,%0D%0A%0D%0AI need help with my Symphony account.%0D%0A%0D%0A`}
              className="block w-full py-3 bg-white text-gray-900 text-center rounded-lg text-sm font-medium"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
