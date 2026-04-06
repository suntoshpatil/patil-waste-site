import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// POST /api/stripe/setup-intent
// Creates or retrieves a Stripe customer and returns a SetupIntent client secret
export async function POST(req: Request) {
  try {
    const { customerId } = await req.json()
    if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })

    // Load customer from Supabase
    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=id,first_name,last_name,email,stripe_customer_id`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Create Stripe customer if they don't have one yet
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

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    })

    return NextResponse.json({ clientSecret: setupIntent.client_secret })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
