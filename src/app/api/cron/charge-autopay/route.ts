/* eslint-disable */
import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/billing'
import { receiptEmail, failedPaymentEmail } from '@/lib/emails'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)
const canEmail = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let charged = 0, failed = 0, skipped = 0, errors: string[] = []

  try {
    // Get all unpaid sent invoices for auto-pay customers
    const today = new Date().toISOString().split('T')[0]
    const invoices = await sbServer(
      `invoices?status=eq.sent&due_date=lte.${today}&select=*,customers(*)` 
    )

    for (const invoice of invoices || []) {
      const customer = invoice.customers
      if (!customer) { skipped++; continue }

      // Skip non-auto-pay customers — they pay manually
      if (!customer.auto_pay || !customer.stripe_customer_id || !customer.stripe_payment_method_id) {
        skipped++; continue
      }

      try {
        // Charge via Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(invoice.total * 100), // cents
          currency: 'usd',
          customer: customer.stripe_customer_id,
          payment_method: customer.stripe_payment_method_id,
          confirm: true,
          off_session: true,
          description: `Patil Waste Removal — ${invoice.period_start} to ${invoice.period_end}`,
          metadata: { invoice_id: invoice.id, customer_id: customer.id },
        })

        if (paymentIntent.status === 'succeeded') {
          // Mark invoice paid
          await sbServer(`invoices?id=eq.${invoice.id}`, {
            method: 'PATCH',
            body: { status: 'paid', paid_at: new Date().toISOString(), stripe_invoice_id: paymentIntent.id },
            prefer: 'return=minimal',
          })
          // Log payment
          await sbServer('payment_logs', {
            method: 'POST',
            body: {
              customer_id: customer.id,
              payment_method: 'card',
              amount: invoice.total,
              reference_number: paymentIntent.id,
              logged_by: 'auto-pay',
            },
          })
          // Send receipt
          if (canEmail) await resend.emails.send(receiptEmail(customer, invoice, invoice.total))
          charged++
        }
      } catch (e: any) {
        // Mark invoice as failed
        await sbServer(`invoices?id=eq.${invoice.id}`, {
          method: 'PATCH',
          body: { status: 'overdue', notes: `Charge failed: ${e.message}` },
          prefer: 'return=minimal',
        })
        // Notify customer
        if (canEmail) await resend.emails.send(failedPaymentEmail(customer, invoice.total)).catch(() => {})
        errors.push(`${customer.email}: ${e.message}`)
        failed++
      }
    }

    return NextResponse.json({ ok: true, charged, failed, skipped, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
