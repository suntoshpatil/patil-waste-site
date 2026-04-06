'use client'
import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'
const ADMIN_PASSWORD = 'PatilWaste2024!'

type Customer = {
  id: string; first_name: string; last_name: string; email: string; phone: string
  service_address: string; town: string; status: string; payment_method: string
  pickup_day: string; bin_situation: string; garage_side_pickup: boolean
  gate_notes: string; notes: string; start_date: string; created_at: string
  subscriptions?: { rate: number; billing_cycle: string; services: { name: string } }[]
}

async function sb(path: string, options: { method?: string; body?: object; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': options.prefer || 'return=representation',
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const txt = await res.text()
  return txt ? JSON.parse(txt) : null
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: '#16a34a', pending: '#d97706', paused: '#2563eb',
    cancelled: '#dc2626', overdue: '#dc2626', paid: '#16a34a', draft: '#6b7280'
  }
  return (
    <span style={{ background: `${colors[status] || '#6b7280'}22`, color: colors[status] || '#6b7280', padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {status}
    </span>
  )
}

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—' }

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
  const [stats, setStats] = useState({ active: 0, pending: 0, overdue: 0, revenue: 0 })
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [payCustomer, setPayCustomer] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [toast, setToast] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAll = useCallback(async () => {
    const [custs, subs, invs, pays] = await Promise.all([
      sb('customers?select=*,subscriptions(rate,billing_cycle,services(name))&order=created_at.desc'),
      sb('subscriptions?select=rate,billing_cycle,status&status=eq.active'),
      sb('invoices?select=*,customers(first_name,last_name)&order=created_at.desc&limit=50'),
      sb('payment_logs?select=*,customers(first_name,last_name)&order=paid_at.desc&limit=20'),
    ])
    setCustomers(custs || [])
    setInvoices(invs || [])
    setPayments(pays || [])
    const active = (custs || []).filter((c: Customer) => c.status === 'active').length
    const pending = (custs || []).filter((c: Customer) => c.status === 'pending').length
    const overdue = (custs || []).filter((c: Customer) => c.status === 'overdue').length
    let revenue = 0
    ;(subs || []).forEach((s: any) => { revenue += s.billing_cycle === 'quarterly' ? s.rate / 3 : s.rate })
    setStats({ active, pending, overdue, revenue })
  }, [])

  useEffect(() => { if (loggedIn) loadAll() }, [loggedIn, loadAll])

  function login() {
    if (pw === ADMIN_PASSWORD) { setLoggedIn(true); sessionStorage.setItem('pwradmin', '1') }
    else setPwErr('Incorrect password.')
  }

  useEffect(() => { if (sessionStorage.getItem('pwradmin') === '1') setLoggedIn(true) }, [])

  async function updateStatus(status: string) {
    if (!selected) return
    await sb(`customers?id=eq.${selected.id}`, { method: 'PATCH', body: { status }, prefer: 'return=minimal' })
    await sb('customer_history', { method: 'POST', body: { customer_id: selected.id, field_changed: 'status', old_value: selected.status, new_value: status, changed_by: 'admin' } })
    showToast(`Status updated to ${status}`)
    setSelected({ ...selected, status })
    loadAll()
  }

  async function saveEdit() {
    if (!selected) return
    await sb(`customers?id=eq.${selected.id}`, { method: 'PATCH', body: editData, prefer: 'return=minimal' })
    await sb('customer_history', { method: 'POST', body: { customer_id: selected.id, field_changed: 'profile_updated', new_value: 'via admin', changed_by: 'admin' } })
    showToast('Customer saved')
    setEditMode(false)
    loadAll()
  }

  async function logPayment() {
    if (!payCustomer || !payAmount) { showToast('Customer and amount required'); return }
    await sb('payment_logs', { method: 'POST', body: { customer_id: payCustomer, payment_method: payMethod, amount: parseFloat(payAmount), reference_number: payRef || null, logged_by: 'Suntosh' } })
    showToast('Payment logged')
    setPayAmount(''); setPayRef('')
    loadAll()
  }

  async function markPaid(id: string) {
    await sb(`invoices?id=eq.${id}`, { method: 'PATCH', body: { status: 'paid', paid_at: new Date().toISOString() }, prefer: 'return=minimal' })
    showToast('Invoice marked as paid')
    loadAll()
  }

  const filtered = customers.filter(c => {
    const name = `${c.first_name} ${c.last_name} ${c.email} ${c.service_address}`.toLowerCase()
    return (!search || name.includes(search.toLowerCase())) && (!statusFilter || c.status === statusFilter) && (!townFilter || c.town === townFilter)
  })

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  const byDay: Record<string, Customer[]> = {}
  days.forEach(d => byDay[d] = [])
  byDay['unassigned'] = []
  customers.filter(c => c.status === 'active').forEach(c => {
    const day = c.pickup_day && days.includes(c.pickup_day) ? c.pickup_day : 'unassigned'
    byDay[day].push(c)
  })

  const s: React.CSSProperties = { fontFamily: 'DM Sans, sans-serif', background: '#0f0f0f', color: '#f9f9f6', minHeight: '100vh' }
  const inp = { style: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '3px', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none', width: '100%' } }
  const sel = { style: { ...inp.style, cursor: 'pointer' } }

  if (!loggedIn) return (
    <div style={{ ...s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '2.5rem', width: '340px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', marginBottom: '0.25rem' }}>Patil <span style={{ color: '#4caf50' }}>Waste</span> Admin</div>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '2rem' }}>Dashboard</div>
        <input type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} style={{ ...inp.style, textAlign: 'center', letterSpacing: '0.2em', marginBottom: '1rem' }} />
        <button onClick={login} style={{ width: '100%', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '3px', padding: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontSize: '0.85rem' }}>Log In</button>
        {pwErr && <p style={{ color: '#e53935', fontSize: '0.8rem', marginTop: '0.75rem' }}>{pwErr}</p>}
      </div>
    </div>
  )

  const navItems = [['dashboard', '📊', 'Dashboard'], ['customers', '👥', 'Customers'], ['routes', '🗓️', 'Routes'], ['invoices', '🧾', 'Invoices'], ['payments', '💵', 'Payments']]

  return (
    <div style={{ ...s, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem', letterSpacing: '0.04em' }}>Patil <span style={{ color: '#4caf50' }}>Waste</span> Admin</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.7rem', borderRadius: '20px' }}>{customers.length} customers</span>
          <button onClick={() => { sessionStorage.removeItem('pwradmin'); setLoggedIn(false) }} style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.3rem 0.75rem', cursor: 'pointer' }}>Log Out</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav style={{ width: '180px', background: '#141414', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '1rem 0', flexShrink: 0 }}>
          {navItems.map(([id, icon, label]) => (
            <div key={id} onClick={() => setView(id)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 1.25rem', fontSize: '0.82rem', fontWeight: 500, color: view === id ? '#fff' : '#6b7280', cursor: 'pointer', borderLeft: `2px solid ${view === id ? '#4caf50' : 'transparent'}`, background: view === id ? 'rgba(61,158,64,0.08)' : 'transparent' }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.02em' }}>Dashboard</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[['Active', stats.active, '#fff'], ['Pending', stats.pending, '#fff'], ['Est. Revenue', `$${stats.revenue.toFixed(0)}/mo`, '#4caf50'], ['Overdue', stats.overdue, '#e53935']].map(([label, val, color]) => (
                  <div key={label as string} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.4rem' }}>{label}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', color: color as string, lineHeight: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', letterSpacing: '0.04em' }}>Recent Signups</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead><tr>{['Name', 'Town', 'Status', 'Signed Up'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {customers.slice(0, 5).map(c => (
                      <tr key={c.id} onClick={() => { setSelected(c); setView('customers') }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{c.town}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{statusBadge(c.status)}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)' }}>{fmt(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {view === 'customers' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.02em' }}>Customers</div>
              </div>

              {/* Profile modal */}
              {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '720px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem' }}>{selected.first_name} {selected.last_name}</div>
                      <button onClick={() => { setSelected(null); setEditMode(false) }} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        {editMode ? (
                          <div>
                            {[['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'], ['service_address', 'Address'], ['gate_notes', 'Gate Notes'], ['notes', 'Notes']].map(([key, label]) => (
                              <div key={key} style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                                <input value={(editData as any)[key] ?? ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} {...inp} />
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                              <button onClick={saveEdit} style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>Save</button>
                              <button onClick={() => setEditMode(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {[['Status', statusBadge(selected.status)], ['Email', selected.email], ['Phone', selected.phone || '—'], ['Address', selected.service_address], ['Town', cap(selected.town)], ['Payment', cap(selected.payment_method)], ['Bin', cap(selected.bin_situation)], ['Garage Pickup', selected.garage_side_pickup ? '✅ Yes' : 'No'], ['Gate Notes', selected.gate_notes || '—'], ['Started', fmt(selected.start_date || selected.created_at)]].map(([label, val]) => (
                              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.84rem' }}>
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{label}</span>
                                <span>{val}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                              <button onClick={() => { setEditData({ ...selected }); setEditMode(true) }} style={{ background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem' }}>✏️ Edit</button>
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '1rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>Change Status</div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[['active', '#2e7d32', '#fff'], ['pending', 'rgba(255,179,0,0.15)', '#ffb300'], ['paused', 'rgba(30,136,229,0.15)', '#64b5f6'], ['cancelled', '#e53935', '#fff']].map(([s, bg, color]) => (
                              <button key={s} onClick={() => updateStatus(s)} style={{ background: bg, color, border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>Notes</div>
                        <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{selected.notes || 'No notes.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
                  <input placeholder="Search name, email, address..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp.style, width: '240px' }} />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} {...sel} style={{ ...sel.style, width: 'auto' }}>
                    <option value="">All Statuses</option>
                    {['active', 'pending', 'paused', 'overdue', 'cancelled'].map(s => <option key={s} value={s}>{cap(s)}</option>)}
                  </select>
                  <select value={townFilter} onChange={e => setTownFilter(e.target.value)} {...sel} style={{ ...sel.style, width: 'auto' }}>
                    <option value="">All Towns</option>
                    {['bedford', 'merrimack', 'amherst', 'milford'].map(t => <option key={t} value={t}>{cap(t)}</option>)}
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead><tr>{['Name', 'Email', 'Town', 'Plan', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, cursor: 'pointer', color: '#4caf50' }} onClick={() => setSelected(c)}>{c.first_name} {c.last_name}</td>
                          <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)' }}>{c.email}</td>
                          <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{c.town}</td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{c.subscriptions?.[0]?.services?.name || '—'}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>{statusBadge(c.status)}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <button onClick={() => setSelected(c)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}>View</button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No customers found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ROUTES */}
          {view === 'routes' && (
            <div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.02em', marginBottom: '1.5rem' }}>Weekly Routes</div>
              {[...days, 'unassigned'].map(day => {
                const list = byDay[day]
                if (!list?.length) return null
                return (
                  <div key={day} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', background: 'rgba(61,158,64,0.08)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.04em' }}>{cap(day)}</div>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{list.length} stop{list.length !== 1 ? 's' : ''}</span>
                    </div>
                    {list.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.84rem' }}>
                        <div style={{ width: '24px', height: '24px', background: '#2e7d32', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{c.service_address}</div>
                        </div>
                        {c.gate_notes && <span style={{ fontSize: '0.72rem', color: '#ffb300', background: 'rgba(255,179,0,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>📌 {c.gate_notes}</span>}
                        {c.garage_side_pickup && <span style={{ fontSize: '0.7rem', color: '#4caf50', background: 'rgba(61,158,64,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>🏠 Garage</span>}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* INVOICES */}
          {view === 'invoices' && (
            <div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.02em', marginBottom: '1.5rem' }}>Invoices</div>
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead><tr>{['Customer', 'Period', 'Total', 'Status', 'Due', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{inv.customers ? `${inv.customers.first_name} ${inv.customers.last_name}` : '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{fmt(inv.period_start)} – {fmt(inv.period_end)}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>${Number(inv.total).toFixed(2)}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{statusBadge(inv.status)}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)' }}>{fmt(inv.due_date)}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {inv.status !== 'paid' && <button onClick={() => markPaid(inv.id)} style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Mark Paid</button>}
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No invoices yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {view === 'payments' && (
            <div style={{ maxWidth: '560px' }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.02em', marginBottom: '1.5rem' }}>Log Payment</div>
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', marginBottom: '1.25rem', letterSpacing: '0.02em' }}>Record Manual Payment</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>Customer</label>
                  <select value={payCustomer} onChange={e => setPayCustomer(e.target.value)} {...sel}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>Amount ($)</label>
                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" {...inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} {...sel}>
                      {['cash', 'venmo', 'zelle', 'card'].map(m => <option key={m} value={m}>{cap(m)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>Reference / Note</label>
                  <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Venmo @handle, cash receipt #..." {...inp} />
                </div>
                <button onClick={logPayment} style={{ width: '100%', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Log Payment</button>
              </div>
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}>Recent Payments</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead><tr>{['Customer', 'Amount', 'Method', 'Date', 'Note'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>{p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#4caf50' }}>${Number(p.amount).toFixed(2)}</td>
                        <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{p.payment_method}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)' }}>{fmt(p.paid_at)}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{p.reference_number || '—'}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No payments logged yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#1a1a1a', border: '1px solid #2e7d32', borderRadius: '8px', padding: '0.85rem 1.25rem', fontSize: '0.84rem', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          ✅ {toast}
        </div>
      )}
    </div>
  )
}
