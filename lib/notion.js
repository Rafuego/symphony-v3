// Notion API integration for Symphony
// Creates and updates pages in per-client Notion databases
// Mapped to existing Notion database schema used by Interlude Studio
//
// Actual Notion "Tasks" database properties:
//   Task name (title), Status (status), Client (relation),
//   Priority (select: High/Medium/Low), Hours (rich_text),
//   Timeline (date — supports start+end range), Due Date (formula — read-only),
//   Completed on (date), Project Type (select),
//   Assignee (person), Reviewer (person),
//   Task Timelines (relation), Sub-tasks/Parent-task (relation),
//   Is blocking/Blocked by (relation)

import { Client } from '@notionhq/client'

// Global Tasks Database ID — shared across all clients
export const DEFAULT_NOTION_DATABASE_ID = '24e866d074498154a2a2ca1cd1768b41'

// Status mapping: Symphony status → Notion Status property values
// Actual Notion status options: Not Started, Blocked, Client Update Needed,
// Next Up, In Progress, Internal Review, In Development, Client Review,
// Completed, Archived
const STATUS_MAP = {
  'in-queue': 'Not Started',
  'in-progress': 'In Progress',
  'in-review': 'Client Review',
  'completed': 'Completed'
}

// Map numeric queue priority to Notion select values
function mapPriority(priority) {
  if (priority <= 1) return 'High'
  if (priority <= 3) return 'Medium'
  return 'Low'
}

// Calculate a due date ~2 business days from start
function calculateDueDate(startDate) {
  const start = new Date(startDate)
  let daysAdded = 0
  const due = new Date(start)
  while (daysAdded < 2) {
    due.setDate(due.getDate() + 1)
    const day = due.getDay()
    if (day !== 0 && day !== 6) daysAdded++ // skip weekends
  }
  return due.toISOString()
}

function getNotionClient() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return null
  return new Client({ auth: apiKey })
}

// Block types that cannot be copied to a new page
const SKIP_BLOCK_TYPES = new Set([
  'child_page', 'child_database', 'unsupported', 'synced_block',
  'link_preview', 'breadcrumb', 'table_of_contents'
])

// Read-only fields to strip from blocks before reuse
const STRIP_FIELDS = new Set([
  'id', 'created_time', 'last_edited_time', 'created_by',
  'last_edited_by', 'has_children', 'archived', 'in_trash', 'parent'
])

/**
 * Recursively remove null/undefined values from an object.
 * The Notion API rejects fields explicitly set to null (e.g., icon: null).
 */
function stripNulls(obj) {
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(obj)) {
      if (val !== null && val !== undefined) {
        result[key] = stripNulls(val)
      }
    }
    return result
  }
  return obj
}

/**
 * Clean a Notion block for reuse in pages.create.
 * Returns null for non-copyable block types.
 */
function cleanBlock(block) {
  if (SKIP_BLOCK_TYPES.has(block.type)) return null

  const content = block[block.type] ? stripNulls(block[block.type]) : {}
  // Attach cleaned children if present
  if (block._children && block._children.length > 0) {
    content.children = block._children
  }
  return { object: 'block', type: block.type, [block.type]: content }
}

/**
 * Read the flat text of a block (concatenating its rich_text runs).
 * Handles the block types we care about for placeholder substitution.
 */
function readBlockText(block) {
  if (!block || !block.type) return ''
  const content = block[block.type]
  if (!content) return ''
  const rt = content.rich_text
  if (!Array.isArray(rt)) return ''
  return rt.map((r) => r?.plain_text ?? r?.text?.content ?? '').join('')
}

/**
 * Build a Notion callout block that links to Symphony. Used to REPLACE the
 * "🎼 Link to Symphony here." placeholder in per-client templates.
 */
function buildSymphonyCallout(symphonyLink) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '🎼' },
      rich_text: [{ text: { content: 'View in Symphony → ', link: { url: symphonyLink } } }],
    },
  }
}

/**
 * Build description paragraphs for injection under a "Description:" placeholder.
 * Chunks long text to respect Notion's 2000-char rich_text limit.
 */
function buildDescriptionParagraphs(description) {
  return chunkText(description, 2000).map((chunk) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: chunk } }] },
  }))
}

/**
 * Walk template blocks and substitute placeholders:
 *   "Link to Symphony here"  → real Symphony-link callout
 *   "Description:"           → keep the line + append the actual description text below
 *
 * Returns { blocks, filled: { symphonyLink, description } } so the caller
 * knows which top-of-page duplicates to skip.
 */
