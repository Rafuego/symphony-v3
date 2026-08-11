#!/usr/bin/env node

/**
 * One-shot import: Highrise work priorities from Interlude_Work_Priorities.xlsx
 *
 * Usage:
 *   BASE_URL=https://symphony.interlude.studio node scripts/import-highrise-priorities.js
 *   BASE_URL=http://localhost:3000                 node scripts/import-highrise-priorities.js
 *
 * Optional flags:
 *   DRY_RUN=1      Print what would be sent, don't POST
 *   CLIENT_NAME=…  Override the client name lookup (default: "Highrise")
 *   DELAY_MS=…     Delay between POSTs (default: 800)
 */

const BASE_URL = process.env.BASE_URL || 'https://symphony.interlude.studio'
const CLIENT_NAME = process.env.CLIENT_NAME || 'Highrise'
const DRY_RUN = process.env.DRY_RUN === '1'
const DELAY_MS = Number(process.env.DELAY_MS || 800)

// Ordered High → Medium → Low so queue priority reflects the Excel priority column.
// Each item: { title, category, priority, description, requestedDueDate }
const items = [
  // ─── HIGH ───────────────────────────────────────────────────────────
  {
    title: 'Brand book finish up',
    category: 'Brand Foundation',
    priority: 'High',
    description: 'Foundational — everything else (decks, one-pagers, website) depends on a finished brand system.',
    requestedDueDate: null, // "July ?" — too vague
  },
  {
    title: 'Redo website',
    category: 'Brand Foundation',
    priority: 'High',
    description: 'Primary external touchpoint for investors, customers, and hires.',
    requestedDueDate: '2026-07-22', // "July 22nd"
  },
  {
    title: 'Customer Deck',
    category: 'Decks',
    priority: 'High',
    description: 'Core sales tool for customer conversations.',
    requestedDueDate: null,
  },
  {
    title: 'Investor Deck',
    category: 'Decks',
    priority: 'High',
    description: 'Directly tied to fundraising timeline.',
    requestedDueDate: null,
  },
  {
    title: 'New customers signed — LinkedIn posts',
    category: 'Marketing Posts (LinkedIn)',
    priority: 'High',
    description: 'High-visibility proof of traction for investors and prospects.',
    requestedDueDate: null,
  },
  {
    title: 'New partnerships announced — LinkedIn posts',
    category: 'Marketing Posts (LinkedIn)',
    priority: 'High',
    description: 'High-visibility proof of traction for investors and prospects.',
    requestedDueDate: null,
  },

  // ─── MEDIUM ─────────────────────────────────────────────────────────
  {
    title: 'About Hut 8 / Highrise relationship one-pager',
    category: 'Sales One-Pagers',
    priority: 'Medium',
    description: 'Clarifies parent/sub relationship for investors and partners.',
    requestedDueDate: null,
  },
  {
    title: 'Impala partnership one-pager',
    category: 'Sales One-Pagers',
    priority: 'Medium',
    description: 'Supports active partnership conversations.',
    requestedDueDate: null,
  },
  {
    title: 'Modelyo partnership one-pager',
    category: 'Sales One-Pagers',
    priority: 'Medium',
    description: 'Supports active partnership conversations.',
    requestedDueDate: null,
  },
  {
    title: 'Case study one-pagers per completed project/customer',
    category: 'Sales One-Pagers',
    priority: 'Medium',
    description: 'Proof points for outbound; produce as projects complete.',
    requestedDueDate: null,
  },
  {
    title: 'One-pagers per industry on why Highrise.AI',
    category: 'Sales One-Pagers',
    priority: 'Medium',
    description: 'Useful for vertical-specific sales motions once core assets are done.',
    requestedDueDate: null,
  },
  {
    title: 'Token factory deck — Impala',
    category: 'Decks',
    priority: 'Medium',
    description: 'Deal-specific; prioritize if Impala conversations are active.',
    requestedDueDate: null,
  },
  {
    title: 'Secure cloud deck — Modelyo',
    category: 'Decks',
    priority: 'Medium',
    description: 'Deal-specific; prioritize if Modelyo conversations are active.',
    requestedDueDate: null,
  },
  {
    title: 'Motion graphics for LinkedIn',
    category: 'Marketing & Events',
    priority: 'Medium',
    description: 'Higher engagement than static posts; good recurring use of retainer.',
    requestedDueDate: null,
  },
  {
    title: 'Recruiting collateral (careers page, job posts, hiring graphics)',
    category: 'Recruiting',
    priority: 'Medium',
    description: 'Important if actively hiring; scales with headcount growth.',
    requestedDueDate: null,
  },
  {
    title: 'New hires joining the company — LinkedIn posts',
    category: 'Marketing Posts (LinkedIn)',
    priority: 'Medium',
    description: 'Recurring content; good retainer filler.',
    requestedDueDate: null,
  },
  {
    title: 'New projects released — LinkedIn posts',
    category: 'Marketing Posts (LinkedIn)',
    priority: 'Medium',
    description: 'Recurring content; good retainer filler.',
    requestedDueDate: null,
  },
  {
    title: 'LinkedIn banners and profile pics — cohesive black background for all',
    category: 'Marketing Posts (LinkedIn)',
    priority: 'Medium',
    description: 'Consistent team-wide LinkedIn presence.',
    requestedDueDate: null,
  },

  // ─── LOW ────────────────────────────────────────────────────────────
  {
    title: 'Competitive comparison one-pagers',
    category: 'Sales One-Pagers',
    priority: 'Low',
    description: 'Helpful for late-stage sales but not urgent.',
    requestedDueDate: null,
  },
  {
    title: 'Events posters and flyers',
    category: 'Marketing & Events',
    priority: 'Low',
    description: 'Only needed ahead of specific events.',
    requestedDueDate: null,
  },
  {
    title: 'Newsletter template design',
    category: 'Marketing & Events',
    priority: 'Low',
    description: 'Nice-to-have, recurring but not urgent.',
    requestedDueDate: null,
  },
  {
    title: 'Swag design (stickers, shirts)',
    category: 'Marketing & Events',
    priority: 'Low',
    description: 'Nice-to-have for conferences, not core to growth.',
    requestedDueDate: null,
  },
]

