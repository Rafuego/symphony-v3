// Notion API integration for Symphony
// Creates and updates pages in per-client Notion databases
// Mapped to existing Notion database schema used by Interlude Studio
//
// Actual Notion "Tasks" database properties:
//   Task name (title), Status (status), Client (relation — skipped),
//   Priority (select: High/Medium/Low), Hours (rich_text),
//   Initial Start Date (date), Initial Due Date (date),
//   Current Timeline (formula — read-only), Completed on (date),
//   Phase (select), Assignee (person), Reviewer (person)

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

/**
 * Create a Notion page in the client's database when a request is submitted.
 * Title format: "ClientName: Request Title" (matches existing convention)
 */
export async function createNotionPage({
  notionDatabaseId,
  notionProjectId,
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

    // NOTE: 'Current Timeline' is a formula (read-only), so we don't set it.

    // Set dates based on whether work has started
    const effectiveStart = startedAt || createdAt || new Date().toISOString()

    properties['Initial Start Date'] = {
      date: { start: effectiveStart }
    }

    const dueDate = calculateDueDate(effectiveStart)
    properties['Initial Due Date'] = {
      date: { start: dueDate }
    }

    // Completed on (only if already completed, unlikely on creation)
    if (status === 'completed') {
      properties['Completed on'] = {
        date: { start: new Date().toISOString() }
      }
    }

    // Build page body content (description, links, attachments, Symphony link)
    const children = []

    // Symphony link at the top for quick reference back
    if (symphonyLink) {
      children.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🔗' },
          rich_text: [{
            text: { content: 'View in Symphony → ', link: { url: symphonyLink } }
          }]
        }
      })
    }

    if (description) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Description' } }] }
      })
      const descChunks = chunkText(description, 2000)
      for (const chunk of descChunks) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: chunk } }] }
        })
      }
    }

    // Request type as context
    if (requestType && requestType !== 'misc') {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: 'Request Type: ' }, annotations: { bold: true } },
            { text: { content: requestType.charAt(0).toUpperCase() + requestType.slice(1) } }
          ]
        }
      })
    }

    if (links && links.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Reference Links' } }] }
      })
      for (const link of links) {
        if (!link) continue
        children.push({
          object: 'block',
          type: 'bookmark',
          bookmark: { url: link }
        })
      }
    }

    if (attachments && attachments.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Attachments' } }] }
      })
      for (const att of attachments) {
        const label = att.name || att.url || 'File'
        const url = att.url
        if (!url) continue
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              text: { content: label, link: { url } }
            }]
          }
        })
      }
    }

    const response = await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties,
      children: children.length > 0 ? children : undefined
    })

    console.log(`Notion page created: ${response.id}`)
    return { success: true, pageId: response.id }
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
  completedAt
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
    if (startedAt !== undefined) {
      properties['Initial Start Date'] = startedAt
        ? { date: { start: startedAt } }
        : { date: null }

      // Recalculate due date when start date changes
      if (startedAt) {
        const dueDate = calculateDueDate(startedAt)
        properties['Initial Due Date'] = { date: { start: dueDate } }
        // NOTE: Current Timeline is a formula — read-only, can't update
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
