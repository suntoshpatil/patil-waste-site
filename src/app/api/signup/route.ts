import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { sbServer } from '@/lib/billing'
import { signupConfirmationEmail } from '@/lib/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

// Schema for the public signup form. Mirrors the fields on /signup and
// matches the customers table shape. All strings are trimmed and capped
// to block payload-abuse and broken rendering from oversized input.
const SignupSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(50),
  last_name: z.string().trim().max(50).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  street_address: z.string().trim().min(3, 'Street address is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(50).optional().or(z.literal('')),
  zip: z.string().trim().max(10).optional().or(z.literal('')),
  plan: z.enum(['standard', 'recycling', 'info']),
  billing_cycle: z.enum(['monthly', 'quarterly']).optional(),
  bin_situation: z.enum(['own', 'rental', 'unsure']).optional(),
  payment_method: z.enum(['card', 'venmo', 'zelle', 'cash']).optional(),
  start_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional()
    .or(z.literal('')),
  gate_notes: z.string().trim().max(500).optional().or(z.literal('')),
  garage_side_pickup: z.boolean().optional(),
  referral: z.string().trim().max(100).optional().or(z.literal('')),
  extra_notes: z.string().trim().max(1000).optional().or(z.literal('')),
  rent_trash: z.boolean().optional(),
  rent_recycling: z.boolean().optional(),
})

const cap = (s: string) =>
  s.trim() ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() : ''

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = SignupSchema.safeParse(raw)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const msg = firstIssue?.message || 'Invalid input'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const d = parsed.data

    // Build the free-text notes the admin panel displays, matching the
    // format the old client-side signup used so admin UX stays identical.
    const binRentalNote =
      d.rent_trash && d.rent_recycling
        ? 'Bin rentals: Trash + Recycling'
        : d.rent_trash
        ? 'Bin rental: Trash bin'
        : d.rent_recycling
        ? 'Bin rental: Recycling bin'
        : ''
    const startWeekLabel = d.start_date
      ? `Requested start week: ${new Date(d.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(new Date(d.start_date + 'T12:00:00').getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : ''
    const notes = [
      d.extra_notes || '',
      d.referral ? `Referred by: ${d.referral}` : '',
      `Plan: ${d.plan} · Billing: ${d.billing_cycle || 'monthly'}`,
      binRentalNote,
      startWeekLabel,
    ]
      .filter(Boolean)
      .join(' | ')

    // Combine address parts into a single full address string for contracts
    // and admin display: "123 Main St, Bedford, NH 03110"
    const statePart = d.state?.trim() || 'NH'
    const zipPart = d.zip?.trim() ? ` ${d.zip.trim()}` : ''
    const fullAddress = `${d.street_address}, ${d.city}, ${statePart}${zipPart}`

    const row = {
      first_name: cap(d.first_name),
      last_name: cap(d.last_name || ''),
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      service_address: fullAddress,
      town: d.city.toLowerCase().trim(),
      status: 'pending',
      payment_method: d.payment_method || null,
      bin_situation: d.bin_situation || null,
      garage_side_pickup: d.garage_side_pickup ?? false,
      gate_notes: d.gate_notes || null,
      notes,
      start_date: d.start_date || null,
    }

    await sbServer('customers', {
      method: 'POST',
      body: row,
      prefer: 'return=minimal',
    })

    // Send welcome email — must be awaited before returning so the
    // serverless function doesn't terminate before Resend finishes.
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
      // Fetch actual plan name + price from the services table
      const PLAN_SERVICE: Record<string, string> = {
        standard: 'Curbside Trash',
        recycling: 'Trash & Recycling',
      }
      let planDisplay = d.plan === 'info' ? 'Information Request' : (PLAN_SERVICE[d.plan] || 'Service Plan')
      try {
        const serviceName = PLAN_SERVICE[d.plan]
        if (serviceName) {
          const services = await sbServer(`services?name=eq.${encodeURIComponent(serviceName)}&select=name,base_price_monthly&limit=1`)
          const svc = services?.[0]
          if (svc?.base_price_monthly) {
            planDisplay = `${svc.name} — $${Number(svc.base_price_monthly).toFixed(0)}/mo`
          }
        }
      } catch { /* non-fatal — fall back to plan label */ }

      const customerForEmail = { first_name: row.first_name, last_name: row.last_name, email: row.email }
      await resend.emails.send(signupConfirmationEmail(customerForEmail, planDisplay, row.start_date || '')).catch((err: unknown) => {
        console.error('[signup] email send failed:', err)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[signup] error:', e)
    return NextResponse.json({ error: 'Failed to submit signup' }, { status: 500 })
  }
}
