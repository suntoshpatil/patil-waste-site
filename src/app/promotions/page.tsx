
import Link from "next/link"
export const metadata = { title: "Promotions | Patil Waste Removal" }
export default function Promotions() {
  return (
    <>
      <div style={{background:"var(--black)",paddingTop:"57px"}}>
        <div className="section" style={{textAlign:"center"}}>
          <div className="section-inner">
            <span className="eyebrow">Current Promotion</span>
            <h1 className="d1" style={{color:"var(--white)"}}>We Raised Our<br /><span style={{color:"var(--accent)"}}>Reward!</span></h1>
          </div>
        </div>
      </div>
      <section className="section" style={{background:"var(--white)"}}>
        <div className="section-inner" style={{maxWidth:"760px"}}>
          <div style={{background:"var(--black)",borderRadius:"8px",padding:"3rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:"4rem",color:"var(--accent)",lineHeight:1,marginBottom:"0.5rem"}}>1 FREE MONTH</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:"1.5rem",color:"var(--white)",marginBottom:"1.5rem"}}>For You AND Your Friend</div>
            <p style={{color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"500px",margin:"0 auto 2rem"}}>Refer a neighbor or friend to Patil Waste Removal. When they sign up for service, <strong style={{color:"#fff"}}>both of you receive one free month</strong> of trash or recycling pickup. Just have them mention your name when signing up.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",maxWidth:"400px",margin:"0 auto 2rem"}}>
              {[["You Get","1 Free Month"],["Your Friend Gets","1 Free Month"]].map(([label, val]) => (
                <div key={label} style={{background:"rgba(255,255,255,0.05)",borderRadius:"6px",padding:"1.25rem"}}>
                  <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--gray)",marginBottom:"0.5rem"}}>{label}</div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:"1.4rem",color:"var(--green-light)"}}>{val}</div>
                </div>
              ))}
            </div>
            <Link href="/signup" className="btn btn-accent">Sign Up &amp; Start Referring</Link>
          </div>
        </div>
      </section>
    </>
  )
}
