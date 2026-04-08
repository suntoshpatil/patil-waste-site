import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { jobReminderEmail } from '@/lib/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Runs daily at 8am via Vercel cron.
// Finds all confirmed job requests with pickup_date = tomorrow and sends
// a reminder email to each customer.
export async function GET(req: Request) {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    // Calculate tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const jobs = await sbServer(
      `job_requests?status=eq.confirmed&pickup_date=eq.${tomorrowStr}&select=*`
    )

    let sent = 0
    let failed = 0
    let skipped = 0
    const errors: string[] = []

    for (const job of jobs || []) {
      if (!job.email) { skipped++; continue }
      try {
        const pickupDate = new Date(job.pickup_date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
        await resend.emails.send(jobReminderEmail(job, pickupDate, job.pickup_time || ''))
        sent++
      } catch (e: any) {
        errors.push(`${job.email}: ${e.message}`)
        failed++
      }
    }

    return NextResponse.json({ ok: true, sent, failed, errors })
  } catch (e: any) {
    console.error('[cron/job-reminders] error:', e)
    return NextResponse.json({ error: 'Job reminders cron failed' }, { status: 500 })
  }
}
