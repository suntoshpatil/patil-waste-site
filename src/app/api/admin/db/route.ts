import { NextResponse } from 'next/server'

// Generic authenticated proxy for admin write operations.
// The admin client sends mutations here instead of hitting Supabase directly
// with the anon key. This route verifies the admin token then forwards the
// request to Supabase using the service_role key (which bypasses RLS).
//
// Only POST, PATCH, and DELETE are proxied — GET reads still go directly
// to Supabase via the anon key since SELECT policies are in place.

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function verifyAdmin(req: Request): boolean {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  const adminPw = process.env.ADMIN_PASSWORD
  if (!adminPw || !auth) return false
  try {
    const decoded = Buffer.from(auth, 'base64').toString()
    return decoded.startsWith('admin:') && decoded.endsWith(`:${adminPw}`)
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table') || ''
    const query = searchParams.get('query') || ''

    if (!table || !/^[a-z_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    })

    const txt = await res.text()
    const data = txt ? JSON.parse(txt) : null
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || `Supabase error ${res.status}` }, { status: res.status })
    }
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    console.error('[admin/db GET] error:', e)
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { table, method, query, body, prefer } = await req.json()

    if (!table || typeof table !== 'string' || !/^[a-z_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }

    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`

    const res = await fetch(url, {
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: prefer || 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const txt = await res.text()
    const data = txt ? JSON.parse(txt) : null
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || `Supabase error ${res.status}` }, { status: res.status })
    }
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    console.error('[admin/db] error:', e)
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
  }
}
