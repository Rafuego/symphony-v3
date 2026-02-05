import { NextResponse } from 'next/server'

// Admin password - hardcoded for now
const ADMIN_PASSWORD = '199705'

export async function POST(request) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Verify password
    const isValid = password === ADMIN_PASSWORD

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('Error verifying admin password:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
