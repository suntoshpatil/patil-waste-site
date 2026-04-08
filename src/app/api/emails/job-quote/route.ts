import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { jobQuoteEmail, jobConfirmedEmail } from '@/lib/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { jobId, type } = body // type: 'quote' | 'confirmed'
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Fetch job from DB — never trust content from the request body
    const [job] = await sbServer(`job_requests?id=eq.${jobId}&select=*`)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (!job.email) return NextResponse.json({ error: 'Job has no email address' }, { status: 400 })
    if (!job.quote_price || !job.pickup_date || !job.pickup_time) {
      return NextResponse.json({ error: 'Job is missing quote price, date, or time' }, { status: 400 })
    }

    const pickupDate = new Date(job.pickup_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    const emailData = type === 'confirmed'
      ? jobConfirmedEmail(job, Number(job.quote_price), pickupDate, job.pickup_time)
      : jobQuoteEmail(job, Number(job.quote_price), pickupDate, job.pickup_time)

    await resend.emails.send(emailData)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[emails/job-quote] error:', e)
    return NextResponse.json({ error: 'Failed to send job email' }, { status: 500 })
  }
}
