// Server-only auth for the owner area (/owner and /api/owner/*).
//
// Unlike the admin gate (a sessionStorage flag in the browser), this is enforced
// on the server: the owner passcode is stored as a bcrypt hash in owner_settings,
// and a successful unlock sets an httpOnly cookie signed with a secret that lives
// only in that table. Every /api/owner route calls requireOwner() first.

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { verifyPassword } from '@/lib/password'

export const OWNER_COOKIE = 'symphony_owner'
export const MIN_PASSCODE_LENGTH = 10

const SESSION_DAYS = 7
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

function sign(secret, expires) {
  return crypto.createHmac('sha256', secret).update(`owner.${expires}`).digest('hex')
}

export function makeToken(secret, now = Date.now()) {
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000
  return { token: `${expires}.${sign(secret, expires)}`, expires }
}

export function tokenValid(secret, token, now = Date.now()) {
  if (!secret || typeof token !== 'string') return false
  const [exp, sig] = token.split('.')
  const expires = Number(exp)
  if (!sig || !Number.isFinite(expires) || expires <= now) return false
  const given = Buffer.from(sig, 'hex')
  const expected = Buffer.from(sign(secret, expires), 'hex')
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

// Constant-time string comparison (hash first so lengths always match).
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function newSessionSecret() {
  return crypto.randomBytes(32).toString('hex')
}

export async function getOwnerSettings(supabase) {
  const { data, error } = await supabase
    .from('owner_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Resolve the caller. `ok` is true only with a valid, unexpired owner cookie.
export async function requireOwner(request) {
  const supabase = createServerSupabaseClient()
  const settings = await getOwnerSettings(supabase)
  const configured = !!settings?.passcode_hash
  const token = request.cookies.get(OWNER_COOKIE)?.value
  const ok = configured && tokenValid(settings.session_secret, token)
  return { ok, configured, supabase, settings }
}

// Check a passcode attempt, with a lockout after repeated failures.
export async function checkPasscode(supabase, settings, passcode) {
  const now = Date.now()
  if (settings.locked_until && new Date(settings.locked_until).getTime() > now) {
    return { ok: false, lockedUntil: settings.locked_until }
  }

  const ok = await verifyPassword(String(passcode || ''), settings.passcode_hash)
  if (ok) {
    if (settings.failed_attempts || settings.locked_until) {
      await supabase
        .from('owner_settings')
        .update({ failed_attempts: 0, locked_until: null, updated_at: new Date(now).toISOString() })
        .eq('id', 1)
    }
    return { ok: true }
  }

  const attempts = (settings.failed_attempts || 0) + 1
  const lock = attempts >= MAX_ATTEMPTS
  const lockedUntil = lock ? new Date(now + LOCK_MINUTES * 60 * 1000).toISOString() : null
  await supabase
    .from('owner_settings')
    .update({
      failed_attempts: lock ? 0 : attempts,
      locked_until: lockedUntil,
      updated_at: new Date(now).toISOString(),
    })
    .eq('id', 1)
  return { ok: false, lockedUntil, attemptsLeft: lock ? 0 : MAX_ATTEMPTS - attempts }
}

// JSON response that is never cached.
export function ownerJson(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function setOwnerCookie(response, secret) {
  const { token, expires } = makeToken(secret)
  response.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expires),
  })
  return response
}

export function clearOwnerCookie(response) {
  response.cookies.set(OWNER_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  })
  return response
}
