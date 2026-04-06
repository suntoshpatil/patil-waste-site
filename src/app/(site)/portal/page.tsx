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

function nextPickupDate(pickupDay: string): string {
  if (!pickupDay) return '—'
  const today = new Date()
  const todayDay = today.getDay()
  const targetDay = DAYS.indexOf(pickupDay.toLowerCase())
  if (targetDay === -1) return '—'
  let diff = targetDay - todayDay
  if (diff <= 0) diff += 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
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

function prorateDays(rate: number): number {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
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
      const results = await sb(`customers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,services(id,name))`)
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

  async function handleLogin() {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('Please enter your 4-digit PIN.'); return }
    if (!foundCustomer) return
    if (foundCustomer.portal_pin !== pin) { setError('Incorrect PIN. Please try again.'); return }
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
      await sb(`customers?id=eq.${customer.id}`, { method:'PATCH', body:{
        contract_accepted: true,
        contract_accepted_at: new Date().toISOString(),
        status: 'active',
      }, prefer:'return=minimal' })
      // Trigger invoice generation
      fetch('/api/cron/generate-invoices', { headers:{ Authorization:'Bearer patilwaste_cron_2024' } }).catch(()=>{})
      const updated = { ...customer, contract_accepted: true, status: 'active' } as any
      setCustomer(updated)
      sessionStorage.setItem('portal_customer', JSON.stringify(updated))
      showToast('Contract accepted! Welcome aboard 🎉')
    } catch (e: any) { showToast('Failed to accept. Please contact us.', 'error') }
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
    const prorated = addTiming === 'immediate' ? prorateDays(svc.base_price_monthly) : null
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
          ? parseFloat(((customer.subscriptions[0].rate / 4.33)).toFixed(2))
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
  const card = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'1.5rem' }
  const inputStyle = { width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'0.75rem 1rem', color:'#fff', fontSize:'0.95rem', boxSizing:'border-box' as const, outline:'none' }
  const btnGreen = { background:'#2e7d32', color:'#fff', border:'none', borderRadius:'8px', padding:'0.75rem 1.5rem', fontSize:'0.9rem', fontWeight:700, cursor:'pointer', width:'100%', fontFamily:'inherit' }
  const btnGhost = { background:'transparent', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'0.6rem 1.2rem', fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }

  // ── LOGIN SCREEN ──
  if (screen === 'login') return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:'6rem' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2.5rem', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>My Account</div>
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
            <button style={btnGreen} onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
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
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2rem', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Set Your PIN</div>
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

  // ── CONTRACT SCREEN ──
  if (customer && (customer as any).status === 'contract_pending' && !(customer as any).contract_accepted) return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:'5rem' }}>
      <div style={{ width:'100%', maxWidth:'640px' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>📋</div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2.2rem', letterSpacing:'0.05em', marginBottom:'0.5rem', color:'#fff' }}>Service Agreement</div>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.95rem' }}>Please review and accept your service agreement to activate your account.</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'1.75rem', marginBottom:'1.5rem', maxHeight:'400px', overflowY:'auto' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.1rem', letterSpacing:'0.05em', marginBottom:'1.25rem', color:'#4caf50' }}>Patil Waste Removal LLC — Service Agreement</div>
          {([
            ['Service', `You are signing up for ${(customer as any).subscriptions?.[0]?.services?.name || 'curbside waste removal'} service at the address on file.`],
            ['Pickup Schedule', `Your scheduled pickup day is ${pickupDay ? pickupDay.charAt(0).toUpperCase()+pickupDay.slice(1) : 'to be confirmed'}. Please have bins at the curb by 8:00 AM on your pickup day.`],
            ['Billing', `Your plan rate is $${(customer as any).subscriptions?.[0]?.rate || '—'}/month, billed ${(customer as any).subscriptions?.[0]?.billing_cycle || 'monthly'}. Invoices are issued on the 25th and due on the 1st.`],
            ['Extra Bags', 'Extra bags beyond your plan limit are charged per bag ($2.00 small / $3.50 large with advance notice). Rates are higher without notice.'],
            ['Skip Credits', 'You may skip up to 2 pickups per quarter for a bill credit. Submit skip requests by 5:00 PM the day before your pickup.'],
            ['Cancellation', 'Month-to-month service — no long-term contract. Cancel any time by contacting Suntosh.'],
            ['Items Not Accepted', 'No hazardous waste, chemicals, paints, oils, explosives, firearms, or medical waste. Contact us for large bulky items not listed in the portal.'],
            ['Payment', `Preferred payment: ${(customer as any).payment_method || 'to be confirmed'}. Payment is due by the 1st of each month. Late payments may result in service suspension.`],
          ] as [string,string][]).map(([heading, body]) => (
            <div key={heading} style={{ marginBottom:'1rem', paddingBottom:'1rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:'0.3rem' }}>{heading}</div>
              <p style={{ fontSize:'0.88rem', color:'rgba(255,255,255,0.85)', lineHeight:1.65, margin:0 }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(46,125,50,0.1)', border:'1px solid rgba(46,125,50,0.3)', borderRadius:'8px', padding:'1rem 1.25rem', marginBottom:'1.25rem', fontSize:'0.85rem', color:'rgba(255,255,255,0.8)' }}>
          By clicking Accept, <strong style={{ color:'#fff' }}>{customer.first_name} {customer.last_name}</strong>, you agree to the Patil Waste Removal service agreement and authorize billing as described above.
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button onClick={logout} style={{ flex:1, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.55)', borderRadius:'8px', padding:'0.85rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.9rem' }}>Decline</button>
          <button onClick={acceptContract} disabled={contractAccepting} style={{ flex:2, background:'#2e7d32', color:'#fff', border:'none', borderRadius:'8px', padding:'0.85rem', cursor:'pointer', fontFamily:'Bebas Neue, sans-serif', fontSize:'1.1rem', letterSpacing:'0.05em', opacity:contractAccepting?0.7:1 }}>
            {contractAccepting ? 'Processing…' : '✅ I Accept — Activate My Account'}
          </button>
        </div>
        <p style={{ textAlign:'center', fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginTop:'0.75rem' }}>Questions? Call Suntosh at (802) 416-9484</p>
      </div>
    </main>
  )

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
    <main style={{ minHeight:'100vh', background:'#0a0a0a', paddingTop:'5rem' }}>
      {/* Header bar */}
      <div style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'1rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.5rem', letterSpacing:'0.05em' }}>
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
                    <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', marginBottom:'0.2rem' }}>{label}</div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup info */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Pickup Schedule</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', marginBottom:'0.2rem' }}>Pickup Day</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', textTransform:'capitalize', color:'#fff' }}>{pickupDay || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', marginBottom:'0.2rem' }}>Next Pickup</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', color:'#4caf50' }}>{nextPickupDate(pickupDay)}</div>
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
                    <span style={{ fontSize:'0.88rem' }}>{b.bin_type === 'trash' ? '🗑️ Trash Bin' : '♻️ Recycling Bin'} <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.78rem' }}>${b.monthly_fee}/mo</span></span>
                    {b.bin_type === 'trash' && (
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color: b.deposit_paid ? '#4caf50' : '#f59e0b', background: b.deposit_paid ? 'rgba(76,175,80,0.1)' : 'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>
                        {b.deposit_paid ? '✅ Deposit Paid' : '⚠️ Deposit Due ($25)'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

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

          // Build a set of notice dates for quick lookup
          const noticeMap: Record<string, any> = {}
          for (const n of notices) {
            if (n.affected_date) noticeMap[n.affected_date] = n
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
                  ['#dc2626','rgba(220,38,38,0.12)','Cancelled'],
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
                      const isPickupDay = pickupDayIndex !== -1 && dayOfWeek === pickupDayIndex
                      const notice = noticeMap[dateStr]
                      const isCancelled = notice?.notice_type === 'cancellation'
                      const isRescheduled = notice?.notice_type === 'reschedule'
                      const isToday = dateStr === todayStr
                      const isPast = dateStr < todayStr

                      let bg = 'transparent'
                      let border = 'transparent'
                      let dotColor = ''

                      if (isPickupDay && !isCancelled) { bg = 'rgba(46,125,50,0.15)'; border = '#2e7d32' }
                      if (isCancelled) { bg = 'rgba(220,38,38,0.12)'; border = '#dc2626' }
                      if (isRescheduled) { bg = 'rgba(245,158,11,0.12)'; border = '#f59e0b' }
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
                          {isCancelled && <div style={{ fontSize:'0.6rem', color:'#f87171', fontWeight:700 }}>CANCELLED</div>}
                          {isRescheduled && <div style={{ fontSize:'0.6rem', color:'#fbbf24', fontWeight:700 }}>MOVED</div>}
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
                      <div style={{ fontSize:'0.82rem', fontWeight:600, marginBottom:'0.2rem' }}>
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
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  while (upcoming.length < 4) {
                    if (d.getDay() === pickupDayIndex) {
                      const ds = d.toISOString().split('T')[0]
                      const notice = noticeMap[ds]
                      upcoming.push(ds)
                    }
                    d.setDate(d.getDate() + 1)
                  }
                  return upcoming.map(ds => {
                    const notice = noticeMap[ds]
                    const isCancelled = notice?.notice_type === 'cancellation'
                    const replacementDate = notice?.replacement_date
                    return (
                      <div key={ds} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.55rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.85rem' }}>
                        <span style={{ textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'rgba(255,255,255,0.35)' : '#fff' }}>
                          {new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
                        </span>
                        {isCancelled && !replacementDate && <span style={{ fontSize:'0.72rem', color:'#f87171', fontWeight:700 }}>CANCELLED</span>}
                        {replacementDate && <span style={{ fontSize:'0.72rem', color:'#fbbf24', fontWeight:700 }}>→ {new Date(replacementDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>}
                        {!notice && <span style={{ fontSize:'0.72rem', color:'#4caf50', fontWeight:700 }}>✓ On schedule</span>}
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
                <label style={{ display:'block', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Which pickup date to skip?</label>
                <input type="date" value={skipDate} onChange={e => setSkipDate(e.target.value)} style={{ ...inputStyle, marginBottom:'1rem', width:'auto' }} />
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.6)', marginBottom:'1.25rem' }}>
                  Estimated credit: <strong style={{ color:'#4caf50' }}>${activeSub ? ((activeSub.rate / 4.33)).toFixed(2) : '—'}</strong> on your next bill
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
                      <a href="mailto:patilwasteremoval@gmail.com" style={{ background:'#2e7d32', color:'#fff', borderRadius:'6px', padding:'0.55rem 1.1rem', fontSize:'0.82rem', fontWeight:700, textDecoration:'none' }}>Pay Now →</a>
                    )}
                  </div>
                  {current.notes && (
                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'0.6rem', marginTop:'0.25rem' }}>{current.notes}</div>
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
                    <span style={{ fontSize:'0.9rem', fontWeight:600 }}>Card saved — auto-pay enabled</span>
                  </div>
                  <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.6)' }}>Your card will be charged automatically on the 1st of each month. To update your card, contact Suntosh.</p>
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
                      const { clientSecret } = await res.json()
                      // Redirect to Stripe-hosted setup page (simplest, no Stripe.js needed)
                      window.location.href = `https://billing.stripe.com/p/login/test_${clientSecret}`
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
                  <span>{activeSub.services?.name}</span><span>${activeSub.rate}/mo</span>
                </div>
              )}
              {bins.map((b: any) => (
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>{b.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental'}</span><span>${b.monthly_fee}/mo</span>
                </div>
              ))}
              {customer.garage_side_pickup && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>Garage-Side Pickup</span><span>$10/mo</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 0', fontWeight:700, fontSize:'1rem' }}>
                <span>Monthly Total</span>
                <span style={{ color:'#4caf50' }}>${((activeSub?.rate||0) + bins.reduce((s:number,b:any)=>s+Number(b.monthly_fee),0) + (customer.garage_side_pickup?10:0)).toFixed(2)}/mo</span>
              </div>
            </div>

            {/* Invoice history */}
            {invoices.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>Invoice History</div>
                {invoices.map((inv: any) => (
                  <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.85rem' }}>
                    <div>
                      <div style={{ fontWeight:500 }}>{inv.period_start} – {inv.period_end}</div>
                      <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)' }}>Due {inv.due_date}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <span style={{ fontWeight:600 }}>${Number(inv.total).toFixed(2)}</span>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', padding:'0.15rem 0.5rem', borderRadius:'4px',
                        color: inv.status==='paid'?'#4caf50': inv.status==='overdue'?'#f87171':'#f59e0b',
                        background: inv.status==='paid'?'rgba(76,175,80,0.1)': inv.status==='overdue'?'rgba(248,113,113,0.1)':'rgba(245,158,11,0.1)'
                      }}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.6)' }}>
              Questions about your bill? Call or text Suntosh at <a href="tel:8024169484" style={{ color:'#4caf50' }}>(802) 416-9484</a> or email <a href="mailto:patilwasteremoval@gmail.com" style={{ color:'#4caf50' }}>patilwasteremoval@gmail.com</a>
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
                          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>Prorated charge of <strong style={{ color:'#fff' }}>${prorateDays(svc.base_price_monthly)}</strong> added to next bill</div>
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
        <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', background:'#1a1a1a', border:`1px solid ${toastType==='error'?'#dc2626':'#2e7d32'}`, borderRadius:'8px', padding:'0.85rem 1.25rem', fontSize:'0.84rem', zIndex:2000, maxWidth:'320px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
          {toastType === 'error' ? '❌' : '✅'} {toast}
        </div>
      )}
    </main>
  )
}
