import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Browser client (for client components)
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Server client with service role (for API routes - bypasses RLS)
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Plan configurations
export const planConfig = {
  launch: {
    name: 'Launch',
    tier: 'EARLY-STAGE STARTUPS',
    defaultPrice: 2000,
    defaultMaxActive: 1,
    defaultDesigners: '1',
    turnaround: '24-48hr'
  },
  growth: {
    name: 'Growth',
    tier: 'SEED TO SERIES B',
    defaultPrice: 3500,
    defaultMaxActive: 3,
    defaultDesigners: '2',
    turnaround: '24-48hr'
  },
  scale: {
    name: 'Scale',
    tier: 'ENTERPRISE & BEYOND',
    defaultPrice: 5000,
    defaultMaxActive: 5,
    defaultDesigners: '3-4',
    turnaround: '48-72hr'
  }
}

// Status configurations
export const statusConfig = {
  'in-queue': { label: 'In Queue', color: '#9CA3AF', bg: '#F3F4F6' },
  'in-progress': { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  'in-review': { label: 'In Review', color: '#7C3AED', bg: '#EDE9FE' },
  'completed': { label: 'Completed', color: '#059669', bg: '#D1FAE5' }
}

// Request type configurations
export const requestTypes = [
  { id: 'brand', label: 'Brand', emoji: '🎨' },
  { id: 'site', label: 'Site', emoji: '🌐' },
  { id: 'deck', label: 'Deck', emoji: '📊' },
  { id: 'product', label: 'Product', emoji: '📱' },
  { id: 'marketing', label: 'Marketing', emoji: '📣' },
  { id: 'misc', label: 'Misc', emoji: '📁' }
]
