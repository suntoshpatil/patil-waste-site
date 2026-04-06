import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sbServer } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// GET /api/stripe/confirm-setup?session_id=xxx&customer_id=xxx
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

    // Save payment method to Supabase and enable auto-pay
    await sbServer(`customers?id=eq.${customerId}`, {
      method: 'PATCH',
      body: {
        stripe_payment_method_id: paymentMethodId,
        auto_pay: true,
      },
      prefer: 'return=minimal',
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
