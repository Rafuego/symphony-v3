// Slack intake bot.
//
// A teammate (or a client) tags the Symphony bot in a client's Slack channel
// and the message becomes a Symphony request, which then flows to Notion and
// the alerts like any request made in the portal.
//
//   - Tagged in a reply under a message: that first message is the brief.
//   - Tagged in a new message: the text after the tag is the request.
//   - "@Symphony link <client name>": connects the channel to a client.
//     (In the text sent to Slack this is written &lt;client name&gt;, because
//     Slack reads bare angle brackets as a link.)
//
// This file holds the logic. app/api/slack/events/route.js is the endpoint
// Slack calls; it checks Slack's signature before anything here runs.
import crypto from 'crypto'

const SLACK_API = 'https://slack.com/api'
const REQUEST_TYPES = ['brand', 'site', 'deck', 'product', 'marketing', 'misc']

// A claim that is still "processing" after this long belonged to a run that
// died, so a later Slack retry is allowed to take it over.
const STALE_CLAIM_MS = 90 * 1000

export function slackConfig() {
  return {
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    botToken: process.env.SLACK_BOT_TOKEN || '',
  }
}

// ---------------------------------------------------------------------------
// Request signature (https://api.slack.com/authentication/verifying-requests-from-slack)
// ---------------------------------------------------------------------------

export function verifySlackSignature({ signingSecret, timestamp, signature, rawBody, now = Date.now() }) {
  if (!signingSecret || !timestamp || !signature) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  // Reject anything older than five minutes, so a captured request cannot be replayed.
  if (Math.abs(now / 1000 - ts) > 60 * 5) return false
  const expected =
    'v0=' + crypto.createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ---------------------------------------------------------------------------
// Slack Web API
// ---------------------------------------------------------------------------

export function createSlackClient(token, fetchImpl = fetch) {
  async function call(method, params = {}, { json = false } = {}) {
    const headers = { Authorization: `Bearer ${token}` }
    let body
    if (json) {
      headers['Content-Type'] = 'application/json; charset=utf-8'
      body = JSON.stringify(params)
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(params).toString()
    }
    const res = await fetchImpl(`${SLACK_API}/${method}`, { method: 'POST', headers, body })
    const data = await res.json().catch(() => null)
    if (!data || !data.ok) {
      const err = new Error(`Slack ${method} failed: ${data?.error || `http ${res.status}`}`)
      err.slackError = data?.error || null
      throw err
    }
    return data
  }
  return { call }
}

// Lets the work carry on after Slack has its answer (Slack wants one within
// three seconds). Returns false where that is not possible, and the caller
// then finishes the work before answering.
export function runAfterResponse(promise) {
  try {
    const context = globalThis[Symbol.for('@vercel/request-context')]?.get?.()
    if (context && typeof context.waitUntil === 'function') {
      context.waitUntil(promise)
      return true
    }
  } catch {
    // fall through
  }
  return false
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const decodeEntities = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const escapeSlack = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function stripBotMention(text, botUserId) {
  if (!text) return ''
  const pattern = botUserId ? new RegExp(`<@${botUserId}(\\|[^>]*)?>`, 'g') : /<@[A-Z0-9]+(\|[^>]*)?>/
  return text.replace(pattern, ' ').replace(/[ \t]+/g, ' ').replace(/^[\s,:;\-–—]+/, '').trim()
}

export function mentionedUserIds(text) {
  const ids = new Set()
  for (const m of String(text || '').matchAll(/<@([A-Z0-9]+)(\|[^>]*)?>/g)) ids.add(m[1])
  return [...ids]
}

// Slack's message format -> plain text. Symphony shows a brief exactly as it
// is stored and Notion gets the same text, so no markup is left in it: names
// replace user ids, links are written out, bold/italic markers are dropped.
export function slackToText(text, { userNames = {} } = {}) {
  if (!text) return ''
  let out = String(text).replace(/<([^<>\n]+)>/g, (whole, inner) => {
    const bar = inner.indexOf('|')
    const target = bar === -1 ? inner : inner.slice(0, bar)
    const label = bar === -1 ? '' : inner.slice(bar + 1)
    if (target.startsWith('@')) return '@' + (label || userNames[target.slice(1)] || 'someone')
    if (target.startsWith('#')) return '#' + (label || 'channel')
    if (target.startsWith('!')) {
      if (label) return label
      if (target.startsWith('!subteam')) return '@group'
      return '@' + target.slice(1).split('^')[0]
    }
    if (/^mailto:/i.test(target)) return label || target.slice(7)
    if (/^https?:\/\//i.test(target)) return label && label !== target ? `${label} (${target})` : target
    return whole
  })
  out = out
    // Emphasis markers hug the words they wrap ("*bold*"); "2 * 3 * 4" is left alone.
    .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)(?<!\s)\*(?=$|[\s.,!?:;)])/gm, '$1$2')
    .replace(/(^|[\s(])_(?!\s)([^_\n]+?)(?<!\s)_(?=$|[\s.,!?:;)])/gm, '$1$2')
    .replace(/(^|[\s(])~(?!\s)([^~\n]+?)(?<!\s)~(?=$|[\s.,!?:;)])/gm, '$1$2')
    .replace(/^[ \t]*[◦▪‣]\s+/gm, '• ')
  return decodeEntities(out).replace(/\n{3,}/g, '\n\n').trim()
}

