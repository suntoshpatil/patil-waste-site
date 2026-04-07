/* eslint-disable */
import { NextResponse } from 'next/server'
import { sbServer, calcInvoiceTotal, getBillingPeriod } from '@/lib/billing'
import { invoiceEmail } from '@/lib/emails'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Monthly period — cron runs on 25th, generates invoice for next month
  const { periodStart, dueDate } = getBillingPeriod()
  let generated = 0, skipped = 0, errors: string[] = []

  try {
    const customers = await sbServer(
      `customers?status=eq.active&select=*,subscriptions(id,rate,billing_cycle,status,pickup_day,billing_start,services(name)),bins(id,bin_type,monthly_rental_fee,ownership)`
    )

    for (const customer of customers || []) {
      try {
        const activeSub = customer.subscriptions?.find((s: any) => s.status === 'active')
        const isQuarterly = activeSub?.billing_cycle === 'quarterly'

        // For quarterly customers: only generate when their current coverage
        // ends THIS month (1 month advance notice for next quarter)
        if (isQuarterly) {
          const lastInvoice = await sbServer(
            `invoices?customer_id=eq.${customer.id}&status=in.(sent,paid)&order=period_end.desc&limit=1&select=period_end`
          ).catch(() => [])

          if (lastInvoice?.length > 0) {
            const lastEndMonth = lastInvoice[0].period_end.slice(0, 7)  // e.g. '2026-06'
            const nextMonth    = periodStart.slice(0, 7)                 // e.g. '2026-06'
            // Only generate if their coverage ends this month or earlier
            if (lastEndMonth > nextMonth) { skipped++; continue }
          }
        }

        // For monthly: skip if invoice already exists for this period
        if (!isQuarterly) {
          const existing = await sbServer(
            `invoices?customer_id=eq.${customer.id}&period_start=eq.${periodStart}&select=id`
          )
          if (existing?.length > 0) { skipped++; continue }
        }

        // Determine period end
        // Monthly: end of next month
        // Quarterly: 3 months from period start
        const pStart = new Date(periodStart + 'T12:00:00')
        let periodEnd: string
        if (isQuarterly) {
          // End of the 3rd month from period start
          const endMonth = new Date(pStart.getFullYear(), pStart.getMonth() + 3, 0)
          periodEnd = endMonth.toISOString().split('T')[0]
        } else {
          const endMonth = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0)
          periodEnd = endMonth.toISOString().split('T')[0]
        }

        // Count approved skip credits for this billing period
        const skips = await sbServer(
          `skip_requests?customer_id=eq.${customer.id}&status=eq.approved&skip_date=gte.${periodStart}&skip_date=lte.${periodEnd}&select=refund_amount`
        ).catch(() => [])
        const skipCredit = (skips || []).reduce((sum: number, s: any) => sum + Number(s.refund_amount || 0), 0)

        // Load confirmed extra bag charges not yet invoiced
        const addons = await sbServer(
          `pickup_addons?customer_id=eq.${customer.id}&status=eq.confirmed&select=*`
        ).catch(() => [])
        const addonTotal = (addons || []).reduce((sum: number, a: any) => sum + Number(a.final_price || 0), 0)
        const addonLines = (addons || []).map((a: any) => ({ description: a.custom_description || 'Extra item', amount: Number(a.final_price || 0) }))

        const { lines, subtotal: baseSubtotal, total: baseTotal } = calcInvoiceTotal({ ...customer, skip_credits: skipCredit })
        const subtotal = parseFloat((baseSubtotal + addonTotal).toFixed(2))
        const total    = parseFloat((baseTotal    + addonTotal).toFixed(2))
        const allLines = [...lines, ...addonLines]

        if (total <= 0) { skipped++; continue }

        const [invoice] = await sbServer('invoices', {
          method: 'POST',
          body: {
            customer_id: customer.id,
            subscription_id: activeSub?.id || null,
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

        await sbServer(`invoices?id=eq.${invoice.id}`, {
          method: 'PATCH', body: { status: 'sent' }, prefer: 'return=minimal',
        })

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
