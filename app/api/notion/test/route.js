import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

// POST /api/notion/test - Validate a Notion database connection
export async function POST(request) {
  try {
    const apiKey = process.env.NOTION_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        valid: false,
        error: 'NOTION_API_KEY not configured on server'
      })
    }

    const { databaseId } = await request.json()
    if (!databaseId) {
      return NextResponse.json({ valid: false, error: 'No database ID provided' })
    }

    const notion = new Client({ auth: apiKey })
    const db = await notion.databases.retrieve({ database_id: databaseId })

    // Check that key properties exist (matching actual Notion database schema)
    // Note: 'Current Timeline' is a formula (read-only), 'Client' is a relation
    const requiredProps = [
      'Status', 'Priority', 'Hours',
      'Initial Start Date', 'Initial Due Date'
    ]
    const existingProps = Object.keys(db.properties)
    const missing = requiredProps.filter(p => !existingProps.includes(p))

    return NextResponse.json({
      valid: missing.length === 0,
      databaseTitle: db.title?.[0]?.plain_text || 'Untitled',
      missingProperties: missing,
      existingProperties: existingProps
    })
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error.message
    })
  }
}
