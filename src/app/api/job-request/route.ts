import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sbServer } from '@/lib/billing'

const JobRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(200).optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'Phone number looks too short').max(30),
  street_address: z.string().trim().min(3, 'Street address is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(50).optional().or(z.literal('')),
  zip: z.string().trim().max(10).optional().or(z.literal('')),
  job_type: z.enum(['junk_removal', 'yard_cleanup', 'both']),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  preferred_date: z.string().trim().max(50).optional().or(z.literal('')),
  photo_data: z
    .array(z.string().max(800_000))
    .max(5, 'Maximum 5 photos')
    .optional(),
})

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = JobRequestSchema.safeParse(raw)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const msg = firstIssue?.message || 'Invalid input'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { photo_data, street_address, city, state, zip, ...fields } = parsed.data

    // Combine address parts into a single full address string
    const statePart = state?.trim() || 'NH'
    const zipPart = zip?.trim() ? ` ${zip.trim()}` : ''
    const address = `${street_address}, ${city}, ${statePart}${zipPart}`

    const row: Record<string, unknown> = {
      ...fields,
      address,
      email: fields.email || null,
      preferred_date: fields.preferred_date || null,
      status: 'new',
    }
    if (photo_data && photo_data.length > 0) {
      row.photo_data = photo_data
    }

    await sbServer('job_requests', {
      method: 'POST',
      body: row,
      prefer: 'return=minimal',
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[job-request] error:', e)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
