
export const metadata = { title: 'Recycling | Patil Waste Removal' }
import Link from 'next/link'
export default function Recycling() {
  const accepted = ['Cardboard & paperboard','Newspapers & magazines','Office paper & junk mail','Plastic bottles & jugs (1-7)','Glass bottles & jars','Aluminum & steel cans','Cartons (milk, juice)']
  const notAccepted = ['Plastic bags (recycle at grocery store)','Styrofoam','Food waste','Dirty / soiled containers','Electronics','Hazardous materials','Medical waste']
  return (
    <>
      <div style={{background:'var(--black)',paddingTop:'57px'}}>
        <div className="section" style={{textAlign:'center'}}>
          <div className="section-inner">
            <span className="eyebrow">Going Green</span>
            <h1 className="d1" style={{color:'var(--white)'}}>Recycling</h1>
            <p className="lead" style={{color:'rgba(255,255,255,0.55)',maxWidth:'600px',margin:'0 auto'}}>At Patil Waste Removal, we are passionate about recycling and doing our part to keep our planet clean and healthy for future generations.</p>
          </div>
        </div>
      </div>
      <section className="section" style={{background:'var(--white)'}}>
        <div className="section-inner">
          <div style={{background:'rgba(255,179,0,0.08)',border:'1px solid rgba(255,179,0,0.3)',borderRadius:'6px',padding:'1.5rem',marginBottom:'2.5rem'}}>
            <p>⚠️ <strong style={{color:'var(--accent)'}}>Important:</strong> Plastic bags must be kept completely separate from all other recyclables — they are recycled differently and contaminate single-stream bins. Do <strong>NOT</strong> bag your recycling. Loose materials only.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem',marginBottom:'2.5rem'}}>
            <div>
              <span className="eyebrow">Accepted Items</span>
              <ul style={{listStyle:'none',padding:0}}>
                {accepted.map(item => <li key={item} style={{padding:'0.5rem 0',borderBottom:'1px solid var(--border-light)',display:'flex',gap:'0.5rem',fontSize:'0.9rem'}}><span style={{color:'var(--green)',fontWeight:700}}>✓</span>{item}</li>)}
              </ul>
            </div>
            <div>
              <span className="eyebrow" style={{color:'var(--red)'}}>Not Accepted</span>
              <ul style={{listStyle:'none',padding:0}}>
                {notAccepted.map(item => <li key={item} style={{padding:'0.5rem 0',borderBottom:'1px solid var(--border-light)',display:'flex',gap:'0.5rem',fontSize:'0.9rem'}}><span style={{color:'var(--red)',fontWeight:700}}>✗</span>{item}</li>)}
              </ul>
            </div>
          </div>
          <div style={{background:'var(--green-pale)',border:'1px solid rgba(46,125,50,0.2)',borderRadius:'6px',padding:'2rem',textAlign:'center'}}>
            <div className="d3" style={{marginBottom:'0.5rem'}}>Add Recycling to Your Plan</div>
            <p style={{fontSize:'0.88rem',color:'var(--gray)',marginBottom:'1.5rem'}}>Add recycling to your service for just <strong>$52/mo</strong> (Trash & Recycling plan).</p>
            <Link href="/signup" className="btn btn-green">Sign Up for Recycling</Link>
          </div>
        </div>
      </section>
    </>
  )
}
