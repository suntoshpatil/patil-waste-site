/* eslint-disable */
// Server-side Supabase helper (uses env vars, never exposed to client)
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

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
    lines.push({ description: sub.services?.name || 'Service Plan', amount: Number(sub.rate) })
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

  // Garage-side pickup — also not affected by skip credits
  const garageLines: { description: string; amount: number }[] = []
  if (customer.garage_side_pickup) {
    garageLines.push({ description: 'Garage-Side Pickup', amount: 10.00 })
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
