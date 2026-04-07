
import Link from 'next/link'
export const metadata = { title: 'Curbside Services | Patil Waste Removal' }
export default function Services() {
  return (
    <>
      <div style={{background:'var(--black)',paddingTop:'57px',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(46,125,50,0.1) 0%, transparent 70%)',pointerEvents:'none'}} />
        <div className="section" style={{textAlign:'center',paddingBottom:'3rem'}}>
          <div className="section-inner">
            <span className="eyebrow">What We Offer</span>
            <h1 className="d1" style={{color:'var(--white)'}}>Curbside Services</h1>
            <p className="lead" style={{color:'rgba(255,255,255,0.55)',maxWidth:'600px',margin:'0 auto'}}>Flat-rate monthly plans for residential curbside trash and recycling pickup across Bedford, Merrimack, Amherst, and Milford.</p>
          </div>
        </div>
      </div>
      <section className="section" style={{background:'var(--cream)'}}>
        <div className="section-inner">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem',maxWidth:'840px',margin:'0 auto 3rem'}}>
            <div className="plan-card">
              <div className="plan-type">Curbside Trash Only</div>
              <div className="d3">Standard Pick-up</div>
              <div className="plan-price">$42<sub> /mo</sub></div>
              <ul className="plan-includes">
                <li>Max 10 standard (13-gal) bags per pickup</li>
                <li>Or max 5 large (32-gal) bags per pickup</li>
                <li>Weekly curbside pickup</li>
                <li>Consistent pickup day each week</li>
                <li>Monthly or quarterly billing</li>
                <li>Skip-week pro-rate credits available</li>
              </ul>
              <Link href="/signup" className="btn btn-green" style={{display:'block',textAlign:'center'}}>Sign Up</Link>
            </div>
            <div className="plan-card dark">
              <span className="pop-tag">Most Popular</span>
              <div className="plan-type">Trash + Recycling</div>
              <div className="d3" style={{color:'#fff'}}>Trash & Recycling</div>
              <div className="plan-price">$52<sub> /mo</sub></div>
              <ul className="plan-includes">
                <li>All Standard plan features included</li>
                <li>2 × 32-gal bins of recycling per week</li>
                <li>No-sort recycling — just toss it in</li>
                <li>Same pickup day as trash</li>
                <li>Do NOT bag recycling</li>
              </ul>
              <Link href="/signup" className="btn btn-green" style={{display:'block',textAlign:'center'}}>Sign Up</Link>
            </div>
          </div>
          <div style={{background:'var(--black)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',padding:'2rem',maxWidth:'820px',margin:'0 auto 2.5rem'}}>
            <span className="eyebrow">Extra Bag Charges</span>
            <div className="d3" style={{color:'var(--white)',marginBottom:'0.4rem'}}>Over Your Limit?</div>
            <p style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.45)',marginBottom:'1.25rem'}}>Extra bags are charged per unit and added as a line item on your next invoice.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem'}}>
              <div>
                <p style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--green-light)',marginBottom:'0.6rem'}}>With advance notice</p>
                <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.7)',padding:'0.4rem 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>Extra 13-gal bag — $2.00 each</div>
                <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.7)',padding:'0.4rem 0'}}>Extra 32-gal bag — $3.50 each</div>
              </div>
              <div>
                <p style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#f87171',marginBottom:'0.6rem'}}>Without advance notice</p>
                <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.7)',padding:'0.4rem 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>Extra 13-gal bag — $3.50 each</div>
                <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.7)',padding:'0.4rem 0'}}>Extra 32-gal bag — $5.00 each</div>
              </div>
            </div>
          </div>
          <div style={{maxWidth:'820px',margin:'0 auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              {[['Junk Removal','Furniture, appliances, electronics, construction debris, moving cleanouts.'],['Yard Waste','Leaves, logs, branches, and landscaping debris.']].map(([title, desc]) => (
                <div key={title} style={{background:'var(--cream)',borderRadius:'10px',padding:'2rem',border:'1px solid var(--border-light)',transition:'transform 0.2s'}}>
                  <div className="d3" style={{marginBottom:'0.4rem'}}>{title}</div>
                  <p style={{fontSize:'0.82rem',color:'var(--gray)',lineHeight:1.6}}>{desc}</p>
                  <Link href="/junk-removal" className="btn btn-green" style={{display:'inline-block',marginTop:'1rem',fontSize:'0.72rem'}}>Get a Quote</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
