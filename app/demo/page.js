'use client'

import { useState } from 'react'
import { planConfig, statusConfig, requestTypes } from '@/lib/supabase'
import RequestCard from '@/components/RequestCard'

// Generate realistic timestamps
const now = new Date()
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()
const daysAhead = (d) => {
  const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

// Dummy client data
const DEMO_CLIENT = {
  id: 'demo-client-id',
  name: 'Acme Corp',
  plan: 'growth',
  logo: '🚀',
  custom_price: null,
  custom_max_active: null,
  custom_designers: null,
  access_token: 'demo-token',
  brand_assets: [
    { name: 'Brand Guidelines.pdf', url: '#', type: 'application/pdf', size: 2400000, addedAt: daysAgo(30) },
    { name: 'Logo Pack.zip', url: '#', type: 'application/zip', size: 8500000, addedAt: daysAgo(30) },
    { name: 'Brand Photos.zip', url: '#', type: 'application/zip', size: 24000000, addedAt: daysAgo(15) }
  ]
}

const INITIAL_REQUESTS = [
  {
    id: 'demo-req-1',
    client_id: 'demo-client-id',
    title: 'Homepage Redesign',
    description: 'Redesign the homepage to match our new brand direction. Focus on a clean, modern layout with emphasis on the hero section and product showcase.\n\n**Key requirements:**\n- New hero section with animated elements\n- Updated product grid layout\n- Mobile-first responsive design\n- Integrate new brand colors',
    status: 'in-progress',
    priority: 1,
    request_type: 'site',
    links: ['https://figma.com/example-design', 'https://docs.google.com/example-brief'],
    attachments: [
      { name: 'brand-reference.png', url: '#', size: 245000, type: 'image/png' },
      { name: 'wireframes-v2.pdf', url: '#', size: 1200000, type: 'application/pdf' }
    ],
    deliverables: [],
    started_at: hoursAgo(18),
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: daysAhead(3),
    admin_notes: '',
    created_at: daysAgo(1),
    request_files: [
      { id: 'file-w1', name: 'Working File - Figma', url: 'https://figma.com/example', file_type: 'figma' }
    ]
  },
  {
    id: 'demo-req-2',
    client_id: 'demo-client-id',
    title: 'Investor Pitch Deck',
    description: 'Create a polished 15-slide pitch deck for our Series A fundraise. Should tell our growth story with clean data visualizations.\n\nSlides needed:\n1. Title / Cover\n2. Problem\n3. Solution\n4. Market Size\n5. Product Demo\n6. Traction & Metrics\n7. Business Model\n8. Competition\n9. Go-to-Market\n10. Team\n11. Financials\n12. The Ask',
    status: 'in-review',
    priority: 2,
    request_type: 'deck',
    links: ['https://docs.google.com/example-content'],
    attachments: [
      { name: 'financial-data.xlsx', url: '#', size: 89000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ],
    deliverables: [
      { name: 'AcmeCorp-PitchDeck-v1.pdf', url: '#', size: 4500000, type: 'application/pdf' },
      { name: 'AcmeCorp-PitchDeck-v1.pptx', url: '#', size: 8200000, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    ],
    started_at: daysAgo(2),
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: daysAhead(1),
    admin_notes: '',
    created_at: daysAgo(3),
    request_files: [
      { id: 'file-1', name: 'Pitch Deck - Figma', url: 'https://figma.com/example', file_type: 'figma' }
    ]
  },
  {
    id: 'demo-req-3',
    client_id: 'demo-client-id',
    title: 'Social Media Ad Creatives',
    description: 'Design a set of social media ad creatives for our Q2 product launch campaign.\n\n- 5 variations for Instagram (1080x1080)\n- 3 variations for LinkedIn (1200x627)\n- 2 story formats (1080x1920)\n\nKeep it bold, on-brand, and conversion-focused.',
    status: 'in-queue',
    priority: 1,
    request_type: 'marketing',
    links: ['https://example.com/campaign-brief'],
    attachments: [],
    deliverables: [],
    started_at: null,
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: daysAhead(7),
    admin_notes: '',
    created_at: daysAgo(1),
    request_files: []
  },
  {
    id: 'demo-req-4',
    client_id: 'demo-client-id',
    title: 'Product Feature Illustrations',
    description: 'Create a set of 6 custom illustrations for our product feature pages. Style should match the existing brand aesthetic — clean lines, limited color palette, subtle gradients.',
    status: 'in-queue',
    priority: 2,
    request_type: 'brand',
    links: [],
    attachments: [
      { name: 'illustration-style-ref.png', url: '#', size: 320000, type: 'image/png' }
    ],
    deliverables: [],
    started_at: null,
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: null,
    admin_notes: '',
    created_at: hoursAgo(6),
    request_files: []
  },
  {
    id: 'demo-req-5',
    client_id: 'demo-client-id',
    title: 'Brand Style Guide',
    description: 'Comprehensive brand style guide covering typography, color palette, logo usage, iconography, and photography direction.',
    status: 'completed',
    priority: 1,
    request_type: 'brand',
    links: [],
    attachments: [],
    deliverables: [
      { name: 'AcmeCorp-BrandGuide-Final.pdf', url: '#', size: 12000000, type: 'application/pdf' },
      { name: 'AcmeCorp-Assets.zip', url: '#', size: 45000000, type: 'application/zip' }
    ],
    started_at: daysAgo(7),
    completed_at: daysAgo(5),
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: daysAgo(5).split('T')[0],
    admin_notes: '',
    created_at: daysAgo(8),
    request_files: [
      { id: 'file-2', name: 'Brand Guide - Figma', url: 'https://figma.com/example', file_type: 'figma' }
    ]
  },
  {
    id: 'demo-req-6',
    client_id: 'demo-client-id',
    title: 'Email Newsletter Templates',
    description: 'Design 3 reusable email newsletter templates for our marketing team. Compatible with Mailchimp.',
    status: 'completed',
    priority: 2,
    request_type: 'marketing',
    links: ['https://mailchimp.com/example'],
    attachments: [],
    deliverables: [
      { name: 'Newsletter-Templates.zip', url: '#', size: 3200000, type: 'application/zip' }
    ],
    started_at: daysAgo(10),
    completed_at: daysAgo(8),
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    requested_due_date: null,
    admin_notes: '',
    created_at: daysAgo(12),
    request_files: []
  }
]

export default function DemoPortal() {
  const [activeFilter, setActiveFilter] = useState('in-progress')
  const [requests, setRequests] = useState(INITIAL_REQUESTS)
  const [brandAssets, setBrandAssets] = useState(DEMO_CLIENT.brand_assets)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    requestType: 'misc',
    links: [''],
    attachments: [],
    requestedDueDate: ''
  })

  const client = DEMO_CLIENT

  const currentPlan = {
    ...planConfig[client.plan],
    price: `$${planConfig[client.plan].defaultPrice.toLocaleString()}`,
    maxActive: planConfig[client.plan].defaultMaxActive,
    designers: planConfig[client.plan].defaultDesigners
  }

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
  const activeCount = inProgressCount + inReviewCount
  const queuedCount = requests.filter(r => r.status === 'in-queue').length
  const completedCount = requests.filter(r => r.status === 'completed').length

  const tabs = [
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'in-queue', label: 'Queue', count: queuedCount },
    { id: 'completed', label: 'Completed', count: completedCount }
  ]

  const filteredRequests = getFilteredRequests()

  // Demo handler — locally update state when a request changes
  const handleRefresh = () => {
    // The RequestCard's fetch calls won't actually save, but we can simulate local updates.
    // For demo recording purposes the buttons will appear functional.
  }

  // Add a fake link
  const addLink = () => setNewRequest({ ...newRequest, links: [...newRequest.links, ''] })
  const updateLink = (i, val) => {
    const updated = [...newRequest.links]
    updated[i] = val
    setNewRequest({ ...newRequest, links: updated })
  }
  const removeLink = (i) => {
    setNewRequest({ ...newRequest, links: newRequest.links.filter((_, idx) => idx !== i) })
  }

  // Simulate file upload for new request
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (newRequest.attachments.length + files.length > 4) {
      alert('Maximum 4 files allowed per request')
      return
    }
    const fakeFiles = files.map(f => ({
      name: f.name,
      url: '#',
      size: f.size,
      type: f.type || 'application/octet-stream'
    }))
    setNewRequest({ ...newRequest, attachments: [...newRequest.attachments, ...fakeFiles] })
  }

  const removeAttachment = (i) => {
    setNewRequest({ ...newRequest, attachments: newRequest.attachments.filter((_, idx) => idx !== i) })
  }

  // Submit a new request locally
  const handleSubmitRequest = () => {
    if (!newRequest.title) {
      alert('Title is required')
      return
    }
    const filteredLinks = newRequest.links.filter(l => l.trim() !== '')
    const hasCapacity = activeCount < currentPlan.maxActive
    const newReq = {
      id: `demo-req-${Date.now()}`,
      client_id: client.id,
      title: newRequest.title,
      description: newRequest.description,
      status: hasCapacity ? 'in-progress' : 'in-queue',
      priority: hasCapacity ? 1 : queuedCount + 1,
      request_type: newRequest.requestType,
      links: filteredLinks,
      attachments: newRequest.attachments,
      deliverables: [],
      started_at: hasCapacity ? new Date().toISOString() : null,
      completed_at: null,
      extension_hours: 0,
      extension_note: null,
      extension_requested: false,
      requested_due_date: newRequest.requestedDueDate || null,
      admin_notes: '',
      created_at: new Date().toISOString(),
      request_files: []
    }
    setRequests([newReq, ...requests])
    setNewRequest({ title: '', description: '', requestType: 'misc', links: [''], attachments: [], requestedDueDate: '' })
    setShowNewRequest(false)
    // Switch to the appropriate tab so user can see their new request
    setActiveFilter(hasCapacity ? 'active' : 'in-queue')
  }

  // Simulate brand asset upload
  const handleBrandAssetUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newAssets = files.map(f => ({
      name: f.name,
      url: '#',
      type: f.type || 'application/octet-stream',
      size: f.size,
      addedAt: new Date().toISOString()
    }))
    setBrandAssets([...brandAssets, ...newAssets])
  }

  const removeBrandAsset = (i) => {
    if (!confirm('Remove this brand asset?')) return
    setBrandAssets(brandAssets.filter((_, idx) => idx !== i))
  }

  const resetDemo = () => {
    if (!confirm('Reset all demo data?')) return
    setRequests(INITIAL_REQUESTS)
    setBrandAssets(DEMO_CLIENT.brand_assets)
    setActiveFilter('in-progress')
    setShowNewRequest(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <div className="h-1.5 bg-[#8B7355]" />

      {/* Demo Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-10 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 text-sm font-medium whitespace-nowrap">🎬 Demo Environment</span>
            <span className="text-amber-500 text-xs hidden sm:inline">— Fully interactive sample data. Nothing is saved.</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={resetDemo}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              ↻ Reset Demo
            </button>
            <a
              href="/admin"
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>

      {/* Help Bar (shows feature highlights for tutorial) */}
      {showHelp && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-10 py-3">
          <div className="max-w-6xl mx-auto flex items-start justify-between gap-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">👋 Welcome to the Symphony demo.</span> Try out the platform: submit a new request, upload brand assets, change request statuses, and explore the workflow. Use the Reset Demo button anytime.
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-blue-600 hover:text-blue-800 text-xl leading-none flex-shrink-0"
              title="Hide help"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-10 py-4 sm:py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
              {client.logo}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-lg sm:text-xl text-gray-900 truncate">{client.name}</h1>
              <span className="text-xs text-gray-500">Symphony by Interlude</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10">
        <div>
          {/* New Request */}
          <div className="mb-8">
            {showNewRequest ? (
              <div className="card">
                <h3 className="font-serif text-xl mb-5">New Request</h3>
                <div className="mb-4">
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="What do you need?"
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
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type.emoji} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="label">Description (Markdown supported)</label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Provide details, links, references..."
                    rows={5}
                    className="input resize-y"
                  />
                </div>
                <div className="mb-4">
                  <label className="label">Reference Links</label>
                  {newRequest.links.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                        placeholder="https://..."
                        className="input flex-1"
                      />
                      {newRequest.links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="px-3 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-sm text-[#8B7355] hover:underline"
                  >
                    + Add another link
                  </button>
                </div>
                <div className="mb-5">
                  <label className="label">Attachments (max 4 files)</label>
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
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-[#8B7355] hover:bg-[#8B7355]/5 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="text-gray-500">📎</span>
                      <span className="text-sm text-gray-600">Click to upload files</span>
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
                  <p className="text-xs text-gray-400 mt-2">When would you like this delivered by? Our team will confirm feasibility.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSubmitRequest} className="btn-primary">
                    Submit Request
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
                New Request
              </button>
            )}
          </div>

          <h2 className="font-serif text-xl mb-5">Requests</h2>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-5 bg-white p-1 sm:p-1.5 rounded-lg shadow-sm overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                  activeFilter === tab.id ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Capacity Indicator */}
          {activeFilter === 'active' && (
            <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
              <div className="text-sm text-blue-700">
                {activeCount < currentPlan.maxActive
                  ? `${currentPlan.maxActive - activeCount} active slot${currentPlan.maxActive - activeCount === 1 ? '' : 's'} available`
                  : 'All active slots in use — new requests will queue up'}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {activeCount} / {currentPlan.maxActive}
              </div>
            </div>
          )}

          {activeFilter === 'in-queue' && queuedCount > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-sm text-amber-700">
                Use the arrows to reorder priority. The #1 item will automatically start when capacity opens up.
              </p>
            </div>
          )}

          {/* Requests */}
          {filteredRequests.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3 opacity-50">
                {activeFilter === 'completed' ? '✓' : activeFilter === 'in-queue' ? '📋' : '🎯'}
              </div>
              <p className="text-gray-500">
                {activeFilter === 'active' && 'No active requests'}
                {activeFilter === 'in-queue' && 'Queue is empty'}
                {activeFilter === 'completed' && 'No completed requests yet'}
              </p>
            </div>
          ) : (
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
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan Info */}
          <div className="card">
            <h3 className="font-serif text-lg mb-4">Your Plan</h3>
            <ul className="space-y-3 mb-5">
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium">{currentPlan.name}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">{currentPlan.price}/mo</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Active Requests</span>
                <span className="font-medium">{activeCount} / {currentPlan.maxActive}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Designers</span>
                <span className="font-medium">{currentPlan.designers}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#8B7355]">✓</span>
                Slack Channel
              </li>
            </ul>
            <div className="pt-5 border-t border-gray-200">
              <button
                onClick={() => alert('In production, this opens an email pre-filled with your plan details to request changes.')}
                className="block w-full text-center py-3 border border-gray-900 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Request Plan Change
              </button>
            </div>
          </div>

          {/* Brand Assets */}
          <div className="card">
            <h3 className="font-serif text-lg mb-4">Brand Assets</h3>
            <p className="text-xs text-gray-500 mb-4">
              Upload logos, brand guidelines, fonts, and other reference files for the team to use.
            </p>
            {brandAssets.length > 0 && (
              <div className="space-y-2 mb-4">
                {brandAssets.map((asset, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-lg flex-shrink-0">
                      {asset.type?.startsWith('image/') ? '🖼️' : '📎'}
                    </span>
                    <a
                      href={asset.url}
                      onClick={(e) => { e.preventDefault(); alert('In production, this downloads the asset.') }}
                      className="text-sm text-gray-700 truncate flex-1 hover:text-[#8B7355]"
                    >
                      {asset.name}
                    </a>
                    <button
                      onClick={() => removeBrandAsset(i)}
                      className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-[#8B7355] hover:bg-[#8B7355]/5 rounded-lg cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                onChange={handleBrandAssetUpload}
                className="hidden"
              />
              <span className="text-gray-500">📎</span>
              <span className="text-sm text-gray-600">Upload brand asset</span>
            </label>
          </div>

          {/* Stats */}
          <div className="card">
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
        </div>
      </div>
    </div>
  )
}
