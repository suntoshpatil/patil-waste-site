/* eslint-disable */
// Server-side Supabase helper — uses the service_role key so it bypasses
// RLS entirely. This is safe because this file only runs on the server
// (API routes, cron jobs). Never import this from client components.
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!

export async function sbServer(path: string, opts: { method?: string; body?: object; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) throw new Error(data?.message || `Supabase error ${res.status}`)
  return data
}

// Calculate invoice total for a customer
export function calcInvoiceTotal(customer: any): {
  lines: { description: string; amount: number }[]
  subtotal: number
  skipCredit: number
  total: number
} {
  const lines: { description: string; amount: number }[] = []

  // Subscription plan
  const sub = customer.subscriptions?.find((s: any) => s.status === 'active')
  if (sub) {
    const isQuarterly = sub.billing_cycle === 'quarterly'
    const amount = isQuarterly ? Number(sub.rate) * 3 : Number(sub.rate)
    const label = isQuarterly ? `${sub.services?.name || 'Service Plan'} (Quarterly)` : (sub.services?.name || 'Service Plan')
    lines.push({ description: label, amount })
  }

  // Bin rentals — always full monthly fee, never prorated after first month
  // and skip credits do NOT apply to bin rentals
  const binLines: { description: string; amount: number }[] = []
  for (const bin of customer.bins || []) {
    if (bin.ownership === 'rental') {
      binLines.push({
        description: bin.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental',
        amount: Number(bin.monthly_rental_fee || bin.monthly_fee || 0),
      })
    }
  }

  // Garage-side pickup — use stored rate if available (senior = $5, standard = $10)
  const garageLines: { description: string; amount: number }[] = []
  if (customer.garage_side_pickup) {
    const garageRate = Number(customer.garage_side_rate || 14.99)
    garageLines.push({ description: 'Garage-Side Pickup', amount: garageRate })
  }

  const serviceSubtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const binSubtotal = binLines.reduce((sum, l) => sum + l.amount, 0)
  const garageSubtotal = garageLines.reduce((sum, l) => sum + l.amount, 0)
  const subtotal = serviceSubtotal + binSubtotal + garageSubtotal

  // Skip credits only reduce the service portion, not bins or garage
  const skipCredit = (customer.skip_credits || 0)
  const serviceAfterCredit = Math.max(0, serviceSubtotal - skipCredit)
  const total = serviceAfterCredit + binSubtotal + garageSubtotal

  const allLines = [...lines, ...binLines, ...garageLines]
  return { lines: allLines, subtotal, skipCredit, total }
}

// Format currency
export const fmt$ = (n: number) => `$${n.toFixed(2)}`

// Get billing period dates
export function getBillingPeriod(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const periodStart = new Date(year, month + 1, 1).toISOString().split('T')[0]  // 1st of next month
  const periodEnd   = new Date(year, month + 2, 0).toISOString().split('T')[0]  // last day of next month
  const dueDate     = new Date(year, month + 1, 1).toISOString().split('T')[0]  // due 1st of next month
  return { periodStart, periodEnd, dueDate }
}
