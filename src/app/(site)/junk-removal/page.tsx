/* eslint-disable */
'use client'
import { useState, useRef } from 'react'

async function compressImage(file: File, maxPx = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

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

const WHAT_WE_REMOVE = [
  { icon: '🛋️', label: 'Furniture', items: 'Sofas, chairs, tables, dressers, bed frames, mattresses' },
  { icon: '🧊', label: 'Appliances', items: 'Refrigerators, washers, dryers, dishwashers, stoves, microwaves' },
  { icon: '🏚️', label: 'Estate Cleanouts', items: 'Full property clear-outs after a move, passing, or foreclosure' },
  { icon: '🌿', label: 'Yard & Brush Waste', items: 'Leaves, branches, brush piles, stumps, seasonal yard debris' },
  { icon: '📦', label: 'General Clutter', items: 'Garage junk, storage room overflows, moving leftovers' },
  { icon: '🚛', label: 'Full Truckload Hauls', items: 'Bulk removal jobs, construction debris, major cleanouts' },
]

const CANT_TAKE = [
  'Hazardous chemicals or paint',
  'Motor oil or automotive fluids',
  'Propane tanks (full)',
  'Asbestos-containing materials',
  'Medical / biohazard waste',
]

const WHY_US = [
  { icon: '📍', title: 'Locally Owned & Operated', body: 'We live and work in the same communities we serve — Bedford, Merrimack, Amherst, and Milford NH.' },
  { icon: '💬', title: 'Quote Before We Start', body: 'No surprises. You get a price upfront before a single item gets loaded. No commitment to request.' },
  { icon: '⚡', title: 'Fast Turnaround', body: 'We respond within 1 business day and can often schedule within the same week.' },
  { icon: '♻️', title: 'Responsible Disposal', body: 'We donate usable items when possible and recycle what we can rather than dumping everything.' },
]

const STEPS = [
  { num: '01', title: 'Request a Quote', body: 'Fill out the form below or give us a call. Tell us what you need removed and when.' },
  { num: '02', title: 'We Come to You', body: 'We\'ll confirm a time, arrive as scheduled, and give you a final price on the spot.' },
  { num: '03', title: 'It\'s Gone', body: 'We do all the heavy lifting and haul everything away. Your space is clear — done.' },
]

export default function JunkRemoval() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', job_type:'', description:'', preferred_date:'' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handlePhotoChange(files: FileList | null) {
    if (!files || files.length === 0) return
    const remaining = 5 - photos.length
    if (remaining <= 0) { setError('Maximum 5 photos allowed.'); return }
    const toProcess = Array.from(files).slice(0, remaining)
    setPhotoLoading(true)
    try {
      const compressed = await Promise.all(
        toProcess.filter(f => f.type.startsWith('image/')).map(f => compressImage(f))
      )
      setPhotos(p => [...p, ...compressed])
    } catch { setError('Failed to process one or more images. Please try again.') }
    setPhotoLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (i: number) => setPhotos(p => p.filter((_, idx) => idx !== i))

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.address || !form.job_type || !form.description) {
      setError('Please fill in all required fields.'); return
    }
    setLoading(true); setError('')
    try {
      await sb('job_requests', { method:'POST', body:{ ...form, status:'new', ...(photos.length > 0 ? { photo_data: photos } : {}) } })
      setSubmitted(true)
    } catch (e: any) { setError(e.message || 'Failed to submit. Please call us directly.') }
    setLoading(false)
  }

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'0.75rem 1rem', color:'#fff', fontSize:'0.92rem', boxSizing:'border-box' as const, fontFamily:'inherit', outline:'none' }
  const sectionHead = { fontFamily:'Bebas Neue, sans-serif', fontSize:'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing:'0.04em', color:'#fff', marginBottom:'0.5rem' }

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

      {/* ── Hero ── */}
      <section style={{ background:'linear-gradient(180deg, #0f2010 0%, #0a0a0a 100%)', padding:'5rem 2rem 4rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(46,125,50,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', maxWidth:'820px', margin:'0 auto' }}>
          <div style={{ display:'inline-block', fontSize:'0.72rem', color:'#4caf50', background:'rgba(46,125,50,0.12)', border:'1px solid rgba(46,125,50,0.3)', borderRadius:'20px', padding:'0.3rem 0.9rem', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
            Serving Bedford · Merrimack · Amherst · Milford NH
          </div>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'clamp(2.8rem, 7vw, 5.5rem)', letterSpacing:'0.04em', lineHeight:1, marginBottom:'1.25rem', color:'#fff' }}>
            Junk Removal &amp; <span style={{ color:'#4caf50' }}>Yard Cleanup</span>
          </div>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'1.1rem', maxWidth:'560px', margin:'0 auto 2rem', lineHeight:1.7 }}>
            One call and it's gone. We haul away furniture, appliances, yard debris, and more — with a free quote, no contracts, and fast scheduling.
          </p>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap', marginBottom:'2rem' }}>
            {[['📦','Furniture & Appliances'],['🌿','Yard & Brush Waste'],['🏚️','Estate Cleanouts'],['🚛','Full Truckload Hauls']].map(([icon, label]) => (
              <div key={label as string} style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.8)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'20px', padding:'0.35rem 0.9rem' }}>
                <span style={{ marginRight:'0.4rem' }}>{icon}</span>{label}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="#quote" style={{ background:'#2e7d32', color:'#fff', textDecoration:'none', borderRadius:'8px', padding:'0.85rem 2rem', fontFamily:'Bebas Neue, sans-serif', fontSize:'1.1rem', letterSpacing:'0.08em' }}>Get a Free Quote →</a>
            <a href="tel:8024169484" style={{ background:'rgba(255,255,255,0.06)', color:'#fff', textDecoration:'none', borderRadius:'8px', padding:'0.85rem 2rem', fontFamily:'Bebas Neue, sans-serif', fontSize:'1.1rem', letterSpacing:'0.08em', border:'1px solid rgba(255,255,255,0.12)' }}>📞 (802) 416-9484</a>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding:'5rem 2rem', maxWidth:'900px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <div style={sectionHead}>How It Works</div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem' }}>Three simple steps — no hassle, no mystery pricing.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1.5rem' }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'2rem 1.75rem', position:'relative' }}>
              <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'3rem', color:'rgba(46,125,50,0.25)', lineHeight:1, marginBottom:'0.5rem' }}>{s.num}</div>
              <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.3rem', letterSpacing:'0.04em', color:'#fff', marginBottom:'0.6rem' }}>{s.title}</div>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.9rem', lineHeight:1.65, margin:0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What We Remove ── */}
      <section style={{ padding:'4rem 2rem', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div style={sectionHead}>What We Remove</div>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem' }}>If it's bulky, heavy, or just in the way — we can likely take it.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1.25rem' }}>
            {WHAT_WE_REMOVE.map(item => (
              <div key={item.label} style={{ display:'flex', gap:'1rem', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'1.25rem 1.5rem', alignItems:'flex-start' }}>
                <div style={{ fontSize:'1.75rem', flexShrink:0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#fff', marginBottom:'0.3rem' }}>{item.label}</div>
                  <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>{item.items}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Patil ── */}
      <section style={{ padding:'5rem 2rem', maxWidth:'900px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <div style={sectionHead}>Why Choose Patil Waste Removal</div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem' }}>Local, honest, and straightforward — that's how we operate.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1.25rem' }}>
          {WHY_US.map(item => (
            <div key={item.title} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'1.75rem' }}>
              <div style={{ fontSize:'1.75rem', marginBottom:'0.75rem' }}>{item.icon}</div>
              <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.15rem', letterSpacing:'0.04em', color:'#fff', marginBottom:'0.5rem' }}>{item.title}</div>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.88rem', lineHeight:1.65, margin:0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Can't Take + Service Area ── */}
      <section style={{ padding:'3rem 2rem 4rem', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'2.5rem' }}>

          {/* Can't take */}
          <div>
            <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.5rem', letterSpacing:'0.04em', color:'#fff', marginBottom:'1rem' }}>What We Can't Take</div>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', marginBottom:'1rem', lineHeight:1.6 }}>
              For the safety of our crew and compliance with disposal regulations, we can't accept:
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {CANT_TAKE.map(item => (
                <li key={item} style={{ display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'0.88rem', color:'rgba(255,255,255,0.6)' }}>
                  <span style={{ color:'#ef4444', fontSize:'1rem' }}>✕</span> {item}
                </li>
              ))}
            </ul>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.8rem', marginTop:'1rem' }}>Not sure? Just ask — we'll let you know.</p>
          </div>

          {/* Service area */}
          <div>
            <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.5rem', letterSpacing:'0.04em', color:'#fff', marginBottom:'1rem' }}>Service Area</div>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', lineHeight:1.7, marginBottom:'1.25rem' }}>
              We primarily serve southern New Hampshire, including:
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
              {['Bedford, NH','Merrimack, NH','Amherst, NH','Milford, NH','Manchester, NH','Nashua, NH'].map(town => (
                <div key={town} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.88rem', color:'rgba(255,255,255,0.7)' }}>
                  <span style={{ color:'#4caf50' }}>📍</span> {town}
                </div>
              ))}
            </div>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.8rem', marginTop:'1.25rem' }}>
              Don't see your town? Reach out — we may still be able to help.
            </p>
          </div>

        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding:'4rem 2rem', maxWidth:'820px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing:'0.04em', color:'#fff', marginBottom:'0.5rem' }}>Item Pricing</div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem', maxWidth:'520px', margin:'0 auto' }}>
            Estimates for common items — final price confirmed before we start. Larger jobs and full cleanouts are quoted on-site.
          </p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          {[
            { name:'Couch / Sofa',                  range:'$40 – $75' },
            { name:'Appliance (washer/dryer/fridge)', range:'$40 – $80' },
            { name:'Chair / Recliner',               range:'$20 – $40' },
            { name:'Desk / Table',                   range:'$25 – $50' },
            { name:'Exercise Equipment',             range:'$30 – $60' },
            { name:'Mattress / Box Spring',          range:'$30 – $50' },
            { name:'TV / Monitor',                   range:'$20 – $40' },
          ].map((item, i, arr) => (
            <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.9rem 1.5rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ fontSize:'0.92rem', color:'rgba(255,255,255,0.75)' }}>{item.name}</span>
              <span style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.05rem', letterSpacing:'0.04em', color:'#4caf50' }}>{item.range}</span>
            </div>
          ))}
          <div style={{ padding:'1rem 1.5rem', background:'rgba(46,125,50,0.06)', borderTop:'1px solid rgba(46,125,50,0.15)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'0.92rem', color:'rgba(255,255,255,0.75)' }}>Full cleanout / large haul</span>
            <span style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.05rem', letterSpacing:'0.04em', color:'#4caf50' }}>Custom Quote</span>
          </div>
        </div>
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.78rem', textAlign:'center', marginTop:'1rem' }}>All prices are estimates. Final quote given before any work begins — no commitment to request.</p>
      </section>

      {/* ── Quote Form ── */}
      <section id="quote" style={{ maxWidth:'640px', margin:'0 auto', padding:'1rem 2rem 5rem' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'clamp(1.8rem, 4vw, 2.4rem)', letterSpacing:'0.04em', color:'#fff', marginBottom:'0.5rem' }}>Request a Free Quote</div>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9rem' }}>No commitment. We'll reach out within 1 business day.</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px', padding:'2.5rem', boxShadow:'0 4px 24px rgba(0,0,0,0.3)' }}>

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
          {/* Photo upload */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>
              Photos of Items (optional) <span style={{ color:'rgba(255,255,255,0.25)', textTransform:'none', letterSpacing:0, fontSize:'0.72rem' }}>up to 5 — helps us give a more accurate quote</span>
            </label>
            <input ref={fileRef} type='file' accept='image/*' multiple style={{ display:'none' }} onChange={e => handlePhotoChange(e.target.files)} />

            {/* Thumbnails grid */}
            {photos.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'0.5rem', marginBottom:'0.5rem' }}>
                {photos.map((src, i) => (
                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:'6px', overflow:'hidden', border:'1px solid rgba(46,125,50,0.3)' }}>
                    <img src={src} alt={`Photo ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    <button onClick={() => removePhoto(i)} style={{ position:'absolute', top:'4px', right:'4px', background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%', color:'#fff', width:'20px', height:'20px', fontSize:'0.7rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more / drop zone — hide when at 5 */}
            {photos.length < 5 && (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handlePhotoChange(e.dataTransfer.files) }}
                style={{ border:'2px dashed rgba(255,255,255,0.12)', borderRadius:'8px', padding:'1.25rem', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(46,125,50,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.12)')}
              >
                {photoLoading
                  ? <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>Processing…</div>
                  : <>
                      <div style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>📷</div>
                      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem' }}>
                        {photos.length === 0 ? 'Click to upload or drag & drop' : `Add more (${5 - photos.length} remaining)`}
                      </div>
                      <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.72rem', marginTop:'0.2rem' }}>JPG, PNG, HEIC</div>
                    </>
                }
              </div>
            )}
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

        {/* Call CTA */}
        <div style={{ marginTop:'1.5rem', textAlign:'center', padding:'1.25rem', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px' }}>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', margin:'0 0 0.4rem' }}>Prefer to talk?</p>
          <a href="tel:8024169484" style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:'1.4rem', letterSpacing:'0.05em', color:'#4caf50', textDecoration:'none' }}>📞 (802) 416-9484</a>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.78rem', marginTop:'0.3rem' }}>Call or text — we'll get back to you fast.</p>
        </div>
      </section>

    </main>
  )
}
