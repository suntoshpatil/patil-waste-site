import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sbServer } from '@/lib/billing'

// Schema for the public junk-removal / yard cleanup quote form.
// All length caps are intentionally generous (~2x typical input) to avoid
// rejecting legitimate requests, but small enough to block obvious abuse.
// Photos are base64 data URIs produced by the client after compression —
// 5 × 600KB ≈ 3MB which fits in a standard request body.
const JobRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(200).optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'Phone number looks too short').max(30),
  address: z.string().trim().min(5, 'Address is required').max(300),
  job_type: z.enum(['junk_removal', 'yard_cleanup', 'both']),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  preferred_date: z.string().trim().max(50).optional().or(z.literal('')),
  photo_data: z
    .array(z.string().max(800_000)) // ~600KB base64 per photo, 800K gives headroom
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

    const { photo_data, ...fields } = parsed.data

    // Strip empty optional strings so we insert NULL instead of '' where
    // the column is nullable.
    const row: Record<string, unknown> = {
      ...fields,
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
