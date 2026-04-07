/* eslint-disable */
'use client'
import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'

async function sb(path: string, opts: { method?: string; body?: object; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data
}

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function nextPickupDate(pickupDay: string, billingStart?: string): string {
  if (!pickupDay) return '—'
  const targetDay = DAYS.indexOf(pickupDay.toLowerCase())
  if (targetDay === -1) return '—'

  // If billing hasn't started yet, show the first pickup from billing_start
  const today = new Date()
  const startFrom = billingStart ? new Date(billingStart + 'T12:00:00') : today
  const base = startFrom > today ? startFrom : today

  const baseDay = base.getDay()
  let diff = targetDay - baseDay
  if (diff < 0) diff += 7
  // If base is already the pickup day and it's the billing start, use that day
  if (diff === 0 && startFrom > today) diff = 0
  else if (diff === 0) diff = 7

  const next = new Date(base)
  next.setDate(base.getDate() + diff)
  return next.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
}

function quarterSkipsUsed(skips: any[]): number {
  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  return skips.filter(s => {
    const d = new Date(s.created_at)
    return d >= qStart && (s.status === 'approved' || s.status === 'pending')
  }).length
}

// Count how many times a given weekday falls in a month (weekly or biweekly)
function countWeekdayInMonth(year: number, month: number, weekday: number, billingStart?: Date, frequency?: string): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    if (date.getDay() === weekday) {
      if (frequency === 'biweekly' && billingStart) {
        // Only count if this is a "pickup week" — same parity as billing_start
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        const weeksDiff = Math.round((date.getTime() - billingStart.getTime()) / msPerWeek)
        if (weeksDiff % 2 !== 0) continue
      }
      count++
    }
  }
  return count
}

// Count remaining pickup occurrences from a given date to end of month
function countRemainingWeekdays(from: Date, weekday: number, billingStart?: Date, frequency?: string): number {
  const year = from.getFullYear()
  const month = from.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = from.getDate(); d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    if (date.getDay() === weekday) {
      if (frequency === 'biweekly' && billingStart) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        const weeksDiff = Math.round((date.getTime() - billingStart.getTime()) / msPerWeek)
        if (weeksDiff % 2 !== 0) continue
      }
      count++
    }
  }
  return count
}

// Prorate based on pickup occurrences remaining vs total in the month
function prorateDays(rate: number, pickupDay?: string, billingStart?: Date, frequency?: string): number {
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (pickupDay) {
    const weekday = DAYS.indexOf(pickupDay.toLowerCase())
    if (weekday !== -1) {
      const total = countWeekdayInMonth(year, month, weekday, billingStart, frequency)
      const remaining = countRemainingWeekdays(now, weekday, billingStart, frequency)
      if (total > 0) return parseFloat(((rate / total) * remaining).toFixed(2))
    }
  }

  // Fallback: day-based proration
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const remaining = daysInMonth - now.getDate() + 1
  return parseFloat(((rate / daysInMonth) * remaining).toFixed(2))
}

type Customer = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  service_address: string
  town: string
  pickup_day: string
  status: string
  payment_method: string
  garage_side_pickup: boolean
  notes: string
  portal_pin?: string
  subscriptions?: { id: string; rate: number; billing_cycle: string; status: string; services: { name: string } }[]
}

