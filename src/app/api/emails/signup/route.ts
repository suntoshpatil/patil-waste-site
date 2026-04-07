/* eslint-disable */
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { signupConfirmationEmail } from '@/lib/emails'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: Request) {
  try {
    const { email, planName, startDate } = await req.json()
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') return NextResponse.json({ ok: true, skipped: true })

    // Fetch customer from DB — ensures we only send to verified signups and use DB data
    const [customer] = await sbServer(`customers?email=eq.${encodeURIComponent(email)}&select=first_name,last_name,email&limit=1`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    await resend.emails.send(signupConfirmationEmail(customer, planName || 'Service Plan', startDate || ''))
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
