/* eslint-disable */
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { contractAcceptedEmail } from '@/lib/emails'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: Request) {
  try {
    const { customerId, planName, firstPickup, invoiceTotal } = await req.json()
    if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') return NextResponse.json({ ok: true, skipped: true })

    // Fetch customer from DB — ensures we use DB data, not caller-supplied content
    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=first_name,last_name,email`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    await resend.emails.send(contractAcceptedEmail(customer, planName || 'Service Plan', firstPickup || 'your first scheduled day', invoiceTotal || 0))
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
