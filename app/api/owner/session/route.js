import {
  requireOwner,
  checkPasscode,
  ownerJson,
  setOwnerCookie,
  clearOwnerCookie,
} from '@/lib/ownerAuth'

export const dynamic = 'force-dynamic'

// GET /api/owner/session - Is the owner area set up, and is this browser unlocked?
export async function GET(request) {
  try {
    const auth = await requireOwner(request)
    return ownerJson({ configured: auth.configured, unlocked: auth.ok })
  } catch (error) {
    console.error('Owner session check failed:', error)
    return ownerJson({ error: 'Could not check the owner session' }, 500)
  }
}

// POST /api/owner/session - Unlock with the owner passcode
export async function POST(request) {
  try {
    const auth = await requireOwner(request)
    if (!auth.configured) {
      return ownerJson({ error: 'The owner passcode has not been set yet' }, 409)
    }

    const body = await request.json().catch(() => ({}))
    if (!body.passcode) {
      return ownerJson({ error: 'Enter your passcode' }, 400)
    }

    const result = await checkPasscode(auth.supabase, auth.settings, body.passcode)
    if (!result.ok) {
      if (result.lockedUntil) {
        return ownerJson({ error: 'Too many wrong tries', lockedUntil: result.lockedUntil }, 429)
      }
      return ownerJson({ error: 'Wrong passcode', attemptsLeft: result.attemptsLeft }, 401)
    }

    return setOwnerCookie(ownerJson({ success: true }), auth.settings.session_secret)
  } catch (error) {
    console.error('Owner unlock failed:', error)
    return ownerJson({ error: 'Could not unlock' }, 500)
  }
}

// DELETE /api/owner/session - Lock this browser again
export async function DELETE() {
  return clearOwnerCookie(ownerJson({ success: true }))
}
