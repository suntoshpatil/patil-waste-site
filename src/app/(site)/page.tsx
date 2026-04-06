import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section style={{ minHeight:'calc(100vh - 57px)', background:'var(--black)', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', padding:'5rem 2.5rem', paddingTop:'calc(57px + 5rem)' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 70% at 30% 50%, rgba(46,125,50,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:'1100px', margin:'0 auto', width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3rem' }}>
          <div className="fade-up" style={{ flex:1 }}>
            <span style={{ display:'inline-block', background:'var(--green)', color:'#fff', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', padding:'0.35rem 0.85rem', borderRadius:'2px', marginBottom:'1.4rem' }}>
              📍 Bedford · Merrimack · Amherst · Milford · and more
            </span>
            <h1 className="d1" style={{ color:'var(--white)' }}>
              Reliability<br />at an <span style={{ color:'var(--green-light)' }}>Affordable</span><br />Price
            </h1>
            <p style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--green-light)', marginTop:'1rem' }}>
              No Surprise Fees — What You See Is What You Pay
            </p>
            <p style={{ color:'rgba(255,255,255,0.55)', maxWidth:'480px', margin:'1rem 0 2rem', lineHeight:1.75 }}>
              Offering curbside trash pick-up service to Bedford, Merrimack, Amherst, and Milford. We strive to ensure your needs are met affordably and reliably.
            </p>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
              <Link href="/signup" className="btn btn-green">Sign Up Today</Link>
              <Link href="/services" className="btn btn-outline">View Services</Link>
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            <Image src="/logo.png" alt="Patil Waste Removal LLC" width={260} height={120} style={{ objectFit:'contain', filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }} />
          </div>
        </div>
        <div style={{ position:'absolute', bottom:'2.5rem', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'3rem' }}>
          {[['50+','Happy Customers'],['10+','Towns & Areas'],['100%','Local & Trusted']].map(([val, label]) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', color:'var(--green-light)', lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginTop:'0.3rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section className="section" style={{ background:'var(--cream)' }}>
        <div className="section-inner" style={{ textAlign:'center' }}>
          <span className="eyebrow">Our Plans</span>
          <h2 className="d2" style={{ marginBottom:'0.5rem' }}>Simple, Transparent Pricing</h2>
          <p className="lead" style={{ marginBottom:'3rem' }}>Flat monthly rates. No contracts. No surprises.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', maxWidth:'720px', margin:'0 auto 2rem' }}>
            <div className="plan-card">
              <div className="plan-type">Recurring — Monthly or Quarterly</div>
              <div className="d3">Standard Pick-up</div>
              <div className="plan-price">$42<sub> /mo</sub></div>
              <ul className="plan-includes" style={{ textAlign:'left' }}>
                <li>Max 10 standard 13-gal bags per week</li>
                <li>Or max 5 large 32-gal bags per week</li>
                <li>Weekly curbside pickup</li>
                <li>Monthly or quarterly billing</li>
                <li>Optional bin rental add-on</li>
                <li>Optional garage-side pickup add-on</li>
              </ul>
              <Link href="/signup" className="btn btn-green" style={{ display:'block', textAlign:'center' }}>Sign Up</Link>
            </div>
            <div className="plan-card dark">
              <span className="pop-tag">Most Popular</span>
              <div className="plan-type">Recurring — Monthly or Quarterly</div>
              <div className="d3" style={{ color:'#fff' }}>Trash &amp; Recycling</div>
              <div className="plan-price">$52<sub> /mo</sub></div>
              <ul className="plan-includes" style={{ textAlign:'left' }}>
                <li>Everything in Standard</li>
                <li>2 × 32-gal bins of recycling per week</li>
                <li>No-sort recycling — just toss it in</li>
                <li>Monthly or quarterly billing</li>
                <li>Optional bin rental add-on</li>
                <li>Optional garage-side pickup add-on</li>
              </ul>
              <Link href="/signup" className="btn btn-green" style={{ display:'block', textAlign:'center' }}>Sign Up</Link>
            </div>
          </div>
          <Link href="/services" style={{ fontSize:'0.84rem', color:'var(--green)', fontWeight:600 }}>View full pricing including bulky items &amp; tires →</Link>
        </div>
      </section>

      {/* Why us */}
      <section className="section" style={{ background:'var(--white)' }}>
        <div className="section-inner" style={{ textAlign:'center' }}>
          <span className="eyebrow">Why Patil Waste</span>
          <h2 className="d2" style={{ marginBottom:'3rem' }}>Built for Reliability</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2rem' }}>
            {[['🗓️','Consistent Schedule','Same day, every week. Set it and forget it.'],['💸','No Hidden Fees','The price you see is the price you pay. Always.'],['📍','Locally Operated','Bedford-based. We know these roads and we show up.']].map(([icon, title, desc]) => (
              <div key={title} style={{ background:'var(--cream)', borderRadius:'6px', padding:'2rem', border:'1px solid var(--border-light)' }}>
                <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>{icon}</div>
                <div className="d3" style={{ marginBottom:'0.5rem' }}>{title}</div>
                <p style={{ fontSize:'0.88rem', color:'var(--gray)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="section" style={{ background:'var(--black)', position:'relative', overflow:'hidden', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 50% 70% at 50% 50%, rgba(76,175,80,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div className="section-inner" style={{ position:'relative', zIndex:1 }}>
          <span className="eyebrow">Current Promotion</span>
          <h2 className="d2" style={{ color:'var(--white)' }}>We Raised Our<br /><span style={{ color:'var(--accent)' }}>Referral Reward!</span></h2>
          <p style={{ fontSize:'1rem', color:'rgba(255,255,255,0.58)', maxWidth:'500px', lineHeight:1.75, margin:'0.75rem auto 1.75rem' }}>
            Tell your neighbors about us. If they sign up, <strong style={{ color:'#fff' }}>both of you get 1 FREE MONTH</strong> of service. Just have them mention your name!
          </p>
          <Link href="/promotions" className="btn btn-accent">See the Referral Program</Link>
        </div>
      </section>
    </>
  )
}
