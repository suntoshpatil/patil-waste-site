/* eslint-disable */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'
import { getSessionCustId } from '@/lib/portalSession'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json()
    if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })

    // Verify the caller owns this customer account
    const cookieStore = await cookies()
    const sessionCustId = getSessionCustId(cookieStore)
    if (!sessionCustId || sessionCustId !== customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=id,first_name,last_name,email,stripe_customer_id`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

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

    // Checkout session in setup mode — collects card without charging
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${SITE_URL}/portal?card_saved=true&session_id={CHECKOUT_SESSION_ID}&customer_id=${customerId}`,
      cancel_url: `${SITE_URL}/portal?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/setup-intent] error:', e)
    return NextResponse.json({ error: 'Failed to start card setup' }, { status: 500 })
  }
}