export default function Portal() {
  const [screen, setScreen] = useState<'login'|'set-pin'|'dashboard'>('login')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bins, setBins] = useState<any[]>([])
  const [skips, setSkips] = useState<any[]>([])
  const [notices, setNotices] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState('success')
  const [tab, setTab] = useState<'home'|'calendar'|'pickup'|'services'|'skips'|'billing'>('home')

  // Bulky items / pickup addons
  const [catalog, setCatalog] = useState<any[]>([])
  const [pickupAddons, setPickupAddons] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [cardSaving, setCardSaving] = useState(false)
  const [payingNow, setPayingNow] = useState(false)
  const [portalMenuOpen, setPortalMenuOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({ email:'', phone:'' })
  const [contactSaving, setContactSaving] = useState(false)
  const [pinAttempts, setPinAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [forgotPin, setForgotPin] = useState(false)
  const [resetPhone, setResetPhone] = useState('')
  const [resetNewPin, setResetNewPin] = useState('')
  const [resetConfirmPin, setResetConfirmPin] = useState('')
  const [cardSaved, setCardSaved] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{id:string, qty:number}[]>([])
  const [customItem, setCustomItem] = useState('')
  const [addonPickupDate, setAddonPickupDate] = useState('')

  // Add service modal
  const [showAddService, setShowAddService] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [addTiming, setAddTiming] = useState<'immediate'|'next_month'>('next_month')

  // Skip modal
  const [skipDate, setSkipDate] = useState('')

  const showToast = (msg: string, type = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('portal_customer')
    if (!saved) return
    const parsed = JSON.parse(saved)
    setCustomer(parsed)
    setScreen('dashboard')
    loadPortalData(parsed)
    // Handle Stripe payment success redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      const invoiceId = params.get('invoice')
      if (invoiceId) {
        sb(`invoices?id=eq.${invoiceId}`, { method:'PATCH', body:{ status:'paid', paid_at: new Date().toISOString() }, prefer:'return=minimal' }).catch(()=>{})
        sb('payment_logs', { method:'POST', body:{ customer_id: parsed.id, payment_method:'card', amount: 0, reference_number:'stripe-checkout', logged_by:'customer' }}).catch(()=>{})
      }
      showToast('Payment successful! Thank you 🎉')
      window.history.replaceState({}, '', '/portal')
    }
    // Handle Stripe card setup success
    if (params.get('card_saved') === 'true') {
      const sessionId = params.get('session_id')
      const custId = params.get('customer_id')
      if (sessionId && custId) {
        fetch(`/api/stripe/confirm-setup?session_id=${sessionId}&customer_id=${custId}`)
          .then(async () => {
            // Re-fetch customer so the UI shows card saved / auto-pay enabled
            const res = await sb(`customers?id=eq.${custId}&select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,billing_start,pickup_frequency,services(id,name))`)
            if (res?.[0]) {
              const updated = res[0]
              sessionStorage.setItem('portal_customer', JSON.stringify(updated))
              setCustomer(updated)
            }
            showToast('Card saved! Auto-pay is now enabled. ✅')
          })
          .catch(() => showToast('Card saved but auto-pay setup had an issue. Contact us.', 'error'))
      }
      window.history.replaceState({}, '', '/portal')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPortalData(cust: Customer) {
    const [b, sk, n, sv, cat, addons, inv] = await Promise.all([
      sb(`bins?customer_id=eq.${cust.id}&select=*`).catch(() => []),
      sb(`skip_requests?customer_id=eq.${cust.id}&select=*&order=created_at.desc`).catch(() => []),
      sb(`schedule_notices?select=*&order=notice_date.desc&limit=5`).catch(() => []),
      sb(`services?select=id,name,base_price_monthly&is_active=eq.true&type=in.(recurring,addon)&order=base_price_monthly.asc`).catch(() => []),
      sb(`bulky_item_catalog?select=*&is_active=eq.true&order=is_fixed_price.desc,name.asc`).catch(() => []),
      sb(`pickup_addons?customer_id=eq.${cust.id}&select=*&order=created_at.desc&limit=20`).catch(() => []),
      sb(`invoices?customer_id=eq.${cust.id}&select=*&order=created_at.desc&limit=12`).catch(() => []),
    ])
    setBins(b || [])
    setSkips(sk || [])
    setNotices(n || [])
    setServices(sv || [])
    setCatalog(cat || [])
    setPickupAddons(addons || [])
    setInvoices(inv || [])
  }

  const [loginStep, setLoginStep] = useState<'email'|'pin'>('email')
  const [contractAccepting, setContractAccepting] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<Customer|null>(null)

  async function handleEmailLookup() {
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true); setError('')
    try {
      const results = await sb(`customers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,billing_start,pickup_frequency,services(id,name))`)
      if (!results || results.length === 0) { setError('No account found with that email. Make sure you used the same email you signed up with.'); setLoading(false); return }
      const cust = results[0]
      if (!cust.portal_pin) {
        // First time — go straight to set PIN
        setCustomer(cust)
        setScreen('set-pin')
        setLoading(false); return
      }
      // Has a PIN — show PIN entry step
      setFoundCustomer(cust)
      setLoginStep('pin')
    } catch (e: any) { setError(e.message || 'Something went wrong.') }
    setLoading(false)
  }

  async function handleResetPin() {
    if (!resetPhone || !foundCustomer) { setError('Please enter your phone number.'); return }
    // Verify last 4 digits of phone match
    const stored = (foundCustomer.phone || '').replace(/\D/g, '').slice(-4)
    const entered = resetPhone.replace(/\D/g, '').slice(-4)
    if (stored !== entered || stored.length < 4) {
      setError('Phone number does not match our records. Contact Suntosh at (802) 416-9484.'); return
    }
    if (!resetNewPin || resetNewPin.length !== 4) { setError('Please enter a valid 4-digit PIN.'); return }
    if (resetNewPin !== resetConfirmPin) { setError('PINs do not match.'); return }
    setLoading(true); setError('')
    try {
      await sb(`customers?id=eq.${foundCustomer.id}`, { method:'PATCH', body:{ portal_pin: resetNewPin }, prefer:'return=minimal' })
      setForgotPin(false)
      setResetPhone(''); setResetNewPin(''); setResetConfirmPin('')
      setPin(resetNewPin)
      setError('')
      // Auto login
      const updated = { ...foundCustomer, portal_pin: resetNewPin }
      sessionStorage.setItem('portal_customer', JSON.stringify(updated))
      setCustomer(updated as any)
      setScreen('dashboard')
      loadPortalData(updated as any)
    } catch (e: any) { setError(e.message || 'Reset failed.') }
    setLoading(false)
  }

  async function handleLogin() {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('Please enter your 4-digit PIN.'); return }
    if (!foundCustomer) return
    if (foundCustomer.portal_pin !== pin) {
      const newAttempts = pinAttempts + 1
      setPinAttempts(newAttempts)
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000
        setLockedUntil(lockTime)
        setPinAttempts(0)
        setError('Too many failed attempts. Your account is locked for 15 minutes.')
      } else {
        setError(`Incorrect PIN. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining.`)
      }
      return
    }
    setPinAttempts(0)
    setLockedUntil(null)
    sessionStorage.setItem('portal_customer', JSON.stringify(foundCustomer))
    setCustomer(foundCustomer)
    setScreen('dashboard')
    loadPortalData(foundCustomer)
  }

  async function handleSetPin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setError('PIN must be exactly 4 digits.'); return }
    if (newPin !== confirmPin) { setError('PINs do not match.'); return }
    if (!customer) return
    setLoading(true); setError('')
    try {
      await sb(`customers?id=eq.${customer.id}`, { method:'PATCH', body:{ portal_pin: newPin }, prefer:'return=minimal' })
      const updated = { ...customer, portal_pin: newPin }
      sessionStorage.setItem('portal_customer', JSON.stringify(updated))
      setCustomer(updated as any)
      setScreen('dashboard')
      loadPortalData(updated as any)
    } catch (e: any) { setError(e.message || 'Failed to set PIN.') }
    setLoading(false)
  }

  async function acceptContract() {
    if (!customer) return
    setContractAccepting(true)
    try {
      // 1. Activate customer and mark contract accepted
      await sb(`customers?id=eq.${customer.id}`, { method:'PATCH', body:{
        contract_accepted: true,
        contract_accepted_at: new Date().toISOString(),
        status: 'active',
      }, prefer:'return=minimal' })

      // 2. Generate prorated first invoice based on billing_start
      const sub = (customer as any).subscriptions?.[0]
      if (sub) {
        const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
        const weekday = pickupDay ? DAYS.indexOf(pickupDay.toLowerCase()) : -1

        // Use billing_start as the reference point for proration (not today)
        const billingStart = sub.billing_start
          ? new Date(sub.billing_start + 'T12:00:00')
          : new Date()
        const year = billingStart.getFullYear()
        const month = billingStart.getMonth()

        // Total pickups in the billing month
        const totalPickups = weekday !== -1 ? countWeekdayInMonth(year, month, weekday) : 4
        // Pickups from billing_start to end of month (inclusive of start date's pickup day)
        const remainingPickups = weekday !== -1 ? countRemainingWeekdays(billingStart, weekday) : 4

        // Prorate service: (remaining pickups / total pickups) * monthly rate
        const proratedRate = parseFloat(((sub.rate / (totalPickups || 1)) * remainingPickups).toFixed(2))

        // Bin rentals — prorated for first month only
        // After first month they bill at full monthly_rental_fee regardless of skips
        const fetchedBins = await sb(`bins?customer_id=eq.${customer.id}&ownership=eq.rental&select=*`).catch(() => [])
        const binLines: string[] = []
        let depositTotal = 0
        const binTotal = (fetchedBins || []).reduce((sum: number, b: any) => {
          const binProrated = parseFloat(((b.monthly_rental_fee / (totalPickups || 1)) * remainingPickups).toFixed(2))
          binLines.push(`${b.bin_type === 'trash' ? 'Trash' : 'Recycling'} bin rental (${remainingPickups}/${totalPickups} pickups): $${binProrated.toFixed(2)}`)
          // Add $25 deposit for trash bin (one-time, non-refundable until bin returned)
          if (b.bin_type === 'trash' && (b.notes || '').includes('unpaid')) {
            depositTotal += 25
            binLines.push('Trash bin deposit (refundable): $25.00')
          }
          return sum + binProrated
        }, 0)

        // Garage pickup proration — same logic as service
        const garageRate = customer.garage_side_pickup ? 10 : 0
        const garageProrated = garageRate > 0
          ? parseFloat(((garageRate / (totalPickups || 1)) * remainingPickups).toFixed(2))
          : 0

        const subtotal = proratedRate + binTotal + depositTotal + garageProrated
        const today = new Date()
        const periodStart = billingStart.toISOString().split('T')[0]
        // Quarterly: period covers 3 months; monthly: covers rest of billing month
        const isQuarterly = sub.billing_cycle === 'quarterly'
        const periodEnd = isQuarterly
          ? new Date(year, month + 3, 0).toISOString().split('T')[0]
          : new Date(year, month + 1, 0).toISOString().split('T')[0]
        const dueDate = today.toISOString().split('T')[0]  // Due on receipt

        const noteLines = [
          `${sub.services?.name || 'Service'} (${remainingPickups}/${totalPickups} ${pickupDay || 'weekly'} pickups): $${proratedRate.toFixed(2)}`,
          ...binLines,
          ...(garageProrated > 0 ? [`Garage pickup (${remainingPickups}/${totalPickups} pickups): $${garageProrated.toFixed(2)}`] : []),
        ].join(' | ')

        await sb('invoices', { method:'POST', body:{
          customer_id: customer.id,
          subscription_id: sub.id,
          subtotal,
          adjustments_total: 0,
          tax_rate: 0,
          tax_amount: 0,
          total: subtotal,
          status: 'sent',
          period_start: periodStart,
          period_end: periodEnd,
          due_date: dueDate,
          notes: `First invoice — due on receipt. ${noteLines}`,
        }})
      }

      // Send contract accepted email
      const emailSub = (customer as any).subscriptions?.[0]
      const planName = emailSub?.services?.name || 'Service Plan'
      const firstPickupLabel = emailSub?.billing_start
        ? new Date(emailSub.billing_start + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
        : 'your first scheduled day'
      fetch('/api/emails/contract-accepted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, planName, firstPickup: firstPickupLabel, invoiceTotal: 0 })
      }).catch(() => {})

      const updated = { ...customer, contract_accepted: true, status: 'active' } as any
      setCustomer(updated)
      sessionStorage.setItem('portal_customer', JSON.stringify(updated))
      loadPortalData(updated)
      showToast('Contract accepted! Your first invoice has been generated. Welcome aboard 🎉')
    } catch (e: any) { showToast('Failed to accept. Please contact us directly.', 'error') }
    setContractAccepting(false)
  }

  async function submitPickupAddon() {
    if (!customer) return
    if (selectedItems.length === 0 && !customItem.trim()) {
      showToast('Please select at least one item or describe what you need picked up.', 'error'); return
    }
    try {
      // Insert each catalog item
      for (const sel of selectedItems) {
        const item = catalog.find(c => c.id === sel.id)
        if (!item) continue
        for (let i = 0; i < sel.qty; i++) {
          await sb('pickup_addons', { method:'POST', body:{
            customer_id: customer.id,
            catalog_item_id: item.id,
            quantity: 1,
            estimated_price: item.is_fixed_price ? item.fixed_price : null,
            status: item.is_fixed_price ? 'confirmed' : 'pending_quote',
            requested_pickup_date: addonPickupDate || null,
          }})
        }
      }
      // Insert custom item if filled in
      if (customItem.trim()) {
        await sb('pickup_addons', { method:'POST', body:{
          customer_id: customer.id,
          custom_description: customItem.trim(),
          quantity: 1,
          status: 'pending_quote',
          requested_pickup_date: addonPickupDate || null,
        }})
      }
      showToast('Added to your next pickup! Suntosh will confirm.')
      setSelectedItems([])
      setCustomItem('')
      setAddonPickupDate('')
      loadPortalData(customer)
    } catch (e: any) { showToast(e.message || 'Failed to submit.', 'error') }
  }

  async function handleRequestService() {
    if (!selectedService || !customer) return
    const svc = services.find(s => s.id === selectedService)
    if (!svc) return
    const prorated = addTiming === 'immediate' ? prorateDays(svc.base_price_monthly, pickupDay) : null
    try {
      await sb('service_requests', { method:'POST', body:{
        customer_id: customer.id,
        service_id: selectedService,
        timing: addTiming,
        prorated_amount: prorated,
        status: 'pending',
        notes: addTiming === 'immediate' ? `Prorated $${prorated} for remainder of month` : 'Effective next billing cycle',
      }})
      showToast('Request submitted! Suntosh will review and activate your service.')
      setShowAddService(false)
      setSelectedService('')
    } catch (e: any) { showToast(e.message || 'Failed to submit request', 'error') }
  }

  async function handleSkipPickup() {
    if (!skipDate || !customer) { showToast('Please select a date.', 'error'); return }
    const used = quarterSkipsUsed(skips)
    if (used >= 2) { showToast('You have used both skip credits for this quarter.', 'error'); return }
    try {
      await sb('skip_requests', { method:'POST', body:{
        customer_id: customer.id,
        skip_date: skipDate,
        status: 'pending',
        refund_amount: customer.subscriptions?.[0]
          ? (() => {
              const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
              const skipDateObj = skipDate ? new Date(skipDate + 'T12:00:00') : new Date()
              const weekday = pickupDay ? DAYS.indexOf(pickupDay.toLowerCase()) : -1
              const freq = (customer as any).subscriptions?.[0]?.pickup_frequency || 'weekly'
              const bs = billingStartDate
              const pickupsInMonth = weekday !== -1 ? countWeekdayInMonth(skipDateObj.getFullYear(), skipDateObj.getMonth(), weekday, bs, freq) : (freq === 'biweekly' ? 2 : 4)
              return parseFloat((customer.subscriptions![0].rate / (pickupsInMonth || 2)).toFixed(2))
            })()
          : null,
      }})
      showToast('Skip request submitted! Credit will appear on your next bill.')
      setSkipDate('')
      loadPortalData(customer)
    } catch (e: any) { showToast(e.message || 'Failed to submit skip request.', 'error') }
  }

  function logout() {
    sessionStorage.removeItem('portal_customer')
    setCustomer(null); setScreen('login')
    setEmail(''); setPin(''); setTab('home')
  }

  // ── STYLES ──
  const card = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'1.5rem', color:'#fff' }
  const inputStyle = { width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'0.75rem 1rem', color:'#fff', fontSize:'0.95rem', boxSizing:'border-box' as const, outline:'none' }
  const btnGreen = { background:'#2e7d32', color:'#fff', border:'none', borderRadius:'8px', padding:'0.75rem 1.5rem', fontSize:'0.9rem', fontWeight:700, cursor:'pointer', width:'100%', fontFamily:'inherit' }
  const btnGhost = { background:'transparent', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'0.6rem 1.2rem', fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }

  // ── LOGIN SCREEN ──
  if (screen === 'login') return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:'6rem' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2.5rem', letterSpacing:'0.05em', marginBottom:'0.5rem', color:'#fff' }}>My Account</div>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9rem' }}>Manage your Patil Waste Removal service</p>
        </div>

        {loginStep === 'email' ? (
          <div style={{ ...card, padding:'2rem' }}>
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Email Address</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleEmailLookup()} autoFocus />
              <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginTop:'0.5rem' }}>Use the email address you signed up with.</p>
            </div>
            {error && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'0.65rem 0.9rem', fontSize:'0.83rem', color:'#f87171', marginBottom:'1rem' }}>{error}</div>}
            <button style={btnGreen} onClick={handleEmailLookup} disabled={loading}>{loading ? 'Looking up…' : 'Continue →'}</button>
          </div>
        ) : (
          <div style={{ ...card, padding:'2rem' }}>
            <div style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.5)', marginBottom:'1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>Signed in as <strong style={{ color:'#fff' }}>{email}</strong></span>
              <button onClick={() => { setLoginStep('email'); setPin(''); setError('') }} style={{ background:'none', border:'none', color:'#4caf50', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit' }}>Change</button>
            </div>
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>4-Digit PIN</label>
              <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} placeholder="••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
            </div>
            {error && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'0.65rem 0.9rem', fontSize:'0.83rem', color:'#f87171', marginBottom:'1rem' }}>{error}</div>}
            {!forgotPin ? (
              <>
                <button style={btnGreen} onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
                <button onClick={() => { setForgotPin(true); setError('') }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit', marginTop:'0.75rem', display:'block', width:'100%', textAlign:'center' }}>Forgot PIN?</button>
              </>
            ) : (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'1.25rem', marginTop:'0.5rem' }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#fff', marginBottom:'0.75rem' }}>Reset your PIN</div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>Last 4 digits of your phone</label>
                  <input style={inputStyle} type="tel" inputMode="numeric" maxLength={4} value={resetPhone} onChange={e => setResetPhone(e.target.value.replace(/\D/g,''))} placeholder="e.g. 9484" />
                </div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>New PIN</label>
                  <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={resetNewPin} onChange={e => setResetNewPin(e.target.value.replace(/\D/g,''))} placeholder="••••" />
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>Confirm New PIN</label>
                  <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={resetConfirmPin} onChange={e => setResetConfirmPin(e.target.value.replace(/\D/g,''))} placeholder="••••" />
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => { setForgotPin(false); setError('') }} style={{ flex:1, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)', borderRadius:'8px', padding:'0.65rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }}>Cancel</button>
                  <button style={{ ...btnGreen, flex:2 }} onClick={handleResetPin} disabled={loading}>{loading ? 'Resetting…' : 'Reset PIN'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginTop:'1.5rem' }}>
          Not a customer yet? <a href="/signup" style={{ color:'#4caf50' }}>Sign up here →</a>
        </p>
      </div>
    </main>
  )

  // ── SET PIN SCREEN ──
  if (screen === 'set-pin') return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:'6rem' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🔐</div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2rem', letterSpacing:'0.05em', marginBottom:'0.5rem', color:'#fff' }}>Set Your PIN</div>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.88rem' }}>Welcome, {customer?.first_name}! Create a 4-digit PIN for future logins.</p>
        </div>
        <div style={{ ...card, padding:'2rem' }}>
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>New PIN</label>
            <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} placeholder="••••" />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Confirm PIN</label>
            <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,''))} placeholder="••••" />
          </div>
          {error && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'0.65rem 0.9rem', fontSize:'0.83rem', color:'#f87171', marginBottom:'1rem' }}>{error}</div>}
          <button style={btnGreen} onClick={handleSetPin} disabled={loading}>{loading ? 'Saving…' : 'Set PIN & Continue'}</button>
        </div>
      </div>
    </main>
  )

  // Derive pickupDay early so it's available for both contract screen and dashboard
  const activeSub = customer ? customer.subscriptions?.find(s => s.status === 'active') : null
  const pickupDay = (activeSub as any)?.pickup_day || (customer as any)?.pickup_day || ''
  const pickupFrequency: string = (activeSub as any)?.pickup_frequency || 'weekly'
  const isBiweekly = pickupFrequency === 'biweekly'
  const billingStartDate = (activeSub as any)?.billing_start ? new Date((activeSub as any).billing_start + 'T12:00:00') : undefined

  // ── CONTRACT SCREEN ──
  if (customer && (customer as any).status === 'contract_pending' && !(customer as any).contract_accepted) {
    const sub = (customer as any).subscriptions?.[0]
    const rate = sub?.rate || 0
    const billingCycle = sub?.billing_cycle || 'monthly'
    const quarterlyRate = (rate * 3).toFixed(2)
    const planName = sub?.services?.name || 'Curbside Waste Removal'
    const pickupDayCap = pickupDay ? pickupDay.charAt(0).toUpperCase()+pickupDay.slice(1) : 'To Be Confirmed'
    const startDate = sub?.billing_start ? new Date(sub.billing_start+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : 'To Be Confirmed'
    const isRecycling = planName.toLowerCase().includes('recycling')
    const p = { fontSize:'0.9rem', color:'#333', lineHeight:'1.7', margin:'0 0 0.5rem 0' }
    const h3 = { fontSize:'0.82rem', fontWeight:700, color:'#111', margin:'0 0 0.3rem 0', textTransform:'uppercase' as const, letterSpacing:'0.04em' }
    const section = { marginBottom:'1.25rem', paddingBottom:'1.25rem', borderBottom:'1px solid #e5e5e5' }

    return (
      <main style={{ minHeight:'100vh', background:'#f5f5f5', paddingTop:'4rem', paddingBottom:'4rem' }}>
        <div style={{ maxWidth:'780px', margin:'0 auto', padding:'0 1.5rem' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
            <p style={{ fontSize:'0.8rem', color:'#888', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'0.5rem' }}>Patil Waste Removal LLC</p>
            <h1 style={{ fontSize:'clamp(1.8rem,5vw,2.8rem)', fontWeight:700, color:'#111', margin:'0 0 1rem' }}>
              Contract for {customer.first_name} {customer.last_name}
            </h1>
            <p style={{ fontSize:'0.95rem', color:'#555', maxWidth:'520px', margin:'0 auto', lineHeight:1.6 }}>
              Please carefully review this contract. In order to make things official, this contract must be reviewed and accepted. We look forward to working with you!
            </p>
          </div>

          <div style={{ background:'#fff', borderRadius:'10px', padding:'2.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>

            {/* Parties */}
            <div style={{ ...section, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
              <div>
                <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'#111', marginBottom:'0.75rem' }}>Parties</h2>
                <p style={{ ...p, fontWeight:600, marginBottom:'0.15rem' }}>Patil Waste Removal LLC.</p>
                <p style={{ ...p, margin:'0', color:'#555' }}>Patilwasteremoval@gmail.com</p>
                <p style={{ ...p, margin:'0', color:'#555' }}>80 Palomino Ln, Bedford NH 03110</p>
                <p style={{ ...p, margin:'0', color:'#555' }}>(802) 416-9484</p>
              </div>
              <div style={{ paddingTop:'2.75rem' }}>
                <p style={{ ...p, fontWeight:600, marginBottom:'0.15rem' }}>{customer.first_name} {customer.last_name}</p>
                <p style={{ ...p, margin:'0', color:'#555' }}>{customer.email}</p>
                <p style={{ ...p, margin:'0', color:'#555' }}>{customer.service_address}</p>
                {customer.phone && <p style={{ ...p, margin:'0', color:'#555' }}>{customer.phone}</p>}
              </div>
            </div>

            {/* Project Description */}
            <div style={section}>
              <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'#111', marginBottom:'0.75rem' }}>Project Description</h2>
              <p style={p}>
                Patil Waste Removal will provide you with trash{isRecycling ? ' and recycling' : ''} pick-up every <strong>{pickupDayCap}</strong> for the paid month.
                This entitles the customer to <strong>10 (13 gallon) trash bags</strong>{isRecycling ? <> and <strong>64 gallons of recycling</strong></> : ''}.
                The price of this service is <strong>${rate.toFixed(2)} monthly</strong> or <strong>${quarterlyRate} quarterly</strong>, due on the 25th of the prior month.
                Your first date of service is set for <strong>{startDate}</strong>.
              </p>
              <p style={p}>
                Patil Waste Removal will collect the trash every {pickupDayCap} that we are open as long as the bins are placed by the end of the driveway by <strong>8am and are easily accessible</strong>. If bins are not placed by the end of the driveway or chosen location by the time the driver arrives for pick up, the customer will still be charged.
              </p>
            </div>

            {/* Terms */}
            <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'#111', marginBottom:'1.25rem' }}>Terms</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
              <div>
                <div style={section}>
                  <h3 style={h3}>Payment</h3>
                  <p style={p}>With chosen services the monthly bill is ${rate.toFixed(2)} or ${quarterlyRate} quarterly. This can be paid through our online credit card processor listed on your invoice, through Venmo, Cashapp, or Cash handed to driver. (If paying cash please inform us so we will know to collect it along with your pick up.)</p>
                  <p style={p}>Your first invoice is <strong>due on receipt</strong> and covers the prorated period from your start date to the end of the month. Recurring invoices are issued on the <strong>25th of each month</strong> and due on the <strong>1st of the following month</strong>.</p>
                </div>
                <div style={section}>
                  <h3 style={h3}>Auto-Pay</h3>
                  <p style={p}>You may optionally save a credit or debit card through your customer portal to enable automatic monthly payments. If auto-pay is enabled, your card on file will be charged on the <strong>1st of each month</strong> for the outstanding invoice amount. Your first invoice will be charged immediately upon saving your card. You may disable auto-pay at any time by contacting Suntosh. Patil Waste Removal uses <strong>Stripe</strong> to process card payments — your card details are never stored on our servers.</p>
                </div>
                <div style={section}>
                  <h3 style={h3}>Payment Refund</h3>
                  <p style={p}>We do not offer refunds for services that have been completed. We can offer partial refunds for future weeks that were pre-paid if service is not needed, as long as we are <strong>informed by 5pm the day before scheduled pick up day.</strong></p>
                </div>
                <div style={section}>
                  <h3 style={h3}>Service Modification</h3>
                  <p style={p}>Patil Waste Removal reserves the right to modify, discontinue, suspend, or disable all or parts of your service.</p>
                </div>
                <div style={{ marginBottom:'1.25rem' }}>
                  <h3 style={h3}>Right to Terminate</h3>
                  <p style={p}>The customer can cancel service anytime they would like.</p>
                  <p style={p}>- If you cancel before your prepaid term ends, service will continue until the term expires. If you choose to end service immediately, you may receive a refund equal to one (1) week of service only.</p>
                  <p style={p}>Bins will be retrieved by the 30th of the canceled month and depending on the condition of the trash bin, the $25 deposit will be returned.</p>
                  <p style={{ ...p, marginBottom:0 }}>To cancel service please contact Patil Waste Removal by email or phone.</p>
                </div>
              </div>
              <div>
                <div style={section}>
                  <h3 style={h3}>Trash Pick-up</h3>
                  <p style={p}>The customer will have trash bagged and placed in bins, maximum of 10 (13 gallon) trash bags. Trash bin shall be brought to the end of the driveway by 8am of the scheduled pick-up day. Trash shall <strong>NOT contain any BROKEN GLASS, EXPLOSIVES, FIREARMS, AMMUNITION, COMBUSTIBLES, FIREWORKS, ASHES, SYRINGES, OR MEDICAL WASTE.</strong> If trash is unbagged or any prohibited items are found the trash will not be picked up and customer will still be charged.</p>
                </div>
                {isRecycling && (
                  <div style={section}>
                    <h3 style={h3}>Recycling Pick-up</h3>
                    <p style={p}><strong>Recycling must NOT be bagged (unless bagged in recyclable paper bags)</strong> Recycling must be placed in bin and brought to the end of the driveway by 8am of scheduled pick up day. Please ensure all items placed in recycling are recyclable, otherwise the whole bin of recycling will have to be considered as trash. <strong>Glass must be kept separate.</strong> (Either placed on top of recyclables in bin or placed in cardboard box next to recycling bin)</p>
                  </div>
                )}
                <div style={section}>
                  <h3 style={h3}>Over Allotted Trash Amount</h3>
                  <p style={p}>If Patil Waste Removal is notified of extra bags by 5pm the night before pick-up then the extra bags will be charged at <strong>$2 per 13 gal bag extra</strong> and <strong>$3.50 per extra 32 gallon bag</strong>. If Patil Waste Removal is <strong>NOT notified</strong> then extra bags will be charged <strong>$3.50 per extra 13 gallon trash bag</strong> and <strong>$5 per extra 32 gallon bag</strong>.</p>
                </div>
                <div>
                  <h3 style={h3}>Bin Rentals</h3>
                  <p style={{ ...p, marginBottom:0 }}>Trash Bins require a $25 deposit which will be returned when Patil Waste Removal retrieves the bin given the bin is not excessively damaged. Bins are property of Patil Waste Removal and are required to be returned by the customer at the end of service.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Accept section */}
          <div style={{ background:'#fff', borderRadius:'10px', padding:'2rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', textAlign:'center' }}>
            <p style={{ fontSize:'0.9rem', color:'#555', marginBottom:'1.25rem', lineHeight:1.6 }}>
              By clicking Accept below, <strong style={{ color:'#111' }}>{customer.first_name} {customer.last_name}</strong>, you confirm you have read and agree to the Patil Waste Removal service agreement and authorize billing as described above.
            </p>
            <div style={{ display:'flex', gap:'0.75rem', maxWidth:'480px', margin:'0 auto' }}>
              <button onClick={logout} style={{ flex:1, background:'transparent', border:'1px solid #ddd', color:'#888', borderRadius:'8px', padding:'0.85rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.9rem' }}>Decline</button>
              <button onClick={acceptContract} disabled={contractAccepting} style={{ flex:2, background:'#2e7d32', color:'#fff', border:'none', borderRadius:'8px', padding:'0.85rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.95rem', fontWeight:700, opacity:contractAccepting?0.7:1 }}>
                {contractAccepting ? 'Processing…' : '✅ I Accept — Activate My Account'}
              </button>
            </div>
            <p style={{ fontSize:'0.78rem', color:'#aaa', marginTop:'0.75rem' }}>Questions? Call or text Patil Waste Removal at (802) 416-9484</p>
          </div>

        </div>
      </main>
    )
  }

  // ── DASHBOARD ──
  if (!customer) return null
  const skipsUsed = quarterSkipsUsed(skips)
  const skipsLeft = Math.max(0, 2 - skipsUsed)

  // Filter out services already subscribed to
  const subscribedIds = (customer.subscriptions || [])
    .filter((s:any) => s.status === 'active')
    .map((s: any) => s.service_id || s.services?.id)
  const availableServices = (() => {
    const seenNames = new Set<string>()
    return services.filter((s:any) => {
      if (subscribedIds.includes(s.id)) return false
      if (seenNames.has(s.name)) return false
      seenNames.add(s.name); return true
    })
  })()

  return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', paddingTop:'3rem' }}>
      {/* Header bar */}
      <div style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'1rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.5rem', letterSpacing:'0.05em', color:'#fff' }}>
            Hey, {customer.first_name} 👋
          </div>
          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>{customer.service_address}</div>
        </div>
        <button style={btnGhost} onClick={logout}>Sign Out</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 2rem', gap:'0.25rem', overflowX:'auto' }}>
        {([['home','🏠 Overview'],['calendar','📅 Schedule'],['pickup','📦 Add to Pickup'],['services','➕ Services'],['skips','⏸️ Skip Pickup'],['billing','💳 Billing']] as [typeof tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background:'none', border:'none', color: tab===id ? '#4caf50' : 'rgba(255,255,255,0.4)', borderBottom: tab===id ? '2px solid #4caf50' : '2px solid transparent', padding:'0.85rem 1.25rem', cursor:'pointer', fontSize:'0.82rem', fontWeight:600, fontFamily:'inherit', whiteSpace:'nowrap', transition:'color 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:'860px', margin:'0 auto', padding:'2rem' }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* Notices */}
            {notices.length > 0 && (
              <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'10px', padding:'1.25rem 1.5rem' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#f59e0b', marginBottom:'0.75rem' }}>📢 Schedule Notices</div>
                {notices.map((n: any) => (
                  <div key={n.id} style={{ paddingBottom:'0.6rem', marginBottom:'0.6rem', borderBottom:'1px solid rgba(245,158,11,0.12)', fontSize:'0.87rem' }}>
                    <span style={{ color:'#fbbf24', fontWeight:600 }}>{new Date(n.notice_date).toLocaleDateString('en-US', { month:'short', day:'numeric' })} — </span>
                    {n.message}
                  </div>
                ))}
              </div>
            )}

            {/* Plan card */}
            <div style={{ ...card, borderLeft:'3px solid #2e7d32' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Your Plan</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem' }}>
                {[
                  ['Service', activeSub?.services?.name || '—'],
                  ['Monthly Rate', activeSub ? `$${activeSub.rate}/mo` : '—'],
                  ['Billing', activeSub ? (activeSub.billing_cycle === 'quarterly' ? 'Quarterly' : 'Monthly') : '—'],
                  ['Status', customer.status.charAt(0).toUpperCase() + customer.status.slice(1)],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.65)', marginBottom:'0.2rem' }}>{label}</div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem', color:'#fff' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup info */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Pickup Schedule</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.65)', marginBottom:'0.2rem' }}>Pickup Day</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', textTransform:'capitalize', color:'#fff' }}>{pickupDay || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.65)', marginBottom:'0.2rem' }}>Next Pickup</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', color:'#4caf50' }}>{nextPickupDate(pickupDay, (activeSub as any)?.billing_start)}</div>
                </div>
              </div>
              {customer.garage_side_pickup && (
                <div style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>🏠 Garage-side pickup enabled</div>
              )}
            </div>

            {/* Bin rentals */}
            {bins.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Bin Rentals</div>
                {bins.map((b: any) => (
                  <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'0.6rem', marginBottom:'0.6rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:'0.88rem' }}>{b.bin_type === 'trash' ? '🗑️ Trash Bin' : '♻️ Recycling Bin'} <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.78rem' }}>${b.monthly_rental_fee}/mo</span></span>
                    {b.bin_type === 'trash' && (
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color: !(b.notes||'').includes('unpaid') ? '#4caf50' : '#f59e0b', background: !(b.notes||'').includes('unpaid') ? 'rgba(76,175,80,0.1)' : 'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>
                        {!(b.notes||'').includes('unpaid') ? '✅ Deposit Paid' : '⚠️ Deposit Due ($25)'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Account details */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)' }}>Account Details</div>
                {!editingContact && (
                  <button onClick={() => { setContactForm({ email: customer.email || '', phone: customer.phone || '' }); setEditingContact(true) }}
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'5px', color:'rgba(255,255,255,0.55)', padding:'0.2rem 0.6rem', cursor:'pointer', fontSize:'0.72rem', fontFamily:'inherit' }}>
                    ✏️ Edit
                  </button>
                )}
              </div>
              {editingContact ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.3rem' }}>Email</label>
                    <input value={contactForm.email} onChange={e => setContactForm(p => ({...p, email: e.target.value}))}
                      style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'7px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.88rem', fontFamily:'inherit', boxSizing:'border-box' as const }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.3rem' }}>Phone</label>
                    <input value={contactForm.phone} onChange={e => setContactForm(p => ({...p, phone: e.target.value}))}
                      style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'7px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.88rem', fontFamily:'inherit', boxSizing:'border-box' as const }} />
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'rgba(255,179,0,0.8)' }}>⚠️ Changing your email will update your login — use your new email next time you sign in.</div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button onClick={async () => {
                      if (!contactForm.email) { showToast('Email cannot be empty', 'error'); return }
                      setContactSaving(true)
                      try {
                        await sb(`customers?id=eq.${customer.id}`, { method:'PATCH', body:{ email: contactForm.email.toLowerCase().trim(), phone: contactForm.phone.trim() || null }, prefer:'return=minimal' })
                        const updated = { ...customer, email: contactForm.email.toLowerCase().trim(), phone: contactForm.phone.trim() }
                        setCustomer(updated as any)
                        sessionStorage.setItem('portal_customer', JSON.stringify(updated))
                        setEditingContact(false)
                        showToast('Contact details updated ✅')
                      } catch { showToast('Failed to update. Please contact us.', 'error') }
                      setContactSaving(false)
                    }} disabled={contactSaving} style={{ flex:2, background:'#2e7d32', border:'none', borderRadius:'7px', color:'#fff', padding:'0.6rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:700 }}>
                      {contactSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditingContact(false)} style={{ flex:1, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'7px', color:'rgba(255,255,255,0.5)', padding:'0.6rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {[['Email', customer.email], ['Phone', customer.phone || '—'], ['Address', customer.service_address]].map(([label, val]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem', padding:'0.35rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.78rem' }}>{label}</span>
                      <span style={{ color:'#fff' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skip credits */}
            <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'0.4rem' }}>Skip Credits This Quarter</div>
                <div style={{ fontSize:'0.9rem' }}>
                  <span style={{ fontSize:'1.4rem', fontWeight:700, color: skipsLeft > 0 ? '#4caf50' : '#f87171' }}>{skipsLeft}</span>
                  <span style={{ color:'rgba(255,255,255,0.6)' }}> / 2 remaining</span>
                </div>
              </div>
              <button onClick={() => setTab('skips')} style={{ ...btnGhost, width:'auto' }}>Skip a Pickup →</button>
            </div>
          </div>
        )}

        {/* ── CALENDAR TAB ── */}
        {tab === 'calendar' && (() => {
          const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
          const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
          const { year, month } = calMonth
          const firstDay = new Date(year, month, 1).getDay()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const pickupDayIndex = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf((pickupDay || '').toLowerCase())
          const calBillingStart = (activeSub as any)?.billing_start || null

          // Build a set of notice dates for quick lookup
          const noticeMap: Record<string, any> = {}
          for (const n of notices) {
            if (n.affected_date) noticeMap[n.affected_date] = n
          }
          // Build skip map from customer's skip requests
          const skipMap: Record<string, any> = {}
          for (const sk of skips) {
            if (sk.skip_date) skipMap[sk.skip_date] = sk
          }

          const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]
          while (cells.length % 7 !== 0) cells.push(null)

          const today = new Date()
          const todayStr = today.toISOString().split('T')[0]

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              {/* Month navigator */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <button onClick={() => setCalMonth(p => {
                  const d = new Date(p.year, p.month - 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:'6px', padding:'0.4rem 0.85rem', cursor:'pointer', fontSize:'1rem', fontFamily:'inherit' }}>‹</button>
                <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.6rem', letterSpacing:'0.05em', color:'#fff' }}>{MONTHS[month]} {year}</div>
                <button onClick={() => setCalMonth(p => {
                  const d = new Date(p.year, p.month + 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:'6px', padding:'0.4rem 0.85rem', cursor:'pointer', fontSize:'1rem', fontFamily:'inherit' }}>›</button>
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                {[
                  ['#2e7d32','rgba(46,125,50,0.15)','Pickup Day'],
                  ['#f59e0b','rgba(245,158,11,0.15)','Rescheduled'],
                  ['#dc2626','rgba(220,38,38,0.12)','Cancelled / Skipped'],
                  ['#818cf8','rgba(99,102,241,0.12)','Skip Pending'],
                  ['rgba(255,255,255,0.15)','rgba(255,255,255,0.04)','Today'],
                ].map(([border, bg, label]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>
                    <div style={{ width:'14px', height:'14px', borderRadius:'3px', background: bg as string, border:`1.5px solid ${border}` }} />
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden' }}>
                {/* Day headers */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d} style={{ padding:'0.6rem 0', textAlign:'center', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)' }}>{d}</div>
                  ))}
                </div>
                {/* Weeks */}
                {Array.from({ length: cells.length / 7 }, (_, week) => (
                  <div key={week} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                      if (!day) return <div key={i} style={{ padding:'0.75rem', minHeight:'52px' }} />
                      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                      const dayOfWeek = new Date(year, month, day).getDay()
                      const isPickupDayOfWeek = pickupDayIndex !== -1 && dayOfWeek === pickupDayIndex
                        && (!calBillingStart || dateStr >= calBillingStart)
                      // For biweekly: only every other occurrence from billing_start
                      const isPickupDay = isPickupDayOfWeek && (() => {
                        if (!isBiweekly || !billingStartDate) return true
                        const cellDate = new Date(year, month, parseInt(dateStr.split('-')[2]))
                        const msPerWeek = 7 * 24 * 60 * 60 * 1000
                        const weeksDiff = Math.round((cellDate.getTime() - billingStartDate.getTime()) / msPerWeek)
                        return weeksDiff % 2 === 0
                      })()
                      const notice = noticeMap[dateStr]
                      const isCancelled = notice?.notice_type === 'cancellation'
                      const isRescheduled = notice?.notice_type === 'reschedule'
                      const skipRequest = skipMap[dateStr]
                      const isSkipped = !!skipRequest && skipRequest.status === 'approved'
                      const isSkipPending = !!skipRequest && skipRequest.status === 'pending'
                      const isToday = dateStr === todayStr
                      const isPast = dateStr < todayStr

                      let bg = 'transparent'
                      let border = 'transparent'
                      let dotColor = ''

                      if (isPickupDay && !isCancelled && !isSkipped) { bg = 'rgba(46,125,50,0.15)'; border = '#2e7d32' }
                      if (isCancelled || isSkipped) { bg = 'rgba(220,38,38,0.12)'; border = '#dc2626' }
                      if (isRescheduled) { bg = 'rgba(245,158,11,0.12)'; border = '#f59e0b' }
                      if (isSkipPending) { bg = 'rgba(99,102,241,0.12)'; border = '#818cf8' }
                      if (isToday) { border = 'rgba(255,255,255,0.4)' }

                      // Check if this date is a replacement day
                      const isReplacement = notices.some((n:any) => n.replacement_date === dateStr)
                      if (isReplacement) { bg = 'rgba(245,158,11,0.12)'; border = '#f59e0b' }

                      return (
                        <div key={i} title={notice?.message || (isReplacement ? 'Replacement pickup' : '')} style={{
                          padding:'0.5rem',
                          minHeight:'52px',
                          background: bg,
                          border: `1.5px solid ${border}`,
                          margin:'1px',
                          borderRadius:'5px',
                          cursor: notice ? 'pointer' : 'default',
                          opacity: isPast && !isToday ? 0.45 : 1,
                          transition:'opacity 0.15s',
                        }}>
                          <div style={{ fontSize:'0.82rem', fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : 'rgba(255,255,255,0.9)', marginBottom:'0.2rem' }}>{day}</div>
                          {isPickupDay && !isCancelled && !isRescheduled && (
                            <div style={{ fontSize:'0.6rem', color:'#4caf50', fontWeight:700 }}>PICKUP</div>
                          )}
                          {(isCancelled || isSkipped) && <div style={{ fontSize:'0.6rem', color:'#f87171', fontWeight:700 }}>{isSkipped ? 'SKIPPED' : 'CANCELLED'}</div>}
                          {isRescheduled && <div style={{ fontSize:'0.6rem', color:'#fbbf24', fontWeight:700 }}>MOVED</div>}
                          {isSkipPending && <div style={{ fontSize:'0.6rem', color:'#a5b4fc', fontWeight:700 }}>SKIP?</div>}
                          {isReplacement && <div style={{ fontSize:'0.6rem', color:'#fbbf24', fontWeight:700 }}>NEW DAY</div>}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Notices for this month */}
              {notices.filter((n:any) => {
                const d = n.affected_date || n.notice_date
                return d && d.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)
              }).length > 0 && (
                <div style={card}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'0.75rem' }}>This Month's Notices</div>
                  {notices.filter((n:any) => {
                    const d = n.affected_date || n.notice_date
                    return d && d.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)
                  }).map((n:any) => (
                    <div key={n.id} style={{ padding:'0.65rem 0.85rem', marginBottom:'0.5rem', borderRadius:'6px', background: n.notice_type==='cancellation'?'rgba(220,38,38,0.08)': n.notice_type==='reschedule'?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.04)', border:`1px solid ${n.notice_type==='cancellation'?'rgba(220,38,38,0.25)': n.notice_type==='reschedule'?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.08)'}` }}>
                      <div style={{ fontSize:'0.82rem', fontWeight:600, marginBottom:'0.2rem', color:'#fff' }}>
                        {n.notice_type==='cancellation'?'❌':n.notice_type==='reschedule'?'🔄':'📢'} {n.message}
                      </div>
                      {n.affected_date && <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)' }}>Affected: {new Date(n.affected_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>}
                      {n.replacement_date && <div style={{ fontSize:'0.75rem', color:'#fbbf24', marginTop:'0.15rem' }}>New pickup: {new Date(n.replacement_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming pickups summary */}
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'0.75rem' }}>Upcoming Pickups</div>
                {pickupDayIndex === -1 ? (
                  <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.55)' }}>Pickup day not set yet — Suntosh will confirm when activating your account.</p>
                ) : (() => {
                  const upcoming: string[] = []
                  const billingStartDate = (activeSub as any)?.billing_start
                  const startFrom = billingStartDate && new Date(billingStartDate+'T12:00:00') > new Date()
                    ? new Date(billingStartDate+'T12:00:00')
                    : new Date()
                  const d = new Date(startFrom)
                  if (startFrom <= new Date()) d.setDate(d.getDate() + 1)
                  while (upcoming.length < 4) {
                    if (d.getDay() === pickupDayIndex) {
                      // For biweekly: skip off-weeks
                      let isPickupWeek = true
                      if (isBiweekly && billingStartDate) {
                        const msPerWeek = 7 * 24 * 60 * 60 * 1000
                        const weeksDiff = Math.round((d.getTime() - billingStartDate.getTime()) / msPerWeek)
                        isPickupWeek = weeksDiff % 2 === 0
                      }
                      if (isPickupWeek) {
                        const ds = d.toISOString().split('T')[0]
                        upcoming.push(ds)
                      }
                    }
                    d.setDate(d.getDate() + 1)
                  }
                  return upcoming.map(ds => {
                    const notice = noticeMap[ds]
                    const isCancelled = notice?.notice_type === 'cancellation'
                    const replacementDate = notice?.replacement_date
                    const skipReq = skipMap[ds]
                    const isSkipped = skipReq?.status === 'approved'
                    const isSkipPending = skipReq?.status === 'pending'
                    return (
                      <div key={ds} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.55rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.85rem' }}>
                        <span style={{ textDecoration: (isCancelled || isSkipped) ? 'line-through' : 'none', color: (isCancelled || isSkipped) ? 'rgba(255,255,255,0.35)' : '#fff' }}>
                          {new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
                        </span>
                        {isCancelled && !replacementDate && <span style={{ fontSize:'0.72rem', color:'#f87171', fontWeight:700 }}>CANCELLED</span>}
                        {isSkipped && <span style={{ fontSize:'0.72rem', color:'#f87171', fontWeight:700 }}>SKIPPED ✓</span>}
                        {isSkipPending && <span style={{ fontSize:'0.72rem', color:'#a5b4fc', fontWeight:700 }}>SKIP PENDING</span>}
                        {replacementDate && <span style={{ fontSize:'0.72rem', color:'#fbbf24', fontWeight:700 }}>→ {new Date(replacementDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>}
                        {!notice && !skipReq && <span style={{ fontSize:'0.72rem', color:'#4caf50', fontWeight:700 }}>✓ On schedule</span>}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )
        })()}

        {/* ── ADD TO PICKUP TAB ── */}
        {tab === 'pickup' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ background:'rgba(46,125,50,0.08)', border:'1px solid rgba(46,125,50,0.2)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.84rem', color:'rgba(255,255,255,0.8)' }}>
              📦 Add bulky items or extra bags to your next scheduled pickup. Fixed-price items are confirmed automatically — anything else will be quoted by Suntosh before your pickup.
            </div>

            {/* Extra bags — fixed price, shown first and prominently */}
            {(() => {
              const bags = catalog.filter((item: any) => item.is_fixed_price)
              const bulky = catalog.filter((item: any) => !item.is_fixed_price)
              const ItemRow = ({ item }: { item: any }) => {
                const sel = selectedItems.find(s => s.id === item.id)
                const isBag = item.is_fixed_price
                return (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: sel ? 'rgba(46,125,50,0.12)' : 'rgba(255,255,255,0.05)', border:`1px solid ${sel ? 'rgba(46,125,50,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius:'7px', padding:'0.7rem 0.9rem', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <input type='checkbox' checked={!!sel} onChange={e => {
                        setSelectedItems(prev => e.target.checked ? [...prev, {id:item.id, qty:1}] : prev.filter(s => s.id !== item.id))
                      }} style={{ accentColor:'#2e7d32', width:'16px', height:'16px', flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#fff' }}>{item.name}</div>
                        <div style={{ fontSize:'0.75rem', marginTop:'0.15rem' }}>
                          {isBag
                            ? <span style={{ color:'#4caf50', fontWeight:700 }}>${item.fixed_price} each</span>
                            : <><span style={{ color:'rgba(255,255,255,0.65)' }}>Est. ${item.estimate_min}–${item.estimate_max}</span><span style={{ color:'#f59e0b', marginLeft:'0.4rem' }}>· quote required</span></>
                          }
                        </div>
                      </div>
                    </div>
                    {/* Quantity controls — always visible for bags, show after check for bulky */}
                    {(sel || isBag) && sel && (
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'rgba(0,0,0,0.25)', borderRadius:'6px', padding:'0.2rem 0.4rem' }}>
                        <button onClick={() => setSelectedItems(prev => prev.map(s => s.id===item.id ? {...s, qty:Math.max(1,s.qty-1)} : s))} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:'4px', width:'28px', height:'28px', cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>−</button>
                        <span style={{ fontSize:'0.95rem', fontWeight:700, minWidth:'24px', textAlign:'center', color:'#fff' }}>{sel.qty}</span>
                        <button onClick={() => setSelectedItems(prev => prev.map(s => s.id===item.id ? {...s, qty:s.qty+1} : s))} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:'4px', width:'28px', height:'28px', cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>+</button>
                      </div>
                    )}
                    {isBag && !sel && (
                      <button onClick={() => setSelectedItems(prev => [...prev, {id:item.id, qty:1}])} style={{ background:'rgba(46,125,50,0.2)', border:'1px solid rgba(46,125,50,0.4)', color:'#4caf50', borderRadius:'6px', padding:'0.3rem 0.8rem', cursor:'pointer', fontSize:'0.8rem', fontWeight:700, fontFamily:'inherit' }}>+ Add</button>
                    )}
                  </div>
                )
              }
              return (
                <>
                  {bags.length > 0 && (
                    <div style={card}>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.75rem' }}>Extra Bags</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {bags.map((item: any) => <ItemRow key={item.id} item={item} />)}
                      </div>
                    </div>
                  )}
                  {bulky.length > 0 && (
                    <div style={card}>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.75rem' }}>Bulky Items</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {bulky.map((item: any) => <ItemRow key={item.id} item={item} />)}
                      </div>
                    </div>
                  )}
                  {catalog.length === 0 && <div style={card}><p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.5)' }}>No items available yet.</p></div>}
                </>
              )
            })()}

            {/* Custom item */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.75rem' }}>Something Not Listed?</div>
              <textarea value={customItem} onChange={e => setCustomItem(e.target.value)} rows={2} placeholder="Describe what you need picked up (e.g. old recliner, broken dishwasher)..." style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.86rem', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' as const }} />
              <p style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.5)', marginTop:'0.4rem' }}>Suntosh will review and send you a price before confirming.</p>
            </div>

            {/* Preferred pickup date */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.75rem' }}>Preferred Pickup Date</div>
              <input type='date' value={addonPickupDate} onChange={e => setAddonPickupDate(e.target.value)} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.86rem' }} />
              <p style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.5)', marginTop:'0.4rem' }}>Leave blank and it will be added to your next regular pickup.</p>
            </div>

            {/* Summary + submit */}
            {(selectedItems.length > 0 || customItem.trim()) && (
              <div style={{ background:'rgba(46,125,50,0.08)', border:'1px solid rgba(46,125,50,0.25)', borderRadius:'8px', padding:'1rem 1.25rem' }}>
                <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.5rem' }}>Summary</div>
                {selectedItems.map(sel => {
                  const item = catalog.find(c => c.id === sel.id)
                  if (!item) return null
                  const price = item.is_fixed_price ? `$${item.fixed_price}` : `$${item.estimate_min}–$${item.estimate_max} est.`
                  return <div key={sel.id} style={{ fontSize:'0.86rem', display:'flex', justifyContent:'space-between', paddingBottom:'0.3rem' }}><span>{sel.qty}× {item.name}</span><span style={{ color:'#4caf50' }}>{price}</span></div>
                })}
                {customItem.trim() && <div style={{ fontSize:'0.86rem', display:'flex', justifyContent:'space-between', paddingBottom:'0.3rem' }}><span>Custom: {customItem.trim().slice(0,40)}{customItem.length>40?'…':''}</span><span style={{ color:'#f59e0b' }}>To be quoted</span></div>}
              </div>
            )}
            <button onClick={submitPickupAddon} style={{ ...btnGreen, width:'auto', alignSelf:'flex-start', padding:'0.75rem 2rem' }}>Submit Pickup Request</button>

            {/* Past addons */}
            {pickupAddons.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'0.75rem' }}>Recent Requests</div>
                {pickupAddons.slice(0,5).map((a: any) => (
                  <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.55rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.84rem' }}>
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>{a.custom_description || a.catalog_item_id}</span>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', padding:'0.15rem 0.5rem', borderRadius:'4px',
                      color: a.status==='confirmed'?'#4caf50': a.status==='pending_quote'?'#f59e0b':'#9ca3af',
                      background: a.status==='confirmed'?'rgba(76,175,80,0.1)': a.status==='pending_quote'?'rgba(245,158,11,0.1)':'rgba(156,163,175,0.1)'
                    }}>{a.status==='pending_quote'?'Pending Quote':a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SERVICES TAB ── */}
        {tab === 'services' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:'10px', padding:'1.5rem' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:'1rem' }}>Current Services</div>
              {(() => {
                const activeSubs = (customer.subscriptions || []).filter((s:any) => s.status === 'active')
                const seen = new Set<string>()
                const unique = activeSubs.filter((s:any) => {
                  const key = s.service_id || s.services?.id || s.services?.name
                  if (!key || seen.has(key)) return false
                  seen.add(key); return true
                })
                if (unique.length === 0) return (
                  <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.9rem' }}>No active services yet.</p>
                )
                return unique.map((s:any) => (
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.8rem 0', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem' }}>{s.services?.name}</span>
                    <span style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.85rem' }}>${s.rate}/mo · {s.billing_cycle}</span>
                  </div>
                ))
              })()}
            </div>

            {availableServices.length > 0 && (
              <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:'10px', padding:'1.5rem' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:'1rem' }}>Add a Service</div>
                {availableServices.map((s:any) => (
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.8rem 0', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.95rem', color:'#fff' }}>{s.name}</div>
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.6)', marginTop:'0.2rem' }}>${s.base_price_monthly}/mo</div>
                    </div>
                    <button onClick={() => { setSelectedService(s.id); setShowAddService(true) }} style={{ background:'rgba(46,125,50,0.2)', border:'1px solid rgba(46,125,50,0.45)', color:'#4caf50', borderRadius:'6px', padding:'0.45rem 1rem', cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'inherit' }}>Request →</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'rgba(46,125,50,0.1)', border:'1px solid rgba(46,125,50,0.3)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.85rem', color:'rgba(255,255,255,0.8)' }}>
              ℹ️ Service additions are reviewed by Suntosh and activated within 1 business day. Immediate additions are prorated for the remainder of the month.
            </div>
          </div>
        )}

        {/* ── SKIP TAB ── */}
        {tab === 'skips' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ ...card, borderLeft:`3px solid ${skipsLeft > 0 ? '#2e7d32' : '#dc2626'}` }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'0.75rem' }}>This Quarter</div>
              <div style={{ fontSize:'2rem', fontWeight:700, color: skipsLeft > 0 ? '#4caf50' : '#f87171' }}>{skipsLeft} skip{skipsLeft !== 1 ? 's' : ''} remaining</div>
              <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.45)', marginTop:'0.4rem' }}>
                You get 2 refundable skip credits per quarter. Credits appear as a deduction on your next bill.
              </p>
            </div>

            {skipsLeft > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Request a Skip</div>
                <label style={{ display:'block', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.6rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Which pickup date to skip?</label>
                {(() => {
                  if (!pickupDay) return <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.4)' }}>Pickup day not set yet.</p>
                  const WDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
                  const weekday = WDAYS.indexOf(pickupDay.toLowerCase())
                  const dates: string[] = []
                  const start = (activeSub as any)?.billing_start
                    ? new Date(Math.max(new Date((activeSub as any).billing_start+'T12:00:00').getTime(), Date.now()))
                    : new Date()
                  const d = new Date(start)
                  // Find next pickup day
                  const diff = (weekday - d.getDay() + 7) % 7 || 7
                  d.setDate(d.getDate() + diff)
                  // Advance to first pickup day
                  while (dates.length < 8) {
                    // For biweekly: only push pickup weeks
                    if (!isBiweekly || !billingStartDate) {
                      dates.push(d.toISOString().split('T')[0])
                      d.setDate(d.getDate() + 7)
                    } else {
                      const msPerWeek = 7 * 24 * 60 * 60 * 1000
                      const weeksDiff = Math.round((d.getTime() - billingStartDate.getTime()) / msPerWeek)
                      if (weeksDiff % 2 === 0) dates.push(d.toISOString().split('T')[0])
                      d.setDate(d.getDate() + 7)
                    }
                  }
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'1rem' }}>
                      {dates.map(ds => {
                        const label = new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
                        const selected = skipDate === ds
                        return (
                          <button key={ds} onClick={() => setSkipDate(ds)}
                            style={{ background: selected ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selected ? 'rgba(46,125,50,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius:'7px', padding:'0.65rem 1rem', color: selected ? '#4caf50' : '#fff', fontSize:'0.88rem', fontWeight: selected ? 700 : 400, cursor:'pointer', textAlign:'left', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span>{label}</span>
                            {selected && <span style={{ fontSize:'0.8rem' }}>✓ Selected</span>}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.6)', marginBottom:'1.25rem' }}>
                  Estimated credit: <strong style={{ color:'#4caf50' }}>${activeSub ? (() => {
                    const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
                    const now = new Date()
                    const weekday = pickupDay ? DAYS.indexOf(pickupDay.toLowerCase()) : -1
                    const pickupsInMonth = weekday !== -1 ? countWeekdayInMonth(now.getFullYear(), now.getMonth(), weekday) : 4
                    return (activeSub.rate / (pickupsInMonth || 4)).toFixed(2)
                  })() : '—'}</strong> on your next bill
                </div>
                <button onClick={handleSkipPickup} style={{ ...btnGreen, width:'auto', padding:'0.65rem 1.5rem' }}>Submit Skip Request</button>
              </div>
            )}

            {skips.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Skip History</div>
                {skips.map((sk: any) => (
                  <div key={sk.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.65rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.85rem' }}>
                    <span>{new Date(sk.skip_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
                    <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                      {sk.refund_amount && <span style={{ color:'#4caf50', fontSize:'0.78rem' }}>-${sk.refund_amount} credit</span>}
                      <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color: sk.status==='approved'?'#4caf50': sk.status==='pending'?'#f59e0b':'#f87171', background: sk.status==='approved'?'rgba(76,175,80,0.1)': sk.status==='pending'?'rgba(245,158,11,0.1)':'rgba(248,113,113,0.1)', padding:'0.15rem 0.5rem', borderRadius:'4px' }}>{sk.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {tab === 'billing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* Current invoice / amount due */}
            {(() => {
              const current = invoices.find((inv: any) => inv.status === 'sent' || inv.status === 'overdue')
              if (!current) return null
              return (
                <div style={{ ...card, borderLeft:`3px solid ${current.status==='overdue'?'#dc2626':'#f59e0b'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                    <div>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: current.status==='overdue'?'#f87171':'#f59e0b', marginBottom:'0.3rem' }}>
                        {current.status === 'overdue' ? '⚠️ Payment Overdue' : '📄 Invoice Due'}
                      </div>
                      <div style={{ fontSize:'1.8rem', fontWeight:700, color:'#fff' }}>${Number(current.total).toFixed(2)}</div>
                      <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.6)', marginTop:'0.2rem' }}>Due {current.due_date} · Period {current.period_start} – {current.period_end}</div>
                    </div>
                    {(customer as any).auto_pay && (customer as any).stripe_payment_method_id ? (
                      <div style={{ background:'rgba(46,125,50,0.1)', border:'1px solid rgba(46,125,50,0.3)', borderRadius:'6px', padding:'0.4rem 0.8rem', fontSize:'0.75rem', color:'#4caf50', fontWeight:700 }}>✅ Auto-pay on</div>
                    ) : (
                      <button onClick={async () => {
                        setPayingNow(true)
                        try {
                          const res = await fetch('/api/stripe/checkout-session', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ invoiceId: current.id, customerId: customer.id }) })
                          const data = await res.json()
                          if (data.url) window.location.href = data.url
                          else showToast('Could not start payment. Call us at (802) 416-9484', 'error')
                        } catch { showToast('Payment error. Call us at (802) 416-9484', 'error') }
                        setPayingNow(false)
                      }} disabled={payingNow} style={{ background:'#2e7d32', color:'#fff', borderRadius:'6px', padding:'0.55rem 1.1rem', fontSize:'0.82rem', fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', opacity: payingNow ? 0.7 : 1 }}>
                        {payingNow ? 'Loading…' : 'Pay Now →'}
                      </button>
                    )}
                  </div>
                  {current.notes && (
                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.75)', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'0.6rem', marginTop:'0.25rem' }}>{current.notes}</div>
                  )}
                </div>
              )
            })()}

            {/* Auto-pay card setup */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Auto-Pay</div>
              {(customer as any).auto_pay && (customer as any).stripe_payment_method_id ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.5rem' }}>
                    <span style={{ fontSize:'1.2rem' }}>💳</span>
                    <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#fff' }}>Card saved — auto-pay enabled</span>
                  </div>
                  <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.6)' }}>Your card will be charged automatically on the 1st of each month. To update your card, contact Patil Waste Removal.</p>
                </div>
              ) : cardSaved ? (
                <div style={{ color:'#4caf50', fontSize:'0.9rem', fontWeight:600 }}>✅ Card saved! Auto-pay is now enabled.</div>
              ) : (
                <div>
                  <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Save a card to enable automatic monthly payments — no need to log in to pay each month.</p>
                  <button onClick={async () => {
                    setCardSaving(true)
                    try {
                      const res = await fetch('/api/stripe/setup-intent', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customerId: customer.id }) })
                      const { url, error } = await res.json()
                      if (url) window.location.href = url
                      else showToast(error || 'Could not start card setup. Please call us.', 'error')
                    } catch { showToast('Could not start card setup. Please call us.', 'error') }
                    setCardSaving(false)
                  }} style={{ ...btnGreen, width:'auto', padding:'0.65rem 1.5rem' }} disabled={cardSaving}>
                    {cardSaving ? 'Loading…' : '💳 Save a Card'}
                  </button>
                  <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginTop:'0.5rem' }}>Secured by Stripe. We never store your card details.</p>
                </div>
              )}
            </div>

            {/* Monthly breakdown */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Monthly Charges</div>
              {activeSub && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span style={{ color:'#fff' }}>{activeSub.services?.name}</span><span style={{ color:'rgba(255,255,255,0.85)' }}>${activeSub.rate}/mo</span>
                </div>
              )}
              {bins.map((b: any) => (
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span style={{ color:'#fff' }}>{b.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental'}</span><span style={{ color:'rgba(255,255,255,0.85)' }}>${b.monthly_rental_fee}/mo</span>
                </div>
              ))}
              {customer.garage_side_pickup && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span style={{ color:'#fff' }}>Garage-Side Pickup</span><span style={{ color:'rgba(255,255,255,0.85)' }}>$10/mo</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 0', fontWeight:700, fontSize:'1rem' }}>
                <span style={{ color:'#fff' }}>Monthly Total</span>
                <span style={{ color:'#4caf50' }}>${((activeSub?.rate||0) + bins.reduce((s:number,b:any)=>s+Number(b.monthly_rental_fee),0) + (customer.garage_side_pickup?10:0)).toFixed(2)}/mo</span>
              </div>
            </div>

            {/* Invoice history */}
            {invoices.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Invoice History</div>
                {invoices.map((inv: any) => (
                  <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.85rem' }}>
                    <div>
                      <div style={{ fontWeight:500, color:'#fff' }}>{inv.period_start} – {inv.period_end}</div>
                      <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.65)' }}>Due {inv.due_date}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontWeight:600, color:'#fff' }}>${Number(inv.total).toFixed(2)}</span>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', padding:'0.15rem 0.5rem', borderRadius:'4px',
                        color: inv.status==='paid'?'#4caf50': inv.status==='overdue'?'#f87171':'#f59e0b',
                        background: inv.status==='paid'?'rgba(76,175,80,0.1)': inv.status==='overdue'?'rgba(248,113,113,0.1)':'rgba(245,158,11,0.1)'
                      }}>{inv.status}</span>
                      <button onClick={() => {
                        const lines = (inv.notes || '').split(' | ').map((l:string) => `<tr><td style="padding:6px 0;color:#555">${l.replace(/: \$/,': $')}</td></tr>`).join('')
                        const html = `<html><head><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;color:#111} h1{font-size:20px} .badge{background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:12px}</style></head><body>
                          <h1>Patil Waste Removal</h1>
                          <p style="color:#555">80 Palomino Ln, Bedford NH 03110 · (802) 416-9484</p>
                          <hr/>
                          <p><strong>Invoice for:</strong> ${customer.first_name} ${customer.last_name}</p>
                          <p><strong>Period:</strong> ${inv.period_start} – ${inv.period_end}</p>
                          <p><strong>Due:</strong> ${inv.due_date} &nbsp; <span class="badge">${inv.status}</span></p>
                          <table style="width:100%;border-collapse:collapse;margin:16px 0">${lines}</table>
                          <hr/>
                          <p style="font-size:18px"><strong>Total: $${Number(inv.total).toFixed(2)}</strong></p>
                        </body></html>`
                        const blob = new Blob([html], { type: 'text/html' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `invoice-${inv.period_start}.html`; a.click()
                        URL.revokeObjectURL(url)
                      }} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'4px', color:'rgba(255,255,255,0.6)', padding:'0.15rem 0.5rem', cursor:'pointer', fontSize:'0.7rem', fontFamily:'inherit' }}>
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.75)' }}>
              Questions about your bill? Call or text Patil Waste Removal at <a href="tel:8024169484" style={{ color:'#4caf50' }}>(802) 416-9484</a> or email <a href="mailto:patilwasteremoval@gmail.com" style={{ color:'#4caf50' }}>patilwasteremoval@gmail.com</a>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD SERVICE MODAL ── */}
      {showAddService && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'100%', maxWidth:'460px', padding:'2rem' }}>
            <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.6rem', marginBottom:'1.25rem' }}>Request Service</div>
            {(() => {
              const svc = services.find(s => s.id === selectedService)
              return svc ? (
                <>
                  <div style={{ background:'rgba(46,125,50,0.08)', border:'1px solid rgba(46,125,50,0.2)', borderRadius:'7px', padding:'0.85rem 1rem', marginBottom:'1.25rem' }}>
                    <div style={{ fontWeight:700 }}>{svc.name}</div>
                    <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>${svc.base_price_monthly}/mo</div>
                  </div>
                  <div style={{ marginBottom:'1.25rem' }}>
                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.6rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>When to start?</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                      <label style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', cursor:'pointer', background:'rgba(255,255,255,0.03)', border:`1px solid ${addTiming==='next_month'?'rgba(46,125,50,0.5)':'rgba(255,255,255,0.08)'}`, borderRadius:'7px', padding:'0.85rem' }}>
                        <input type="radio" value="next_month" checked={addTiming==='next_month'} onChange={() => setAddTiming('next_month')} style={{ accentColor:'#2e7d32', marginTop:'2px' }} />
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.88rem' }}>Next billing cycle</div>
                          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>Starts at your next billing date — no extra charge</div>
                        </div>
                      </label>
                      <label style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', cursor:'pointer', background:'rgba(255,255,255,0.03)', border:`1px solid ${addTiming==='immediate'?'rgba(46,125,50,0.5)':'rgba(255,255,255,0.08)'}`, borderRadius:'7px', padding:'0.85rem' }}>
                        <input type="radio" value="immediate" checked={addTiming==='immediate'} onChange={() => setAddTiming('immediate')} style={{ accentColor:'#2e7d32', marginTop:'2px' }} />
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.88rem' }}>Start immediately</div>
                          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>Prorated charge of <strong style={{ color:'#fff' }}>${prorateDays(svc.base_price_monthly, pickupDay)}</strong> added to next bill</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : null
            })()}
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
              <button style={btnGhost} onClick={() => setShowAddService(false)}>Cancel</button>
              <button style={{ ...btnGreen, width:'auto', padding:'0.65rem 1.5rem' }} onClick={handleRequestService}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', background:'#1a1a1a', border:`1px solid ${toastType==='error'?'#dc2626':'#2e7d32'}`, borderRadius:'8px', padding:'0.85rem 1.25rem', fontSize:'0.84rem', zIndex:2000, maxWidth:'320px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', color:'#fff' }}>
          {toastType === 'error' ? '❌' : '✅'} {toast}
        </div>
      )}
    </main>
  )
}
