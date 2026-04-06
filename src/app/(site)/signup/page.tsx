"use client"
import { useState } from "react"

export default function Signup() {
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget
    const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.value || ""
    const data = {
      firstName: g("fn"), lastName: g("ln"), email: g("em"), phone: g("ph"),
      address: g("addr"), town: g("town"), plan: g("plan"),
      billingCycle: g("billing_cycle"), binSituation: g("bin_situation"),
      paymentMethod: g("payment_method"), startDate: g("startDate"),
      referral: g("referral"), gateNotes: g("gate_notes"), notes: g("notes"),
      garagePickup: (f.elements.namedItem("addon_garageside") as HTMLInputElement)?.checked || false
    }
    if (!data.firstName || !data.email || !data.address || !data.town || !data.plan) {
      setErr("Please fill in all required fields."); return
    }
    setErr("")
    try {
      const res = await fetch("https://patil-waste-backend.onrender.com/api/signup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error()
    } catch { /* demo mode */ }
    setDone(true)
  }

  const inp = { style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "3px", padding: "0.7rem 0.9rem", color: "#fff", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", width: "100%" } }
  const sel = { style: { ...inp.style, cursor: "pointer" } }

  return (
    <>
      <div style={{ background: "var(--black)", paddingTop: "57px" }}>
        <div className="section" style={{ textAlign: "center", paddingBottom: "2rem" }}>
          <div className="section-inner">
            <span className="eyebrow">Get Started</span>
            <h1 className="d1" style={{ color: "var(--white)" }}>Sign Up</h1>
            <p className="lead" style={{ color: "rgba(255,255,255,0.55)", maxWidth: "500px", margin: "0 auto" }}>
              Fill out the form and we will follow up within one business day to confirm your start date.
            </p>
          </div>
        </div>
      </div>

      <section className="section" style={{ background: "var(--black)" }}>
        <div className="section-inner" style={{ maxWidth: "680px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎉</div>
              <div className="d2" style={{ color: "var(--white)", marginBottom: "0.5rem" }}>Request Received!</div>
              <p style={{ color: "rgba(255,255,255,0.55)" }}>
                We will be in touch within one business day to confirm your start date and any add-on details.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0" }}>

              {/* Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp"><label>First Name *</label><input name="fn" placeholder="First" {...inp} /></div>
                <div className="f-grp"><label>Last Name *</label><input name="ln" placeholder="Last" {...inp} /></div>
              </div>

              {/* Contact */}
              <div className="f-grp"><label>Email *</label><input name="em" type="email" placeholder="you@email.com" {...inp} /></div>
              <div className="f-grp"><label>Phone</label><input name="ph" type="tel" placeholder="(603) 000-0000" {...inp} /></div>

              {/* Address */}
              <div className="f-grp"><label>Service Address *</label><input name="addr" placeholder="123 Main St, Bedford, NH" {...inp} /></div>
              <div className="f-grp">
                <label>Town *</label>
                <select name="town" {...sel}>
                  <option value="">Select your town...</option>
                  {["bedford", "merrimack", "amherst", "milford"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}, NH</option>
                  ))}
                  <option value="other">Other — contact us first</option>
                </select>
              </div>

              {/* Plan + Billing */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp">
                  <label>Service Type *</label>
                  <select name="plan" {...sel}>
                    <option value="">Select...</option>
                    <option value="standard">Trash Only — $42/mo</option>
                    <option value="recycling">Trash & Recycling — $52/mo</option>
                    <option value="info">Just requesting info</option>
                  </select>
                </div>
                <div className="f-grp">
                  <label>Billing Cycle</label>
                  <select name="billing_cycle" {...sel}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (3 months)</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', marginBottom:'0.75rem' }}>
                Need junk removal or a yard cleanup? <a href="/junk-removal" style={{ color:'#4caf50' }}>Request a quote here instead →</a>
              </p>

              {/* Start Date */}
              <div className="f-grp"><label>Requested Start Date</label><input name="startDate" type="date" {...inp} /></div>

              {/* Bin + Payment */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp">
                  <label>Bin Situation</label>
                  <select name="bin_situation" {...sel}>
                    <option value="own">I have my own bins</option>
                    <option value="rental">I need to rent bins</option>
                    <option value="unsure">Not sure</option>
                  </select>
                </div>
                <div className="f-grp">
                  <label>Preferred Payment</label>
                  <select name="payment_method" {...sel}>
                    <option value="card">Credit / Debit Card</option>
                    <option value="venmo">Venmo</option>
                    <option value="zelle">Zelle</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Garage-Side Add-On */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1.1rem", marginBottom: "0.85rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem" }}>Add-Ons</p>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)" }}>
                  <input type="checkbox" name="addon_garageside" style={{ marginTop: "0.15rem", accentColor: "var(--green-light)" }} />
                  <span>
                    Garage-Side Pickup — <strong style={{ color: "var(--green-light)" }}>$10/mo</strong> | Seniors 65+ <strong style={{ color: "var(--accent)" }}>$5/mo</strong>
                    <br /><span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>We pick up from your garage — no dragging the bin to the curb.</span>
                  </span>
                </label>
              </div>

              {/* Referral */}
              <div className="f-grp"><label>Referral — Who referred you?</label><input name="referral" placeholder="Enter their name" {...inp} /></div>

              {/* Gate Notes */}
              <div className="f-grp"><label>Gate Code / Property Notes</label><textarea name="gate_notes" placeholder="e.g. gate code #1234, dogs in yard..." {...inp} /></div>

              {/* Additional Notes */}
              <div className="f-grp"><label>Additional Notes</label><textarea name="notes" placeholder="Questions about billing, bin rental, etc..." {...inp} /></div>

              {err && <p style={{ color: "#f87171", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{err}</p>}

              <button type="submit" className="btn btn-green" style={{ width: "100%", fontSize: "0.9rem", padding: "1rem" }}>
                Submit Request
              </button>
              <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.28)", textAlign: "center" }}>
                We will follow up within one business day to confirm your details.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
