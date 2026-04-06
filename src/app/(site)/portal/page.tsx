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
  const [tab, setTab] = useState<'home'|'services'|'pickup'|'skips'|'billing'>('home')

  // Bulky items / pickup addons
  const [catalog, setCatalog] = useState<any[]>([])
  const [pickupAddons, setPickupAddons] = useState<any[]>([])
  const [selectedItems, setSelectedItems] = useState<{id:string, qty:number}[]>([])
  const [customItem, setCustomItem] = useState('')
  const [addonPickupDate, setAddonPickupDate] = useState('')

  // Add service modal
  const [showAddService, setShowAddService] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [addTiming, setAddTiming] = useState<'immediate'|'next_month'>('next_month')

  // Skip modal
  const [showSkip, setShowSkip] = useState(false) // used in skip tab
  const [skipDate, setSkipDate] = useState('')

  const showToast = (msg: string, type = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('portal_customer')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Use startTransition to avoid cascading render warning
      Promise.resolve().then(() => {
        setCustomer(parsed)
        setScreen('dashboard')
      })
    }
  }, [])

  async function loadPortalData(cust: Customer) {
    const [b, sk, n, sv, cat, addons] = await Promise.all([
      sb(`bins?customer_id=eq.${cust.id}&select=*`).catch(() => []),
      sb(`skip_requests?customer_id=eq.${cust.id}&select=*&order=created_at.desc`).catch(() => []),
      sb(`schedule_notices?select=*&order=notice_date.desc&limit=5`).catch(() => []),
      sb(`services?select=id,name,base_price_monthly&is_active=eq.true&type=in.(recurring,addon)&order=base_price_monthly.asc`).catch(() => []),
      sb(`bulky_item_catalog?select=*&is_active=eq.true&order=name.asc`).catch(() => []),
      sb(`pickup_addons?customer_id=eq.${cust.id}&select=*&order=created_at.desc&limit=20`).catch(() => []),
    ])
    setBins(b || [])
    setSkips(sk || [])
    setNotices(n || [])
    setServices(sv || [])
    setCatalog(cat || [])
    setPickupAddons(addons || [])
  }

  async function handleLogin() {
    if (!email || !pin) { setError('Please enter your email and PIN.'); return }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN must be 4 digits.'); return }
    setLoading(true); setError('')
    try {
      const results = await sb(`customers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&select=*,subscriptions(id,rate,billing_cycle,status,services(name))`)
      if (!results || results.length === 0) { setError('No account found with that email.'); setLoading(false); return }
      const cust = results[0]
      if (!cust.portal_pin) {
        setCustomer(cust)
        setScreen('set-pin')
        setLoading(false); return
      }
      if (cust.portal_pin !== pin) { setError('Incorrect PIN.'); setLoading(false); return }
      sessionStorage.setItem('portal_customer', JSON.stringify(cust))
      setCustomer(cust)
      setScreen('dashboard')
      loadPortalData(cust)
    } catch (e: any) { setError(e.message || 'Login failed.') }
    setLoading(false)
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
      setShowSkip(false)
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
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9rem' }}>Sign in to manage your Patil Waste Removal service</p>
        </div>
        <div style={{ ...card, padding:'2rem' }}>
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Email Address</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>4-Digit PIN</label>
            <input style={inputStyle} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} placeholder="••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', marginTop:'0.4rem' }}>First time? Enter your email and any 4 digits — you'll be prompted to set your PIN.</p>
          </div>
          {error && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'0.65rem 0.9rem', fontSize:'0.83rem', color:'#f87171', marginBottom:'1rem' }}>{error}</div>}
          <button style={btnGreen} onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </div>
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', marginTop:'1.5rem' }}>
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

  // ── DASHBOARD ──
  if (!customer) return null
  const activeSub = customer.subscriptions?.find(s => s.status === 'active')
  const skipsUsed = quarterSkipsUsed(skips)
  const skipsLeft = Math.max(0, 2 - skipsUsed)

  // Filter out services already subscribed to
  const subscribedIds = (customer.subscriptions || []).map((s: any) => s.service_id || s.services?.id)
  const availableServices = services.filter(s => !subscribedIds.includes(s.id))

  return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', paddingTop:'5rem' }}>
      {/* Header bar */}
      <div style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'1rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.5rem', letterSpacing:'0.05em' }}>
            Hey, {customer.first_name} 👋
          </div>
          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>{customer.service_address}</div>
        </div>
        <button style={btnGhost} onClick={logout}>Sign Out</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 2rem', gap:'0.25rem', overflowX:'auto' }}>
        {([['home','🏠 Overview'],['pickup','📦 Add to Pickup'],['services','➕ Services'],['skips','⏸️ Skip Pickup'],['billing','💳 Billing']] as [typeof tab, string][]).map(([id, label]) => (
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
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Your Plan</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem' }}>
                {[
                  ['Service', activeSub?.services?.name || '—'],
                  ['Monthly Rate', activeSub ? `$${activeSub.rate}/mo` : '—'],
                  ['Billing', activeSub ? (activeSub.billing_cycle === 'quarterly' ? 'Quarterly' : 'Monthly') : '—'],
                  ['Status', customer.status.charAt(0).toUpperCase() + customer.status.slice(1)],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.2rem' }}>{label}</div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup info */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Pickup Schedule</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.2rem' }}>Pickup Day</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', textTransform:'capitalize' }}>{customer.pickup_day || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.2rem' }}>Next Pickup</div>
                  <div style={{ fontWeight:600, fontSize:'1rem', color:'#4caf50' }}>{nextPickupDate(customer.pickup_day)}</div>
                </div>
              </div>
              {customer.garage_side_pickup && (
                <div style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>🏠 Garage-side pickup enabled</div>
              )}
            </div>

            {/* Bin rentals */}
            {bins.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Bin Rentals</div>
                {bins.map((b: any) => (
                  <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'0.6rem', marginBottom:'0.6rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:'0.88rem' }}>{b.bin_type === 'trash' ? '🗑️ Trash Bin' : '♻️ Recycling Bin'} <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' }}>${b.monthly_fee}/mo</span></span>
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
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.4rem' }}>Skip Credits This Quarter</div>
                <div style={{ fontSize:'0.9rem' }}>
                  <span style={{ fontSize:'1.4rem', fontWeight:700, color: skipsLeft > 0 ? '#4caf50' : '#f87171' }}>{skipsLeft}</span>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}> / 2 remaining</span>
                </div>
              </div>
              <button onClick={() => setTab('skips')} style={{ ...btnGhost, width:'auto' }}>Skip a Pickup →</button>
            </div>
          </div>
        )}

        {/* ── ADD TO PICKUP TAB ── */}
        {tab === 'pickup' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ background:'rgba(46,125,50,0.06)', border:'1px solid rgba(46,125,50,0.15)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.84rem', color:'rgba(255,255,255,0.6)' }}>
              📦 Add bulky items or extra bags to your next scheduled pickup. Items with fixed prices are confirmed automatically — anything else will be quoted by Suntosh before your pickup.
            </div>

            {/* Catalog items */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Common Items</div>
              {catalog.length === 0 ? (
                <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.3)' }}>No items available yet.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {catalog.map((item: any) => {
                    const sel = selectedItems.find(s => s.id === item.id)
                    return (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: sel ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${sel ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'7px', padding:'0.65rem 0.9rem', transition:'all 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                          <input type='checkbox' checked={!!sel} onChange={e => {
                            setSelectedItems(prev => e.target.checked ? [...prev, {id:item.id, qty:1}] : prev.filter(s => s.id !== item.id))
                          }} style={{ accentColor:'#2e7d32', width:'16px', height:'16px' }} />
                          <div>
                            <div style={{ fontSize:'0.88rem', fontWeight:500 }}>{item.name}</div>
                            <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginTop:'0.1rem' }}>
                              {item.is_fixed_price
                                ? <span style={{ color:'#4caf50' }}>${item.fixed_price} flat</span>
                                : <span>Est. ${item.estimate_min}–${item.estimate_max}</span>
                              }
                              {!item.is_fixed_price && <span style={{ color:'#f59e0b', marginLeft:'0.4rem' }}>· quote required</span>}
                            </div>
                          </div>
                        </div>
                        {sel && (
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                            <button onClick={() => setSelectedItems(prev => prev.map(s => s.id===item.id ? {...s, qty:Math.max(1,s.qty-1)} : s))} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:'4px', width:'26px', height:'26px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                            <span style={{ fontSize:'0.88rem', minWidth:'20px', textAlign:'center' }}>{sel.qty}</span>
                            <button onClick={() => setSelectedItems(prev => prev.map(s => s.id===item.id ? {...s, qty:s.qty+1} : s))} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:'4px', width:'26px', height:'26px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Custom item */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>Something Not Listed?</div>
              <textarea value={customItem} onChange={e => setCustomItem(e.target.value)} rows={2} placeholder="Describe what you need picked up (e.g. old recliner, broken dishwasher)..." style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.86rem', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' as const }} />
              <p style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.35)', marginTop:'0.4rem' }}>Suntosh will review and send you a price before confirming.</p>
            </div>

            {/* Preferred pickup date */}
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>Preferred Pickup Date</div>
              <input type='date' value={addonPickupDate} onChange={e => setAddonPickupDate(e.target.value)} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.86rem' }} />
              <p style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.35)', marginTop:'0.4rem' }}>Leave blank and it will be added to your next regular pickup.</p>
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
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>Recent Requests</div>
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
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Current Services</div>
              {(customer.subscriptions || []).length === 0 ? (
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.88rem' }}>No active services.</p>
              ) : customer.subscriptions!.map(s => (
                <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>{s.services?.name}</span>
                  <span style={{ color:'rgba(255,255,255,0.5)' }}>${s.rate}/mo · {s.billing_cycle}</span>
                </div>
              ))}
            </div>

            {availableServices.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Add a Service</div>
                {availableServices.map(s => (
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{s.name}</div>
                      <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>${s.base_price_monthly}/mo</div>
                    </div>
                    <button onClick={() => { setSelectedService(s.id); setShowAddService(true) }} style={{ ...btnGhost, width:'auto', fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>Request →</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:'rgba(46,125,50,0.06)', border:'1px solid rgba(46,125,50,0.2)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>
              ℹ️ Service additions are reviewed by Suntosh and activated within 1 business day. Immediate additions are prorated for the remainder of the month.
            </div>
          </div>
        )}

        {/* ── SKIP TAB ── */}
        {tab === 'skips' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ ...card, borderLeft:`3px solid ${skipsLeft > 0 ? '#2e7d32' : '#dc2626'}` }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>This Quarter</div>
              <div style={{ fontSize:'2rem', fontWeight:700, color: skipsLeft > 0 ? '#4caf50' : '#f87171' }}>{skipsLeft} skip{skipsLeft !== 1 ? 's' : ''} remaining</div>
              <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.45)', marginTop:'0.4rem' }}>
                You get 2 refundable skip credits per quarter. Credits appear as a deduction on your next bill.
              </p>
            </div>

            {skipsLeft > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Request a Skip</div>
                <label style={{ display:'block', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Which pickup date to skip?</label>
                <input type="date" value={skipDate} onChange={e => setSkipDate(e.target.value)} style={{ ...inputStyle, marginBottom:'1rem', width:'auto' }} />
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginBottom:'1.25rem' }}>
                  Estimated credit: <strong style={{ color:'#4caf50' }}>${activeSub ? ((activeSub.rate / 4.33)).toFixed(2) : '—'}</strong> on your next bill
                </div>
                <button onClick={handleSkipPickup} style={{ ...btnGreen, width:'auto', padding:'0.65rem 1.5rem' }}>Submit Skip Request</button>
              </div>
            )}

            {skips.length > 0 && (
              <div style={card}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Skip History</div>
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
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Payment Method</div>
              <div style={{ fontWeight:600, fontSize:'1rem', textTransform:'capitalize' }}>{customer.payment_method}</div>
              <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.35)', marginTop:'0.4rem' }}>To update your payment method, contact Suntosh at (802) 416-9484.</p>
            </div>
            <div style={card}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', marginBottom:'1rem' }}>Monthly Charges</div>
              {activeSub && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>{activeSub.services?.name}</span>
                  <span>${activeSub.rate}/mo</span>
                </div>
              )}
              {bins.map((b: any) => (
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>{b.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental'}</span>
                  <span>${b.monthly_fee}/mo</span>
                </div>
              ))}
              {customer.garage_side_pickup && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.88rem' }}>
                  <span>Garage-side Pickup</span>
                  <span>$10/mo</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 0', fontWeight:700, fontSize:'1rem' }}>
                <span>Total</span>
                <span style={{ color:'#4caf50' }}>
                  ${(
                    (activeSub?.rate || 0) +
                    bins.reduce((sum: number, b: any) => sum + b.monthly_fee, 0) +
                    (customer.garage_side_pickup ? 10 : 0)
                  ).toFixed(2)}/mo
                </span>
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:'8px', padding:'1rem 1.25rem', fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>
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
                          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>Starts at your next billing date — no extra charge</div>
                        </div>
                      </label>
                      <label style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', cursor:'pointer', background:'rgba(255,255,255,0.03)', border:`1px solid ${addTiming==='immediate'?'rgba(46,125,50,0.5)':'rgba(255,255,255,0.08)'}`, borderRadius:'7px', padding:'0.85rem' }}>
                        <input type="radio" value="immediate" checked={addTiming==='immediate'} onChange={() => setAddTiming('immediate')} style={{ accentColor:'#2e7d32', marginTop:'2px' }} />
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.88rem' }}>Start immediately</div>
                          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>Prorated charge of <strong style={{ color:'#fff' }}>${prorateDays(svc.base_price_monthly)}</strong> added to next bill</div>
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
