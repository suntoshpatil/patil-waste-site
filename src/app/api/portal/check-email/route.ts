import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/billing'

// Returns whether the customer exists and has a PIN set.
// Never returns actual customer data — just signals which login screen to show.
export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()
    const results = await sbServer(`customers?email=eq.${encodeURIComponent(normalized)}&select=id,portal_pin,first_name`)

    if (!results || results.length === 0) {
      // Return same shape as "no pin" to avoid user enumeration timing differences
      return NextResponse.json({ exists: false })
    }

    const cust = results[0]
    return NextResponse.json({ exists: true, hasPIN: !!cust.portal_pin, firstName: cust.first_name || '' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
