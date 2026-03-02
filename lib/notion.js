// Notion API integration for Symphony
// Creates and updates pages in per-client Notion databases
// Mapped to existing Notion database schema used by Interlude Studio

import { Client } from '@notionhq/client'

// Status mapping: Symphony status → Notion Status property values
const STATUS_MAP = {
  'in-queue': 'Not Started',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'completed': 'Done'
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
      'Title': {
        title: [{ text: { content: pageTitle } }]
      },
      // Notion Status property (Not Started / In Progress / In Review / Done)
      'Status': {
        status: { name: STATUS_MAP[status] || 'Not Started' }
      },
      // Client select property
      'Client': {
        select: { name: clientName || 'Unknown' }
      },
      // Priority select (High / Medium / Low)
      'Priority': {
        select: { name: mapPriority(priority || 1) }
      },
      // Extension hours
      'Hours': {
        number: extensionHours || 0
      }
    }

    // Set dates based on whether work has started
    const effectiveStart = startedAt || createdAt || new Date().toISOString()

    properties['Initial Start Date'] = {
      date: { start: effectiveStart }
    }

    const dueDate = calculateDueDate(effectiveStart)
    properties['Initial Due Date'] = {
      date: { start: dueDate }
    }

    // Current Timeline as date range (start → due)
    properties['Current Timeline'] = {
      date: { start: effectiveStart, end: dueDate }
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
      properties['Title'] = { title: [{ text: { content: pageTitle } }] }
    }
    if (priority !== undefined) {
      properties['Priority'] = { select: { name: mapPriority(priority) } }
    }
    if (extensionHours !== undefined) {
      properties['Hours'] = { number: extensionHours }
    }
    if (startedAt !== undefined) {
      properties['Initial Start Date'] = startedAt
        ? { date: { start: startedAt } }
        : { date: null }

      // Recalculate timeline when start date changes
      if (startedAt) {
        const dueDate = calculateDueDate(startedAt)
        properties['Initial Due Date'] = { date: { start: dueDate } }
        properties['Current Timeline'] = { date: { start: startedAt, end: dueDate } }
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
