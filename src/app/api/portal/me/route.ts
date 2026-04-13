import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sbServer } from '@/lib/billing'
import { getSessionCustId } from '@/lib/portalSession'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const customerId = getSessionCustId(cookieStore)
    if (!customerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const results = await sbServer(
      `customers?id=eq.${customerId}&select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,billing_start,pickup_frequency,services(id,name))`
    )

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const customer = results[0]
    // Strip the PIN from what we send to the browser
    const { portal_pin: _pin, ...safe } = customer
    return NextResponse.json({ customer: safe })
  } catch {
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 })
  }
}
