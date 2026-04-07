/* eslint-disable */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    const customerId = searchParams.get('customer_id')

    if (!sessionId || !customerId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent'],
    })

    const setupIntent = session.setup_intent as Stripe.SetupIntent
    const paymentMethodId = setupIntent?.payment_method as string

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'No payment method found' }, { status: 400 })
    }

    // Load customer to get stripe_customer_id
    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=id,email,stripe_customer_id`)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Verify the Stripe session actually belongs to this customer
    if (customer.stripe_customer_id && session.customer !== customer.stripe_customer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Set as default payment method on Stripe customer
    if (customer?.stripe_customer_id) {
      await stripe.customers.update(customer.stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
    }

    // Save to Supabase and enable auto-pay
    await sbServer(`customers?id=eq.${customerId}`, {
      method: 'PATCH',
      body: { stripe_payment_method_id: paymentMethodId, auto_pay: true },
      prefer: 'return=minimal',
    })

    // Check for any outstanding first invoice (due on receipt, status=sent)
    const invoices = await sbServer(
      `invoices?customer_id=eq.${customerId}&status=eq.sent&select=*`
    ).catch(() => [])

    for (const invoice of invoices || []) {
      if (!invoice.total || invoice.total <= 0) continue
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(invoice.total * 100),
          currency: 'usd',
          customer: customer.stripe_customer_id,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          description: `Patil Waste Removal — First invoice ${invoice.period_start} to ${invoice.period_end}`,
          metadata: { invoice_id: invoice.id, customer_id: customerId },
        })

        if (paymentIntent.status === 'succeeded') {
          await sbServer(`invoices?id=eq.${invoice.id}`, {
            method: 'PATCH',
            body: { status: 'paid', paid_at: new Date().toISOString(), stripe_invoice_id: paymentIntent.id },
            prefer: 'return=minimal',
          })
          await sbServer('payment_logs', {
            method: 'POST',
            body: {
              customer_id: customerId,
              payment_method: 'card',
              amount: invoice.total,
              reference_number: paymentIntent.id,
              logged_by: 'auto-pay',
            },
          })
        }
      } catch (chargeErr: any) {
        // Don't block card save if charge fails — invoice stays as sent
        console.error('First invoice charge failed:', chargeErr.message)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
