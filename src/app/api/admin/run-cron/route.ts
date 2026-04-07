/* eslint-disable */
import { NextResponse } from 'next/server'

// Proxy endpoint — admin panel calls this instead of exposing cron secret client-side
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    const adminPw = process.env.ADMIN_PASSWORD || 'PatilWaste2024!'
    const decoded = Buffer.from(auth, 'base64').toString()
    if (!decoded.startsWith('admin:') || !decoded.endsWith(`:${adminPw}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const cronSecret = process.env.CRON_SECRET || 'patilwaste_cron_2024'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'
    const res = await fetch(`${baseUrl}/api/cron/generate-invoices`, {
      headers: { Authorization: `Bearer ${cronSecret}` }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
