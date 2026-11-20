import { planConfig } from '@/lib/supabase'
import { requireOwner, ownerJson } from '@/lib/ownerAuth'

export const dynamic = 'force-dynamic'

// Internal / test accounts that are not real clients, so they stay off the board.
const INTERNAL_ACCOUNTS = ['demo', 'interlude studio']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NOTE_LENGTH = 4000
const PAGE = 1000

// Requests can outgrow PostgREST's 1000-row page, so read them in pages.
async function fetchRequestRows(supabase) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('requests')
      .select('client_id, status, created_at')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE) return rows
  }
}

// GET /api/owner/plan - Live accounts with the owner's decisions (owner only)
export async function GET(request) {
  try {
    const auth = await requireOwner(request)
    if (!auth.ok) return ownerJson({ error: 'Locked' }, 401)
    const { supabase } = auth

    const [clientsRes, plansRes, requests] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, plan, custom_price, client_status, client_tag, created_at'),
      supabase.from('account_plans').select('client_id, decision, note, updated_at'),
      fetchRequestRows(supabase),
    ])
    if (clientsRes.error) throw clientsRes.error
    if (plansRes.error) throw plansRes.error

    const stats = new Map()
    for (const r of requests) {
      const s = stats.get(r.client_id) || { requests: 0, open: 0, completed: 0, lastSubmitted: null }
      s.requests += 1
      if (r.status === 'completed') s.completed += 1
      else s.open += 1
      const day = (r.created_at || '').slice(0, 10)
      if (day && (!s.lastSubmitted || day > s.lastSubmitted)) s.lastSubmitted = day
      stats.set(r.client_id, s)
    }

    const plans = new Map((plansRes.data || []).map((p) => [p.client_id, p]))

    const accounts = (clientsRes.data || [])
      .filter((c) => !INTERNAL_ACCOUNTS.includes((c.name || '').trim().toLowerCase()))
      .map((c) => {
        const s = stats.get(c.id) || { requests: 0, open: 0, completed: 0, lastSubmitted: null }
        const p = plans.get(c.id)
        return {
          id: c.id,
          name: c.name,
          plan: c.plan,
          mrr: c.custom_price ? parseInt(c.custom_price) : planConfig[c.plan]?.defaultPrice || 0,
          status: c.client_status === 'paused' ? 'paused' : 'active',
          tag: c.client_tag || null,
          since: (c.created_at || '').slice(0, 10),
          requests: s.requests,
          open: s.open,
          completed: s.completed,
          lastSubmitted: s.lastSubmitted,
          decision: p?.decision || null,
          note: p?.note || '',
        }
      })

    return ownerJson({ accounts, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Owner plan load failed:', error)
    return ownerJson({ error: 'Could not load accounts' }, 500)
  }
}

// PUT /api/owner/plan - Save one account's decision and note (owner only)
export async function PUT(request) {
  try {
    const auth = await requireOwner(request)
    if (!auth.ok) return ownerJson({ error: 'Locked' }, 401)
    const { supabase } = auth

    const body = await request.json().catch(() => ({}))
    const clientId = body.clientId
    const decision = body.decision === 'keep' || body.decision === 'part' ? body.decision : null
    const note = typeof body.note === 'string' ? body.note.slice(0, MAX_NOTE_LENGTH) : ''

    if (typeof clientId !== 'string' || !UUID.test(clientId)) {
      return ownerJson({ error: 'Unknown account' }, 400)
    }

    // Nothing decided and no note: remove the row instead of storing an empty one.
    if (!decision && !note.trim()) {
      const { error } = await supabase.from('account_plans').delete().eq('client_id', clientId)
      if (error) throw error
      return ownerJson({ success: true })
    }

    const { error } = await supabase
      .from('account_plans')
      .upsert(
        { client_id: clientId, decision, note, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' }
      )
    if (error) {
      // 23503 = the client no longer exists
      if (error.code === '23503') return ownerJson({ error: 'Unknown account' }, 400)
      throw error
    }

    return ownerJson({ success: true })
  } catch (error) {
    console.error('Owner plan save failed:', error)
    return ownerJson({ error: 'Could not save' }, 500)
  }
}
