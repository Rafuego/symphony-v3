import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import {
  MIN_PASSCODE_LENGTH,
  getOwnerSettings,
  newSessionSecret,
  ownerJson,
  safeEqual,
  setOwnerCookie,
} from '@/lib/ownerAuth'

export const dynamic = 'force-dynamic'

// POST /api/owner/setup - One-time: choose the owner passcode.
//
// Works only while no passcode exists. The caller must also know the admin
// password, so a stranger who finds the URL cannot claim the owner area first.
// Once a passcode is set this route always refuses; resetting it means deleting
// the owner_settings row in the database.
export async function POST(request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return ownerJson({ error: 'Admin password not configured on server' }, 500)
    }

    const supabase = createServerSupabaseClient()
    const existing = await getOwnerSettings(supabase)
    if (existing?.passcode_hash) {
      return ownerJson({ error: 'The owner passcode is already set' }, 409)
    }

    const body = await request.json().catch(() => ({}))
    const passcode = typeof body.passcode === 'string' ? body.passcode : ''

    if (!body.adminPassword || !safeEqual(body.adminPassword, adminPassword)) {
      return ownerJson({ error: 'The admin password is not right' }, 401)
    }
    if (passcode.length < MIN_PASSCODE_LENGTH) {
      return ownerJson({ error: `Use at least ${MIN_PASSCODE_LENGTH} characters for your passcode` }, 400)
    }
    if (safeEqual(passcode, adminPassword)) {
      return ownerJson({ error: 'Choose a passcode that is different from the admin password' }, 400)
    }

    const secret = newSessionSecret()
    const row = {
      id: 1,
      passcode_hash: await hashPassword(passcode),
      session_secret: secret,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }

    // Insert (not upsert) so two simultaneous setups cannot both win: the
    // primary key lets exactly one through. A leftover row with no hash is
    // filled in by a guarded update instead.
    let claimed = false
    if (existing) {
      const { data, error } = await supabase
        .from('owner_settings')
        .update(row)
        .eq('id', 1)
        .is('passcode_hash', null)
        .select('id')
      if (error) throw error
      claimed = (data || []).length === 1
    } else {
      const { error } = await supabase.from('owner_settings').insert(row)
      if (error && error.code !== '23505') throw error
      claimed = !error
    }

    if (!claimed) {
      return ownerJson({ error: 'The owner passcode is already set' }, 409)
    }

    return setOwnerCookie(ownerJson({ success: true }), secret)
  } catch (error) {
    console.error('Owner setup failed:', error)
    return ownerJson({ error: 'Could not save the passcode' }, 500)
  }
}