function enhanceTemplateBlocks(blocks, { symphonyLink, description }) {
  const filled = { symphonyLink: false, description: false }
  const out = []
  for (const block of blocks) {
    const text = readBlockText(block).toLowerCase()

    // Replace "🎼 Link to Symphony here." placeholder callout with the real link
    if (symphonyLink && !filled.symphonyLink && text.includes('link to symphony')) {
      out.push(buildSymphonyCallout(symphonyLink))
      filled.symphonyLink = true
      continue
    }

    // Inject description right after the "Description:" line in the Summary section
    if (description && !filled.description && /^description\s*:/i.test(text.trim())) {
      out.push(block)
      out.push(...buildDescriptionParagraphs(description))
      filled.description = true
      continue
    }

    out.push(block)
  }
  return { blocks: out, filled }
}

/**
 * Fetch all blocks from a Notion page (template), recursively including children.
 * Returns cleaned blocks ready for pages.create.
 */
async function fetchTemplateBlocks(notion, pageId) {
  const blocks = []
  let cursor = undefined

  // Paginate through all top-level blocks
  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    })

    for (const block of response.results) {
      // Recursively fetch children if the block has them
      if (block.has_children) {
        const childBlocks = await fetchTemplateBlocks(notion, block.id)
        block._children = childBlocks
      }
      const cleaned = cleanBlock(block)
      if (cleaned) blocks.push(cleaned)
    }

    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return blocks
}

/**
 * Create a Notion page in the client's database when a request is submitted.
 * Title format: "ClientName: Request Title" (matches existing convention)
 */
