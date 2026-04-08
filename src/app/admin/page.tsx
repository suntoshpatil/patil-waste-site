/* eslint-disable */
'use client'
import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'

const BLANK_CUSTOMER = { first_name:'', last_name:'', email:'', phone:'', service_address:'', town:'bedford', status:'active', payment_method:'cash', pickup_day:'', bin_situation:'own', garage_side_pickup:false, gate_notes:'', notes:'', start_date:'' }

type Customer = typeof BLANK_CUSTOMER & { id: string; created_at: string; subscriptions?: { rate: number; billing_cycle: string; services: { name: string } }[] }

async function sb(path: string, opts: { method?: string; body?: object; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': opts.prefer || 'return=representation' },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = { active:'#16a34a', pending:'#d97706', contract_pending:'#7c3aed', paused:'#2563eb', cancelled:'#dc2626', overdue:'#dc2626', paid:'#16a34a', draft:'#6b7280', sent:'#d97706', new:'#d97706' }
  const c = colors[status] || '#6b7280'
  return <span style={{ background:`${c}22`, color:c, padding:'0.15rem 0.5rem', borderRadius:'20px', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{status}</span>
}

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'

function isBiweeklyPickupWeek(billingStart: string | null | undefined): boolean {
  if (!billingStart) return true // default to yes if unknown
  const start = new Date(billingStart + 'T00:00:00')
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.round((today.getTime() - start.getTime()) / msPerWeek)
  return weeksSinceStart % 2 === 0
}
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'

const Inp = ({ label, name, value, onChange, type='text', placeholder='' }: any) => (
  <div style={{ marginBottom:'0.75rem' }}>
    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }} />
  </div>
)

const Sel = ({ label, name, value, onChange, options }: any) => (
  <div style={{ marginBottom:'0.75rem' }}>
    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>{label}</label>
    <select name={name} value={value} onChange={onChange}
      style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%', cursor:'pointer' }}>
      {options.map(([v,l]: [string,string]) => <option key={v} value={v} style={{ background:'#1a1a1a' }}>{l}</option>)}
    </select>
  </div>
)

const Btn = ({ onClick, children, color='#2e7d32', textColor='#fff', small=false, disabled=false }: any) => (
  <button onClick={onClick} disabled={disabled} style={{ background:color, color:textColor, border:'none', borderRadius:'4px', padding: small ? '0.3rem 0.65rem' : '0.55rem 1.1rem', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight:700, fontSize: small ? '0.72rem' : '0.8rem', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'inherit', opacity: disabled ? 0.6 : 1 }}>
    {children}
  </button>
)

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [view, setView] = useState('dashboard')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [townFilter, setTownFilter] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [stats, setStats] = useState({ active:0, pending:0, overdue:0, revenue:0 })
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [payCustomer, setPayCustomer] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addData, setAddData] = useState<any>({ ...BLANK_CUSTOMER })
  const [importMode, setImportMode] = useState(false)
  const [importDepositPaid, setImportDepositPaid] = useState(false)
  const [importPaidThrough, setImportPaidThrough] = useState('')
  const [addServiceIds, setAddServiceIds] = useState<string[]>([])
  const [addBillingCycle, setAddBillingCycle] = useState('monthly')
  const [servicesList, setServicesList] = useState<{id:string,name:string,base_price_monthly:number}[]>([])
  const [serviceRequests, setServiceRequests] = useState<any[]>([])
  const [skipRequests, setSkipRequests] = useState<any[]>([])
  const [jobRequests, setJobRequests] = useState<any[]>([])
  const [pickupAddons, setPickupAddons] = useState<any[]>([])
  const [noticeMsg, setNoticeMsg] = useState('')
  const [allNotices, setAllNotices] = useState<any[]>([])
  const [editingNoticeId, setEditingNoticeId] = useState<string|null>(null)
  const [editingNoticeMsg, setEditingNoticeMsg] = useState('')
  const [noticeDate, setNoticeDate] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const [replacementDate, setReplacementDate] = useState('')
  const [onboardCustomer, setOnboardCustomer] = useState<any>(null)
  const [onboardData, setOnboardData] = useState({ pickup_day:'', start_date:'', notes:'' })
  const [onboardServiceId, setOnboardServiceId] = useState('')
  const [onboardBillingCycle, setOnboardBillingCycle] = useState('monthly')
  const [onboardGarage, setOnboardGarage] = useState(false)
  const [onboardFrequency, setOnboardFrequency] = useState<'weekly'|'biweekly'>('weekly')
  const [onboardCustomRate, setOnboardCustomRate] = useState<string>('')
  const [onboardGarageSenior, setOnboardGarageSenior] = useState(false)
  const [onboardTrashBin, setOnboardTrashBin] = useState(false)
  const [onboardRecyclingBin, setOnboardRecyclingBin] = useState(false)
  const [addTrashBin, setAddTrashBin] = useState(false)
  const [addRecyclingBin, setAddRecyclingBin] = useState(false)
  const [selectedBins, setSelectedBins] = useState<any[]>([])
  const [extraBagDate, setExtraBagDate] = useState('')
  const [extraBagType, setExtraBagType] = useState<'13gal'|'32gal'>('13gal')
  const [extraBagQty, setExtraBagQty] = useState(1)
  const [extraBagSaving, setExtraBagSaving] = useState(false)
  const [pendingAddons, setPendingAddons] = useState<any[]>([])
  // Bulk select
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  // Customer history
  const [customerHistory, setCustomerHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [editingRate, setEditingRate] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [invoicePreview, setInvoicePreview] = useState<any>(null)
  const [invoiceTab, setInvoiceTab] = useState<'sent'|'upcoming'>('sent')
  const [upcomingInvoices, setUpcomingInvoices] = useState<any[]>([])
  const [editingUpcoming, setEditingUpcoming] = useState<string|null>(null)
  const [upcomingEdits, setUpcomingEdits] = useState<any>({})
  const [selectedUpcoming, setSelectedUpcoming] = useState<string|null>(null)
  const [upcomingDiscountInputs, setUpcomingDiscountInputs] = useState<Record<string,string>>({})
  // Revenue chart
  const [revenueHistory, setRevenueHistory] = useState<any[]>([])
  // Overdue reminder sending
  const [sendingReminders, setSendingReminders] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [discountInvoice, setDiscountInvoice] = useState<any>(null)
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountNote, setDiscountNote] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState<string|null>(null)
  const [catalog, setCatalog] = useState<any[]>([])
  const [catalogEdits, setCatalogEdits] = useState<Record<string,any>>({})
  const [catalogSaving, setCatalogSaving] = useState<string|null>(null)
  const [servicePriceEdits, setServicePriceEdits] = useState<Record<string,string>>({})
  const [servicePriceSaving, setServicePriceSaving] = useState<string|null>(null)

  const showToast = (msg: string, type = 'success') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500) }

  const loadAll = useCallback(async () => {
    const [custs, subs, invs, pays, svcs, svcReqs, skipReqs, jobReqs, addons] = await Promise.all([
      sb('customers?select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,pickup_frequency,billing_start,services(name)),bins(id,bin_type,monthly_rental_fee,ownership)&order=created_at.desc'),
      sb('subscriptions?select=rate,billing_cycle,status&status=eq.active'),
      sb('invoices?select=*,customers(first_name,last_name)&order=due_date.desc&limit=100'),
      sb('payment_logs?select=*,customers(first_name,last_name)&order=paid_at.desc&limit=20'),
      sb('services?select=id,name,base_price_monthly,type&is_active=eq.true&order=base_price_monthly.asc'),
      sb('service_requests?select=*,customers(first_name,last_name),services(name)&status=eq.pending&order=created_at.desc').catch(()=>[]),
      sb('skip_requests?select=*,customers(first_name,last_name)&status=eq.pending&order=created_at.desc').catch(()=>[]),
      sb('job_requests?select=*&order=created_at.desc&limit=50').catch(()=>[]),
      sb('pickup_addons?select=*,customers(first_name,last_name),bulky_item_catalog(name,estimate_min,estimate_max,fixed_price,is_fixed_price)&status=in.(pending_quote,confirmed,picked_up)&order=created_at.desc').catch(()=>[]),
    ])
    setCustomers(custs || [])
    setInvoices(invs || [])
    setPayments(pays || [])
    setServicesList(svcs || [])
    setServiceRequests(svcReqs || [])
    setSkipRequests(skipReqs || [])
    setJobRequests(jobReqs || [])
    setPickupAddons(addons || [])
    const active = (custs||[]).filter((c:Customer) => c.status==='active').length
    const pending = (custs||[]).filter((c:Customer) => c.status==='pending').length
    const overdue = (custs||[]).filter((c:Customer) => c.status==='overdue').length
    let revenue = 0
    // Derive revenue directly from active customers' nested subscriptions
    ;(custs||[]).filter((c:any) => c.status === 'active').forEach((c:any) => {
      const activeSub = c.subscriptions?.find((s:any) => s.status === 'active')
      if (activeSub) revenue += activeSub.rate  // rate is always monthly regardless of billing cycle
      if (c.garage_side_pickup) revenue += Number(c.garage_side_rate || 14.99)
      ;(c.bins||[]).forEach((b:any) => { if (b.ownership === 'rental') revenue += Number(b.monthly_rental_fee || 0) })
    })
    setStats({ active, pending, overdue, revenue })
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    // Restore login from localStorage on page load/refresh
    const saved = localStorage.getItem('pwradmin')
    if (saved && saved.length > 10) {
      setLoggedIn(true)
      setAdminToken(saved)
    }
  }, [])

  // Load data when logged in
  useEffect(() => {
    if (!loggedIn) return
    loadAll()
    loadRevenueHistory()
    // Auto-refresh every 60 seconds — also reload selected customer's addons/bins
    const interval = setInterval(() => {
      loadAll()
      if (selected) loadSelectedBins(selected.id)
    }, 60000)
    return () => clearInterval(interval)
  }, [loggedIn, loadAll])

  async function login() {
    try {
      const res = await fetch('/api/admin/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pw }) })
      const data = await res.json()
      if (data.ok) {
        setLoggedIn(true)
        setAdminToken(data.token)
        localStorage.setItem('pwradmin', data.token)
      } else { setPwErr('Incorrect password.') }
    } catch { setPwErr('Login failed. Try again.') }
  }

  async function addCustomer() {
    if (!addData.first_name || !addData.email || !addData.service_address || !addData.town) {
      showToast('Name, email, address, and town are required', 'error'); return
    }
    try {
      const { pickup_day, start_date, ...insertData } = addData
      if (start_date) (insertData as any).start_date = start_date
      const result = await sb('customers', { method:'POST', body: insertData })
      const newCustomer = Array.isArray(result) ? result[0] : result
      // Create one subscription per selected service
      if (newCustomer?.id && addServiceIds.length > 0) {
        for (const svcId of addServiceIds) {
          const svc = servicesList.find(s => s.id === svcId)
          const rate = svc?.base_price_monthly || 0
          await sb('subscriptions', { method:'POST', body:{
            customer_id: newCustomer.id,
            service_id: svcId,
            rate,
            billing_cycle: addBillingCycle,
            pickup_day: pickup_day || null,
            status: 'active',
            billing_start: addData.start_date || new Date().toISOString().split('T')[0],
            next_billing_date: addData.start_date || new Date().toISOString().split('T')[0],
          }})
        }
      }
      // Create bin rental rows
      if (newCustomer?.id) {
        const binInserts = []
        if (addTrashBin) binInserts.push({ customer_id: newCustomer.id, bin_type:'trash', ownership:'rental', monthly_rental_fee:7.99, assigned_date:addData.start_date || new Date().toISOString().split('T')[0], notes: importDepositPaid ? 'Deposit: paid' : 'Deposit: unpaid $25' })
        if (addRecyclingBin) binInserts.push({ customer_id: newCustomer.id, bin_type:'recycling', ownership:'rental', monthly_rental_fee:3.99, assigned_date:addData.start_date || new Date().toISOString().split('T')[0], notes:'No deposit required' })
        for (const bin of binInserts) {
          await sb('bins', { method:'POST', body: bin })
        }
      }
      // If importing existing customer with a paid-through date, create a paid invoice
      // so the cron knows they're already covered and won't double-charge
      if (importMode && importPaidThrough && newCustomer?.id) {
        const subId = addServiceIds.length > 0
          ? (await sb(`subscriptions?customer_id=eq.${newCustomer.id}&select=id&limit=1`).catch(()=>[]))?.[0]?.id
          : null
        // Calculate total for the paid invoice
        const rate = servicesList.find(s => addServiceIds.includes(s.id))?.base_price_monthly || 0
        const total = addBillingCycle === 'quarterly' ? rate * 3 : rate
        // period_start = their billing start, period_end = paid through date
        const periodStart = addData.start_date || new Date().toISOString().split('T')[0]
        if (!importPaidThrough) { /* no paid-through date set, skip invoice creation */ } else {
          // Delete any sent/draft invoices that fall within the paid-through period
          // (these may have been accidentally generated before the import)
          const existingInvs = await sb(`invoices?customer_id=eq.${newCustomer.id}&status=in.(sent,draft)&period_start=lte.${importPaidThrough}&select=id`).catch(()=>[])
          for (const inv of existingInvs || []) {
            await sb(`invoices?id=eq.${inv.id}`, { method:'DELETE', prefer:'return=minimal' }).catch(()=>{})
          }
          // Create the paid invoice covering the already-paid period
          await sb('invoices', { method:'POST', body:{
            customer_id: newCustomer.id,
            subscription_id: subId || null,
            subtotal: total,
            adjustments_total: 0,
            tax_rate: 0,
            tax_amount: 0,
            total,
            status: 'paid',
            paid_at: new Date().toISOString(),
            period_start: periodStart,
            period_end: importPaidThrough,
            due_date: periodStart,
            notes: `Imported from Squarespace — already paid through ${importPaidThrough}`,
          }})
        }
      }
      showToast(importMode ? 'Customer imported!' : 'Customer added!')
      setShowAddModal(false)
      setAddData({ ...BLANK_CUSTOMER })
      setImportMode(false)
      setImportDepositPaid(false)
      setImportPaidThrough('')
      setAddServiceIds([])
      setAddBillingCycle('monthly')
      setAddTrashBin(false)
      setAddRecyclingBin(false)
      loadAll()
    } catch (e: unknown) { showToast('Error: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error') }
  }

  async function approveServiceRequest(id: string, customerId: string, serviceId: string, timing: string, rate: number) {
    if (timing === 'immediate' || timing === 'next_month') {
      await sb('subscriptions', { method:'POST', body:{ customer_id:customerId, service_id:serviceId, rate, billing_cycle:'monthly', status:'active', billing_start:new Date().toISOString().split('T')[0], next_billing_date:new Date().toISOString().split('T')[0] }})
    }
    await sb(`service_requests?id=eq.${id}`, { method:'PATCH', body:{ status:'approved' }, prefer:'return=minimal' })
    showToast('Service approved and activated!')
    loadAll()
  }

  async function denyRequest(table: string, id: string) {
    await sb(`${table}?id=eq.${id}`, { method:'PATCH', body:{ status:'denied' }, prefer:'return=minimal' })
    showToast('Request denied.')
    loadAll()
  }

  async function approveSkip(id: string) {
    await sb(`skip_requests?id=eq.${id}`, { method:'PATCH', body:{ status:'approved' }, prefer:'return=minimal' })
    showToast('Skip approved — credit will apply to next bill.')
    loadAll()
  }

  async function postNotice() {
    if (!noticeMsg || !noticeDate) { showToast('Message and date required', 'error'); return }
    await sb('schedule_notices', { method:'POST', body:{
      message: noticeMsg,
      notice_date: noticeDate,
      affected_date: noticeDate,
      replacement_date: replacementDate || null,
      notice_type: noticeType,
    }})
    showToast('Notice posted — customers will see it on their calendar!')
    setNoticeMsg(''); setNoticeDate(''); setReplacementDate(''); setNoticeType('info')
    loadAll()
  }

  async function completeOnboarding() {
    if (!onboardCustomer) return
    if (!onboardData.pickup_day) { showToast('Please assign a pickup day', 'error'); return }
    try {
      // Update customer — activate and set start date + notes
      await sb(`customers?id=eq.${onboardCustomer.id}`, {
        method: 'PATCH',
        body: {
          status: 'contract_pending',
          garage_side_pickup: onboardGarage || onboardGarageSenior,
          garage_side_rate: onboardGarageSenior ? 5 : (onboardGarage ? 14.99 : null),
          notes: onboardData.notes || onboardCustomer.notes || null,
        },
        prefer: 'return=minimal',
      })
      // Create subscription if one was chosen and doesn't already exist
      if (onboardServiceId) {
        const existing = await sb(`subscriptions?customer_id=eq.${onboardCustomer.id}&status=eq.active&select=id`)
        if (!existing || existing.length === 0) {
          const svc = servicesList.find((s:any) => s.id === onboardServiceId)
          const billingStart = onboardData.start_date || new Date().toISOString().split('T')[0]
          await sb('subscriptions', { method: 'POST', body: {
            customer_id: onboardCustomer.id,
            service_id: onboardServiceId,
            rate: onboardCustomRate ? parseFloat(onboardCustomRate) : (svc?.base_price_monthly || 0),
            billing_cycle: onboardBillingCycle,
            pickup_frequency: onboardFrequency,
            status: 'active',
            pickup_day: onboardData.pickup_day,
            billing_start: billingStart,
            next_billing_date: billingStart,
          }})
        }
      }
      // Create bin rentals if selected — check for existing first to avoid duplicates
      const existingBins = await sb(`bins?customer_id=eq.${onboardCustomer.id}&ownership=eq.rental&select=bin_type`).catch(() => [])
      const hasTrash = (existingBins || []).some((b:any) => b.bin_type === 'trash')
      const hasRecycling = (existingBins || []).some((b:any) => b.bin_type === 'recycling')
      if (onboardTrashBin && !hasTrash) {
        await sb('bins', { method:'POST', body:{ customer_id:onboardCustomer.id, bin_type:'trash', ownership:'rental', monthly_rental_fee:7.99, assigned_date:new Date().toISOString().split('T')[0], notes:'Deposit: unpaid $25' }})
      }
      if (onboardRecyclingBin && !hasRecycling) {
        await sb('bins', { method:'POST', body:{ customer_id:onboardCustomer.id, bin_type:'recycling', ownership:'rental', monthly_rental_fee:3.99, assigned_date:new Date().toISOString().split('T')[0], notes:'No deposit required' }})
      }
      // Send contract ready email
      const planName = servicesList.find(s => s.id === onboardServiceId)?.name || 'Service Plan'
      fetch('/api/emails/contract-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: onboardCustomer.id, planName, pickupDay: onboardData.pickup_day, startDate: onboardData.start_date })
      }).catch(() => {})
      showToast(`Contract sent to ${onboardCustomer.first_name}! Awaiting their acceptance. ✅`)
      setOnboardCustomer(null)
      setOnboardData({ pickup_day:'', start_date:'', notes:'' })
      setOnboardServiceId('')
      setOnboardBillingCycle('monthly')
      setOnboardGarage(false)
      setOnboardGarageSenior(false)
      setOnboardFrequency('weekly')
      setOnboardCustomRate('')
      setOnboardTrashBin(false)
      setOnboardRecyclingBin(false)
      loadAll()
    } catch (e: any) { showToast('Error: ' + e.message, 'error') }
  }

  async function resetCustomerPin(customerId: string, name: string) {
    await sb(`customers?id=eq.${customerId}`, { method:'PATCH', body:{ portal_pin: null }, prefer:'return=minimal' })
    showToast(`${name}'s PIN cleared — they'll set a new one on next login`)
    loadAll()
  }

  async function addExtraBags() {
    if (!selected || !extraBagDate) { showToast('Please select a pickup date', 'error'); return }
    setExtraBagSaving(true)
    const price = extraBagType === '13gal' ? 3.50 : 5.00
    const label = extraBagType === '13gal' ? '13-gal bag' : '32-gal bag'
    const total = parseFloat((price * extraBagQty).toFixed(2))
    const note = `${extraBagQty}x ${label} (no notice) on ${extraBagDate} — $${total.toFixed(2)}`
    try {
      // Save as a pickup_addon record so it appears on the customer's next invoice
      await sb('pickup_addons', { method:'POST', body:{
        customer_id: selected.id,
        custom_description: note,
        quantity: extraBagQty,
        estimated_price: total,
        final_price: total,
        status: 'confirmed',
        requested_pickup_date: extraBagDate,
      }})
      showToast(`Added ${extraBagQty}x ${label} charge ($${total.toFixed(2)}) to ${selected.first_name}'s next bill`)
      setExtraBagDate('')
      setExtraBagQty(1)
      // Refresh pending addons list
      const addons = await sb(`pickup_addons?customer_id=eq.${selected.id}&status=in.(confirmed,picked_up,pending_quote)&order=created_at.desc&select=*`).catch(()=>[])
      setPendingAddons(addons || [])
    } catch (e: any) { showToast(e.message || 'Failed to add charge', 'error') }
    setExtraBagSaving(false)
  }

  // ── Load customer history ──
  async function loadHistory(customerId: string) {
    const data = await sb(`customer_history?customer_id=eq.${customerId}&order=created_at.desc&limit=30`).catch(() => [])
    setCustomerHistory(data || [])
  }

  // ── Bulk action ──
  async function applyBulkAction() {
    if (!bulkAction || selectedIds.length === 0) return
    if (!confirm(`Apply "${bulkAction}" to ${selectedIds.length} customers?`)) return
    for (const id of selectedIds) {
      try {
        if (['active','paused','cancelled'].includes(bulkAction)) {
          const cust = customers.find((c:any) => c.id === id)
          await sb(`customers?id=eq.${id}`, { method:'PATCH', body:{ status: bulkAction }, prefer:'return=minimal' })
          await sb('customer_history', { method:'POST', body:{ customer_id:id, field_changed:'status', old_value:cust?.status, new_value:bulkAction, changed_by:'admin-bulk' }})
        }
      } catch {}
    }
    setSelectedIds([])
    setBulkAction('')
    showToast(`Applied "${bulkAction}" to ${selectedIds.length} customers`)
    loadAll()
  }

  // ── Send overdue reminders ──
  async function sendOverdueReminders() {
    const overdueInvs = invoices.filter((i:any) => i.status === 'overdue' || i.status === 'sent')
    if (overdueInvs.length === 0) { showToast('No outstanding invoices', 'error'); return }
    setSendingReminders(true)
    let sent = 0
    for (const inv of overdueInvs) {
      try {
        await sb('customer_history', { method:'POST', body:{
          customer_id: inv.customer_id,
          field_changed: 'reminder_sent',
          old_value: null,
          new_value: `Payment reminder sent for $${Number(inv.total).toFixed(2)} invoice`,
          changed_by: 'admin'
        }})
        sent++
      } catch {}
    }
    showToast(`Logged ${sent} payment reminders — email delivery requires Resend setup`)
    setSendingReminders(false)
  }

  // ── Load revenue history (last 6 months from invoices) ──
  async function loadRevenueHistory() {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const data = await sb(`invoices?status=in.(paid,sent)&due_date=gte.${sixMonthsAgo.toISOString().split('T')[0]}&select=total,due_date,status&order=due_date.asc`).catch(() => [])
    // Group by due_date month — invoice sent Dec 25, due Jan 1 = January revenue
    const byMonth: Record<string, number> = {}
    for (const inv of data || []) {
      const month = inv.due_date?.slice(0, 7)
      if (month) byMonth[month] = (byMonth[month] || 0) + Number(inv.total || 0)
    }
    setRevenueHistory(Object.entries(byMonth).map(([month, total]) => ({ month, total })))
  }

  async function loadSelectedBins(customerId: string) {
    setInvoicePreview(null)
    const addons = await sb(`pickup_addons?customer_id=eq.${customerId}&status=in.(confirmed,picked_up,pending_quote)&order=created_at.desc&select=*`).catch(()=>[])
    setPendingAddons(addons || [])
    try {
      const bins = await sb(`bins?customer_id=eq.${customerId}&select=*`)
      setSelectedBins(bins || [])
    } catch { setSelectedBins([]) }
  }

  async function toggleDepositPaid(binId: string, current: boolean) {
    await sb(`bins?id=eq.${binId}`, { method:'PATCH', body:{ notes: current ? 'Deposit: unpaid $25' : 'Deposit: paid' }, prefer:'return=minimal' })
    if (selected) loadSelectedBins(selected.id)
  }

  async function deleteCustomer() {
    if (!selected) return
    try {
      await sb(`customers?id=eq.${selected.id}`, { method:'DELETE', prefer:'return=minimal' })
      showToast('Customer deleted')
      setSelected(null)
      setConfirmDelete(false)
      loadAll()
    } catch { showToast('Error deleting customer', 'error') }
  }

  async function updateStatus(status: string) {
    if (!selected) return
    await sb(`customers?id=eq.${selected.id}`, { method:'PATCH', body:{ status }, prefer:'return=minimal' })
    await sb('customer_history', { method:'POST', body:{ customer_id:selected.id, field_changed:'status', old_value:selected.status, new_value:status, changed_by:'admin' } })
    showToast(`Status → ${status}`)
    setSelected({ ...selected, status })
    loadAll()
  }

  async function saveEdit() {
    if (!selected) return
    const { pickup_day, pickup_frequency, garage_pickup_opt, subscriptions, bins, created_at, id, ...patchData } = editData as any
    if (garage_pickup_opt === 'none') { patchData.garage_side_pickup = false; patchData.garage_side_rate = null }
    else if (garage_pickup_opt === 'standard') { patchData.garage_side_pickup = true; patchData.garage_side_rate = 14.99 }
    else if (garage_pickup_opt === 'senior') { patchData.garage_side_pickup = true; patchData.garage_side_rate = 5 }
    await sb(`customers?id=eq.${selected.id}`, { method:'PATCH', body:patchData, prefer:'return=minimal' })
    const activeSub = (selected as any).subscriptions?.find((s:any) => s.status === 'active')
    if (activeSub && pickup_day !== undefined) {
      const subPatch: any = { pickup_day }
      if (pickup_frequency) subPatch.pickup_frequency = pickup_frequency
      await sb(`subscriptions?id=eq.${activeSub.id}`, { method:'PATCH', body: subPatch, prefer:'return=minimal' })
    }
    showToast('Customer updated')
    setEditMode(false)
    // Re-fetch this customer so the panel updates immediately without closing
    const updated = await sb(`customers?id=eq.${selected.id}&select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,billing_start,services(name))`)
    if (updated?.[0]) setSelected(updated[0])
    loadAll()
  }

  async function logPayment() {
    if (!payCustomer || !payAmount) { showToast('Customer and amount required','error'); return }
    await sb('payment_logs', { method:'POST', body:{ customer_id:payCustomer, payment_method:payMethod, amount:parseFloat(payAmount), reference_number:payRef||null, logged_by:'Suntosh' } })
    showToast('Payment logged')
    setPayAmount(''); setPayRef('')
    loadAll()
  }

  async function loadUpcomingInvoices() {
    const custs = await sb('customers?status=eq.active&select=*,subscriptions(id,rate,billing_cycle,status,pickup_day,billing_start,services(name)),bins(id,bin_type,monthly_rental_fee,ownership)').catch(()=>[])
    const upcoming = []
    for (const c of custs || []) {
      const activeSub = c.subscriptions?.find((s:any) => s.status === 'active')
      if (!activeSub) continue
      const isQ = activeSub.billing_cycle === 'quarterly'
      // Get last paid invoice to determine next send date
      const lastPaid = await sb(`invoices?customer_id=eq.${c.id}&status=in.(paid)&order=period_end.desc&limit=1&select=period_end`).catch(()=>[])
      const paidThrough = lastPaid?.[0]?.period_end || null
      // Calculate next period
      const now = new Date()
      let sendDate: string, periodStart: string, periodEnd: string
      if (paidThrough) {
        const afterPaid = new Date(paidThrough + 'T12:00:00')
        afterPaid.setDate(afterPaid.getDate() + 1)
        periodStart = afterPaid.toISOString().split('T')[0]
        const ps = new Date(periodStart + 'T12:00:00')
        periodEnd = isQ
          ? new Date(ps.getFullYear(), ps.getMonth() + 3, 0).toISOString().split('T')[0]
          : new Date(ps.getFullYear(), ps.getMonth() + 1, 0).toISOString().split('T')[0]
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
        periodEnd = isQ
          ? new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().split('T')[0]
          : new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0]
      }
      // Send date = 25th of month before period starts
      const ps2 = new Date(periodStart + 'T12:00:00')
      sendDate = new Date(ps2.getFullYear(), ps2.getMonth() - 1, 25).toISOString().split('T')[0]
      // Calculate amount with line items
      const lines: {label:string, amount:number}[] = []
      const baseAmt = isQ ? activeSub.rate * 3 : activeSub.rate
      lines.push({ label: `${activeSub.services?.name || 'Service'}${isQ ? ' (Quarterly)' : ''}`, amount: parseFloat(baseAmt.toFixed(2)) })
      ;(c.bins||[]).forEach((b:any) => {
        if (b.ownership==='rental') lines.push({ label: b.bin_type==='trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental', amount: Number(b.monthly_rental_fee||0) })
      })
      if (c.garage_side_pickup) lines.push({ label: 'Garage-Side Pickup', amount: Number(c.garage_side_rate||10) })
      const addons = await sb(`pickup_addons?customer_id=eq.${c.id}&status=in.(confirmed,picked_up)&select=final_price,custom_description`).catch(()=>[])
      const addonTotal = (addons||[]).reduce((s:number,a:any) => s + Number(a.final_price||0), 0)
      const addonLabels = (addons||[]).map((a:any) => a.custom_description).join(', ')
      ;(addons||[]).forEach((a:any) => lines.push({ label: a.custom_description||'Extra Item', amount: Number(a.final_price||0) }))
      const total = parseFloat(lines.reduce((s,l) => s + l.amount, 0).toFixed(2))
      upcoming.push({ customerId: c.id, name: `${c.first_name} ${c.last_name}`, plan: activeSub.services?.name, billing: activeSub.billing_cycle, paidThrough, periodStart, periodEnd, sendDate, total, addonTotal, addonLabels, lines })
    }
    upcoming.sort((a:any,b:any) => a.sendDate.localeCompare(b.sendDate))
    setUpcomingInvoices(upcoming)
  }

  async function previewNextInvoice(cust: any) {
    const activeSub = cust.subscriptions?.find((s:any) => s.status === 'active')
    const bins = await sb(`bins?customer_id=eq.${cust.id}&ownership=eq.rental&select=*`).catch(()=>[])
    const addons = await sb(`pickup_addons?customer_id=eq.${cust.id}&status=in.(confirmed,picked_up)&select=*`).catch(()=>[])

    // Check last paid invoice to determine actual next due date
    const lastPaid = await sb(`invoices?customer_id=eq.${cust.id}&status=in.(paid)&order=period_end.desc&limit=1&select=period_end`).catch(()=>[])
    const paidThrough = lastPaid?.[0]?.period_end || null

    const now = new Date()
    const isQ = activeSub?.billing_cycle === 'quarterly'

    // Calculate actual next period start — day after paid-through ends (or next month if no paid invoice)
    let periodStart: string
    let periodEnd: string
    let dueDate: string

    if (paidThrough) {
      const afterPaid = new Date(paidThrough + 'T12:00:00')
      afterPaid.setDate(afterPaid.getDate() + 1)
      periodStart = afterPaid.toISOString().split('T')[0]
      // period end: 3 months for quarterly, 1 month for monthly
      const ps = new Date(periodStart + 'T12:00:00')
      periodEnd = isQ
        ? new Date(ps.getFullYear(), ps.getMonth() + 3, 0).toISOString().split('T')[0]
        : new Date(ps.getFullYear(), ps.getMonth() + 1, 0).toISOString().split('T')[0]
      dueDate = periodStart
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
      periodEnd = isQ
        ? new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().split('T')[0]
        : new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0]
      dueDate = periodStart
    }

    const lines: {label:string, amount:number, note?:string}[] = []
    if (activeSub) {
      const amt = isQ ? activeSub.rate * 3 : activeSub.rate
      lines.push({ label: `${activeSub.services?.name || 'Service'}${isQ ? ' (Quarterly)' : ''}`, amount: amt })
    }
    for (const b of bins || []) {
      lines.push({ label: b.bin_type === 'trash' ? 'Trash Bin Rental' : 'Recycling Bin Rental', amount: Number(b.monthly_rental_fee || 0) })
    }
    if (cust.garage_side_pickup) lines.push({ label: 'Garage-Side Pickup', amount: Number(cust.garage_side_rate || 14.99) })
    for (const a of addons || []) {
      lines.push({ label: a.custom_description || 'Extra item', amount: Number(a.final_price || 0), note: a.requested_pickup_date ? `Pickup: ${a.requested_pickup_date}` : undefined })
    }

    const total = parseFloat(lines.reduce((s,l) => s + l.amount, 0).toFixed(2))
    setInvoicePreview({ lines, total, periodStart, periodEnd, dueDate, paidThrough, customer: cust, hasAddons: (addons||[]).length > 0 })
  }

  async function loadAllNotices() {
    const n = await sb('schedule_notices?order=notice_date.desc&select=*').catch(()=>[])
    setAllNotices(n || [])
  }

  async function recalcInvoice(inv: any) {
    // Find the customer and recalculate total including bins and garage
    const custs = await sb(`customers?id=eq.${inv.customer_id}&select=*,subscriptions(id,rate,billing_cycle,status,pickup_day,billing_start,services(name)),bins(id,bin_type,monthly_rental_fee,ownership)`)
    const cust = custs?.[0]
    if (!cust) { showToast('Customer not found', 'error'); return }
    const { calcInvoiceTotal } = await import('@/lib/billing').catch(() => ({ calcInvoiceTotal: null }))
    // Manual calculation since we can't import server lib client-side
    let total = 0
    const activeSub = cust.subscriptions?.find((s:any) => s.status === 'active')
    if (activeSub) total += activeSub.billing_cycle === 'quarterly' ? activeSub.rate * 3 : activeSub.rate
    for (const bin of cust.bins || []) {
      if (bin.ownership === 'rental') total += Number(bin.monthly_rental_fee || 0)
    }
    if (cust.garage_side_pickup) total += Number(cust.garage_side_rate || 14.99)
    total = parseFloat(total.toFixed(2))
    await sb(`invoices?id=eq.${inv.id}`, { method:'PATCH', body:{ subtotal: total, total }, prefer:'return=minimal' })
    showToast(`Invoice recalculated to $${total.toFixed(2)}`)
    loadAll()
  }

  async function markPaid(id: string) {
    await sb(`invoices?id=eq.${id}`, { method:'PATCH', body:{ status:'paid', paid_at:new Date().toISOString() }, prefer:'return=minimal' })
    showToast('Marked as paid')
    loadAll()
  }

  async function applyDiscount() {
    if (!discountInvoice) return
    const amount = parseFloat(discountAmount)
    if (isNaN(amount) || amount <= 0) { showToast('Enter a valid discount amount', 'error'); return }
    const newTotal = parseFloat(Math.max(0, Number(discountInvoice.total) - amount).toFixed(2))
    const newAdjustments = parseFloat((Number(discountInvoice.adjustments_total || 0) + amount).toFixed(2))
    const discountLine = `Discount: -$${amount.toFixed(2)}${discountNote ? ' (' + discountNote + ')' : ''}`
    const updatedNotes = discountInvoice.notes ? `${discountInvoice.notes}, ${discountLine}` : discountLine
    await sb(`invoices?id=eq.${discountInvoice.id}`, {
      method: 'PATCH',
      body: { total: newTotal, adjustments_total: newAdjustments, notes: updatedNotes },
      prefer: 'return=minimal'
    })
    showToast(`Discount of $${amount.toFixed(2)} applied — new total $${newTotal.toFixed(2)}`)
    setDiscountInvoice(null)
    setDiscountAmount('')
    setDiscountNote('')
    loadAll()
  }

  const filtered = customers.filter(c => {
    const q = `${c.first_name} ${c.last_name} ${c.email} ${c.service_address}`.toLowerCase()
    return (!search || q.includes(search.toLowerCase())) && (!statusFilter || c.status===statusFilter) && (!townFilter || c.town===townFilter)
  })

  const days = ['monday','tuesday','wednesday','thursday','friday']
  const byDay: Record<string, Customer[]> = {}
  days.forEach(d => byDay[d]=[])
  byDay['unassigned']=[]
  customers.filter(c => c.status==='active').forEach(c => {
    const subPickupDay = (c as any).subscriptions?.find((s:any)=>s.status==='active')?.pickup_day || ''
    const d = subPickupDay && days.includes(subPickupDay) ? subPickupDay : 'unassigned'
    byDay[d].push(c)
  })

  const onAdd = (e: any) => setAddData((p:any) => ({ ...p, [e.target.name]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))
  const onEdit = (e: any) => setEditData((p:any) => ({ ...p, [e.target.name]: e.target.type==='checkbox' ? e.target.checked : e.target.value }))

  // ── LOGIN ──────────────────────────────────────────────────
  if (!loggedIn) return (
    <div style={{ fontFamily:'DM Sans,sans-serif', background:'#0f0f0f', color:'#f9f9f6', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'2.5rem', width:'340px', textAlign:'center' }}>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.8rem', marginBottom:'0.25rem' }}>Patil <span style={{ color:'#4caf50' }}>Waste</span> Admin</div>
        <div style={{ fontSize:'0.72rem', letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'2rem' }}>Dashboard</div>
        <input type="password" placeholder="Enter password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.7rem 0.9rem', color:'#fff', fontSize:'1rem', fontFamily:'inherit', outline:'none', width:'100%', textAlign:'center', letterSpacing:'0.2em', marginBottom:'1rem' }} />
        <button onClick={login} style={{ width:'100%', background:'#2e7d32', color:'#fff', border:'none', borderRadius:'3px', padding:'0.85rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontSize:'0.85rem', fontFamily:'inherit' }}>Log In</button>
        {pwErr && <p style={{ color:'#e53935', fontSize:'0.8rem', marginTop:'0.75rem' }}>{pwErr}</p>}
      </div>
    </div>
  )

  // Also add contract_pending badge color
  const navItems: [string,string,string][] = [['dashboard','📊','Dashboard'],['customers','👥','Customers'],['routes','🗓️','Routes'],['invoices','🧾','Invoices'],['payments','💵','Payments'],['requests','🔔','Requests'],['jobs','🚛','Jobs'],['notices','📢','Notices'],['catalog','🏷️','Catalog']]

  return (
    <div className="admin-page" style={{ fontFamily:'DM Sans,sans-serif', background:'#0f0f0f', color:'#f9f9f6', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .admin-page { height: auto !important; overflow: visible !important; min-height: 100vh; }
          .admin-topbar { padding: 0 1rem !important; height: auto !important; min-height: 56px; flex-wrap: wrap; }
          .admin-topbar-badge { display: none !important; }
          .admin-layout { flex-direction: column !important; height: auto !important; overflow: visible !important; }
          .admin-sidebar {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.07) !important;
          }
          .admin-sidebar > div {
            flex-direction: column !important;
            padding: 0.55rem 0.7rem !important;
            font-size: 0.7rem !important;
            border-left: none !important;
            border-bottom: 2px solid transparent;
            white-space: nowrap !important;
            gap: 0.2rem !important;
            min-width: fit-content;
            justify-content: center;
            align-items: center !important;
          }
          .admin-main { padding: 0.75rem !important; }
          .admin-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .admin-table-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .admin-table-scroll table { min-width: 560px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="admin-topbar" style={{ background:'#141414', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.4rem', letterSpacing:'0.04em' }}>Patil <span style={{ color:'#4caf50' }}>Waste</span> Admin</div>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <span className="admin-topbar-badge" style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#6b7280', background:'rgba(255,255,255,0.05)', padding:'0.3rem 0.7rem', borderRadius:'20px' }}>{customers.length} customers</span>
          <button onClick={() => { localStorage.removeItem('pwradmin'); setLoggedIn(false); setAdminToken('') }} style={{ fontSize:'0.75rem', color:'#6b7280', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'4px', padding:'0.3rem 0.75rem', cursor:'pointer', fontFamily:'inherit' }}>Log Out</button>
        </div>
      </div>

      <div className="admin-layout" style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar */}
        <nav className="admin-sidebar" style={{ width:'180px', background:'#141414', borderRight:'1px solid rgba(255,255,255,0.07)', padding:'1rem 0', flexShrink:0, overflowY:'auto' }}>
          {navItems.map(([id,icon,label]) => {
            const pendingCount = id === 'requests' ? serviceRequests.length + skipRequests.length : id === 'jobs' ? jobRequests.filter((j:any)=>j.status==='new').length + pickupAddons.filter((a:any)=>a.status==='pending_quote').length : id === 'dashboard' ? customers.filter(c=>c.status==='pending').length : 0
            return (
              <div key={id} onClick={async () => { setView(id); if (id === 'notices') loadAllNotices(); if (id === 'catalog') { const items = await sb('bulky_item_catalog?select=*&order=name.asc').catch(()=>[]); setCatalog(items); setCatalogEdits({}) } }} style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.7rem 1.25rem', fontSize:'0.82rem', fontWeight:500, color:view===id?'#fff':'#6b7280', cursor:'pointer', borderLeft:`2px solid ${view===id?'#4caf50':'transparent'}`, background:view===id?'rgba(61,158,64,0.08)':'transparent', transition:'all 0.15s' }}>
                <span>{icon}</span><span>{label}</span>
                {pendingCount > 0 && <span style={{ marginLeft:'auto', background:'#dc2626', color:'#fff', borderRadius:'10px', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.45rem', minWidth:'18px', textAlign:'center' }}>{pendingCount}</span>}
              </div>
            )
          })}
        </nav>

        {/* Main content */}
        <div className="admin-main" style={{ flex:1, overflowY:'auto', padding:'1.5rem' }}>

          {/* ── DASHBOARD ── */}
          {view==='dashboard' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
                <div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Dashboard</div>
                  {lastUpdated && <div style={{ fontSize:'0.7rem', color:'#6b7280', marginTop:'0.1rem' }}>Updated {lastUpdated.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>}
                </div>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <button onClick={async () => { setRefreshing(true); await loadAll(); setRefreshing(false) }}
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color: refreshing ? '#6b7280' : 'rgba(255,255,255,0.7)', padding:'0.4rem 0.75rem', cursor:'pointer', fontSize:'0.78rem', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <span style={{ display:'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                  <Btn onClick={() => setShowAddModal(true)}>+ Add Customer</Btn>
                </div>
              </div>
              <div className="admin-stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
                {([['Active',stats.active,'#fff'],['Pending',stats.pending,'#fff'],['Est. Revenue',`$${stats.revenue.toFixed(0)}/mo`,'#4caf50'],['Overdue',stats.overdue,'#e53935']] as [string,any,string][]).map(([label,val,color]) => (
                  <div key={label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.25rem' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.4rem' }}>{label}</div>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2.2rem', color, lineHeight:1 }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Pending onboarding alert */}
              {customers.filter(c => c.status === 'pending' || c.status === 'contract_pending').length > 0 && (
                <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.04em', color:'#fbbf24', marginBottom:'0.75rem' }}>
                    🕐 {customers.filter(c => c.status === 'pending' || c.status === 'contract_pending').length} Customer{customers.filter(c => c.status === 'pending' || c.status === 'contract_pending').length > 1 ? 's' : ''} Awaiting Onboarding
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {customers.filter(c => c.status === 'pending' || c.status === 'contract_pending').map(c => (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.2)', borderRadius:'6px', padding:'0.65rem 0.9rem' }}>
                        <div>
                          <span style={{ fontWeight:600 }}>{c.first_name} {c.last_name}</span>
                          <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', marginLeft:'0.6rem' }}>{c.email}</span>
                          <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', marginLeft:'0.6rem' }}>Signed up {fmt(c.created_at)}</span>
                        </div>
                        <Btn small onClick={() => {
                          setOnboardCustomer(c)
                          setOnboardData({ pickup_day:'', start_date:'', notes: c.notes || '' })
                          // Pre-select service if they already have a subscription
                          const sub = (c as any).subscriptions?.find((s:any) => s.status === 'active')
                          if (sub) setOnboardServiceId(sub.service_id || '')
                          // Pre-check bin rentals from signup notes
                          const n = (c.notes || '').toLowerCase()
                          setOnboardTrashBin(n.includes('trash bin') || n.includes('trash + recycling'))
                          setOnboardRecyclingBin(n.includes('recycling bin') || n.includes('trash + recycling'))
                          // Pre-check garage pickup if they requested it
                          setOnboardGarage(c.garage_side_pickup || false)
                        }}>Onboard →</Btn>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Chart */}
              {revenueHistory.length > 0 && (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.04em', marginBottom:'1rem' }}>📈 Revenue (Last 6 Months)</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:'0.5rem', height:'100px' }}>
                    {revenueHistory.map(({ month, total }) => {
                      const max = Math.max(...revenueHistory.map(r => r.total), 1)
                      const pct = (total / max) * 100
                      const label = new Date(month + '-15').toLocaleDateString('en-US', { month:'short', year:'2-digit' })
                      return (
                        <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.35rem' }}>
                          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.4)' }}>${total >= 1000 ? (total/1000).toFixed(1)+'k' : total.toFixed(0)}</div>
                          <div style={{ width:'100%', background:'rgba(46,125,50,0.7)', borderRadius:'3px 3px 0 0', height:`${Math.max(pct, 4)}%`, transition:'height 0.3s', minHeight:'4px' }} />
                          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.4)', textAlign:'center' }}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="admin-table-scroll" style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)', fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.04em' }}>Recent Signups</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                  <thead><tr>{['Name','Town','Status','Signed Up'].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {customers.slice(0,5).map(c=>(
                      <tr key={c.id} onClick={()=>{setSelected(c);setView('customers');loadSelectedBins(c.id)}} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}>
                        <td style={{ padding:'0.85rem 1rem', fontWeight:600 }}>{c.first_name} {c.last_name}</td>
                        <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)', textTransform:'capitalize' }}>{c.town}</td>
                        <td style={{ padding:'0.85rem 1rem' }}><Badge status={c.status} /></td>
                        <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)' }}>{fmt(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CUSTOMERS ── */}
          {view==='customers' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Customers</div>
                <Btn onClick={()=>setShowAddModal(true)}>+ Add Customer</Btn>
              </div>
              {/* Bulk actions bar */}
              {selectedIds.length > 0 && (
                <div style={{ background:'rgba(46,125,50,0.08)', border:'1px solid rgba(46,125,50,0.25)', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#4caf50' }}>{selectedIds.length} selected</span>
                  <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)}
                    style={{ background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.4rem 0.65rem', color:'#fff', fontSize:'0.8rem', fontFamily:'inherit' }}>
                    <option value=''>— Choose action —</option>
                    <option value='active'>Set Active</option>
                    <option value='paused'>Set Paused</option>
                    <option value='cancelled'>Set Cancelled</option>
                  </select>
                  <Btn small onClick={applyBulkAction} color='#2e7d32'>Apply</Btn>
                  <button onClick={()=>setSelectedIds([])} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.78rem', fontFamily:'inherit' }}>Clear</button>
                </div>
              )}

              {/* Search + filters */}
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)', flexWrap:'wrap' }}>
                  <input placeholder="Search name, email, address..." value={search} onChange={e=>setSearch(e.target.value)}
                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.5rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'240px' }} />
                  {[['',statusFilter,setStatusFilter,['','active','pending','paused','overdue','cancelled'],['All Statuses','Active','Pending','Paused','Overdue','Cancelled']],
                    ['',townFilter,setTownFilter,['','bedford','merrimack','amherst','milford'],['All Towns','Bedford','Merrimack','Amherst','Milford']]].map(([,val,setter,vals,labels]:any,i)=>(
                    <select key={i} value={val} onChange={e=>setter(e.target.value)}
                      style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.5rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                      {vals.map((v:string,j:number)=><option key={v} value={v} style={{ background:'#1a1a1a' }}>{labels[j]}</option>)}
                    </select>
                  ))}
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                    <thead><tr>{['Name','Email','Town','Plan','Billing','Status','Actions'].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.map(c=>(
                        <tr key={c.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding:'0.85rem 1rem', fontWeight:600, cursor:'pointer', color:'#4caf50', whiteSpace:'nowrap' }} onClick={()=>{setSelected(c);setEditData({...c});setEditMode(false);setConfirmDelete(false);loadSelectedBins(c.id)}}>{c.first_name} {c.last_name}</td>
                          <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)' }}>{c.email}</td>
                          <td style={{ padding:'0.85rem 1rem', textTransform:'capitalize' }}>{c.town}</td>
                          <td style={{ padding:'0.85rem 1rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>{c.subscriptions?.[0]?.services?.name || '—'}</td>
                          <td style={{ padding:'0.85rem 1rem', fontSize:'0.75rem' }}>
                            {c.subscriptions?.[0]?.billing_cycle === 'quarterly'
                              ? <span style={{ background:'rgba(124,58,237,0.15)', color:'#a78bfa', padding:'0.15rem 0.5rem', borderRadius:'10px', fontWeight:700 }}>Quarterly</span>
                              : <span style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', padding:'0.15rem 0.5rem', borderRadius:'10px' }}>Monthly</span>
                            }
                          </td>
                          <td style={{ padding:'0.85rem 1rem' }}><Badge status={c.status} /></td>
                          <td style={{ padding:'0.85rem 1rem' }}>
                            <div style={{ display:'flex', gap:'0.4rem' }}>
                              <Btn small onClick={()=>{setSelected(c);setEditData({...c});setEditMode(false);setConfirmDelete(false);loadSelectedBins(c.id)}}>View</Btn>
                              <Btn small color='#7f1d1d' onClick={()=>{setSelected(c);setConfirmDelete(true)}}>Delete</Btn>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length===0 && <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#6b7280' }}>No customers found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ROUTES ── */}
          {view==='routes' && (
            <div>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Weekly Routes</div>
              {[...days,'unassigned'].map(day=>{
                const list = byDay[day]
                if (!list?.length) return null
                return (
                  <div key={day} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', marginBottom:'1rem', overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.25rem', background:'rgba(61,158,64,0.08)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.3rem', letterSpacing:'0.04em' }}>{cap(day)}</div>
                      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>{list.length} stop{list.length!==1?'s':''}</span>
                    </div>
                    {list.map((c,i)=>{
                      const activeSub = (c as any).subscriptions?.find((s:any) => s.status === 'active')
                      const isBiweekly = activeSub?.pickup_frequency === 'biweekly'
                      const isThisWeek = !isBiweekly || isBiweeklyPickupWeek(activeSub?.billing_start)
                      return (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.84rem', opacity: isThisWeek ? 1 : 0.35 }}>
                          <div style={{ width:'24px', height:'24px', background: isThisWeek ? '#2e7d32' : '#374151', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, flexShrink:0 }}>{i+1}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:600 }}>{c.first_name} {c.last_name}</div>
                            <div style={{ fontSize:'0.78rem', color:'#6b7280' }}>{c.service_address}</div>
                          </div>
                          {isBiweekly && (
                            <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'0.2rem 0.55rem', borderRadius:'4px',
                              background: isThisWeek ? 'rgba(46,125,50,0.15)' : 'rgba(255,255,255,0.06)',
                              color: isThisWeek ? '#4caf50' : '#6b7280' }}>
                              {isThisWeek ? '✅ This week' : '⏭ Skip week'}
                            </span>
                          )}
                          {c.gate_notes && <span style={{ fontSize:'0.72rem', color:'#ffb300', background:'rgba(255,179,0,0.1)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>📌 {c.gate_notes}</span>}
                          {c.garage_side_pickup && <span style={{ fontSize:'0.7rem', color:'#4caf50', background:'rgba(61,158,64,0.1)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>🏠 Garage</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {customers.filter(c=>c.status==='active').length===0 && <div style={{ textAlign:'center', color:'#6b7280', padding:'3rem' }}>No active customers yet</div>}
            </div>
          )}

          {/* ── PHOTO LIGHTBOX ── */}
          {lightboxSrc && (
            <div onClick={() => setLightboxSrc(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out', padding:'1.5rem' }}>
              <img src={lightboxSrc} alt="Photo" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:'8px', boxShadow:'0 8px 40px rgba(0,0,0,0.8)', objectFit:'contain' }} onClick={e => e.stopPropagation()} />
              <button onClick={() => setLightboxSrc(null)} style={{ position:'fixed', top:'1rem', right:'1.25rem', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50%', color:'#fff', width:'36px', height:'36px', fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              <a href={lightboxSrc} download="photo.jpg" onClick={e=>e.stopPropagation()} style={{ position:'fixed', bottom:'1.5rem', left:'50%', transform:'translateX(-50%)', background:'#2e7d32', color:'#fff', textDecoration:'none', borderRadius:'6px', padding:'0.5rem 1.25rem', fontSize:'0.82rem', fontWeight:700, letterSpacing:'0.06em' }}>⬇ Download</a>
            </div>
          )}

          {/* ── INVOICES ── */}
          {discountInvoice && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'2rem', width:'380px', maxWidth:'100%' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.6rem', letterSpacing:'0.02em', marginBottom:'0.25rem' }}>Apply Discount</div>
                <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', marginBottom:'1.5rem' }}>
                  {discountInvoice.customers?.first_name} {discountInvoice.customers?.last_name} — Current total: <strong style={{ color:'#fff' }}>${Number(discountInvoice.total).toFixed(2)}</strong>
                </div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Discount Amount ($)</label>
                  <input type='number' step='0.01' min='0' value={discountAmount} onChange={e=>setDiscountAmount(e.target.value)} placeholder='0.00' autoFocus
                    style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', padding:'0.7rem 0.9rem', color:'#fff', fontSize:'1rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ marginBottom:'1.25rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Reason (optional)</label>
                  <input value={discountNote} onChange={e=>setDiscountNote(e.target.value)} placeholder='e.g. loyalty discount, service issue...'
                    style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', padding:'0.7rem 0.9rem', color:'#fff', fontSize:'0.88rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                </div>
                {discountAmount && !isNaN(parseFloat(discountAmount)) && parseFloat(discountAmount) > 0 && (
                  <div style={{ background:'rgba(46,125,50,0.1)', border:'1px solid rgba(46,125,50,0.3)', borderRadius:'6px', padding:'0.65rem 0.9rem', marginBottom:'1.25rem', fontSize:'0.88rem' }}>
                    New total: <strong style={{ color:'#4caf50' }}>${Math.max(0, Number(discountInvoice.total) - parseFloat(discountAmount)).toFixed(2)}</strong>
                    <span style={{ color:'rgba(255,255,255,0.35)', marginLeft:'0.5rem' }}>(saving ${parseFloat(discountAmount).toFixed(2)})</span>
                  </div>
                )}
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  <Btn onClick={applyDiscount} style={{ flex:1 }}>Apply Discount</Btn>
                  <Btn color='#2a2a2a' textColor='#aaa' onClick={()=>{ setDiscountInvoice(null); setDiscountAmount(''); setDiscountNote('') }} style={{ flex:1 }}>Cancel</Btn>
                </div>
              </div>
            </div>
          )}

          {view==='invoices' && (
            <div style={{ maxWidth:'900px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Invoices</div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <Btn small color='#7f1d1d' onClick={sendOverdueReminders} disabled={sendingReminders}>
                    {sendingReminders ? 'Sending…' : '📧 Send Reminders'}
                  </Btn>
                  <Btn small onClick={async () => {
                    showToast('Generating invoices…')
                    try {
                      const res = await fetch('/api/admin/run-cron', { method:'POST', headers:{ Authorization:`Bearer ${adminToken}` }})
                      const data = await res.json()
                      showToast(`Done — ${data.generated} generated, ${data.skipped} skipped`)
                      loadAll()
                    } catch { showToast('Failed to generate invoices','error') }
                  }}>⚡ Generate Now</Btn>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:'0.25rem', marginBottom:'1.25rem', background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'0.25rem' }}>
                {([['sent','📄 Sent & Paid'],['upcoming','🔮 Upcoming']] as const).map(([id,label]) => (
                  <button key={id} onClick={() => { setInvoiceTab(id); if (id==='upcoming') loadUpcomingInvoices() }}
                    style={{ flex:1, background: invoiceTab===id ? 'rgba(46,125,50,0.3)' : 'transparent', border: invoiceTab===id ? '1px solid rgba(46,125,50,0.4)' : '1px solid transparent', borderRadius:'6px', color: invoiceTab===id ? '#4caf50' : 'rgba(255,255,255,0.45)', padding:'0.5rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', fontWeight:700, letterSpacing:'0.04em' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── SENT & PAID ── */}
              {invoiceTab === 'sent' && (<>
                {invoices.filter((i:any)=>i.status==='overdue').length > 0 && (
                  <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'8px', padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
                    <div style={{ fontWeight:700, color:'#f87171', marginBottom:'0.5rem' }}>⚠️ {invoices.filter((i:any)=>i.status==='overdue').length} overdue invoice(s)</div>
                    {invoices.filter((i:any)=>i.status==='overdue').map((inv:any) => (
                      <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.84rem', padding:'0.35rem 0' }}>
                        <span>{inv.customers?.first_name} {inv.customers?.last_name} — ${Number(inv.total).toFixed(2)} due {inv.due_date}</span>
                        <Btn small onClick={()=>markPaid(inv.id)}>Mark Paid</Btn>
                      </div>
                    ))}
                  </div>
                )}
                <div className="admin-table-scroll" style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                    <thead><tr>{['Customer','Period','Total','Status','Due','Actions'].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {invoices.map((inv:any)=>(
                        <tr key={inv.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background: inv.status==='overdue'?'rgba(220,38,38,0.04)':'' }}>
                          <td style={{ padding:'0.85rem 1rem', fontWeight:600 }}>{inv.customers?`${inv.customers.first_name} ${inv.customers.last_name}`:'—'}</td>
                          <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>{inv.period_start} – {inv.period_end}</td>
                          <td style={{ padding:'0.85rem 1rem', fontWeight:600 }}>${Number(inv.total).toFixed(2)}</td>
                          <td style={{ padding:'0.85rem 1rem' }}><Badge status={inv.status} /></td>
                          <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)' }}>{fmt(inv.due_date)}</td>
                          <td style={{ padding:'0.85rem 1rem' }}>
                            <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                              {inv.status!=='paid' && <Btn small onClick={()=>markPaid(inv.id)}>Mark Paid</Btn>}
                              {inv.status!=='paid' && <Btn small color='#4a1d96' onClick={()=>{ setDiscountInvoice(inv); setDiscountAmount(''); setDiscountNote('') }}>🏷️ Discount</Btn>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {invoices.length===0 && <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#6b7280' }}>No invoices yet — click Generate Now to create them</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>)}

              {/* ── UPCOMING ── */}
              {invoiceTab === 'upcoming' && (
                <div className="admin-table-scroll" style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                  <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>
                    Showing next invoice for each active customer. Click a row to edit the send date or amount before it goes out.
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                    <thead><tr>{['Customer','Plan','Period','Est. Total','Send On','Paid Through',''].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {upcomingInvoices.length === 0 && (
                        <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'#6b7280' }}>Loading upcoming invoices…</td></tr>
                      )}
                      {upcomingInvoices.map((inv:any) => {
                        const isEditing = editingUpcoming === inv.customerId
                        const edits = upcomingEdits[inv.customerId] || {}
                        const isExpanded = selectedUpcoming === inv.customerId
                        const discountVal = parseFloat(upcomingDiscountInputs[inv.customerId]||'0') || 0
                        const discountedTotal = Math.max(0, inv.total - discountVal)
                        return (
                          <>
                          <tr key={inv.customerId} style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)', background: isExpanded ? 'rgba(255,255,255,0.03)' : '' }}>
                            <td style={{ padding:'0.85rem 1rem', fontWeight:600, cursor:'pointer', userSelect:'none' }} onClick={() => setSelectedUpcoming(isExpanded ? null : inv.customerId)}>
                              {inv.name} <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.7rem' }}>{isExpanded ? '▲' : '▼'}</span>
                            </td>
                            <td style={{ padding:'0.85rem 1rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.55)' }}>{inv.plan}<br/><span style={{ color:'rgba(255,255,255,0.3)' }}>{inv.billing}</span></td>
                            <td style={{ padding:'0.85rem 1rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.45)' }}>{inv.periodStart}<br/>– {inv.periodEnd}</td>
                            <td style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#4caf50' }}>
                              {isEditing ? (
                                <input type='number' step='0.01' defaultValue={inv.total}
                                  onChange={e => setUpcomingEdits((p:any) => ({...p, [inv.customerId]: {...(p[inv.customerId]||{}), total: e.target.value}}))}
                                  style={{ width:'80px', background:'#111', border:'1px solid rgba(46,125,50,0.4)', borderRadius:'4px', padding:'0.25rem 0.4rem', color:'#fff', fontSize:'0.85rem', fontFamily:'inherit' }} />
                              ) : (
                                <div>
                                  ${inv.total.toFixed(2)}
                                  {inv.addonTotal > 0 && (
                                    <div style={{ fontSize:'0.7rem', color:'#fbbf24', fontWeight:400, marginTop:'0.15rem' }}>
                                      🛍️ +${inv.addonTotal.toFixed(2)} extras
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap' }}>
                              {isEditing ? (
                                <input type='date' defaultValue={inv.sendDate}
                                  onChange={e => setUpcomingEdits((p:any) => ({...p, [inv.customerId]: {...(p[inv.customerId]||{}), sendDate: e.target.value}}))}
                                  style={{ background:'#111', border:'1px solid rgba(46,125,50,0.4)', borderRadius:'4px', padding:'0.25rem 0.4rem', color:'#fff', fontSize:'0.8rem', fontFamily:'inherit' }} />
                              ) : fmt(inv.sendDate)}
                            </td>
                            <td style={{ padding:'0.85rem 1rem', fontSize:'0.78rem', color: inv.paidThrough ? '#4caf50' : 'rgba(255,255,255,0.3)' }}>
                              {inv.paidThrough ? `✅ ${fmt(inv.paidThrough)}` : '—'}
                            </td>
                            <td style={{ padding:'0.85rem 1rem' }}>
                              {isEditing ? (
                                <div style={{ display:'flex', gap:'0.4rem' }}>
                                  <Btn small onClick={async () => {
                                    const e = upcomingEdits[inv.customerId] || {}
                                    // Save to subscription if amount changed
                                    if (e.total) {
                                      const subs = await sb(`subscriptions?customer_id=eq.${inv.customerId}&status=eq.active&select=id,billing_cycle`).catch(()=>[])
                                      if (subs?.[0]) {
                                        const isQ = subs[0].billing_cycle === 'quarterly'
                                        const parsed = parseFloat(e.total)
                                        if (!isNaN(parsed) && parsed > 0) {
                                          const monthlyRate = isQ ? parsed / 3 : parsed
                                          await sb(`subscriptions?id=eq.${subs[0].id}`, { method:'PATCH', body:{ rate: parseFloat(monthlyRate.toFixed(2)) }, prefer:'return=minimal' })
                                        }
                                      }
                                    }
                                    showToast('Updated')
                                    setEditingUpcoming(null)
                                    loadUpcomingInvoices()
                                  }}>Save</Btn>
                                  <Btn small color='transparent' textColor='#6b7280' onClick={() => setEditingUpcoming(null)}>Cancel</Btn>
                                </div>
                              ) : (
                                <Btn small color='#1e3a2a' onClick={() => setEditingUpcoming(inv.customerId)}>✏️ Edit</Btn>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                              <td colSpan={7} style={{ padding:0 }}>
                                <div style={{ background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'1.25rem 1.5rem' }}>
                                  <div style={{ marginBottom:'1rem', maxWidth:'360px' }}>
                                    <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'0.6rem' }}>Charge Breakdown</div>
                                    {(inv.lines||[]).map((line:any, i:number) => (
                                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'0.3rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.85rem' }}>
                                        <span style={{ color:'rgba(255,255,255,0.65)' }}>{line.label}</span>
                                        <span style={{ fontWeight:600 }}>${line.amount.toFixed(2)}</span>
                                      </div>
                                    ))}
                                    {discountVal > 0 && (
                                      <div style={{ display:'flex', justifyContent:'space-between', padding:'0.3rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.85rem' }}>
                                        <span style={{ color:'#f59e0b' }}>Discount</span>
                                        <span style={{ fontWeight:600, color:'#f59e0b' }}>-${discountVal.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0 0', fontSize:'0.9rem' }}>
                                      <span style={{ fontWeight:700 }}>Total</span>
                                      <span style={{ fontWeight:700, color:'#4caf50' }}>${discountedTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                      <label style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>Discount $</label>
                                      <input type='number' step='0.01' min='0' placeholder='0.00'
                                        value={upcomingDiscountInputs[inv.customerId]||''}
                                        onChange={e => setUpcomingDiscountInputs((p:any) => ({...p, [inv.customerId]: e.target.value}))}
                                        style={{ width:'80px', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', padding:'0.35rem 0.5rem', color:'#fff', fontSize:'0.85rem', fontFamily:'inherit', outline:'none' }} />
                                    </div>
                                    {discountVal > 0 && (
                                      <Btn small color='#4a1d96' onClick={() => {
                                        setUpcomingEdits((p:any) => ({...p, [inv.customerId]: {...(p[inv.customerId]||{}), total: discountedTotal.toFixed(2)}}))
                                        setEditingUpcoming(inv.customerId)
                                        setSelectedUpcoming(null)
                                      }}>🏷️ Apply Discount</Btn>
                                    )}
                                    <Btn small color='#1e3a2a' onClick={() => { setEditingUpcoming(inv.customerId); setSelectedUpcoming(null) }}>✏️ Edit Total</Btn>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {view==='payments' && (
            <div style={{ maxWidth:'560px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Log Payment</div>
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.5rem', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.3rem', marginBottom:'1.25rem', letterSpacing:'0.02em' }}>Record Manual Payment</div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Customer</label>
                  <select value={payCustomer} onChange={e=>setPayCustomer(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%', cursor:'pointer' }}>
                    <option value="" style={{ background:'#1a1a1a' }}>Select customer...</option>
                    {customers.map(c=><option key={c.id} value={c.id} style={{ background:'#1a1a1a' }}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'0.75rem' }}>
                  <div>
                    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Amount ($)</label>
                    <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="0.00" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Method</label>
                    <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%', cursor:'pointer' }}>
                      {['cash','venmo','zelle','card'].map(m=><option key={m} value={m} style={{ background:'#1a1a1a' }}>{cap(m)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Reference / Note</label>
                  <input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Venmo @handle, cash receipt #..." style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }} />
                </div>
                <Btn onClick={logPayment} style={{ width:'100%' }}>Log Payment</Btn>
              </div>
              <div className="admin-table-scroll" style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)', fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem' }}>Recent Payments</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                  <thead><tr>{['Customer','Amount','Method','Date','Note'].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map((p:any)=>(
                      <tr key={p.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'0.85rem 1rem' }}>{p.customers?`${p.customers.first_name} ${p.customers.last_name}`:'—'}</td>
                        <td style={{ padding:'0.85rem 1rem', fontWeight:600, color:'#4caf50' }}>${Number(p.amount).toFixed(2)}</td>
                        <td style={{ padding:'0.85rem 1rem', textTransform:'capitalize' }}>{p.payment_method}</td>
                        <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)' }}>{fmt(p.paid_at)}</td>
                        <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem' }}>{p.reference_number||'—'}</td>
                      </tr>
                    ))}
                    {payments.length===0 && <tr><td colSpan={5} style={{ padding:'3rem', textAlign:'center', color:'#6b7280' }}>No payments logged yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REQUESTS VIEW ── */}
          {view==='requests' && (
            <div style={{ maxWidth:'680px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Pending Requests</div>

              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem' }}>Service Additions</div>
              {serviceRequests.length === 0 ? (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.88rem', marginBottom:'1.5rem' }}>No pending service requests</div>
              ) : serviceRequests.map((r:any) => (
                <div key={r.id} style={{ background:'#1a1a1a', border:'1px solid rgba(255,179,0,0.2)', borderRadius:'8px', padding:'1.25rem', marginBottom:'0.75rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{r.customers?.first_name} {r.customers?.last_name}</div>
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>Wants to add: <strong style={{ color:'#fff' }}>{r.services?.name}</strong></div>
                      <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:'0.2rem' }}>
                        Timing: {r.timing === 'immediate' ? `Immediate (prorated $${r.prorated_amount})` : 'Next billing cycle'}
                      </div>
                    </div>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>PENDING</span>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <Btn small onClick={() => approveServiceRequest(r.id, r.customer_id, r.service_id, r.timing, servicesList.find(s=>s.id===r.service_id)?.base_price_monthly||0)}>✅ Approve</Btn>
                    <Btn small color='#7f1d1d' onClick={() => denyRequest('service_requests', r.id)}>❌ Deny</Btn>
                  </div>
                </div>
              ))}

              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem', marginTop:'1.5rem' }}>Skip Requests</div>
              {skipRequests.length === 0 ? (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.88rem' }}>No pending skip requests</div>
              ) : skipRequests.map((r:any) => (
                <div key={r.id} style={{ background:'#1a1a1a', border:'1px solid rgba(255,179,0,0.2)', borderRadius:'8px', padding:'1.25rem', marginBottom:'0.75rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{r.customers?.first_name} {r.customers?.last_name}</div>
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>Skip date: <strong style={{ color:'#fff' }}>{new Date(r.skip_date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong></div>
                      {r.refund_amount && <div style={{ fontSize:'0.78rem', color:'#4caf50', marginTop:'0.2rem' }}>Credit: ${r.refund_amount}</div>}
                    </div>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>PENDING</span>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <Btn small onClick={() => approveSkip(r.id)}>✅ Approve Skip</Btn>
                    <Btn small color='#7f1d1d' onClick={() => denyRequest('skip_requests', r.id)}>❌ Deny</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── JOBS VIEW ── */}
          {view==='jobs' && (
            <div style={{ maxWidth:'720px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Jobs &amp; Work Orders</div>

              {/* Pickup addons from portal */}
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem' }}>📦 Customer Pickup Add-ons</div>
              {pickupAddons.length === 0 ? (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.88rem', marginBottom:'1.5rem' }}>No pending pickup add-ons</div>
              ) : pickupAddons.map((a:any) => (
                <div key={a.id} style={{ background:'#1a1a1a', border:'1px solid rgba(255,179,0,0.2)', borderRadius:'8px', padding:'1.25rem', marginBottom:'0.75rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem' }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{a.customers?.first_name} {a.customers?.last_name}</div>
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)', marginTop:'0.2rem' }}>
                        {a.custom_description || (a.bulky_item_catalog
                          ? `${a.bulky_item_catalog.name} — ${a.bulky_item_catalog.is_fixed_price ? `$${a.bulky_item_catalog.fixed_price}` : `est. $${a.bulky_item_catalog.estimate_min}–$${a.bulky_item_catalog.estimate_max}`}`
                          : '—')}
                      </div>
                      {a.requested_pickup_date && <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>Requested: {new Date(a.requested_pickup_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>}
                    </div>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>{a.status==='pending_quote'?'NEEDS QUOTE':'CONFIRMED'}</span>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.5rem', flexWrap:'wrap' }}>
                    {/* Admin can always edit price regardless of status */}
                    <input type='number' placeholder={`Price: $${a.final_price||'?'}`} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'4px', padding:'0.4rem 0.65rem', color:'#fff', fontSize:'0.82rem', fontFamily:'inherit', width:'130px' }}
                      onBlur={async e => {
                        const price = parseFloat(e.target.value)
                        if (!isNaN(price) && price > 0) {
                          const newStatus = a.status === 'pending_quote' ? 'confirmed' : a.status
                          await sb(`pickup_addons?id=eq.${a.id}`, { method:'PATCH', body:{ final_price:price, status:newStatus }, prefer:'return=minimal' })
                          showToast('Price updated')
                          loadAll()
                        }
                      }}
                    />
                    {a.status !== 'picked_up' && a.status !== 'invoiced' && (
                      <Btn small onClick={async()=>{ await sb(`pickup_addons?id=eq.${a.id}`,{method:'PATCH',body:{status:'picked_up'},prefer:'return=minimal'}); showToast('Marked picked up — on next invoice'); loadAll() }}>✅ Mark Picked Up</Btn>
                    )}
                    {a.status === 'picked_up' && (
                      <span style={{ fontSize:'0.72rem', color:'#4caf50', fontWeight:700, background:'rgba(76,175,80,0.1)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>✅ Picked up</span>
                    )}
                    {/* Admin can always remove — even after picked up */}
                    <Btn small color='#7f1d1d' onClick={async()=>{ await sb(`pickup_addons?id=eq.${a.id}`,{method:'DELETE',prefer:'return=minimal'}); showToast('Job removed'); loadAll() }}>🗑️ Remove</Btn>
                  </div>
                </div>
              ))}

              {/* Public job requests */}
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem', marginTop:'1.5rem' }}>🚛 Junk Removal &amp; Yard Cleanup Requests</div>
              {jobRequests.length === 0 ? (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.88rem' }}>No job requests yet</div>
              ) : jobRequests.map((j:any) => (
                <div key={j.id} style={{ background:'#1a1a1a', border:`1px solid ${j.status==='new'?'rgba(255,179,0,0.2)':'rgba(255,255,255,0.07)'}`, borderRadius:'8px', padding:'1.25rem', marginBottom:'0.75rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'1rem' }}>{j.name}</div>
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>{j.phone}{j.email ? ` · ${j.email}` : ''}</div>
                      <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:'0.15rem' }}>{j.address}</div>
                      <button onClick={async()=>{ await sb(`job_requests?id=eq.${j.id}`,{method:'DELETE',prefer:'return=minimal'}); showToast('Job request removed'); loadAll() }}
                        style={{ marginTop:'0.5rem', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'4px', color:'#f87171', padding:'0.2rem 0.55rem', cursor:'pointer', fontSize:'0.72rem', fontFamily:'inherit' }}>🗑️ Remove</button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.3rem' }}>
                      <span style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', padding:'0.2rem 0.6rem', borderRadius:'4px',
                        color:j.status==='new'?'#f59e0b':j.status==='completed'?'#4caf50':'#9ca3af',
                        background:j.status==='new'?'rgba(245,158,11,0.1)':j.status==='completed'?'rgba(76,175,80,0.1)':'rgba(156,163,175,0.1)'
                      }}>{j.status}</span>
                      <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)', textTransform:'capitalize' }}>{j.job_type?.replace('_',' ')}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.6)', marginBottom:'0.75rem', background:'rgba(255,255,255,0.03)', borderRadius:'5px', padding:'0.6rem 0.75rem' }}>{j.description}</div>
                  {/* Photos */}
                  {Array.isArray(j.photo_data) && j.photo_data.length > 0 && (
                    <div style={{ marginBottom:'0.75rem' }}>
                      <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'0.4rem' }}>Photos ({j.photo_data.length})</div>
                      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                        {j.photo_data.map((src: string, i: number) => (
                          <img key={i} src={src} alt={`Photo ${i+1}`} onClick={() => setLightboxSrc(src)}
                            style={{ width:'72px', height:'72px', objectFit:'cover', borderRadius:'5px', cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', transition:'opacity 0.15s' }}
                            onMouseEnter={e=>(e.currentTarget.style.opacity='0.75')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')} />
                        ))}
                      </div>
                    </div>
                  )}
                  {j.preferred_date && <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.75rem' }}>Preferred: {new Date(j.preferred_date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>}
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                    {['new','quoted','scheduled','completed','cancelled'].filter(s=>s!==j.status).map(s => (
                      <button key={s} onClick={async()=>{ await sb(`job_requests?id=eq.${j.id}`,{method:'PATCH',body:{status:s},prefer:'return=minimal'}); showToast(`Marked as ${s}`); loadAll() }}
                        style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:'4px', padding:'0.3rem 0.7rem', cursor:'pointer', fontSize:'0.72rem', textTransform:'capitalize', fontFamily:'inherit' }}>
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── NOTICES VIEW ── */}
          {view==='notices' && (
            <div style={{ maxWidth:'680px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Schedule Notices</div>

              {/* Post new notice */}
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.5rem', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', marginBottom:'1rem' }}>Post a New Notice</div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Notice Type</label>
                  <select value={noticeType||'info'} onChange={e=>setNoticeType(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }}>
                    <option value='announcement' style={{background:'#111'}}>📣 Announcement — all customers</option>
                    <option value='info' style={{background:'#111'}}>📢 Info — pickup day customers only</option>
                    <option value='cancellation' style={{background:'#111'}}>❌ Cancellation — pickup day customers only</option>
                    <option value='reschedule' style={{background:'#111'}}>🔄 Reschedule — pickup day customers only</option>
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: noticeType==='reschedule' ? '1fr 1fr' : '1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  <div>
                    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>{noticeType==='announcement' || noticeType==='info' ? 'Notice Date' : 'Affected Pickup Date'}</label>
                    <input type='date' value={noticeDate} onChange={e=>setNoticeDate(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }} />
                  </div>
                  {noticeType==='reschedule' && (
                    <div>
                      <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Replacement Pickup Date</label>
                      <input type='date' value={replacementDate||''} onChange={e=>setReplacementDate(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }} />
                    </div>
                  )}
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Message to Customers</label>
                  <textarea value={noticeMsg} onChange={e=>setNoticeMsg(e.target.value)} rows={2} placeholder={noticeType==='cancellation'?'e.g. No pickup Monday July 4th due to Independence Day':noticeType==='reschedule'?'e.g. Monday July 4th pickup moved to Tuesday July 5th':'e.g. Service may be delayed due to weather'} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%', resize:'vertical' }} />
                </div>
                <Btn onClick={async () => { await postNotice(); loadAllNotices() }}>📢 Post Notice</Btn>
              </div>

              {/* Existing notices */}
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.04em' }}>Posted Notices</div>
                  <button onClick={loadAllNotices} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', padding:'0.2rem 0.6rem', cursor:'pointer', fontSize:'0.72rem', fontFamily:'inherit' }}>↻ Refresh</button>
                </div>
                {allNotices.length === 0 ? (
                  <div style={{ padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.85rem' }}>No notices posted yet — click Refresh to load</div>
                ) : allNotices.map((n:any) => (
                  <div key={n.id} style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    {editingNoticeId === n.id ? (
                      <div>
                        <textarea value={editingNoticeMsg} onChange={e=>setEditingNoticeMsg(e.target.value)} rows={2}
                          style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', marginBottom:'0.5rem', resize:'vertical' }} />
                        <div style={{ display:'flex', gap:'0.5rem' }}>
                          <Btn small onClick={async () => {
                            await sb(`schedule_notices?id=eq.${n.id}`, { method:'PATCH', body:{ message: editingNoticeMsg }, prefer:'return=minimal' })
                            showToast('Notice updated')
                            setEditingNoticeId(null)
                            loadAllNotices()
                          }}>Save</Btn>
                          <Btn small color='transparent' textColor='#6b7280' onClick={() => setEditingNoticeId(null)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem' }}>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem' }}>
                            <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.15rem 0.5rem', borderRadius:'4px',
                              background: n.notice_type==='cancellation' ? 'rgba(220,38,38,0.15)' : n.notice_type==='reschedule' ? 'rgba(245,158,11,0.15)' : n.notice_type==='announcement' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.08)',
                              color: n.notice_type==='cancellation' ? '#f87171' : n.notice_type==='reschedule' ? '#fbbf24' : n.notice_type==='announcement' ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
                              {n.notice_type === 'cancellation' ? '❌ Cancellation' : n.notice_type === 'reschedule' ? '🔄 Reschedule' : n.notice_type === 'announcement' ? '📣 All Customers' : '📢 Info'}
                            </span>
                            <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
                              {new Date(n.notice_date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                            </span>
                            {n.replacement_date && <span style={{ fontSize:'0.75rem', color:'#4caf50' }}>→ {new Date(n.replacement_date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>}
                          </div>
                          <div style={{ fontSize:'0.87rem', color:'rgba(255,255,255,0.85)' }}>{n.message}</div>
                        </div>
                        <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                          <button onClick={() => { setEditingNoticeId(n.id); setEditingNoticeMsg(n.message) }}
                            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', padding:'0.25rem 0.55rem', cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit' }}>✏️ Edit</button>
                          <button onClick={async () => {
                            setAllNotices((prev:any[]) => prev.filter((x:any) => x.id !== n.id))
                            await sb(`schedule_notices?id=eq.${n.id}`, { method:'DELETE', prefer:'return=minimal' }).catch(()=>{})
                            showToast('Notice deleted')
                          }} style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'4px', color:'#f87171', padding:'0.25rem 0.55rem', cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit' }}>🗑️ Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CATALOG VIEW ── */}
          {view==='catalog' && (
            <div style={{ maxWidth:'680px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'0.5rem' }}>Pricing &amp; Catalog</div>

              {/* Service pricing */}
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem' }}>📦 Curbside Service Plans</div>
              <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', padding:'0.85rem 1rem', fontSize:'0.8rem', color:'rgba(255,200,100,0.8)', marginBottom:'1rem' }}>
                ⚠️ Changing these prices only affects <strong>new customers</strong>. Existing subscriptions keep their current rate until you manually update them.
              </div>
              {servicesList.filter((s:any) => s.type === 'recurring').map((svc:any) => {
                const editVal = servicePriceEdits[svc.id]
                const isDirty = editVal !== undefined
                return (
                  <div key={svc.id} style={{ background:'#1a1a1a', border:`1px solid ${isDirty ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'8px', padding:'1.1rem 1.25rem', marginBottom:'0.6rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
                    <div style={{ fontSize:'0.9rem', fontWeight:600, color:'rgba(255,255,255,0.8)', flex:1 }}>{svc.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>$</span>
                        <input type='number' step='0.01' value={editVal ?? svc.base_price_monthly}
                          onChange={e => setServicePriceEdits(p => ({ ...p, [svc.id]: e.target.value }))}
                          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.45rem 0.65rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'90px' }} />
                        <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)' }}>/mo</span>
                      </div>
                      {isDirty && (
                        <Btn small disabled={servicePriceSaving === svc.id} onClick={async () => {
                          setServicePriceSaving(svc.id)
                          await sb(`services?id=eq.${svc.id}`, { method:'PATCH', body:{ base_price_monthly: parseFloat(editVal) }, prefer:'return=minimal' })
                          const updated = await sb('services?select=id,name,base_price_monthly,type&is_active=eq.true&order=base_price_monthly.asc').catch(()=>[])
                          setServicesList(updated)
                          setServicePriceEdits(p => { const n = {...p}; delete n[svc.id]; return n })
                          setServicePriceSaving(null)
                          showToast(`${svc.name} price updated`)
                        }}>
                          {servicePriceSaving === svc.id ? 'Saving…' : 'Save'}
                        </Btn>
                      )}
                    </div>
                  </div>
                )
              })}

              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.05em', color:'#6b7280', marginBottom:'0.75rem', marginTop:'1.75rem' }}>🚛 Junk Removal Item Pricing</div>
              <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.4)', marginBottom:'1rem' }}>These appear on the public Junk Removal page and are used for pickup addon quotes.</p>

              {catalog.length === 0 ? (
                <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'2rem', textAlign:'center', color:'#6b7280', fontSize:'0.88rem' }}>No catalog items found</div>
              ) : catalog.map((item: any) => {
                const edits = catalogEdits[item.id] || {}
                const val = (field: string) => edits[field] !== undefined ? edits[field] : item[field]
                const isDirty = Object.keys(edits).length > 0
                return (
                  <div key={item.id} style={{ background:'#1a1a1a', border:`1px solid ${isDirty ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'8px', padding:'1.25rem', marginBottom:'0.75rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                      <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{item.name}</div>
                      <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', cursor:'pointer' }}>
                        <input type='checkbox' checked={val('is_active')} onChange={e => setCatalogEdits(p => ({ ...p, [item.id]: { ...(p[item.id]||{}), is_active: e.target.checked } }))} style={{ accentColor:'#4caf50' }} />
                        Active
                      </label>
                    </div>

                    {item.is_fixed_price ? (
                      <div>
                        <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Fixed Price ($)</label>
                        <input type='number' value={val('fixed_price') ?? ''} onChange={e => setCatalogEdits(p => ({ ...p, [item.id]: { ...(p[item.id]||{}), fixed_price: e.target.value } }))}
                          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'140px' }} />
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:'1rem', alignItems:'flex-end' }}>
                        <div>
                          <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Est. Min ($)</label>
                          <input type='number' value={val('estimate_min') ?? ''} onChange={e => setCatalogEdits(p => ({ ...p, [item.id]: { ...(p[item.id]||{}), estimate_min: e.target.value } }))}
                            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'120px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Est. Max ($)</label>
                          <input type='number' value={val('estimate_max') ?? ''} onChange={e => setCatalogEdits(p => ({ ...p, [item.id]: { ...(p[item.id]||{}), estimate_max: e.target.value } }))}
                            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'120px' }} />
                        </div>
                        {isDirty && (
                          <Btn small onClick={async () => {
                            setCatalogSaving(item.id)
                            const patch: any = {}
                            if (edits.estimate_min !== undefined) patch.estimate_min = parseFloat(edits.estimate_min)
                            if (edits.estimate_max !== undefined) patch.estimate_max = parseFloat(edits.estimate_max)
                            if (edits.fixed_price !== undefined) patch.fixed_price = parseFloat(edits.fixed_price)
                            if (edits.is_active !== undefined) patch.is_active = edits.is_active
                            await sb(`bulky_item_catalog?id=eq.${item.id}`, { method:'PATCH', body: patch, prefer:'return=minimal' })
                            const updated = await sb('bulky_item_catalog?select=*&order=name.asc').catch(()=>[])
                            setCatalog(updated)
                            setCatalogEdits(p => { const n = {...p}; delete n[item.id]; return n })
                            setCatalogSaving(null)
                            showToast('Price updated')
                          }} disabled={catalogSaving === item.id}>
                            {catalogSaving === item.id ? 'Saving…' : 'Save'}
                          </Btn>
                        )}
                      </div>
                    )}

                    {/* Save button for fixed-price items */}
                    {item.is_fixed_price && isDirty && (
                      <div style={{ marginTop:'0.75rem' }}>
                        <Btn small onClick={async () => {
                          setCatalogSaving(item.id)
                          const patch: any = {}
                          if (edits.fixed_price !== undefined) patch.fixed_price = parseFloat(edits.fixed_price)
                          if (edits.is_active !== undefined) patch.is_active = edits.is_active
                          await sb(`bulky_item_catalog?id=eq.${item.id}`, { method:'PATCH', body: patch, prefer:'return=minimal' })
                          const updated = await sb('bulky_item_catalog?select=*&order=name.asc').catch(()=>[])
                          setCatalog(updated)
                          setCatalogEdits(p => { const n = {...p}; delete n[item.id]; return n })
                          setCatalogSaving(null)
                          showToast('Price updated')
                        }} disabled={catalogSaving === item.id}>
                          {catalogSaving === item.id ? 'Saving…' : 'Save'}
                        </Btn>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div> {/* end content area */}
      </div> {/* end flex row */}

      {/* ── CUSTOMER PROFILE MODAL ── */}
      {selected && !showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{if(e.target===e.currentTarget){setSelected(null);setEditMode(false);setConfirmDelete(false)}}}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'680px', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', padding:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.8rem' }}>{selected.first_name} {selected.last_name}</div>
              <button onClick={()=>{setSelected(null);setEditMode(false);setConfirmDelete(false)}} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'1.4rem', cursor:'pointer' }}>✕</button>
            </div>

            {/* Delete confirm */}
            {confirmDelete && (
              <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.4)', borderRadius:'6px', padding:'1.25rem', marginBottom:'1.5rem' }}>
                <div style={{ fontWeight:700, color:'#f87171', marginBottom:'0.5rem' }}>⚠️ Delete {selected.first_name} {selected.last_name}?</div>
                <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>This cannot be undone. All their data will be permanently removed.</p>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  <Btn color='#dc2626' onClick={deleteCustomer}>Yes, Delete</Btn>
                  <Btn color='transparent' textColor='#6b7280' onClick={()=>setConfirmDelete(false)}>Cancel</Btn>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
              <div>
                {editMode ? (
                  <div>
                    <Inp label="First Name" name="first_name" value={editData.first_name||''} onChange={onEdit} />
                    <Inp label="Last Name" name="last_name" value={editData.last_name||''} onChange={onEdit} />
                    <Inp label="Email" name="email" value={editData.email||''} onChange={onEdit} />
                    <Inp label="Phone" name="phone" value={editData.phone||''} onChange={onEdit} />
                    <Inp label="Address" name="service_address" value={editData.service_address||''} onChange={onEdit} />
                    <Sel label="Town" name="town" value={editData.town||''} onChange={onEdit} options={[['bedford','Bedford'],['merrimack','Merrimack'],['amherst','Amherst'],['milford','Milford'],['other','Other']]} />
                    <Sel label="Status" name="status" value={editData.status||''} onChange={onEdit} options={[['active','Active'],['pending','Pending'],['paused','Paused'],['cancelled','Cancelled'],['overdue','Overdue']]} />
                    <Sel label="Payment Method" name="payment_method" value={editData.payment_method||''} onChange={onEdit} options={[['cash','Cash'],['venmo','Venmo'],['zelle','Zelle'],['card','Card']]} />
                    <Sel label="Pickup Day" name="pickup_day" value={editData.pickup_day||''} onChange={onEdit} options={[['','TBD'],['monday','Monday'],['tuesday','Tuesday'],['wednesday','Wednesday'],['thursday','Thursday'],['friday','Friday']]} />
                    <Sel label="Pickup Frequency" name="pickup_frequency" value={(editData as any).pickup_frequency||'weekly'} onChange={onEdit} options={[['weekly','Weekly'],['biweekly','Bi-Weekly (every other week)']]} />
                    <Sel label="Garage Pickup" name="garage_pickup_opt" value={(editData as any).garage_pickup_opt} onChange={onEdit} options={[['none','None'],['standard','Standard ($14.99/mo)'],['senior','Senior 65+ ($5/mo)']]} />
                    <Inp label="Gate Notes" name="gate_notes" value={editData.gate_notes||''} onChange={onEdit} placeholder="Gate code, property access..." />
                    <Inp label="Notes" name="notes" value={editData.notes||''} onChange={onEdit} placeholder="Internal notes..." />
                    <div style={{ display:'flex', gap:'0.5rem', marginTop:'1rem' }}>
                      <Btn onClick={saveEdit}>Save Changes</Btn>
                      <Btn color='transparent' textColor='#6b7280' onClick={()=>setEditMode(false)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(()=>{const activeSub=(selected as any).subscriptions?.find((s:any)=>s.status==='active'); return [['Status', <Badge key="s" status={selected.status} />],['Email',selected.email],['Phone',selected.phone||'—'],['Address',selected.service_address],['Town',cap(selected.town)],['Pickup Day',cap(activeSub?.pickup_day)||'—'],['Frequency', (() => {
    const isB = activeSub?.pickup_frequency === 'biweekly'
    if (!isB) return 'Weekly'
    const isThisWeek = isBiweeklyPickupWeek(activeSub?.billing_start)
    return <span>{isThisWeek ? <span style={{color:'#4caf50',fontWeight:700}}>✅ Bi-Weekly — PICKUP THIS WEEK</span> : <span style={{color:'#6b7280'}}>⏭ Bi-Weekly — skip this week</span>}</span>
  })()],['Plan',activeSub?.services?.name||'—'],['Billing',cap(activeSub?.billing_cycle||'monthly')],['Rate',`$${activeSub?.rate||'—'}/mo`],['Payment',cap(selected.payment_method)],['Bin',cap(selected.bin_situation)],['Garage Pickup',selected.garage_side_pickup?'✅ Yes':'No'],['Gate Notes',selected.gate_notes||'—'],['Started',fmt(selected.created_at)]] as [string,any][]})().map(([label,val])=>(
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.45rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.84rem' }}>
                        <span style={{ color:'#6b7280', fontSize:'0.75rem' }}>{label}</span>
                        <span>{val}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'1.25rem' }}>
                      <Btn small onClick={()=>{ const activeSub=(selected as any).subscriptions?.find((s:any)=>s.status==='active'); const gOpt = !selected.garage_side_pickup ? 'none' : Number((selected as any).garage_side_rate) === 5 ? 'senior' : 'standard'; setEditData({...selected, pickup_day: activeSub?.pickup_day||'', pickup_frequency: activeSub?.pickup_frequency||'weekly'} as any); setEditData((p:any) => ({...p, garage_pickup_opt: gOpt})); setEditMode(true); setConfirmDelete(false) }}>✏️ Edit</Btn>
                      <Btn small color='#7f1d1d' onClick={()=>{setConfirmDelete(true)}}>🗑️ Delete</Btn>
                      <Btn small color='#1e3a5f' onClick={()=>resetCustomerPin(selected.id, selected.first_name)}>🔑 Reset PIN</Btn>
                      <Btn small color='#374151' onClick={()=>{ loadHistory(selected.id); setShowHistory((h:boolean)=>!h) }}>📋 History</Btn>
                      <Btn small color='#1a3a2a' onClick={()=>previewNextInvoice(selected)}>🧾 Preview Invoice</Btn>
                      {(selected as any).contract_accepted && (
                        <a href={`/api/contracts/${selected.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', background:'rgba(30,58,95,0.5)', border:'1px solid rgba(59,130,246,0.3)', color:'#93c5fd', borderRadius:'4px', padding:'0.3rem 0.65rem', fontSize:'0.72rem', fontWeight:700, textDecoration:'none', cursor:'pointer' }}>
                          📄 Contract
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {!editMode && (
                  <div style={{ marginTop:'1.25rem', background:'rgba(255,255,255,0.04)', borderRadius:'6px', padding:'1rem' }}>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>Change Status</div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {([['active','#2e7d32','#fff'],['pending','rgba(255,179,0,0.2)','#ffb300'],['paused','rgba(30,136,229,0.2)','#64b5f6'],['cancelled','rgba(220,38,38,0.2)','#f87171']] as [string,string,string][]).map(([s,bg,color])=>(
                        <button key={s} onClick={()=>updateStatus(s)} style={{ background:bg, color, border:'none', borderRadius:'4px', padding:'0.35rem 0.75rem', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, textTransform:'capitalize', fontFamily:'inherit' }}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.5rem' }}>Notes</div>
                <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>{selected.notes||'No notes.'}</p>

                {/* ── BIN RENTALS ── */}
                <div style={{ marginTop:'1.25rem' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.6rem' }}>Bin Rentals</div>
                  {selectedBins.length === 0 ? (
                    <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.3)' }}>No bin rentals</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {selectedBins.map((bin:any) => (
                        <div key={bin.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'0.65rem 0.85rem' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ fontSize:'0.88rem' }}>{bin.bin_type==='trash' ? '🗑️ Trash Bin' : '♻️ Recycling Bin'}</span>
                              <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>${bin.monthly_rental_fee}/mo</span>
                            </div>
                            {bin.bin_type === 'trash' && (
                              <button
                                onClick={() => toggleDepositPaid(bin.id, !(bin.notes || '').includes('unpaid'))}
                                style={{
                                  background: bin.deposit_paid ? 'rgba(46,125,50,0.15)' : 'rgba(220,38,38,0.12)',
                                  border: `1px solid ${bin.deposit_paid ? 'rgba(46,125,50,0.4)' : 'rgba(220,38,38,0.35)'}`,
                                  color: bin.deposit_paid ? '#4caf50' : '#f87171',
                                  borderRadius:'5px', padding:'0.25rem 0.6rem', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, fontFamily:'inherit'
                                }}
                              >
                                {!(bin.notes || '').includes('unpaid') ? '✅ Deposit Paid' : '❌ Deposit Unpaid ($25)'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── INVOICE PREVIEW ── */}
                {invoicePreview && invoicePreview.customer?.id === selected.id && (
                  <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
                      <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280' }}>🧾 Next Invoice Preview</div>
                      <button onClick={()=>setInvoicePreview(null)} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'0.85rem' }}>✕</button>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', padding:'0.85rem 1rem' }}>
                      {invoicePreview.paidThrough && (
                        <div style={{ background:'rgba(46,125,50,0.1)', border:'1px solid rgba(46,125,50,0.25)', borderRadius:'5px', padding:'0.5rem 0.75rem', marginBottom:'0.75rem', fontSize:'0.78rem', color:'#4caf50', fontWeight:600 }}>
                          ✅ Paid through {new Date(invoicePreview.paidThrough+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                        </div>
                      )}
                      <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.5rem' }}>
                        Next invoice: {invoicePreview.periodStart} – {invoicePreview.periodEnd} · Due {invoicePreview.dueDate || invoicePreview.periodStart}
                      </div>
                      {invoicePreview.lines.map((l:any, i:number) => (
                        <div key={i} style={{ padding:'0.3rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.84rem' }}>
                            <span style={{ color: l.note ? '#fbbf24' : 'rgba(255,255,255,0.75)' }}>{l.note ? '🛍️ ' : ''}{l.label}</span>
                            <span style={{ color:'#fff' }}>${l.amount.toFixed(2)}</span>
                          </div>
                          {l.note && <div style={{ fontSize:'0.72rem', color:'rgba(255,179,0,0.7)', marginTop:'0.1rem' }}>{l.note}</div>}
                        </div>
                      ))}
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.92rem', fontWeight:700, paddingTop:'0.5rem', marginTop:'0.25rem', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color:'#fff' }}>Total</span>
                        <span style={{ color:'#4caf50' }}>${invoicePreview.total.toFixed(2)}</span>
                      </div>
                      {invoicePreview.hasAddons && (
                        <div style={{ marginTop:'0.5rem', fontSize:'0.72rem', color:'#fbbf24' }}>⚠️ Includes extra bag charges — these will be marked as invoiced when the bill is sent</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── RATE OVERRIDE ── */}
                <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.6rem' }}>💰 Monthly Rate</div>
                  {editingRate ? (
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem' }}>$</span>
                      <input autoFocus value={newRate} onChange={e => setNewRate(e.target.value)}
                        style={{ width:'90px', background:'#111', border:'1px solid rgba(46,125,50,0.5)', borderRadius:'6px', padding:'0.5rem 0.65rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit', fontWeight:700 }} />
                      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>/mo</span>
                      <Btn small onClick={async () => {
                        const activeSub = (selected as any).subscriptions?.find((s:any) => s.status === 'active')
                        if (activeSub && newRate) {
                          const parsed = parseFloat(newRate)
                          if (isNaN(parsed) || parsed <= 0) { showToast('Please enter a valid rate', 'error'); return }
                          await sb(`subscriptions?id=eq.${activeSub.id}`, { method:'PATCH', body:{ rate: parsed }, prefer:'return=minimal' })
                          showToast('Rate updated')
                          setEditingRate(false)
                          loadAll()
                        }
                      }}>Save</Btn>
                      <Btn small color='transparent' textColor='#6b7280' onClick={() => setEditingRate(false)}>Cancel</Btn>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <span style={{ fontSize:'1.1rem', fontWeight:700, color:'#4caf50' }}>
                        ${(selected as any).subscriptions?.find((s:any) => s.status === 'active')?.rate || '—'}/mo
                      </span>
                      <button onClick={() => {
                        const activeSub = (selected as any).subscriptions?.find((s:any) => s.status === 'active')
                        setNewRate(String(activeSub?.rate || ''))
                        setEditingRate(true)
                      }} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'5px', color:'rgba(255,255,255,0.55)', padding:'0.25rem 0.6rem', cursor:'pointer', fontSize:'0.72rem', fontFamily:'inherit' }}>
                        ✏️ Edit Rate
                      </button>
                    </div>
                  )}
                </div>

                {/* ── EXTRA BAGS (NO NOTICE) ── */}
                <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>🛍️ Add Extra Bags (No-Notice Fee)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.5rem' }}>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.25rem' }}>Pickup Date</div>
                      <input type='date' value={extraBagDate} onChange={e=>setExtraBagDate(e.target.value)}
                        style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.5rem 0.65rem', color:'#fff', fontSize:'0.82rem', fontFamily:'inherit', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.25rem' }}>Bag Type</div>
                      <select value={extraBagType} onChange={e=>setExtraBagType(e.target.value as any)}
                        style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.5rem 0.65rem', color:'#fff', fontSize:'0.82rem', fontFamily:'inherit' }}>
                        <option value='13gal'>13-gal — $3.50 each</option>
                        <option value='32gal'>32-gal — $5.00 each</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.25rem' }}>Qty</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
                        <button onClick={()=>setExtraBagQty(q=>Math.max(1,q-1))} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'4px', color:'#fff', width:'28px', height:'28px', cursor:'pointer', fontSize:'1rem' }}>−</button>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:'0.95rem', minWidth:'24px', textAlign:'center' }}>{extraBagQty}</span>
                        <button onClick={()=>setExtraBagQty(q=>q+1)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'4px', color:'#fff', width:'28px', height:'28px', cursor:'pointer', fontSize:'1rem' }}>+</button>
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:'0.25rem' }}>Total</div>
                      <div style={{ color:'#f59e0b', fontWeight:700, fontSize:'0.92rem' }}>
                        ${((extraBagType === '13gal' ? 3.50 : 5.00) * extraBagQty).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ alignSelf:'flex-end' }}>
                      <button onClick={addExtraBags} disabled={extraBagSaving || !extraBagDate}
                        style={{ background:'#2e7d32', border:'none', borderRadius:'6px', color:'#fff', padding:'0.5rem 1rem', cursor:'pointer', fontSize:'0.8rem', fontWeight:700, fontFamily:'inherit', opacity: (!extraBagDate || extraBagSaving) ? 0.5 : 1 }}>
                        {extraBagSaving ? 'Adding…' : '+ Add to Bill'}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', marginTop:'0.5rem' }}>
                    Charged at no-notice rate. Will appear on customer's next invoice.
                  </div>
                  {/* Pending extra bag charges */}
                  <div style={{ marginTop:'0.85rem', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'0.75rem' }}>
                    <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>
                      Pending charges {pendingAddons.length > 0 ? `(${pendingAddons.length})` : '— none'}
                    </div>
                    {pendingAddons.map((a:any) => (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'6px', padding:'0.45rem 0.7rem', marginBottom:'0.35rem' }}>
                        <div>
                          <span style={{ fontSize:'0.8rem', color:'#fbbf24', fontWeight:700 }}>${Number(a.final_price).toFixed(2)}</span>
                          <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginLeft:'0.5rem' }}>{a.custom_description}</span>
                          {a.requested_pickup_date && <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)', marginLeft:'0.5rem' }}>· {a.requested_pickup_date}</span>}
                        </div>
                        <button onClick={async () => {
                          await sb(`pickup_addons?id=eq.${a.id}`, { method:'DELETE', prefer:'return=minimal' })
                          setPendingAddons((prev:any[]) => prev.filter((x:any) => x.id !== a.id))
                          showToast('Charge removed')
                        }} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:'4px', color:'#f87171', cursor:'pointer', fontSize:'0.8rem', padding:'0.15rem 0.5rem', fontFamily:'inherit' }}>× Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── CUSTOMER HISTORY ── */}
                {showHistory && (
                  <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.75rem' }}>📋 Customer History</div>
                    {customerHistory.length === 0 ? (
                      <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.3)' }}>No history yet</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:'240px', overflowY:'auto' }}>
                        {customerHistory.map((h:any) => (
                          <div key={h.id} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'6px', padding:'0.55rem 0.75rem', fontSize:'0.78rem' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                              <div>
                                <span style={{ color:'rgba(255,255,255,0.5)', textTransform:'uppercase', fontSize:'0.68rem', letterSpacing:'0.06em' }}>{h.field_changed?.replace(/_/g,' ')}</span>
                                {h.old_value && <span style={{ color:'rgba(255,255,255,0.35)', marginLeft:'0.4rem' }}>· {h.old_value} →</span>}
                                <span style={{ color:'#fff', marginLeft:'0.3rem' }}>{h.new_value || '—'}</span>
                              </div>
                              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.7rem', whiteSpace:'nowrap' }}>{fmt(h.created_at)}</span>
                            </div>
                            {h.changed_by && <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.68rem', marginTop:'0.15rem' }}>by {h.changed_by}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONBOARD CUSTOMER MODAL ── */}
      {onboardCustomer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{if(e.target===e.currentTarget)setOnboardCustomer(null)}}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'560px', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', padding:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.8rem' }}>Onboard Customer</div>
                <div style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.5)', marginTop:'0.15rem' }}>{onboardCustomer.first_name} {onboardCustomer.last_name} · {onboardCustomer.email}</div>
              </div>
              <button onClick={()=>setOnboardCustomer(null)} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'1.4rem', cursor:'pointer' }}>✕</button>
            </div>

            {/* Customer summary */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', padding:'1rem', marginBottom:'1.25rem', fontSize:'0.84rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {(()=>{
                  // Parse bin rental request from notes
                  const notes = onboardCustomer.notes || ''
                  const binNote = notes.split('|').map((s:string)=>s.trim()).find((s:string)=>s.toLowerCase().includes('bin rental'))
                  const binDisplay = binNote || (onboardCustomer.bin_situation === 'rental' ? 'Rental (check notes)' : cap(onboardCustomer.bin_situation))
                  // Parse requested start week from notes
                  const startWeek = notes.split('|').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('202') || s.includes('Week'))
                  // Parse requested start week from notes
                  const startWeekNote = notes.split('|').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('Requested start week'))
                  return [
                    ['Address', onboardCustomer.service_address],
                    ['Town', cap(onboardCustomer.town)],
                    ['Phone', onboardCustomer.phone || '—'],
                    ['Payment', cap(onboardCustomer.payment_method)],
                    ['Bins Requested', binDisplay],
                    ['Garage Pickup', onboardCustomer.garage_side_pickup ? '✅ Yes' : 'No'],
                    ['Requested Start', startWeekNote ? startWeekNote.replace('Requested start week: ','') : '—'],
                  ] as [string,any][]
                })().map(([label, val]) => (
                  <div key={label}>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.72rem' }}>{label}: </span>
                    <span style={{ color: label==='Bins Requested' && String(val).includes('Trash') ? '#fbbf24' : '#fff' }}>{val}</span>
                  </div>
                ))}
              </div>
              {onboardCustomer.notes && (
                <div style={{ marginTop:'0.6rem', color:'rgba(255,255,255,0.6)', fontSize:'0.8rem', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'0.6rem' }}>
                  Notes: {onboardCustomer.notes}
                </div>
              )}
            </div>

            {/* Step 1: Assign pickup day */}
            <div style={{ marginBottom:'1.1rem', paddingBottom:'1.1rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Pickup Day *</label>
              <select value={onboardData.pickup_day} onChange={e => {
                const day = e.target.value
                setOnboardData(p => {
                  // Auto-calculate first pickup date in requested week
                  const notes = onboardCustomer?.notes || ''
                  const startWeekNote = notes.split('|').map((s:string) => s.trim()).find((s:string) => s.startsWith('Requested start week'))
                  // Try to get the Monday of requested week from start_date field or notes
                  let firstPickup = ''
                  if (day) {
                    const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
                    const targetDay = DAYS.indexOf(day)
                    // Use customer start_date (Monday of week) as base, or today
                    const base = (onboardCustomer as any).start_date
                      ? new Date((onboardCustomer as any).start_date + 'T12:00:00')
                      : new Date()
                    // Find the occurrence of targetDay in that week (Mon-Sun)
                    const baseDay = base.getDay() // 0=Sun
                    // Get Monday of that week
                    const monday = new Date(base)
                    monday.setDate(base.getDate() - ((baseDay === 0 ? 7 : baseDay) - 1))
                    // Find the target day within Mon-Sun of that week
                    const diff = (targetDay === 0 ? 7 : targetDay) - 1 // days from Monday
                    const pickup = new Date(monday)
                    pickup.setDate(monday.getDate() + diff)
                    firstPickup = pickup.toISOString().split('T')[0]
                  }
                  return { ...p, pickup_day: day, start_date: firstPickup }
                })
              }}
                style={{ width:'100%', background:'#111', border:`1px solid ${onboardData.pickup_day ? 'rgba(46,125,50,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit' }}>
                <option value=''>— Select pickup day —</option>
                {['monday','tuesday','wednesday','thursday','friday'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>
                ))}
              </select>
              {onboardData.pickup_day && onboardData.start_date && (
                <div style={{ marginTop:'0.5rem', fontSize:'0.82rem', color:'#4caf50', fontWeight:600 }}>
                  📅 First pickup: {new Date(onboardData.start_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                </div>
              )}
            </div>

            {/* Step 2: Service Plan */}
            <div style={{ marginBottom:'1.1rem', paddingBottom:'1.1rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Service Plan</label>
              <select value={onboardServiceId} onChange={e => {
                setOnboardServiceId(e.target.value)
                const svc = servicesList.find((s:any) => s.id === e.target.value)
                setOnboardCustomRate(svc ? String(svc.base_price_monthly) : '')
              }}
                style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit' }}>
                <option value=''>— None / add later —</option>
                {servicesList.filter((s:any) => s.type === 'recurring').map((s:any) => (
                  <option key={s.id} value={s.id}>{s.name} (${s.base_price_monthly}/mo)</option>
                ))}
              </select>
              {onboardServiceId && (
                <>
                {/* Custom rate override */}
                <div style={{ marginTop:'0.6rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.25rem' }}>Monthly Rate ($)</label>
                    <input type='number' step='0.01' value={onboardCustomRate} onChange={e=>setOnboardCustomRate(e.target.value)}
                      style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit', fontWeight:700, boxSizing:'border-box' as const }} />
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', paddingTop:'1.2rem' }}>
                    Default: ${servicesList.find((s:any) => s.id === onboardServiceId)?.base_price_monthly?.toFixed(2) || '—'}/mo
                  </div>
                </div>
                <div style={{ marginTop:'0.6rem', display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                  {['monthly','quarterly'].map(cycle => (
                    <label key={cycle} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.7)' }}>
                      <input type='radio' value={cycle} checked={onboardBillingCycle===cycle} onChange={()=>setOnboardBillingCycle(cycle)} style={{ accentColor:'#2e7d32' }} />
                      {cycle.charAt(0).toUpperCase()+cycle.slice(1)}
                    </label>
                  ))}
                </div>
              </>
              )}
              {/* Pickup frequency — admin only, not advertised */}
              <div style={{ marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'0.4rem' }}>Pickup Frequency</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {(['weekly','biweekly'] as const).map(val => (
                    <label key={val} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.82rem', color: onboardFrequency===val ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                      <input type='radio' value={val} checked={onboardFrequency===val} onChange={()=>setOnboardFrequency(val as any)} style={{ accentColor:'#2e7d32' }} />
                      {val === 'weekly' ? 'Weekly (standard)' : 'Bi-Weekly (by request)'}
                    </label>
                  ))}
                </div>
                {onboardFrequency === 'biweekly' && (
                  <div style={{ marginTop:'0.4rem', fontSize:'0.72rem', color:'#f59e0b' }}>{'⚠️ Bi-weekly: every other ' + (onboardData.pickup_day || 'week') + '. Use $26 or $30/mo rate.'}</div>
                )}
              </div>
            </div>

            {/* Step 3: Add-ons */}
            <div style={{ marginBottom:'1.1rem', paddingBottom:'1.1rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.6rem' }}>Add-Ons</label>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {/* Garage pickup */}
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'0.65rem 0.85rem' }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>🏠 Garage-Side Pickup</div>
                  <div style={{ display:'flex', gap:'1.5rem' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.75)' }}>
                      <input type='checkbox' checked={onboardGarage} onChange={e=>{ setOnboardGarage(e.target.checked); if(e.target.checked) setOnboardGarageSenior(false) }} style={{ accentColor:'#2e7d32' }} />
                      Standard — $10/mo
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.75)' }}>
                      <input type='checkbox' checked={onboardGarageSenior} onChange={e=>{ setOnboardGarageSenior(e.target.checked); if(e.target.checked) setOnboardGarage(false) }} style={{ accentColor:'#2e7d32' }} />
                      Senior 65+ — $5/mo
                    </label>
                  </div>
                </div>
                {/* Bin rentals */}
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'0.65rem 0.85rem' }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>🗑️ Bin Rentals</div>
                  <div style={{ display:'flex', gap:'1.5rem' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.75)' }}>
                      <input type='checkbox' checked={onboardTrashBin} onChange={e=>setOnboardTrashBin(e.target.checked)} style={{ accentColor:'#2e7d32' }} />
                      Trash — $7.99/mo
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.75)' }}>
                      <input type='checkbox' checked={onboardRecyclingBin} onChange={e=>setOnboardRecyclingBin(e.target.checked)} style={{ accentColor:'#2e7d32' }} />
                      Recycling — $3.99/mo
                    </label>
                  </div>
                  {onboardTrashBin && <p style={{ fontSize:'0.75rem', color:'#f59e0b', marginTop:'0.4rem', marginBottom:0 }}>⚠️ $25 deposit required — mark as paid/unpaid in customer profile</p>}
                </div>
              </div>
            </div>

            {/* Step 4: Start date */}
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Start Date</label>
              <input type='date' value={onboardData.start_date} onChange={e=>setOnboardData(p=>({...p,start_date:e.target.value}))}
                style={{ background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit' }} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Internal Notes</label>
              <textarea value={onboardData.notes} onChange={e=>setOnboardData(p=>({...p,notes:e.target.value}))} rows={2}
                placeholder='Any notes about this customer...'
                style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.88rem', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>

            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <Btn color='transparent' textColor='#6b7280' onClick={()=>setOnboardCustomer(null)}>Cancel</Btn>
              <Btn onClick={completeOnboarding}>📋 Send Contract to Customer</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOMER MODAL ── */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{if(e.target===e.currentTarget)setShowAddModal(false)}}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'640px', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', padding:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.8rem' }}>{importMode ? 'Import Existing Customer' : 'Add Customer'}</div>
              <button onClick={()=>setShowAddModal(false)} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'1.4rem', cursor:'pointer' }}>✕</button>
            </div>
            {/* Mode toggle */}
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'0.35rem' }}>
              {[{id:false,label:'🆕 New Customer',desc:'Goes through signup → contract flow'},{id:true,label:'📋 Import Existing',desc:'Already your customer — sets active immediately'}].map(m => (
                <button key={String(m.id)} onClick={()=>{ setImportMode(m.id); setAddData({...BLANK_CUSTOMER, status: m.id ? 'active' : 'pending'}) }} style={{ flex:1, background: importMode===m.id ? '#2e7d32' : 'none', border:'none', borderRadius:'6px', padding:'0.55rem 0.75rem', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.15s' }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#fff' }}>{m.label}</div>
                  <div style={{ fontSize:'0.7rem', color: importMode===m.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{m.desc}</div>
                </button>
              ))}
            </div>
            {importMode && (
              <div style={{ background:'rgba(46,125,50,0.06)', border:'1px solid rgba(46,125,50,0.2)', borderRadius:'8px', padding:'0.85rem 1rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', marginBottom:'0.75rem' }}>
                  ✅ Set to <strong style={{color:'#4caf50'}}>active</strong> immediately — no contract, no new invoice generated.
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', marginBottom:'0.3rem' }}>
                    Already paid through (optional)
                  </label>
                  <input type='date' value={importPaidThrough} onChange={e => setImportPaidThrough(e.target.value)}
                    style={{ background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.85rem', fontFamily:'inherit' }} />
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', marginTop:'0.3rem' }}>
                    Enter their current paid-through date so the system won't invoice them until then.
                    e.g. June 30 for quarterly customers who just paid for Apr–Jun.
                  </div>
                  {importPaidThrough && (
                    <div style={{ marginTop:'0.4rem', fontSize:'0.78rem', color:'#4caf50', fontWeight:600 }}>
                      ✓ A paid invoice will be recorded through {new Date(importPaidThrough+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Inp label="First Name *" name="first_name" value={addData.first_name} onChange={onAdd} placeholder="First" />
              <Inp label="Last Name *" name="last_name" value={addData.last_name} onChange={onAdd} placeholder="Last" />
              <Inp label="Email *" name="email" value={addData.email} onChange={onAdd} placeholder="email@example.com" />
              <Inp label="Phone" name="phone" value={addData.phone} onChange={onAdd} placeholder="(603) 000-0000" />
            </div>
            <Inp label="Service Address *" name="service_address" value={addData.service_address} onChange={onAdd} placeholder="123 Main St, Bedford, NH" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Sel label="Town *" name="town" value={addData.town} onChange={onAdd} options={[['bedford','Bedford'],['merrimack','Merrimack'],['amherst','Amherst'],['milford','Milford'],['other','Other']]} />
              <Sel label="Status" name="status" value={addData.status} onChange={onAdd} options={[['active','Active'],['pending','Pending'],['paused','Paused']]} />
              <Sel label="Pickup Day" name="pickup_day" value={addData.pickup_day} onChange={onAdd} options={[['','TBD'],['monday','Monday'],['tuesday','Tuesday'],['wednesday','Wednesday'],['thursday','Thursday'],['friday','Friday']]} />
              <Sel label="Payment Method" name="payment_method" value={addData.payment_method} onChange={onAdd} options={[['cash','Cash'],['venmo','Venmo'],['zelle','Zelle'],['card','Card']]} />
              <Sel label="Bin Situation" name="bin_situation" value={addData.bin_situation} onChange={onAdd} options={[['own','Own bins'],['rental','Rental'],['unsure','Unsure']]} />
              {!importMode && <Inp label="Start Date" name="start_date" value={addData.start_date} onChange={onAdd} type="date" />}
            </div>
            <Inp label="Gate Code / Property Notes" name="gate_notes" value={addData.gate_notes} onChange={onAdd} placeholder="Gate code, dogs in yard..." />
            <Inp label="Notes" name="notes" value={addData.notes} onChange={onAdd} placeholder="Any additional notes..." />
            <div style={{ marginTop:'0.5rem' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontSize:'0.88rem', color:'rgba(255,255,255,0.7)' }}>
                <input type="checkbox" name="garage_side_pickup" checked={addData.garage_side_pickup} onChange={onAdd} style={{ accentColor:'#4caf50' }} />
                Garage-side pickup add-on
              </label>
            </div>
            {/* ── PLAN / SUBSCRIPTION ── */}
            <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.05em', marginBottom:'0.75rem', color:'#2e7d32' }}>Plan &amp; Subscription</div>
              <div>
                <label style={{ display:'block', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Select Services (choose all that apply)</label>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {servicesList.filter((s:any) => s.type === 'recurring').map((s:any) => {
                    const checked = addServiceIds.includes(s.id)
                    return (
                      <label key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', background: checked ? 'rgba(46,125,50,0.1)' : 'rgba(255,255,255,0.03)', border:`1px solid ${checked ? 'rgba(46,125,50,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:'6px', padding:'0.55rem 0.85rem', transition:'all 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                          <input type='checkbox' checked={checked} onChange={e => {
                            setAddServiceIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))
                          }} style={{ accentColor:'#2e7d32', width:'15px', height:'15px' }} />
                          <span style={{ fontSize:'0.88rem' }}>{s.name}</span>
                        </div>
                        <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)' }}>${s.base_price_monthly}/mo</span>
                      </label>
                    )
                  })}
                  {servicesList.length === 0 && <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.3)' }}>No services found — add them in Supabase first.</p>}
                </div>
                {addServiceIds.length > 0 && (
                  <div style={{ marginTop:'0.6rem', fontSize:'0.82rem', color:'#4caf50' }}>
                    Total: ${servicesList.filter(s => addServiceIds.includes(s.id)).reduce((sum, s) => sum + s.base_price_monthly, 0).toFixed(2)}/mo
                  </div>
                )}
              </div>
              <div style={{ marginTop:'0.75rem' }}>
                <label style={{ display:'block', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Billing Cycle</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {(['monthly','quarterly'] as const).map(cycle => (
                    <label key={cycle} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.88rem', color:'rgba(255,255,255,0.7)' }}>
                      <input type='radio' name='billing_cycle' value={cycle} checked={addBillingCycle===cycle} onChange={()=>setAddBillingCycle(cycle)} style={{ accentColor:'#2e7d32' }} />
                      {cycle.charAt(0).toUpperCase()+cycle.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* ── BIN RENTALS ── */}
            <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.05em', marginBottom:'0.75rem', color:'#2e7d32' }}>Bin Rentals</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'0.65rem 0.85rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <input type='checkbox' checked={addTrashBin} onChange={e=>setAddTrashBin(e.target.checked)} style={{ accentColor:'#2e7d32', width:'15px', height:'15px' }} />
                    <span style={{ fontSize:'0.88rem' }}>🗑️ Trash Bin Rental</span>
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)' }}>$7.99/mo · $25 deposit</div>
                </label>
                {addTrashBin && (
                  importMode ? (
                    <div style={{ marginLeft:'1.5rem' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>
                        <input type='checkbox' checked={importDepositPaid} onChange={e=>setImportDepositPaid(e.target.checked)} style={{ accentColor:'#2e7d32' }} />
                        $25 deposit already collected
                      </label>
                    </div>
                  ) : (
                    <div style={{ marginLeft:'1.5rem', fontSize:'0.8rem', color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'5px', padding:'0.4rem 0.7rem' }}>
                      ⚠️ $25 deposit will be marked as <strong>unpaid</strong> — collect before first pickup
                    </div>
                  )
                )}
                <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'0.65rem 0.85rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <input type='checkbox' checked={addRecyclingBin} onChange={e=>setAddRecyclingBin(e.target.checked)} style={{ accentColor:'#2e7d32', width:'15px', height:'15px' }} />
                    <span style={{ fontSize:'0.88rem' }}>♻️ Recycling Bin Rental</span>
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)' }}>$3.99/mo · no deposit</div>
                </label>
              </div>
            </div>

            <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.07)', justifyContent:'flex-end' }}>
              <Btn color='transparent' textColor='#6b7280' onClick={()=>setShowAddModal(false)}>Cancel</Btn>
              <Btn onClick={addCustomer}>{importMode ? '📋 Import Customer' : 'Save Customer'}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', background:'#1a1a1a', border:`1px solid ${toastType==='error'?'#dc2626':'#2e7d32'}`, borderRadius:'8px', padding:'0.85rem 1.25rem', fontSize:'0.84rem', zIndex:2000, display:'flex', alignItems:'center', gap:'0.5rem', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
          {toastType==='error'?'❌':'✅'} {toast}
        </div>
      )}
    </div>
  )
}
