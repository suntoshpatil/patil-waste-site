/* eslint-disable */
'use client'
import { useState } from 'react'

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'

async function sb(path: string, opts: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

const JOB_TYPES = [
  { id: 'junk_removal', label: '🗑️ Junk Removal', desc: 'Old furniture, appliances, clutter, estate cleanouts' },
  { id: 'yard_cleanup', label: '🌿 Yard Cleanup', desc: 'Leaf removal, brush clearing, seasonal yard waste' },
  { id: 'both', label: '🏠 Both', desc: 'Combination of junk removal and yard cleanup' },
]

export default function JunkRemoval() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', job_type:'', description:'', preferred_date:'' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.address || !form.job_type || !form.description) {
      setError('Please fill in all required fields.'); return
    }
    setLoading(true); setError('')
    try {
      await sb('job_requests', { method:'POST', body:{ ...form, status:'new' } })
      setSubmitted(true)
    } catch (e: any) { setError(e.message || 'Failed to submit. Please call us directly.') }
    setLoading(false)
  }

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'0.75rem 1rem', color:'#fff', fontSize:'0.92rem', boxSizing:'border-box' as const, fontFamily:'inherit', outline:'none' }

  if (submitted) return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:'6rem' }}>
      <div style={{ textAlign:'center', maxWidth:'480px' }}>
        <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>✅</div>
        <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'2.5rem', letterSpacing:'0.05em', marginBottom:'1rem', color:'#fff' }}>Request Received!</div>
        <p style={{ color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:'1.5rem' }}>
          Thanks, {form.name.split(' ')[0]}! Patil Waste Removal will review your request and reach out within 1 business day with availability and a quote.
        </p>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>
          Questions? Call or text <a href="tel:8024169484" style={{ color:'#4caf50' }}>(802) 416-9484</a>
        </p>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#0a0a0a', paddingTop:'5rem' }}>
      {/* Hero */}
      <section style={{ background:'linear-gradient(180deg, #0f2010 0%, #0a0a0a 100%)', padding:'5rem 2rem 4rem', textAlign:'center', position:'relative', overflow:'hidden' }}><div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(46,125,50,0.12) 0%, transparent 70%)', pointerEvents:'none' }} /><div style={{position:'relative'}}>
        <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'clamp(2.5rem, 6vw, 4.5rem)', letterSpacing:'0.04em', lineHeight:1, marginBottom:'1rem', color:'#fff' }}>
          <span style={{ color:'#fff' }}>Junk Removal</span> <span style={{ color:'#fff' }}>&amp;</span> <span style={{ color:'#4caf50' }}>Yard Cleanup</span>
        </div>
        <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1.05rem', maxWidth:'520px', margin:'0 auto 2rem' }}>
          No subscription needed. Fill out the form and we'll get back to you with a quote — usually within one business day.
        </p>
        <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap' }}>
          {[['📦','Furniture & Appliances'],['🌿','Yard & Brush Waste'],['🏚️','Estate Cleanouts'],['🚛','Full Truckload Hauls']].map(([icon, label]) => (
            <div key={label as string} style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.75)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'0.35rem 0.85rem' }}><span style={{ marginRight:'0.4rem' }}>{icon}</span>{label}</div>
          ))}
        </div>
      </div></section>

      {/* Form */}
      <section style={{ maxWidth:'640px', margin:'0 auto', padding:'2rem' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px', padding:'2.5rem', boxShadow:'0 4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.6rem', letterSpacing:'0.05em', marginBottom:'1.5rem', color:'#fff' }}>Request a Quote</div>

          {/* Job type */}
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.6rem' }}>What do you need? *</label>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {JOB_TYPES.map(jt => (
                <label key={jt.id} style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', cursor:'pointer', background: form.job_type===jt.id ? 'rgba(46,125,50,0.1)' : 'rgba(255,255,255,0.02)', border:`1px solid ${form.job_type===jt.id ? 'rgba(46,125,50,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:'8px', padding:'0.85rem 1rem', transition:'all 0.15s' }}>
                  <input type='radio' name='job_type' value={jt.id} checked={form.job_type===jt.id} onChange={()=>set('job_type',jt.id)} style={{ accentColor:'#2e7d32', marginTop:'3px' }} />
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.92rem', color:'#fff' }}>{jt.label}</div>
                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', marginTop:'0.15rem' }}>{jt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="mobile-stack" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Full Name *</label>
              <input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Phone *</label>
              <input style={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(603) 000-0000" />
            </div>
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Email</label>
            <input style={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="jane@example.com" />
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Service Address *</label>
            <input style={inp} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="123 Main St, Bedford, NH" />
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Describe What Needs to Go *</label>
            <textarea style={{ ...inp, resize:'vertical' }} rows={4} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. 2 old couches, a broken treadmill, and about 10 bags of yard debris from the backyard..." />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>Preferred Date (optional)</label>
            <input style={{ ...inp, width:'auto' }} type='date' value={form.preferred_date} onChange={e=>set('preferred_date',e.target.value)} />
          </div>

          {error && (
            <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'0.75rem 1rem', fontSize:'0.84rem', color:'#f87171', marginBottom:'1rem' }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ width:'100%', background:'#2e7d32', color:'#fff', border:'none', borderRadius:'8px', padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'Bebas Neue, sans-serif', letterSpacing:'0.08em' }}>
            {loading ? 'Submitting…' : 'Submit Request →'}
          </button>
          <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:'0.75rem' }}>
            No commitment. We'll contact you with pricing before any work begins.
          </p>
        </div>
      </section>
    </main>
  )
}
