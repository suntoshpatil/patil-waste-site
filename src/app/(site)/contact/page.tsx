/* eslint-disable */

"use client"
import { useState } from "react"
export default function Contact() {
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState("")
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = { firstName:(form.fn as any).value, lastName:(form.ln as any).value, phone:(form.ph as any).value, email:(form.em as any).value, message:(form.msg as any).value }
    if (!data.firstName || !data.email || !data.message) { setErr("Please fill in your name, email, and message."); return }
    setErr("")
    // Save contact submission to Supabase
    try {
      await fetch("https://kmvwwxlwzacxvtlqugws.supabase.co/rest/v1/job_requests", {
        method: "POST",
        headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ",
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          phone: data.phone || null,
          address: "",
          job_type: "junk_removal",
          description: `[CONTACT FORM] ${data.message}`,
          status: "new",
        }),
      })
    } catch {}
    setSent(true)
  }
  return (
    <>
      <div style={{background:"var(--black)",paddingTop:"57px"}}>
        <div className="section" style={{textAlign:"center"}}>
          <div className="section-inner">
            <span className="eyebrow">Get In Touch</span>
            <h1 className="d1" style={{color:"var(--white)"}}>Contact Us</h1>
            <p className="lead" style={{color:"rgba(255,255,255,0.55)",maxWidth:"500px",margin:"0 auto"}}>Have a question? Fill out the form or reach us directly. We actually pick up the phone.</p>
          </div>
        </div>
      </div>
      <section className="section" style={{background:"var(--black)"}}>
        <div className="section-inner contact-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4rem",maxWidth:"900px"}}>
          <div>
            <div style={{marginBottom:"2rem"}}>
              {[["📞","Phone","(802) 416-9484"],["✉️","Email","patilwasteremoval@gmail.com"],["📍","Address","80 Palomino Ln, Bedford NH 03110"],["🕐","Hours","Mon–Fri: 7am–6pm"]].map(([icon, label, val]) => (
                <div key={label} style={{display:"flex",gap:"1rem",marginBottom:"1.5rem"}}>
                  <span style={{fontSize:"1.4rem"}}>{icon}</span>
                  <div><div style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--gray)",marginBottom:"0.25rem"}}>{label}</div><div style={{color:"var(--white)",fontSize:"0.9rem"}}>{val}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            {sent ? (
              <div style={{textAlign:"center",padding:"3rem 0"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>✅</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:"1.8rem",color:"var(--white)",marginBottom:"0.5rem"}}>Message Sent!</div>
                <p style={{color:"rgba(255,255,255,0.55)"}}>We will get back to you within one business day.</p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                  <div className="f-grp"><label>First Name *</label><input name="fn" placeholder="First" /></div>
                  <div className="f-grp"><label>Last Name</label><input name="ln" placeholder="Last" /></div>
                </div>
                <div className="f-grp"><label>Email *</label><input name="em" type="email" placeholder="you@email.com" /></div>
                <div className="f-grp"><label>Phone</label><input name="ph" type="tel" placeholder="(603) 000-0000" /></div>
                <div className="f-grp"><label>Message *</label><textarea name="msg" placeholder="Questions, junk removal quote, general inquiry..." style={{minHeight:"120px"}} /></div>
                {err && <p style={{color:"#f87171",fontSize:"0.82rem",marginBottom:"0.75rem"}}>{err}</p>}
                <button type="submit" className="btn btn-green" style={{width:"100%"}}>Send Message</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
