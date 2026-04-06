/* eslint-disable */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'

export async function POST(req: Request) {
  try {
    const { invoiceId, customerId } = await req.json()
    if (!invoiceId || !customerId) {
      return NextResponse.json({ error: 'Missing invoiceId or customerId' }, { status: 400 })
    }

    const [invoice] = await sbServer(`invoices?id=eq.${invoiceId}&select=*`)
    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=id,first_name,last_name,email,stripe_customer_id`)

    if (!invoice || !customer) {
      return NextResponse.json({ error: 'Invoice or customer not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = customer.stripe_customer_id
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        metadata: { supabase_id: customer.id },
      })
      stripeCustomerId = stripeCustomer.id
      await sbServer(`customers?id=eq.${customerId}`, {
        method: 'PATCH',
        body: { stripe_customer_id: stripeCustomerId },
        prefer: 'return=minimal',
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Patil Waste Removal — ${invoice.period_start} to ${invoice.period_end}`,
            description: invoice.notes || 'Waste removal service',
          },
          unit_amount: Math.round(invoice.total * 100),
        },
        quantity: 1,
      }],
      success_url: `${SITE_URL}/portal?payment=success&invoice=${invoiceId}`,
      cancel_url: `${SITE_URL}/portal?tab=billing`,
      metadata: { invoice_id: invoiceId, customer_id: customerId },
    })

    // Mark invoice as paid on success via webhook (or optimistically here)
    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
