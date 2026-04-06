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

  // Bin rentals
  for (const bin of customer.bins || []) {
    if (bin.status === 'active') {
      lines.push({
        description: bin.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental',
        amount: Number(bin.monthly_fee),
      })
    }
  }

  // Garage-side pickup
  if (customer.garage_side_pickup) {
    lines.push({ description: 'Garage-Side Pickup', amount: 10.00 })
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)

  // Skip credits — approved skips from this billing period
  const skipCredit = (customer.skip_credits || 0)

  const total = Math.max(0, subtotal - skipCredit)

  return { lines, subtotal, skipCredit, total }
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
