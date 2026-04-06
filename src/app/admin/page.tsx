/* eslint-disable */
'use client'
import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'
const ADMIN_PASSWORD = 'PatilWaste2024!'

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
  const colors: Record<string, string> = { active:'#16a34a', pending:'#d97706', paused:'#2563eb', cancelled:'#dc2626', overdue:'#dc2626', paid:'#16a34a', draft:'#6b7280' }
  const c = colors[status] || '#6b7280'
  return <span style={{ background:`${c}22`, color:c, padding:'0.15rem 0.5rem', borderRadius:'20px', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{status}</span>
}

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'
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

const Btn = ({ onClick, children, color='#2e7d32', textColor='#fff', small=false }: any) => (
  <button onClick={onClick} style={{ background:color, color:textColor, border:'none', borderRadius:'4px', padding: small ? '0.3rem 0.65rem' : '0.55rem 1.1rem', cursor:'pointer', fontWeight:700, fontSize: small ? '0.72rem' : '0.8rem', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'inherit' }}>
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
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addData, setAddData] = useState<any>({ ...BLANK_CUSTOMER })
  const [addServiceIds, setAddServiceIds] = useState<string[]>([])
  const [addBillingCycle, setAddBillingCycle] = useState('monthly')
  const [servicesList, setServicesList] = useState<{id:string,name:string,base_price_monthly:number}[]>([])
  const [serviceRequests, setServiceRequests] = useState<any[]>([])
  const [skipRequests, setSkipRequests] = useState<any[]>([])
  const [jobRequests, setJobRequests] = useState<any[]>([])
  const [pickupAddons, setPickupAddons] = useState<any[]>([])
  const [noticeMsg, setNoticeMsg] = useState('')
  const [noticeDate, setNoticeDate] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const [replacementDate, setReplacementDate] = useState('')
  const [onboardCustomer, setOnboardCustomer] = useState<any>(null)
  const [onboardData, setOnboardData] = useState({ pickup_day:'', start_date:'', notes:'' })
  const [onboardServiceId, setOnboardServiceId] = useState('')
  const [onboardBillingCycle, setOnboardBillingCycle] = useState('monthly')
  const [addTrashBin, setAddTrashBin] = useState(false)
  const [addRecyclingBin, setAddRecyclingBin] = useState(false)
  const [selectedBins, setSelectedBins] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const showToast = (msg: string, type = 'success') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500) }

  const loadAll = useCallback(async () => {
    const [custs, subs, invs, pays, svcs, svcReqs, skipReqs, jobReqs, addons] = await Promise.all([
      sb('customers?select=*,subscriptions(id,service_id,rate,billing_cycle,status,pickup_day,services(name))&order=created_at.desc'),
      sb('subscriptions?select=rate,billing_cycle,status&status=eq.active'),
      sb('invoices?select=*,customers(first_name,last_name)&order=due_date.desc&limit=100'),
      sb('payment_logs?select=*,customers(first_name,last_name)&order=paid_at.desc&limit=20'),
      sb('services?select=id,name,base_price_monthly&is_active=eq.true&type=in.(recurring,addon)&order=base_price_monthly.asc'),
      sb('service_requests?select=*,customers(first_name,last_name),services(name)&status=eq.pending&order=created_at.desc').catch(()=>[]),
      sb('skip_requests?select=*,customers(first_name,last_name)&status=eq.pending&order=created_at.desc').catch(()=>[]),
      sb('job_requests?select=*&order=created_at.desc&limit=50').catch(()=>[]),
      sb('pickup_addons?select=*,customers(first_name,last_name)&status=in.(pending_quote,confirmed)&order=created_at.desc').catch(()=>[]),
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
    ;(subs||[]).forEach((s:any) => { revenue += s.billing_cycle==='quarterly' ? s.rate/3 : s.rate })
    setStats({ active, pending, overdue, revenue })
  }, [])

  useEffect(() => { if (loggedIn) loadAll() }, [loggedIn, loadAll])
  useEffect(() => { if (sessionStorage.getItem('pwradmin')==='1') setLoggedIn(true) }, [])

  function login() {
    if (pw === ADMIN_PASSWORD) { setLoggedIn(true); sessionStorage.setItem('pwradmin','1') }
    else setPwErr('Incorrect password.')
  }

  async function addCustomer() {
    if (!addData.first_name || !addData.email || !addData.service_address || !addData.town) {
      showToast('Name, email, address, and town are required', 'error'); return
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pickup_day, ...insertData } = addData
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
            status: 'active',
            billing_start: addData.start_date || new Date().toISOString().split('T')[0],
            next_billing_date: addData.start_date || new Date().toISOString().split('T')[0],
          }})
        }
      }
      // Create bin rental rows
      if (newCustomer?.id) {
        const binInserts = []
        if (addTrashBin) binInserts.push({ customer_id: newCustomer.id, bin_type:'trash', monthly_fee:7.99, deposit_amount:25.00, deposit_paid:false, status:'active' })
        if (addRecyclingBin) binInserts.push({ customer_id: newCustomer.id, bin_type:'recycling', monthly_fee:3.99, deposit_amount:0, deposit_paid:true, status:'active' })
        for (const bin of binInserts) {
          await sb('bins', { method:'POST', body: bin })
        }
      }
      showToast('Customer added!')
      setShowAddModal(false)
      setAddData({ ...BLANK_CUSTOMER })
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
          status: 'active',
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
            rate: svc?.base_price_monthly || 0,
            billing_cycle: onboardBillingCycle,
            status: 'active',
            pickup_day: onboardData.pickup_day,
            billing_start: billingStart,
            next_billing_date: billingStart,
          }})
        }
      }
      showToast(`${onboardCustomer.first_name} is now active! ✅`)
      setOnboardCustomer(null)
      setOnboardData({ pickup_day:'', start_date:'', notes:'' })
      setOnboardServiceId('')
      setOnboardBillingCycle('monthly')
      loadAll()
    } catch (e: any) { showToast('Error: ' + e.message, 'error') }
  }

  async function loadSelectedBins(customerId: string) {
    try {
      const bins = await sb(`bins?customer_id=eq.${customerId}&select=*`)
      setSelectedBins(bins || [])
    } catch { setSelectedBins([]) }
  }

  async function toggleDepositPaid(binId: string, current: boolean) {
    await sb(`bins?id=eq.${binId}`, { method:'PATCH', body:{ deposit_paid: !current }, prefer:'return=minimal' })
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
    const { pickup_day, subscriptions, bins, created_at, id, ...patchData } = editData as any
    // Save customer fields
    await sb(`customers?id=eq.${selected.id}`, { method:'PATCH', body:patchData, prefer:'return=minimal' })
    // Save pickup_day to active subscription
    if (pickup_day !== undefined) {
      const activeSub = (selected as any).subscriptions?.find((s:any) => s.status === 'active')
      if (activeSub) {
        await sb(`subscriptions?id=eq.${activeSub.id}`, { method:'PATCH', body:{ pickup_day }, prefer:'return=minimal' })
      }
    }
    showToast('Customer updated')
    setEditMode(false)
    loadAll()
  }

  async function logPayment() {
    if (!payCustomer || !payAmount) { showToast('Customer and amount required','error'); return }
    await sb('payment_logs', { method:'POST', body:{ customer_id:payCustomer, payment_method:payMethod, amount:parseFloat(payAmount), reference_number:payRef||null, logged_by:'Suntosh' } })
    showToast('Payment logged')
    setPayAmount(''); setPayRef('')
    loadAll()
  }

  async function markPaid(id: string) {
    await sb(`invoices?id=eq.${id}`, { method:'PATCH', body:{ status:'paid', paid_at:new Date().toISOString() }, prefer:'return=minimal' })
    showToast('Marked as paid')
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

  const navItems: [string,string,string][] = [['dashboard','📊','Dashboard'],['customers','👥','Customers'],['routes','🗓️','Routes'],['invoices','🧾','Invoices'],['payments','💵','Payments'],['requests','🔔','Requests'],['jobs','🚛','Jobs'],['notices','📢','Notices']]

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', background:'#0f0f0f', color:'#f9f9f6', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Topbar */}
      <div style={{ background:'#141414', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.4rem', letterSpacing:'0.04em' }}>Patil <span style={{ color:'#4caf50' }}>Waste</span> Admin</div>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <span style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#6b7280', background:'rgba(255,255,255,0.05)', padding:'0.3rem 0.7rem', borderRadius:'20px' }}>{customers.length} customers</span>
          <button onClick={() => { sessionStorage.removeItem('pwradmin'); setLoggedIn(false) }} style={{ fontSize:'0.75rem', color:'#6b7280', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'4px', padding:'0.3rem 0.75rem', cursor:'pointer', fontFamily:'inherit' }}>Log Out</button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar */}
        <nav style={{ width:'180px', background:'#141414', borderRight:'1px solid rgba(255,255,255,0.07)', padding:'1rem 0', flexShrink:0, overflowY:'auto' }}>
          {navItems.map(([id,icon,label]) => {
            const pendingCount = id === 'requests' ? serviceRequests.length + skipRequests.length : id === 'jobs' ? jobRequests.filter((j:any)=>j.status==='new').length + pickupAddons.filter((a:any)=>a.status==='pending_quote').length : id === 'dashboard' ? customers.filter(c=>c.status==='pending').length : 0
            return (
              <div key={id} onClick={() => setView(id)} style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.7rem 1.25rem', fontSize:'0.82rem', fontWeight:500, color:view===id?'#fff':'#6b7280', cursor:'pointer', borderLeft:`2px solid ${view===id?'#4caf50':'transparent'}`, background:view===id?'rgba(61,158,64,0.08)':'transparent', transition:'all 0.15s' }}>
                <span>{icon}</span><span>{label}</span>
                {pendingCount > 0 && <span style={{ marginLeft:'auto', background:'#dc2626', color:'#fff', borderRadius:'10px', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.45rem', minWidth:'18px', textAlign:'center' }}>{pendingCount}</span>}
              </div>
            )
          })}
        </nav>

        {/* Main content */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.5rem' }}>

          {/* ── DASHBOARD ── */}
          {view==='dashboard' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Dashboard</div>
                <Btn onClick={() => setShowAddModal(true)}>+ Add Customer</Btn>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
                {([['Active',stats.active,'#fff'],['Pending',stats.pending,'#fff'],['Est. Revenue',`$${stats.revenue.toFixed(0)}/mo`,'#4caf50'],['Overdue',stats.overdue,'#e53935']] as [string,any,string][]).map(([label,val,color]) => (
                  <div key={label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.25rem' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6b7280', marginBottom:'0.4rem' }}>{label}</div>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2.2rem', color, lineHeight:1 }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Pending onboarding alert */}
              {customers.filter(c => c.status === 'pending').length > 0 && (
                <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.04em', color:'#fbbf24', marginBottom:'0.75rem' }}>
                    🕐 {customers.filter(c => c.status === 'pending').length} Customer{customers.filter(c => c.status === 'pending').length > 1 ? 's' : ''} Awaiting Onboarding
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {customers.filter(c => c.status === 'pending').map(c => (
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
                        }}>Onboard →</Btn>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
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
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Customers</div>
                <Btn onClick={()=>setShowAddModal(true)}>+ Add Customer</Btn>
              </div>

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
                    <thead><tr>{['Name','Email','Town','Plan','Status','Actions'].map(h=><th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.07)', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.map(c=>(
                        <tr key={c.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding:'0.85rem 1rem', fontWeight:600, cursor:'pointer', color:'#4caf50', whiteSpace:'nowrap' }} onClick={()=>{setSelected(c);setEditData({...c});setEditMode(false);setConfirmDelete(false)}}>{c.first_name} {c.last_name}</td>
                          <td style={{ padding:'0.85rem 1rem', color:'rgba(255,255,255,0.5)' }}>{c.email}</td>
                          <td style={{ padding:'0.85rem 1rem', textTransform:'capitalize' }}>{c.town}</td>
                          <td style={{ padding:'0.85rem 1rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>{c.subscriptions?.[0]?.services?.name || '—'}</td>
                          <td style={{ padding:'0.85rem 1rem' }}><Badge status={c.status} /></td>
                          <td style={{ padding:'0.85rem 1rem' }}>
                            <div style={{ display:'flex', gap:'0.4rem' }}>
                              <Btn small onClick={()=>{setSelected(c);setEditData({...c});setEditMode(false);setConfirmDelete(false)}}>View</Btn>
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
                    {list.map((c,i)=>(
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.84rem' }}>
                        <div style={{ width:'24px', height:'24px', background:'#2e7d32', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600 }}>{c.first_name} {c.last_name}</div>
                          <div style={{ fontSize:'0.78rem', color:'#6b7280' }}>{c.service_address}</div>
                        </div>
                        {c.gate_notes && <span style={{ fontSize:'0.72rem', color:'#ffb300', background:'rgba(255,179,0,0.1)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>📌 {c.gate_notes}</span>}
                        {c.garage_side_pickup && <span style={{ fontSize:'0.7rem', color:'#4caf50', background:'rgba(61,158,64,0.1)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>🏠 Garage</span>}
                      </div>
                    ))}
                  </div>
                )
              })}
              {customers.filter(c=>c.status==='active').length===0 && <div style={{ textAlign:'center', color:'#6b7280', padding:'3rem' }}>No active customers yet</div>}
            </div>
          )}

          {/* ── INVOICES ── */}
          {view==='invoices' && (
            <div style={{ maxWidth:'860px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em' }}>Invoices</div>
                <Btn small onClick={async () => {
                  showToast('Generating invoices…')
                  try {
                    const res = await fetch('/api/cron/generate-invoices', { headers:{ Authorization:`Bearer patilwaste_cron_2024` }})
                    const data = await res.json()
                    showToast(`Done — ${data.generated} generated, ${data.skipped} skipped`)
                    loadAll()
                  } catch { showToast('Failed to generate invoices','error') }
                }}>⚡ Generate Now</Btn>
              </div>

              {/* Failed / overdue alerts */}
              {invoices.filter((i:any)=>i.status==='overdue').length > 0 && (
                <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'8px', padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
                  <div style={{ fontWeight:700, color:'#f87171', marginBottom:'0.5rem' }}>⚠️ {invoices.filter((i:any)=>i.status==='overdue').length} overdue invoice(s)</div>
                  {invoices.filter((i:any)=>i.status==='overdue').map((inv:any) => (
                    <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.84rem', padding:'0.35rem 0' }}>
                      <span>{inv.customers?.first_name} {inv.customers?.last_name} — ${Number(inv.total).toFixed(2)} due {inv.due_date}</span>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <Btn small onClick={()=>markPaid(inv.id)}>Mark Paid</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
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
                          {inv.status!=='paid' && <Btn small onClick={()=>markPaid(inv.id)}>Mark Paid</Btn>}
                        </td>
                      </tr>
                    ))}
                    {invoices.length===0 && <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#6b7280' }}>No invoices yet — click Generate Now to create them</td></tr>}
                  </tbody>
                </table>
              </div>
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
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', overflow:'hidden' }}>
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
                      <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)', marginTop:'0.2rem' }}>{a.custom_description || `Catalog item: ${a.catalog_item_id}`}</div>
                      {a.requested_pickup_date && <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>Requested: {new Date(a.requested_pickup_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>}
                    </div>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>{a.status==='pending_quote'?'NEEDS QUOTE':'CONFIRMED'}</span>
                  </div>
                  {a.status === 'pending_quote' && (
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.5rem' }}>
                      <input type='number' placeholder='Set price $' style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'4px', padding:'0.4rem 0.65rem', color:'#fff', fontSize:'0.82rem', fontFamily:'inherit', width:'120px' }}
                        onBlur={async e => {
                          const price = parseFloat(e.target.value)
                          if (!isNaN(price)) {
                            await sb(`pickup_addons?id=eq.${a.id}`, { method:'PATCH', body:{ final_price:price, status:'confirmed' }, prefer:'return=minimal' })
                            showToast('Price set, status confirmed')
                            loadAll()
                          }
                        }}
                      />
                      <Btn small color='#7f1d1d' onClick={async()=>{ await sb(`pickup_addons?id=eq.${a.id}`,{method:'PATCH',body:{status:'cancelled'},prefer:'return=minimal'}); showToast('Cancelled'); loadAll() }}>Cancel</Btn>
                    </div>
                  )}
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
            <div style={{ maxWidth:'560px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.02em', marginBottom:'1.5rem' }}>Schedule Notices</div>
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'1.5rem', marginBottom:'1.5rem' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', marginBottom:'1rem' }}>Post a Schedule Notice</div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>Notice Type</label>
                  <select value={noticeType||'info'} onChange={e=>setNoticeType(e.target.value)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'3px', padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.84rem', fontFamily:'inherit', outline:'none', width:'100%' }}>
                    <option value='info' style={{background:'#111'}}>📢 General Info</option>
                    <option value='cancellation' style={{background:'#111'}}>❌ Cancellation — no pickup this day</option>
                    <option value='reschedule' style={{background:'#111'}}>🔄 Reschedule — moved to another day</option>
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: noticeType==='reschedule' ? '1fr 1fr' : '1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  <div>
                    <label style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'0.3rem' }}>{noticeType==='info' ? 'Notice Date' : 'Affected Pickup Date'}</label>
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
                <Btn onClick={postNotice}>📢 Post Notice</Btn>
              </div>
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
                    <Sel label="Pickup Day" name="pickup_day" value={editData.pickup_day||''} onChange={onEdit} options={[['','TBD'],['monday','Monday'],['tuesday','Tuesday'],['wednesday','Wednesday'],['thursday','Thursday'],['friday','Friday']]} />
                    <Inp label="Gate Notes" name="gate_notes" value={editData.gate_notes||''} onChange={onEdit} placeholder="Gate code, property access..." />
                    <Inp label="Notes" name="notes" value={editData.notes||''} onChange={onEdit} placeholder="Internal notes..." />
                    <div style={{ display:'flex', gap:'0.5rem', marginTop:'1rem' }}>
                      <Btn onClick={saveEdit}>Save Changes</Btn>
                      <Btn color='transparent' textColor='#6b7280' onClick={()=>setEditMode(false)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(()=>{const activeSub=(selected as any).subscriptions?.find((s:any)=>s.status==='active'); return [['Status', <Badge key="s" status={selected.status} />],['Email',selected.email],['Phone',selected.phone||'—'],['Address',selected.service_address],['Town',cap(selected.town)],['Pickup Day',cap(activeSub?.pickup_day)||'—'],['Plan',activeSub?.services?.name||'—'],['Payment',cap(selected.payment_method)],['Bin',cap(selected.bin_situation)],['Garage Pickup',selected.garage_side_pickup?'✅ Yes':'No'],['Gate Notes',selected.gate_notes||'—'],['Started',fmt(selected.created_at)]] as [string,any][]})().map(([label,val])=>(
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.45rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.84rem' }}>
                        <span style={{ color:'#6b7280', fontSize:'0.75rem' }}>{label}</span>
                        <span>{val}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'1.25rem' }}>
                      <Btn small onClick={()=>{ const activeSub=(selected as any).subscriptions?.find((s:any)=>s.status==='active'); setEditData({...selected, pickup_day: activeSub?.pickup_day||''}); setEditMode(true); setConfirmDelete(false) }}>✏️ Edit</Btn>
                      <Btn small color='#7f1d1d' onClick={()=>{setConfirmDelete(true)}}>🗑️ Delete</Btn>
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
                              <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>${bin.monthly_fee}/mo</span>
                            </div>
                            {bin.bin_type === 'trash' && (
                              <button
                                onClick={() => toggleDepositPaid(bin.id, bin.deposit_paid)}
                                style={{
                                  background: bin.deposit_paid ? 'rgba(46,125,50,0.15)' : 'rgba(220,38,38,0.12)',
                                  border: `1px solid ${bin.deposit_paid ? 'rgba(46,125,50,0.4)' : 'rgba(220,38,38,0.35)'}`,
                                  color: bin.deposit_paid ? '#4caf50' : '#f87171',
                                  borderRadius:'5px', padding:'0.25rem 0.6rem', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, fontFamily:'inherit'
                                }}
                              >
                                {bin.deposit_paid ? '✅ Deposit Paid' : '❌ Deposit Unpaid ($25)'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                {[
                  ['Address', onboardCustomer.service_address],
                  ['Town', cap(onboardCustomer.town)],
                  ['Phone', onboardCustomer.phone || '—'],
                  ['Payment', cap(onboardCustomer.payment_method)],
                  ['Bin Situation', cap(onboardCustomer.bin_situation)],
                  ['Garage Pickup', onboardCustomer.garage_side_pickup ? '✅ Yes' : 'No'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.72rem' }}>{label}: </span>
                    <span style={{ color:'#fff' }}>{val}</span>
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
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Pickup Day *</label>
              <select value={onboardData.pickup_day} onChange={e=>setOnboardData(p=>({...p, pickup_day:e.target.value}))}
                style={{ width:'100%', background:'#111', border:`1px solid ${onboardData.pickup_day ? 'rgba(46,125,50,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit' }}>
                <option value=''>— Select pickup day —</option>
                {['monday','tuesday','wednesday','thursday','friday'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Confirm or assign plan */}
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem' }}>Service Plan</label>
              <select value={onboardServiceId} onChange={e=>setOnboardServiceId(e.target.value)}
                style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', padding:'0.65rem 0.85rem', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit' }}>
                <option value=''>— None / add later —</option>
                {servicesList.map((s:any) => (
                  <option key={s.id} value={s.id}>{s.name} (${s.base_price_monthly}/mo)</option>
                ))}
              </select>
              {onboardServiceId && (
                <div style={{ marginTop:'0.5rem', display:'flex', gap:'1rem' }}>
                  {['monthly','quarterly'].map(cycle => (
                    <label key={cycle} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontSize:'0.85rem', color:'rgba(255,255,255,0.7)' }}>
                      <input type='radio' value={cycle} checked={onboardBillingCycle===cycle} onChange={()=>setOnboardBillingCycle(cycle)} style={{ accentColor:'#2e7d32' }} />
                      {cycle.charAt(0).toUpperCase()+cycle.slice(1)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Start date */}
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
              <Btn onClick={completeOnboarding}>✅ Activate Customer</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOMER MODAL ── */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{if(e.target===e.currentTarget)setShowAddModal(false)}}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'640px', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', padding:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.8rem' }}>Add Customer</div>
              <button onClick={()=>setShowAddModal(false)} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'1.4rem', cursor:'pointer' }}>✕</button>
            </div>
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
              <Inp label="Start Date" name="start_date" value={addData.start_date} onChange={onAdd} type="date" />
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
                  {servicesList.map(s => {
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
                  <div style={{ marginLeft:'1.5rem', fontSize:'0.8rem', color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'5px', padding:'0.4rem 0.7rem' }}>
                    ⚠️ $25 deposit will be marked as <strong>unpaid</strong> — collect before first pickup
                  </div>
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
              <Btn onClick={addCustomer}>Save Customer</Btn>
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