const GREETING =
  /^(hi|hey|hello|hiya|yo|morning|good (morning|afternoon|evening))( (team|all|everyone|folks|guys|there|interlude|@\S+( \S+)?))?[\s,!.:\-–—]+/i

// A short, readable title from the first real line of a message.
export function deriveTitle(text, max = 90) {
  const lines = String(text || '').replace(/`/g, '').split('\n').map((l) => l.replace(/^[-•]\s+/, '').trim()).filter(Boolean)
  let title = ''
  for (const line of lines) {
    const candidate = line.replace(GREETING, '').trim()
    if (candidate.replace(/[^a-z0-9]/gi, '').length >= 3) {
      title = candidate
      break
    }
  }
  if (!title) return ''
  if (title.length > max) {
    const sentence = title.slice(0, max + 1).match(/^(.{20,}?[.!?])(\s|$)/)
    title = sentence ? sentence[1] : title.slice(0, max).replace(/\s+\S*$/, '') + '…'
  }
  title = title.replace(/[\s:;,.\-–—]+$/, '')
  return title.charAt(0).toUpperCase() + title.slice(1)
}

// "@Symphony please add this" is an instruction to the bot, not a title.
const FILLER = new Set(
  ('please pls plz can could would you u add log create capture track file push make new take grab submit put ' +
    'this that it a an the as to in into on onto request requests ticket task symphony for us here up one ' +
    'thanks thank ty board queue dashboard platform and notion too also now').split(' ')
)
export function isFiller(text) {
  const words = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  return words.every((w) => FILLER.has(w))
}

// "deck: Investor update" -> { type: 'deck', rest: 'Investor update' }
export function splitTypePrefix(text) {
  const m = String(text || '').match(/^(brand|site|deck|product|marketing|misc)\s*[:\-–—]\s+(.*)$/is)
  if (!m) return { type: null, rest: String(text || '') }
  return { type: m[1].toLowerCase(), rest: m[2] }
}

const TYPE_RULES = [
  ['deck', /\b(deck|decks|slides?|presentation|pitch|keynote|powerpoint|ppt)\b/i],
  ['brand', /\b(logo|logos|branding|rebrand|wordmark|brand identity|brand guidelines?|brand(?! new))\b/i],
  ['site', /\b(website|web ?site|web ?page|landing page|home ?page|webflow|framer|site)\b/i],
  ['marketing', /\b(social|ads?|banners?|campaign|newsletter|email|linkedin|instagram|one[- ]pagers?|one[- ]page|flyer|brochure|graphic|graphics|booth|swag|merch|poster)\b/i],
  ['product', /\b(app|product|ui|ux|dashboard|prototype|wireframes?|user flow|onboarding)\b/i],
]
export function inferRequestType(title, description = '') {
  for (const source of [title, description]) {
    for (const [type, pattern] of TYPE_RULES) if (pattern.test(source || '')) return type
  }
  return 'misc'
}

// ---------------------------------------------------------------------------
// Channel <-> client
// ---------------------------------------------------------------------------

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function channelKey(channelName) {
  return norm(String(channelName || '').toLowerCase().replace(/^(interlude|int)[-_]/, ''))
}

export const isInternalChannel = (name) => /^int[-_]/i.test(name || '')
export const isClientChannel = (name) => /^interlude[-_]/i.test(name || '')

// A channel is connected on its own only when its name is exactly one client
// and nothing else comes close. Anything less certain is left for a person to
// confirm, because a wrong match would put one client's message on another
// client's board.
export function matchChannelToClient(channelName, clients) {
  const key = channelKey(channelName)
  if (key.length < 2) return { exact: null, candidates: [] }
  const exact = clients.filter((c) => norm(c.name) === key || norm(c.slug) === key)
  const near = clients.filter((c) => {
    if (exact.includes(c)) return false
    const name = norm(c.name)
    if (key.length < 3 || name.length < 3) return false
    return name.startsWith(key) || key.startsWith(name)
  })
  if (exact.length === 1 && near.length === 0) return { exact: exact[0], candidates: [] }
  return { exact: null, candidates: [...exact, ...near] }
}

export function findClientByName(clients, query) {
  const q = norm(String(query || '').replace(/[*_~`"'“”‘’]/g, ''))
  if (!q) return { match: null, suggestions: [] }
  const exact = clients.filter((c) => norm(c.name) === q || norm(c.slug) === q)
  if (exact.length === 1) return { match: exact[0], suggestions: [] }
  const partial = clients.filter((c) => !exact.includes(c) && q.length >= 3 && norm(c.name).includes(q))
  if (exact.length === 0 && partial.length === 1) return { match: partial[0], suggestions: [] }
  return { match: null, suggestions: [...exact, ...partial].slice(0, 5) }
}

// Only a full member of Interlude's own Slack can connect a channel: not a
// client in a shared channel, not a guest, not another bot.
export function isTeamMember(user, homeTeamId) {
  if (!user || !homeTeamId) return false
  if (user.is_bot || user.deleted || user.is_stranger) return false
  if (user.is_restricted || user.is_ultra_restricted) return false
  return user.team_id === homeTeamId
}

const noop = () => {}

const displayName = (user) =>
  user?.profile?.display_name || user?.real_name || user?.profile?.real_name || user?.name || ''

// ---------------------------------------------------------------------------
// The lock: one row per tagged message
// ---------------------------------------------------------------------------

async function claimMessage(supabase, row, now) {
  const { error } = await supabase.from('slack_intake').insert(row)
  if (!error) return true
  if (error.code !== '23505') throw new Error(`Could not record the Slack message: ${error.message}`)

  const { data: existing } = await supabase
    .from('slack_intake')
    .select('status, request_id, created_at')
    .eq('channel_id', row.channel_id)
    .eq('message_ts', row.message_ts)
    .maybeSingle()

  const stale =
    existing &&
    existing.status === 'processing' &&
    !existing.request_id &&
    now - new Date(existing.created_at).getTime() > STALE_CLAIM_MS
  if (!stale) return false

  const { data: taken } = await supabase
    .from('slack_intake')
    .update({ created_at: new Date(now).toISOString() })
    .eq('channel_id', row.channel_id)
    .eq('message_ts', row.message_ts)
    .eq('status', 'processing')
    .eq('created_at', existing.created_at)
    .select('message_ts')
  return Array.isArray(taken) && taken.length > 0
}

// ---------------------------------------------------------------------------
// The mention handler
// ---------------------------------------------------------------------------

const HELP = [
  'Here is how to use me:',
  '• Reply under a client’s message and tag me. That message goes onto the client’s Symphony board.',
  '• Add a title after my name if you want a specific one: `@Symphony Homepage hero refresh`',
  '• Or write the request in a new message: `@Symphony Three LinkedIn banners for the launch`',
  '• Start with a type to set it: `@Symphony deck: Investor update` (brand, site, deck, product, marketing, misc)',
  '• To connect a channel to a client: `@Symphony link &lt;client name&gt;`',
].join('\n')

let identityCache = null
async function botIdentity(slack, token) {
  if (identityCache && identityCache.token === token) return identityCache
  const auth = await slack.call('auth.test')
  identityCache = { token, userId: auth.user_id, teamId: auth.team_id }
  return identityCache
}

export function resetSlackBotCache() {
  identityCache = null
}

// deps: { supabase, slack, createRequest, botToken?, now? }
// createRequest(payload) must return { request, notionResult } or throw.
export async function handleAppMention({ event, baseUrl, deps }) {
  const { supabase, slack, createRequest } = deps
  const now = deps.now ? deps.now() : Date.now()
  const channel = event.channel
  const ts = event.ts
  const threadTs = event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : null
  const replyTo = event.thread_ts || event.ts

  const say = (text) =>
    slack
      .call(
        'chat.postMessage',
        { channel, thread_ts: replyTo, text, unfurl_links: false, unfurl_media: false },
        { json: true }
      )
      .catch((err) => console.error('Slack reply failed:', err.message))

  const key = { channel_id: channel, message_ts: ts }
  const finish = (patch) =>
    supabase.from('slack_intake').update(patch).eq('channel_id', channel).eq('message_ts', ts)

  // One run per tagged message, however many times Slack delivers it.
  const claimed = await claimMessage(
    supabase,
    { ...key, thread_ts: threadTs || ts, slack_user_id: event.user || null, status: 'processing' },
    now
  )
  if (!claimed) return { action: 'duplicate' }

  let created = null
  try {
    const identity = await botIdentity(slack, deps.botToken || '')
    const raw = stripBotMention(event.text || '', identity.userId)

    // --- help -------------------------------------------------------------
    if (/^help[\s.!?]*$/i.test(raw) || (!threadTs && isFiller(raw))) {
      await say(HELP)
      await finish({ status: 'replied' })
      return { action: 'help' }
    }

    const loadClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, slug, client_status, access_token')
      if (error) throw new Error(error.message)
      return data || []
    }
    const channelName = async () => {
      const info = await slack.call('conversations.info', { channel })
      return info.channel?.name || ''
    }

    // --- link a channel to a client ----------------------------------------
    const linkMatch = raw.match(/^link(?:\s+(?:this channel to|channel to|this to|to))?\s+(.+)$/i)
    // "link Kunin" is the command. A longer sentence that starts with "Link ..."
    // (say, "Link in bio graphic for Instagram") is a request.
    const linkCommand = linkMatch && linkMatch[1].trim().split(/\s+/).length <= 4 ? linkMatch : null
    if (linkCommand || /^link[\s.!?]*$/i.test(raw)) {
      const info = await slack.call('users.info', { user: event.user }).catch(() => null)
      if (!isTeamMember(info?.user, identity.teamId)) {
        await say('Only the Interlude team can connect a channel to a client.')
        await finish({ status: 'replied' })
        return { action: 'link_refused' }
      }
      const clients = await loadClients()
      const { match, suggestions } = findClientByName(clients, linkCommand?.[1] || '')
      if (!match) {
        const hint = suggestions.length
          ? ` Did you mean ${suggestions.map((c) => `*${escapeSlack(c.name)}*`).join(' or ')}?`
          : ''
        await say(
          `I couldn’t find that client in Symphony.${hint}\nUse the name as it appears on the client list: \`@Symphony link &lt;client name&gt;\``
        )
        await finish({ status: 'replied' })
        return { action: 'link_not_found' }
      }
      const name = await channelName().catch(() => '')
      const { error } = await supabase.from('slack_channels').upsert({
        channel_id: channel,
        client_id: match.id,
        channel_name: name || null,
        linked_by: event.user || null,
        updated_at: new Date(now).toISOString(),
      })
      if (error) throw new Error(error.message)
      await say(
        `Connected <#${channel}> to *${escapeSlack(match.name)}*. Tag me under a message to add it to their Symphony board.`
      )
      await finish({ status: 'replied', client_id: match.id })
      return { action: 'linked', clientId: match.id }
    }

    // --- which client is this channel? --------------------------------------
    let client = null
    let name = ''
    let autoLinked = false
    const { data: link, error: linkError } = await supabase
      .from('slack_channels')
      .select('client_id, channel_name')
      .eq('channel_id', channel)
      .maybeSingle()
    if (linkError) throw new Error(linkError.message)

    if (link) {
      name = link.channel_name || ''
      const { data } = await supabase
        .from('clients')
        .select('id, name, slug, client_status, access_token')
        .eq('id', link.client_id)
        .maybeSingle()
      client = data || null
    }
    if (!client) {
      name = await channelName()
      const clients = await loadClients()
      const { exact, candidates } = matchChannelToClient(name, clients)
      if (!exact) {
        const hint = candidates.length
          ? ` Did you mean ${candidates.slice(0, 4).map((c) => `*${escapeSlack(c.name)}*`).join(' or ')}?`
          : ''
        await say(
          `I don’t know which client this channel belongs to yet.${hint}\nSomeone on the Interlude team can connect it by replying here: \`@Symphony link &lt;client name&gt;\`. Then tag me again.`
        )
        await finish({ status: 'replied' })
        return { action: 'unlinked', candidates: candidates.map((c) => c.name) }
      }
      const { error } = await supabase.from('slack_channels').upsert({
        channel_id: channel,
        client_id: exact.id,
        channel_name: name || null,
        linked_by: 'auto',
        updated_at: new Date(now).toISOString(),
      })
      if (error) throw new Error(error.message)
      client = exact
      autoLinked = true
    }

    const adminUrl = (requestId) => `${baseUrl}/admin?client=${client.slug || client.id}&request=${requestId}`
    const portalUrl = (requestId) => `${baseUrl}/portal/${client.access_token}?request=${requestId}`
    const linksFor = (requestId) => {
      const links = [`<${adminUrl(requestId)}|Open in Symphony>`]
      // The client's own board link goes only where the client already is.
      if (isClientChannel(name) && client.access_token) links.push(`<${portalUrl(requestId)}|Client view>`)
      return links.join('  ·  ')
    }

    // --- what was asked ------------------------------------------------------
    const typed = splitTypePrefix(raw)
    const explicitLines = typed.rest.split('\n').map((l) => l.trim())
    const explicitFirst = explicitLines.find(Boolean) || ''
    const hasExplicitTitle = !!explicitFirst && !isFiller(explicitFirst)

    // A thread that is already a request is not added twice by a bare tag.
    if (threadTs && !hasExplicitTitle) {
      const { data: earlier } = await supabase
        .from('slack_intake')
        .select('request_id')
        .eq('channel_id', channel)
        .eq('thread_ts', threadTs)
        .eq('status', 'done')
      const earlierId = (earlier || []).map((r) => r.request_id).find(Boolean)
      if (earlierId) {
        const { data: existing } = await supabase
          .from('requests')
          .select('id, title')
          .eq('id', earlierId)
          .maybeSingle()
        if (existing) {
          await say(
            `This thread is already in Symphony as *${escapeSlack(existing.title)}*.  ${linksFor(existing.id)}\nTo add another request from this thread, tag me again with a title, like \`@Symphony Second request title\`.`
          )
          await finish({ status: 'replied', client_id: client.id })
          return { action: 'already', requestId: existing.id }
        }
      }
    }

    let source = null // the message the brief is taken from
    if (threadTs) {
      const replies = await slack.call('conversations.replies', {
        channel,
        ts: threadTs,
        limit: '1',
        inclusive: 'true',
      })
      source = replies.messages?.[0] || null
    }
    const sourceText = source
      ? source.text || source.attachments?.[0]?.text || source.attachments?.[0]?.fallback || ''
      : ''

    // Names for the people involved (the author, the tagger, anyone mentioned).
    const authorId = source ? source.user || null : event.user || null
    const ids = [...new Set([authorId, event.user, ...mentionedUserIds(sourceText), ...mentionedUserIds(raw)])]
      .filter((id) => id && id !== identity.userId)
      .slice(0, 8)
    const userNames = {}
    await Promise.all(
      ids.map(async (id) => {
        const info = await slack.call('users.info', { user: id }).catch(() => null)
        const label = displayName(info?.user)
        if (label) userNames[id] = label
      })
    )
    const authorName = (authorId && userNames[authorId]) || source?.username || ''
    const taggerName = (event.user && userNames[event.user]) || 'the team'

    const explicit = slackToText(typed.rest, { userNames })
    const explicitParts = explicit.split('\n')
    const brief = slackToText(sourceText, { userNames })

    let title = ''
    let body = ''
    if (threadTs) {
      // The first line after the tag is the title (unless it is just "please
      // add this"); anything on later lines is a note for the designers.
      const note = explicitParts.slice(1).join('\n').trim()
      title = hasExplicitTitle ? deriveTitle(explicitParts[0], 120) : ''
      if (!title) title = deriveTitle(brief)
      body = [brief, note ? `Note from ${taggerName}: ${note}` : ''].filter(Boolean).join('\n\n')
    } else {
      title = deriveTitle(explicit)
      // Keep the full text as the brief only when it says more than the title.
      body = explicit.replace(/\s+/g, ' ').trim().length > title.length + 5 ? explicit : ''
    }
    if (!title) title = authorName ? `Request from ${authorName} in Slack` : 'Request from Slack'

    const fileCount = (source?.files || event.files || []).length
    const where = name ? ` in #${name}` : ''
    const addedBy = threadTs && event.user && event.user !== authorId ? `, added by ${taggerName}` : ''
    const footer = [
      `From Slack${authorName ? `: sent by ${authorName}` : ''}${where}${addedBy}.`,
      fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'} attached to the Slack message (see the link).` : '',
    ]
      .filter(Boolean)
      .join(' ')
    const description = [body, footer].filter(Boolean).join('\n\n')

    const permalink = await slack
      .call('chat.getPermalink', { channel, message_ts: threadTs || ts })
      .then((r) => r.permalink || null)
      .catch(() => null)

    const requestType = REQUEST_TYPES.includes(typed.type) ? typed.type : inferRequestType(title, body)

    // --- create it the same way the portal does ------------------------------
    created = await createRequest({
      clientId: client.id,
      title,
      description,
      requestType,
      links: permalink ? [permalink] : [],
    })
    const request = created?.request
    if (!request?.id) throw new Error('The request was not created')

    await finish({ status: 'done', request_id: request.id, client_id: client.id })

    const state = request.status === 'in-progress' ? 'In progress' : 'In the queue'
    const lines = [
      `Added to Symphony for *${escapeSlack(client.name)}*: *${escapeSlack(title)}*`,
      `${state}  ·  ${linksFor(request.id)}`,
    ]
    if (autoLinked) {
      lines.push(
        `_I matched this channel to ${escapeSlack(client.name)} by its name. If that is wrong, reply \`@Symphony link &lt;client name&gt;\`._`
      )
    }
    await say(lines.join('\n'))

    return {
      action: 'created',
      requestId: request.id,
      clientId: client.id,
      title,
      requestType,
      autoLinked,
      notion: created.notionResult || null,
    }
  } catch (err) {
    console.error('Slack intake error:', err)
    if (created?.request?.id) {
      // The request exists; only the follow-up failed. Keep the record straight.
      await finish({ status: 'done', request_id: created.request.id }).then(noop, noop)
      await say('Added to Symphony, but I hit a problem right after. Please check the board.')
      return { action: 'created', requestId: created.request.id, warning: err.message }
    }
    await finish({ status: 'failed' }).then(noop, noop)
    await say('Sorry, I couldn’t add that to Symphony, so nothing was created. Please try again, or add it in the dashboard.')
    return { action: 'failed', error: err.message }
  }
}
