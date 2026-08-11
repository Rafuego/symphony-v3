import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const REQUIRED_DB_PROPS = ['Task name', 'Status', 'Priority', 'Hours', 'Client', 'Timeline']

// POST /api/notion/test - Validate Notion database, project page, and template page IDs
export async function POST(request) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'NOTION_API_KEY not configured on server',
    })
  }

  const { databaseId, projectId, templateId } = await request.json()
  const notion = new Client({ auth: apiKey })

  const [database, project, template] = await Promise.all([
    databaseId ? testDatabase(notion, databaseId) : null,
    projectId ? testPage(notion, projectId) : null,
    templateId ? testPage(notion, templateId) : null,
  ])

  return NextResponse.json({ ok: true, database, project, template })
}

async function testDatabase(notion, id) {
  try {
    const db = await notion.databases.retrieve({ database_id: id })
    const existingProps = Object.keys(db.properties)
    const missing = REQUIRED_DB_PROPS.filter((p) => !existingProps.includes(p))
    return {
      valid: missing.length === 0,
      name: db.title?.[0]?.plain_text || 'Untitled',
      missingProperties: missing,
      hint: missing.length > 0
        ? `Missing required columns: ${missing.join(', ')}. Add these to the Notion database.`
        : null,
    }
  } catch (err) {
    return { valid: false, error: humanizeError(err) }
  }
}

async function testPage(notion, id) {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    const titleProp = Object.values(page.properties || {}).find((p) => p.type === 'title')
    const name = titleProp?.title?.[0]?.plain_text || 'Untitled'
    return { valid: true, name }
  } catch (err) {
    return { valid: false, error: humanizeError(err) }
  }
}

function humanizeError(err) {
  const code = err?.code || ''
  if (code === 'object_not_found') return 'Not found — check the ID or make sure the Notion integration has been shared with this page/database.'
  if (code === 'unauthorized') return 'Notion API key is invalid or does not have access.'
  if (code === 'validation_error') return 'ID format is invalid.'
  return err?.message || String(err)
}
