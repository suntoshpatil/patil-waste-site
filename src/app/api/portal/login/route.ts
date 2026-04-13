import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/billing'
import { makeSessionToken, sessionCookieHeader } from '@/lib/portalSession'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/portalRateLimit'

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json().catch(() => ({}))

    if (!email || typeof email !== 'string' || !pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Email and PIN required' }, { status: 400 })
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    // Check rate limit before hitting the DB
    const rl = checkRateLimit(normalized)
    if (!rl.allowed) {
      const mins = Math.ceil((rl.remainingMs || 0) / 60000)
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    }

    const results = await sbServer(`customers?email=eq.${encodeURIComponent(normalized)}&select=id,portal_pin`)
    if (!results || results.length === 0) {
      // Record attempt even for unknown emails to prevent enumeration via timing
      recordFailedAttempt(normalized)
      return NextResponse.json({ error: 'Incorrect email or PIN.' }, { status: 401 })
    }

    const cust = results[0]

    if (!cust.portal_pin || cust.portal_pin !== pin) {
      const res = recordFailedAttempt(normalized)
      if (res.locked) {
        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked for 15 minutes.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `Incorrect PIN. ${res.remaining} attempt${res.remaining !== 1 ? 's' : ''} remaining.` },
        { status: 401 }
      )
    }

    // Success — clear attempts, issue session cookie
    clearAttempts(normalized)
    const token = makeSessionToken(cust.id)

    return NextResponse.json(
      { ok: true },
      { headers: { 'Set-Cookie': sessionCookieHeader(token) } }
    )
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
