/* eslint-disable */
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { signupConfirmationEmail } from '@/lib/emails'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body?.email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') return NextResponse.json({ ok: true, skipped: true })

    // Fetch customer + subscription from DB. Plan name and start date are
    // derived server-side — never trust values from the request body, which
    // get interpolated into email HTML.
    const [customer] = await sbServer(`customers?email=eq.${encodeURIComponent(email)}&select=first_name,last_name,email,subscriptions(billing_start,status,services(name))&limit=1`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const sub = customer.subscriptions?.find((s: any) => s.status === 'active') || customer.subscriptions?.[0]
    const planName = sub?.services?.name || 'Service Plan'
    const startDate = sub?.billing_start || ''

    await resend.emails.send(signupConfirmationEmail(customer, planName, startDate))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[emails/signup] error:', e)
    return NextResponse.json({ error: 'Failed to send signup email' }, { status: 500 })
  }
}
