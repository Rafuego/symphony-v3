'use client'

import { planConfig } from '@/lib/supabase'

const PLAN_STYLES = {
  launch: 'bg-rose-100 text-rose-700',
  growth: 'bg-emerald-100 text-emerald-700',
  scale: 'bg-violet-100 text-violet-700',
  custom: 'bg-amber-100 text-amber-700',
}

// Effective monthly price for a client (custom override → plan default).
export function clientMRR(client) {
  return client.custom_price
    ? parseInt(client.custom_price)
    : planConfig[client.plan]?.defaultPrice || 0
}

// Plan pill — shows "Custom" when a custom price overrides the plan.
export function ClientPlanBadge({ client }) {
  const isCustom = !!client.custom_price
  const label = isCustom ? 'Custom' : planConfig[client.plan]?.name || client.plan
  const style = isCustom ? PLAN_STYLES.custom : PLAN_STYLES[client.plan] || 'bg-gray-100 text-gray-700'
  return <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${style}`}>{label}</span>
}

// Active / Paused status pill.
export function ClientStatusBadge({ status }) {
  const paused = status === 'paused'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        paused ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-gray-400' : 'bg-emerald-500'}`} />
      {paused ? 'Paused' : 'Active'}
    </span>
  )
}

// Notion configuration indicator.
export function NotionStatus({ client }) {
  const ok = !!client.notion_project_id
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-gray-600' : 'text-amber-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {ok ? 'Notion configured' : 'No project ID'}
    </span>
  )
}
