import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/billing'
import { makeSessionToken, sessionCookieHeader } from '@/lib/portalSession'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/portalRateLimit'

// PIN reset via phone verification.
// Verifies the last 4 digits of the customer's phone number, then sets a new PIN.
export async function POST(req: Request) {
  try {
    const { email, phoneLast4, newPin } = await req.json().catch(() => ({}))

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    if (!phoneLast4 || !/^\d{4}$/.test(phoneLast4)) {
      return NextResponse.json({ error: 'Last 4 digits of phone required' }, { status: 400 })
    }
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'New PIN must be exactly 4 digits' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    // Rate limit resets too
    const rl = checkRateLimit(`reset:${normalized}`)
    if (!rl.allowed) {
      const mins = Math.ceil((rl.remainingMs || 0) / 60000)
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    }

    const results = await sbServer(`customers?email=eq.${encodeURIComponent(normalized)}&select=id,phone`)
    if (!results || results.length === 0) {
      recordFailedAttempt(`reset:${normalized}`)
      return NextResponse.json({ error: 'Phone number does not match our records.' }, { status: 401 })
    }

    const cust = results[0]
    const storedLast4 = (cust.phone || '').replace(/\D/g, '').slice(-4)

    if (storedLast4.length < 4 || storedLast4 !== phoneLast4) {
      const res = recordFailedAttempt(`reset:${normalized}`)
      if (res.locked) {
        return NextResponse.json(
          { error: 'Too many attempts. Locked for 15 minutes. Contact us at (802) 416-9484.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `Phone number does not match. ${res.remaining} attempt${res.remaining !== 1 ? 's' : ''} remaining.` },
        { status: 401 }
      )
    }

    // Phone verified — update the PIN
    clearAttempts(`reset:${normalized}`)
    await sbServer(`customers?id=eq.${cust.id}`, {
      method: 'PATCH',
      body: { portal_pin: newPin },
      prefer: 'return=minimal',
    })

    // Issue session cookie
    const token = makeSessionToken(cust.id)
    return NextResponse.json(
      { ok: true },
      { headers: { 'Set-Cookie': sessionCookieHeader(token) } }
    )
  } catch {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
