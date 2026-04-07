import Link from 'next/link'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer style={{ background:'#0f0f0f', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'3.5rem 2.5rem 2rem', color:'rgba(255,255,255,0.45)', fontSize:'0.82rem' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
        <div className="footer-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'2rem', marginBottom:'2.5rem' }}>
          <div>
            <Logo height={52} />
            <p style={{ marginTop:'1rem', lineHeight:1.7 }}>Reliable curbside trash &amp; recycling pickup across southern New Hampshire.</p>
            <p style={{ marginTop:'0.75rem' }}>(802) 416-9484</p>
            <a href="mailto:patilwasteremoval@gmail.com" style={{ color:'#4caf50' }}>patilwasteremoval@gmail.com</a>
          </div>
          <div>
            <p style={{ fontWeight:700, color:'#fff', marginBottom:'1rem', fontSize:'0.7rem', letterSpacing:'0.14em', textTransform:'uppercase' }}>Quick Links</p>
            {[['/', 'Home'],['/services','Services'],['/recycling','Recycling'],['/faqs','FAQs'],['/promotions','Promotions'],['/contact','Contact'],['/signup','Sign Up']].map(([href, label]) => (
              <div key={href} style={{ marginBottom:'0.5rem' }}>
                <Link href={href} style={{ color:'rgba(255,255,255,0.45)', transition:'color 0.2s' }}>{label}</Link>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontWeight:700, color:'#fff', marginBottom:'1rem', fontSize:'0.7rem', letterSpacing:'0.14em', textTransform:'uppercase' }}>Service Area</p>
            {['Bedford, NH','Merrimack, NH','Amherst, NH','Milford, NH','And more…'].map(t => (
              <p key={t} style={{ marginBottom:'0.4rem' }}>{t}</p>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:'1.5rem', textAlign:'center' }}>
          <p>© {new Date().getFullYear()} Patil Waste Removal LLC · Bedford, NH · All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
