import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sbServer } from '@/lib/billing'
import { getSessionCustId } from '@/lib/portalSession'

// Returns all portal dashboard data for the authenticated customer in one request.
// Replaces the 7 individual Supabase reads that previously used the anon key.
export async function GET() {
  try {
    const cookieStore = await cookies()
    const customerId = getSessionCustId(cookieStore)
    if (!customerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const [bins, skips, notices, services, catalog, addons, invoices] = await Promise.all([
      sbServer(`bins?customer_id=eq.${customerId}&select=*`).catch(() => []),
      sbServer(`skip_requests?customer_id=eq.${customerId}&select=*&order=created_at.desc`).catch(() => []),
      sbServer(`schedule_notices?select=*&order=notice_date.desc&limit=5`).catch(() => []),
      sbServer(`services?select=id,name,base_price_monthly&is_active=eq.true&type=in.(recurring,addon)&order=base_price_monthly.asc`).catch(() => []),
      sbServer(`bulky_item_catalog?select=*&is_active=eq.true&order=is_fixed_price.desc,name.asc`).catch(() => []),
      sbServer(`pickup_addons?customer_id=eq.${customerId}&select=*,bulky_item_catalog(name)&order=created_at.desc&limit=20`).catch(() => []),
      sbServer(`invoices?customer_id=eq.${customerId}&select=*&order=created_at.desc&limit=12`).catch(() => []),
    ])

    return NextResponse.json({ bins, skips, notices, services, catalog, addons, invoices })
  } catch {
    return NextResponse.json({ error: 'Failed to load portal data' }, { status: 500 })
  }
}