const categoryToRequestType = {
  'Brand Foundation': 'brand',
  'Decks': 'deck',
  'Sales One-Pagers': 'marketing',
  'Marketing & Events': 'marketing',
  'Marketing Posts (LinkedIn)': 'marketing',
  'Recruiting': 'misc',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findClientId(name) {
  const res = await fetch(`${BASE_URL}/api/clients`)
  if (!res.ok) throw new Error(`GET /api/clients failed: ${res.status} ${res.statusText}`)
  const body = await res.json()
  const clients = Array.isArray(body) ? body : body.clients
  if (!Array.isArray(clients)) throw new Error(`Unexpected /api/clients shape: ${JSON.stringify(body).slice(0, 200)}`)
  const match = clients.find((c) => c.name?.toLowerCase() === name.toLowerCase())
  if (!match) {
    const names = clients.map((c) => c.name).join(', ')
    throw new Error(`Client "${name}" not found. Available: ${names}`)
  }
  return match
}

async function createRequest(clientId, item) {
  const body = {
    clientId,
    title: item.title,
    description: `${item.description}\n\n**Priority (from import):** ${item.priority}\n**Category:** ${item.category}`,
    requestType: categoryToRequestType[item.category] || 'misc',
    links: [],
    attachments: [],
    requestedDueDate: item.requestedDueDate,
  }

  if (DRY_RUN) {
    console.log('DRY_RUN would POST:', JSON.stringify(body, null, 2))
    return { dryRun: true }
  }

  const res = await fetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${data.error || res.statusText}`)
  return data
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Client:   ${CLIENT_NAME}`)
  console.log(`Items:    ${items.length}`)
  console.log(`Dry run:  ${DRY_RUN}`)
  console.log()

  const client = await findClientId(CLIENT_NAME)
  console.log(`Found client: ${client.name} (id=${client.id}, plan=${client.plan})`)
  console.log()

  let ok = 0
  let fail = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const label = `[${i + 1}/${items.length}] ${item.priority.padEnd(6)} ${item.title}`
    try {
      await createRequest(client.id, item)
      console.log(`✓ ${label}`)
      ok++
    } catch (err) {
      console.error(`✗ ${label}\n    ${err.message}`)
      fail++
    }
    if (i < items.length - 1) await sleep(DELAY_MS)
  }

  console.log()
  console.log(`Done. ${ok} created, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
