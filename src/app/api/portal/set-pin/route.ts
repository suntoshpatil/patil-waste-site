import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/billing'
import { makeSessionToken, sessionCookieHeader } from '@/lib/portalSession'

// First-time PIN setup — only works when the customer has NO pin yet.
export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json().catch(() => ({}))

    if (!email || typeof email !== 'string' || !pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Email and PIN required' }, { status: 400 })
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()
    const results = await sbServer(`customers?email=eq.${encodeURIComponent(normalized)}&select=id,portal_pin`)

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    const cust = results[0]

    // Guard: only allow this route if no PIN is set yet
    if (cust.portal_pin) {
      return NextResponse.json({ error: 'PIN already set. Use login instead.' }, { status: 403 })
    }

    // Set the PIN
    await sbServer(`customers?id=eq.${cust.id}`, {
      method: 'PATCH',
      body: { portal_pin: pin },
      prefer: 'return=minimal',
    })

    // Issue session cookie
    const token = makeSessionToken(cust.id)
    return NextResponse.json(
      { ok: true },
      { headers: { 'Set-Cookie': sessionCookieHeader(token) } }
    )
  } catch {
    return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 })
  }
}
