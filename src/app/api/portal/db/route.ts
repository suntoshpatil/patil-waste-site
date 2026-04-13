import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionCustId } from '@/lib/portalSession'

// Portal write proxy — mirrors /api/admin/db but authenticated via session cookie
// instead of admin password. Automatically scopes every write to the logged-in
// customer so a customer can never touch another customer's records.

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Tables where the PK/ownership column is `id` rather than `customer_id`
const SELF_TABLES = new Set(['customers'])

// Tables the portal is allowed to write to
const ALLOWED_TABLES = new Set([
  'customers',
  'invoices',
  'skip_requests',
  'pickup_addons',
  'service_requests',
  'payment_logs',
])

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const customerId = getSessionCustId(cookieStore)
  if (!customerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { table, method, query: clientQuery, body, prefer } = await req.json()

    if (!table || typeof table !== 'string' || !/^[a-z_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }

    let finalQuery: string = clientQuery || ''
    let safeBody = body

    if (method === 'POST') {
      // No new rows allowed on the customers table via portal
      if (SELF_TABLES.has(table)) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
      }
      // Force customer_id to session value — never trust client-supplied value
      safeBody = { ...(body || {}), customer_id: customerId }
    } else {
      // PATCH / DELETE — append ownership filter so client can't target other rows
      const ownerFilter = SELF_TABLES.has(table)
        ? `id=eq.${customerId}`
        : `customer_id=eq.${customerId}`
      finalQuery = finalQuery ? `${finalQuery}&${ownerFilter}` : ownerFilter
    }

    const url = `${SUPABASE_URL}/rest/v1/${table}${finalQuery ? `?${finalQuery}` : ''}`
    const res = await fetch(url, {
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: prefer || 'return=representation',
      },
      body: safeBody ? JSON.stringify(safeBody) : undefined,
    })

    const txt = await res.text()
    const data = txt ? JSON.parse(txt) : null
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || `Supabase error ${res.status}` }, { status: res.status })
    }
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
  }
}
