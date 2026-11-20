import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  slackConfig,
  verifySlackSignature,
  createSlackClient,
  handleAppMention,
  runAfterResponse,
} from '@/lib/slackBot'
import { POST as createRequestRoute } from '@/app/api/requests/route'

export const dynamic = 'force-dynamic'
// Creating the request also writes to Notion, which can take a few seconds.
export const maxDuration = 60

const ALLOWED_SUBTYPES = new Set(['file_share', 'thread_broadcast'])

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

function originOf(request) {
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return { host, protocol, baseUrl: host ? `${protocol}://${host}` : 'https://symphony.interlude.studio' }
}

function readChallenge(rawBody) {
  try {
    const body = JSON.parse(rawBody)
    const ok = body?.type === 'url_verification' && typeof body.challenge === 'string' && body.challenge.length <= 200
    return ok ? body.challenge : null
  } catch {
    return null
  }
}

// POST /api/slack/events - Slack calls this when the bot is tagged.
//
// Until SLACK_SIGNING_SECRET is set this endpoint does nothing. Once it is
// set, every call must carry Slack's signature for that secret, so nobody
// else can create requests through it.
export async function POST(request) {
  const { signingSecret, botToken } = slackConfig()
  const rawBody = await request.text()

  if (!signingSecret) {
    // Not set up yet. The one thing answered is Slack's address check, which
    // only echoes a value back, so the app can be created before the keys are
    // in place. Everything else is refused.
    const challenge = readChallenge(rawBody)
    if (challenge) return json({ challenge })
    return json({ error: 'The Slack bot is not set up yet' }, 503)
  }

  const signed = verifySlackSignature({
    signingSecret,
    timestamp: request.headers.get('x-slack-request-timestamp'),
    signature: request.headers.get('x-slack-signature'),
    rawBody,
  })
  if (!signed) return json({ error: 'Invalid signature' }, 401)

  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid body' }, 400)
  }

  // Slack's one-time check when the events address is saved.
  if (body.type === 'url_verification') return json({ challenge: body.challenge })

  const event = body.event
  if (body.type !== 'event_callback' || event?.type !== 'app_mention') return json({ ok: true })
  // Never react to bots (including this one) or to edits/deletions. A tag on a
  // message that carries a file, or a reply also sent to the channel, is fine.
  if (event.bot_id || (event.subtype && !ALLOWED_SUBTYPES.has(event.subtype))) return json({ ok: true })

  if (!botToken) {
    console.error('Slack bot was tagged but SLACK_BOT_TOKEN is not set')
    return json({ ok: true })
  }

  const { host, protocol, baseUrl } = originOf(request)
  const supabase = createServerSupabaseClient()
  const slack = createSlackClient(botToken)

  // Go through the same code the portal uses, so capacity rules, alerts and
  // the Notion sync all apply to requests that come from Slack.
  const createRequest = async (payload) => {
    const headers = { 'content-type': 'application/json', 'x-forwarded-proto': protocol }
    if (host) headers['x-forwarded-host'] = host
    const res = await createRequestRoute(
      new Request(`${baseUrl}/api/requests`, { method: 'POST', headers, body: JSON.stringify(payload) })
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) throw new Error(data.error || `Create failed (${res.status})`)
    return data
  }

  const work = handleAppMention({ event, baseUrl, deps: { supabase, slack, createRequest, botToken } }).catch(
    (err) => {
      console.error('Slack intake failed:', err)
      return { action: 'failed' }
    }
  )

  // Slack wants an answer within three seconds. Where the platform lets work
  // continue after the answer, answer now; otherwise finish first (Slack may
  // then send the event again, which the per-message lock ignores).
  if (!runAfterResponse(work)) await work
  return json({ ok: true })
}

// GET /api/slack/events - setup check. Says only whether each piece is in
// place, never any value.
export async function GET() {
  const { signingSecret, botToken } = slackConfig()
  const status = { signingSecret: !!signingSecret, botToken: !!botToken, botTokenWorks: null, database: null }

  if (botToken) {
    try {
      await createSlackClient(botToken).call('auth.test')
      status.botTokenWorks = true
    } catch {
      status.botTokenWorks = false
    }
  }
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('slack_channels').select('channel_id').limit(1)
    status.database = !error
  } catch {
    status.database = false
  }

  const ready = status.signingSecret && status.botToken && status.botTokenWorks === true && status.database === true
  return json({ ready, ...status })
}
