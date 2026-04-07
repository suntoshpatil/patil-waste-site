/* eslint-disable */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// POST /api/stripe/save-card
// Called after SetupIntent succeeds — saves the payment method to the customer
export async function POST(req: Request) {
  try {
    const { customerId, paymentMethodId, enableAutoPay } = await req.json()
    if (!customerId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=id,stripe_customer_id`)
    if (!customer?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    // Verify the payment method isn't already owned by a different customer
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
    if (pm.customer && pm.customer !== customer.stripe_customer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Attach payment method to Stripe customer and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.stripe_customer_id })
    await stripe.customers.update(customer.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Save to Supabase
    await sbServer(`customers?id=eq.${customerId}`, {
      method: 'PATCH',
      body: {
        stripe_payment_method_id: paymentMethodId,
        auto_pay: enableAutoPay ?? true,
      },
      prefer: 'return=minimal',
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