export async function createNotionPage({
  notionDatabaseId,
  notionProjectId,
  notionTemplateId,
  title,
  status,
  requestType,
  clientName,
  symphonyLink,
  description,
  priority,
  links,
  attachments,
  createdAt,
  startedAt,
  requestedDueDate,
  extensionHours
}) {
  const notion = getNotionClient()
  if (!notion || !notionDatabaseId) {
    console.log('Notion not configured, skipping page creation')
    return { success: false, reason: 'not_configured' }
  }

  try {
    // Format title as "ClientName: Request Title"
    const pageTitle = clientName ? `${clientName}: ${title || 'Untitled Request'}` : (title || 'Untitled Request')

    const properties = {
      // Page title — "ClientName: Request Title"
      'Task name': {
        title: [{ text: { content: pageTitle } }]
      },
      // Notion Status property (status type, not select)
      'Status': {
        status: { name: STATUS_MAP[status] || 'Not Started' }
      },
      // Priority select (High / Medium / Low)
      'Priority': {
        select: { name: mapPriority(priority || 1) }
      },
      // Hours is rich_text in the actual schema
      'Hours': {
        rich_text: [{ text: { content: String(extensionHours || 0) } }]
      }
    }

    // 'Client' is a relation to the Projects database.
    // If the admin has mapped this Symphony client to a Notion project page, link it.
    if (notionProjectId) {
      properties['Client'] = {
        relation: [{ id: notionProjectId }]
      }
    }

    // NOTE: 'Due Date' is a formula (read-only), so we don't set it.
    // 'Timeline' is a date property that supports start + end range.

    // Set Timeline date range based on whether work has started
    // If client requested a specific due date, use that; otherwise calculate default
    const effectiveStart = startedAt || createdAt || new Date().toISOString()
    const dueDate = requestedDueDate || calculateDueDate(effectiveStart)

    properties['Timeline'] = {
      date: { start: effectiveStart, end: dueDate }
    }

    // Completed on (only if already completed, unlikely on creation)
    if (status === 'completed') {
      properties['Completed on'] = {
        date: { start: new Date().toISOString() }
      }
    }

    // Fetch + enhance template blocks first, so we know which placeholders it
    // filled (Symphony link, description). Anything the template covers, we
    // skip in the top-of-page blocks below to avoid duplicates.
    let templateError = null
    let enhancedTemplateBlocks = []
    let templateFilled = { symphonyLink: false, description: false }
    if (notionTemplateId) {
      try {
        console.log('Fetching template blocks for:', notionTemplateId)
        const rawTemplateBlocks = await fetchTemplateBlocks(notion, notionTemplateId)
        console.log('Template blocks fetched:', rawTemplateBlocks.length)
        const enhanced = enhanceTemplateBlocks(rawTemplateBlocks, { symphonyLink, description })
        enhancedTemplateBlocks = enhanced.blocks
        templateFilled = enhanced.filled
      } catch (templateErr) {
        console.error('Failed to fetch template blocks:', templateErr.message)
        templateError = templateErr.message
      }
    }

    // Build the Symphony-added top-of-page blocks. Skip any block the template
    // already covers (link callout, description) so the two don't duplicate.
    const topBlocks = []

    if (symphonyLink && !templateFilled.symphonyLink) {
      topBlocks.push(buildSymphonyCallout(symphonyLink))
    }

    if (description && !templateFilled.description) {
      topBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Description' } }] },
      })
      topBlocks.push(...buildDescriptionParagraphs(description))
    }

    if (requestType && requestType !== 'misc') {
      topBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: 'Request Type: ' }, annotations: { bold: true } },
            { text: { content: requestType.charAt(0).toUpperCase() + requestType.slice(1) } },
          ],
        },
      })
    }

    if (links && links.length > 0) {
      topBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Reference Links' } }] },
      })
      for (const link of links) {
        if (!link) continue
        topBlocks.push({ object: 'block', type: 'bookmark', bookmark: { url: link } })
      }
    }

    if (attachments && attachments.length > 0) {
      topBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Attachments' } }] },
      })
      for (const att of attachments) {
        const label = att.name || att.url || 'File'
        const url = att.url
        if (!url) continue
        topBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: label, link: { url } } }] },
        })
      }
    }

    // Compose final children: top blocks (only what the template didn't cover),
    // then a divider, then the enhanced template. If nothing needs a top block,
    // skip the divider too.
    const children = [...topBlocks]
    if (enhancedTemplateBlocks.length > 0) {
      if (topBlocks.length > 0) {
        children.push({ object: 'block', type: 'divider', divider: {} })
      }
      children.push(...enhancedTemplateBlocks)
    }

    // Notion pages.create supports max 100 children
    const firstBatch = children.slice(0, 100)
    const overflow = children.slice(100)

    const response = await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties,
      children: firstBatch.length > 0 ? firstBatch : undefined
    })

    // Append overflow blocks in 100-block chunks
    if (overflow.length > 0) {
      for (let i = 0; i < overflow.length; i += 100) {
        const chunk = overflow.slice(i, i + 100)
        await notion.blocks.children.append({
          block_id: response.id,
          children: chunk
        })
      }
    }

    console.log(`Notion page created: ${response.id}`)
    return { success: true, pageId: response.id, templateError }
  } catch (error) {
    console.error('Notion page creation error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Update a Notion page's properties when a request changes in Symphony.
 * Only sends fields that are explicitly provided (not undefined).
 */
export async function updateNotionPage({
  notionPageId,
  status,
  priority,
  title,
  clientName,
  extensionHours,
  startedAt,
  completedAt,
  requestedDueDate
}) {
  const notion = getNotionClient()
  if (!notion || !notionPageId) {
    console.log('Notion not configured or no page ID, skipping update')
    return { success: false, reason: 'not_configured' }
  }

  try {
    const properties = {}

    if (status !== undefined) {
      properties['Status'] = { status: { name: STATUS_MAP[status] || status } }
    }
    if (title !== undefined) {
      const pageTitle = clientName ? `${clientName}: ${title}` : title
      properties['Task name'] = { title: [{ text: { content: pageTitle } }] }
    }
    if (priority !== undefined) {
      properties['Priority'] = { select: { name: mapPriority(priority) } }
    }
    if (extensionHours !== undefined) {
      properties['Hours'] = {
        rich_text: [{ text: { content: String(extensionHours) } }]
      }
    }
    // Timeline: if either startedAt or requestedDueDate changes, update the range
    if (startedAt !== undefined || requestedDueDate !== undefined) {
      if (startedAt || requestedDueDate) {
        const effectiveStart = startedAt || new Date().toISOString()
        const dueDate = requestedDueDate || calculateDueDate(effectiveStart)
        properties['Timeline'] = { date: { start: effectiveStart, end: dueDate } }
      } else {
        properties['Timeline'] = { date: null }
      }
    }
    if (completedAt !== undefined) {
      properties['Completed on'] = completedAt
        ? { date: { start: completedAt } }
        : { date: null }
    }

    if (Object.keys(properties).length === 0) {
      return { success: true, reason: 'no_changes' }
    }

    await notion.pages.update({
      page_id: notionPageId,
      properties
    })

    console.log(`Notion page updated: ${notionPageId}`)
    return { success: true }
  } catch (error) {
    console.error('Notion page update error:', error.message)
    return { success: false, error: error.message }
  }
}

// Split text into chunks respecting Notion's 2000 char limit
function chunkText(text, maxLen) {
  const chunks = []
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.substring(i, i + maxLen))
  }
  return chunks
}
