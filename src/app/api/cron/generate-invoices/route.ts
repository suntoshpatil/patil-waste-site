import { NextResponse } from 'next/server'
import { sbServer, calcInvoiceTotal, getBillingPeriod } from '@/lib/billing'
import { invoiceEmail } from '@/lib/emails'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  // Verify this is called by Vercel cron (or manually by admin)
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { periodStart, periodEnd, dueDate } = getBillingPeriod()
  let generated = 0, skipped = 0, errors: string[] = []

  try {
    // Load all active customers with their subscriptions, bins, and approved skips
    const customers = await sbServer(
      `customers?status=eq.active&select=*,subscriptions(id,rate,billing_cycle,status,pickup_day,billing_start,services(name)),bins(id,bin_type,monthly_rental_fee,ownership)`
    )

    for (const customer of customers || []) {
      try {
        // Skip if invoice already exists for this period
        const existing = await sbServer(
          `invoices?customer_id=eq.${customer.id}&period_start=eq.${periodStart}&select=id`
        )
        if (existing?.length > 0) { skipped++; continue }

        // For quarterly customers: skip if they had an invoice in the last 3 months
        const activeSub = customer.subscriptions?.find((s: any) => s.status === 'active')
        if (activeSub?.billing_cycle === 'quarterly') {
          const threeMonthsAgo = new Date()
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
          const recentInvoices = await sbServer(
            `invoices?customer_id=eq.${customer.id}&status=in.(sent,paid)&period_start=gte.${threeMonthsAgo.toISOString().split('T')[0]}&select=id`
          ).catch(() => [])
          if (recentInvoices?.length > 0) { skipped++; continue }
        }

        // Count approved skip credits for this billing period
        const skips = await sbServer(
          `skip_requests?customer_id=eq.${customer.id}&status=eq.approved&skip_date=gte.${periodStart}&skip_date=lte.${periodEnd}&select=refund_amount`
        ).catch(() => [])
        const skipCredit = (skips || []).reduce((sum: number, s: any) => sum + Number(s.refund_amount || 0), 0)

        // Load any confirmed extra bag charges not yet invoiced
        const addons = await sbServer(
          `pickup_addons?customer_id=eq.${customer.id}&status=eq.confirmed&select=*`
        ).catch(() => [])
        const addonTotal = (addons || []).reduce((sum: number, a: any) => sum + Number(a.final_price || 0), 0)
        const addonLines = (addons || []).map((a: any) => ({ description: a.custom_description || 'Extra item', amount: Number(a.final_price || 0) }))

        const { lines, subtotal: baseSubtotal, total: baseTotal } = calcInvoiceTotal({ ...customer, skip_credits: skipCredit })
        const subtotal = parseFloat((baseSubtotal + addonTotal).toFixed(2))
        const total = parseFloat((baseTotal + addonTotal).toFixed(2))
        const allLines = [...lines, ...addonLines]

        if (total <= 0) { skipped++; continue }

        // Create invoice
        const [invoice] = await sbServer('invoices', {
          method: 'POST',
          body: {
            customer_id: customer.id,
            subscription_id: customer.subscriptions?.find((s: any) => s.status === 'active')?.id || null,
            subtotal,
            adjustments_total: skipCredit,
            tax_rate: 0,
            tax_amount: 0,
            total,
            status: 'draft',
            period_start: periodStart,
            period_end: periodEnd,
            due_date: dueDate,
            notes: allLines.map((l: any) => `${l.description}: $${l.amount.toFixed(2)}`).join(', '),
          },
        })

        // Mark extra bag addons as invoiced
        for (const addon of addons || []) {
          await sbServer(`pickup_addons?id=eq.${addon.id}`, {
            method: 'PATCH', body: { status: 'invoiced', notes: `Invoiced on ${new Date().toISOString().split('T')[0]}` }, prefer: 'return=minimal'
          }).catch(() => {})
        }

        // Mark invoice as sent
        await sbServer(`invoices?id=eq.${invoice.id}`, {
          method: 'PATCH',
          body: { status: 'sent' },
          prefer: 'return=minimal',
        })

        // Send email notification
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
          await resend.emails.send(invoiceEmail(customer, { ...invoice, status: 'sent' }, lines))
        }

        generated++
      } catch (e: any) {
        errors.push(`${customer.email}: ${e.message}`)
      }
    }

    return NextResponse.json({ ok: true, generated, skipped, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
