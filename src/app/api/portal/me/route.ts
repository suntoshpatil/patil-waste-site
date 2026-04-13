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

    // Explicit field list — never return stripe keys, portal_pin, or internal notes to the browser
    const results = await sbServer(
      `customers?id=eq.${customerId}&select=id,first_name,last_name,email,phone,service_address,status,contract_accepted,garage_side_pickup,garage_side_rate,pickup_day,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,billing_start,pickup_frequency,services(id,name))`
    )

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ customer: results[0] })
  } catch {
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 })
  }
}
