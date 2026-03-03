'use client'

import { useState } from 'react'
import { planConfig, statusConfig, requestTypes } from '@/lib/supabase'
import RequestCard from '@/components/RequestCard'

// Dummy client data
const DEMO_CLIENT = {
  id: 'demo-client-id',
  name: 'Acme Corp',
  plan: 'growth',
  logo: '🚀',
  custom_price: null,
  custom_max_active: null,
  custom_designers: null,
  brand_assets: [
    { name: 'Brand Guidelines.pdf', url: '#', type: 'file' },
    { name: 'Logo Pack.zip', url: '#', type: 'file' }
  ]
}

// Generate realistic timestamps
const now = new Date()
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()

const DEMO_REQUESTS = [
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
      { name: 'brand-reference.png', url: '#', size: 245000 },
      { name: 'wireframes-v2.pdf', url: '#', size: 1200000 }
    ],
    deliverables: [],
    started_at: hoursAgo(18),
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    admin_notes: '',
    created_at: daysAgo(1),
    request_files: []
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
      { name: 'financial-data.xlsx', url: '#', size: 89000 }
    ],
    deliverables: [
      { name: 'AcmeCorp-PitchDeck-v1.pdf', url: '#', size: 4500000 },
      { name: 'AcmeCorp-PitchDeck-v1.pptx', url: '#', size: 8200000 }
    ],
    started_at: daysAgo(2),
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
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
      { name: 'illustration-style-ref.png', url: '#', size: 320000 }
    ],
    deliverables: [],
    started_at: null,
    completed_at: null,
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
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
      { name: 'AcmeCorp-BrandGuide-Final.pdf', url: '#', size: 12000000 },
      { name: 'AcmeCorp-Assets.zip', url: '#', size: 45000000 }
    ],
    started_at: daysAgo(7),
    completed_at: daysAgo(5),
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
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
      { name: 'Newsletter-Templates.zip', url: '#', size: 3200000 }
    ],
    started_at: daysAgo(10),
    completed_at: daysAgo(8),
    extension_hours: 0,
    extension_note: null,
    extension_requested: false,
    admin_notes: '',
    created_at: daysAgo(12),
    request_files: []
  }
]

export default function DemoPortal() {
  const [activeFilter, setActiveFilter] = useState('in-progress')

  const client = DEMO_CLIENT
  const requests = DEMO_REQUESTS

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
  const queuedCount = requests.filter(r => r.status === 'in-queue').length
  const completedCount = requests.filter(r => r.status === 'completed').length
  const brandAssets = client.brand_assets || []

  const tabs = [
    { id: 'in-queue', label: 'Queue', count: queuedCount },
    { id: 'in-progress', label: 'In Progress', count: inProgressCount },
    { id: 'in-review', label: 'In Review', count: inReviewCount },
    { id: 'completed', label: 'Completed', count: completedCount }
  ]

  const filteredRequests = getFilteredRequests()

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <div className="h-1.5 bg-[#8B7355]" />

      {/* Demo Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-10 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-sm font-medium">Demo Environment</span>
            <span className="text-amber-500 text-xs">— This is a preview with sample data. No actions are saved.</span>
          </div>
          <a
            href="/admin"
            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
          >
            ← Back to Admin
          </a>
        </div>
      </div>

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
          <button
            onClick={() => alert('This is a demo — new requests are disabled.')}
            className="btn-primary"
          >
            + New Request
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-10 py-10 grid grid-cols-[1fr_340px] gap-10">
        <div>
          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeFilter === tab.id
                    ? 'border-[#8B7355] text-[#8B7355]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Requests */}
          {filteredRequests.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-gray-500">No requests in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isAdmin={false}
                  showPriorityControls={false}
                  queuePosition={activeFilter === 'in-queue' ? index + 1 : null}
                  totalQueued={queuedCount}
                  clientId={client.id}
                  onRefresh={() => {}}
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
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium">{currentPlan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">{currentPlan.price}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Requests</span>
                <span className="font-medium">{inProgressCount + inReviewCount} / {currentPlan.maxActive}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Designers</span>
                <span className="font-medium">{currentPlan.designers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Turnaround</span>
                <span className="font-medium">{currentPlan.turnaround}</span>
              </div>
            </div>
          </div>

          {/* Brand Assets */}
          {brandAssets.length > 0 && (
            <div className="card">
              <h3 className="font-serif text-lg mb-4">Brand Assets</h3>
              <div className="space-y-2">
                {brandAssets.map((asset, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-lg">📎</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{asset.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-serif text-lg mb-4">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Requests</span>
                <span className="font-medium">{requests.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-green-600">{completedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">In Progress</span>
                <span className="font-medium text-amber-600">{inProgressCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">In Queue</span>
                <span className="font-medium">{queuedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
