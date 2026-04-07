/* eslint-disable */
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { signupConfirmationEmail } from '@/lib/emails'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: Request) {
  try {
    const { customer, planName, startDate } = await req.json()
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') return NextResponse.json({ ok: true, skipped: true })
    await resend.emails.send(signupConfirmationEmail(customer, planName, startDate))
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
