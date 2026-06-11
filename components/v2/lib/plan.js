import { planConfig } from '@/lib/supabase'

// Resolves a client's effective plan (custom overrides → plan defaults).
// Extracts the currentPlan logic duplicated in ClientPortal.js / AdminClientDashboard.js.
export function resolvePlan(client) {
  const base = planConfig[client?.plan] || planConfig.growth
  return {
    key: client?.plan || 'growth',
    name: base.name,
    tier: base.tier,
    price: client?.custom_price ? parseInt(client.custom_price) : base.defaultPrice,
    maxActive: client?.custom_max_active ? parseInt(client.custom_max_active) : base.defaultMaxActive,
    designers: client?.custom_designers || base.defaultDesigners,
    turnaround: base.turnaround,
  }
}

export function formatPrice(price) {
  return `$${parseInt(price || 0).toLocaleString()}`
}
