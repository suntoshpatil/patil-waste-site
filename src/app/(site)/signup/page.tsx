/* eslint-disable */
"use client"
import { useState, useEffect } from "react"

const SUPABASE_URL = 'https://kmvwwxlwzacxvtlqugws.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttdnd3eGx3emFjeHZ0bHF1Z3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxOTMsImV4cCI6MjA5MDkxOTE5M30.TELT8SLAI2CJOQ2BJQq_3FyKzCkOKoT1lxmJIhrqMhQ'

export default function Signup() {
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState("")
  const [loading, setLoading] = useState(false)
  const [rentTrash, setRentTrash]         = useState(false)
  const [rentRecycling, setRentRecycling] = useState(false)
  const [prices, setPrices] = useState({ standard: 42, recycling: 52 })

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/services?select=name,base_price_monthly&type=eq.recurring&is_active=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json()).then((data: any[]) => {
      const standard  = data.find(s => s.name === 'Curbside Trash')?.base_price_monthly ?? 42
      const recycling = data.find(s => s.name === 'Trash & Recycling')?.base_price_monthly ?? 52
      setPrices({ standard, recycling })
    }).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    const f = e.currentTarget
    const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.value?.trim() || ""
    const checked = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.checked || false

    const cap = (s: string) => s.trim() ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() : ''
    const first_name        = cap(g("fn"))
    const last_name         = cap(g("ln"))
    const email             = g("em").toLowerCase()
    const phone             = g("ph")
    const service_address   = g("addr")
    const town              = g("town")
    const plan              = g("plan")
    const billing_cycle     = g("billing_cycle")
    const bin_situation     = g("bin_situation")
    const payment_method    = g("payment_method")
    const start_date        = g("startDate") || null
    const gate_notes        = g("gate_notes") || null
    const garage_side_pickup = checked("addon_garageside")
    const referral          = g("referral")
    const extra_notes       = g("notes")
    const rentTrashVal      = (f.elements.namedItem("rent_trash") as HTMLInputElement)?.checked || false
    const rentRecyclingVal  = (f.elements.namedItem("rent_recycling") as HTMLInputElement)?.checked || false
    const binRentalNote     = rentTrashVal && rentRecyclingVal ? "Bin rentals: Trash + Recycling"
                            : rentTrashVal ? "Bin rental: Trash bin"
                            : rentRecyclingVal ? "Bin rental: Recycling bin"
                            : ""
    const startWeekLabel    = start_date ? `Requested start week: ${new Date(start_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(new Date(start_date+'T12:00:00').getTime()+6*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : ""
    const notes             = [extra_notes, referral ? `Referred by: ${referral}` : "", `Plan: ${plan} · Billing: ${billing_cycle}`, binRentalNote, startWeekLabel].filter(Boolean).join(" | ")

    if (!first_name || !email || !service_address || !town || !plan) {
      setErr("Please fill in all required fields."); return
    }

    setErr(""); setLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          first_name, last_name, email, phone,
          service_address, town,
          status: "pending",
          payment_method, bin_situation,
          garage_side_pickup, gate_notes, notes, start_date,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || `Error ${res.status}`)
      }
      // Send signup confirmation email (fire and forget)
    fetch('/api/emails/signup', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, planName: plan || 'Service Plan', startDate: start_date || '' })
    }).catch(()=>{})
    setDone(true)
    } catch (e: any) {
      setErr(e.message || "Something went wrong. Please try again or call us directly.")
    }
    setLoading(false)
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

              <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp"><label>First Name *</label><input name="fn" placeholder="First" {...inp} /></div>
                <div className="f-grp"><label>Last Name *</label><input name="ln" placeholder="Last" {...inp} /></div>
              </div>

              <div className="f-grp"><label>Email *</label><input name="em" type="email" placeholder="you@email.com" {...inp} /></div>
              <div className="f-grp"><label>Phone</label><input name="ph" type="tel" placeholder="(603) 000-0000" {...inp} /></div>

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

              <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp">
                  <label>Service Type *</label>
                  <select name="plan" {...sel}>
                    <option value="">Select...</option>
                    <option value="standard">Trash Only — ${prices.standard}/mo</option>
                    <option value="recycling">Trash &amp; Recycling — ${prices.recycling}/mo</option>
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
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.75rem" }}>
                Need junk removal or a yard cleanup? <a href="/junk-removal" style={{ color: "#4caf50" }}>Request a quote here instead →</a>
              </p>

              <div className="f-grp">
                <label>Requested Start Week</label>
                <select name="startDate" {...sel}>
                  <option value="">Select a week...</option>
                  {(() => {
                    const opts = []
                    const d = new Date()
                    // Start from next Monday
                    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7))
                    for (let i = 0; i < 8; i++) {
                      const start = new Date(d)
                      const end = new Date(d)
                      end.setDate(end.getDate() + 6)
                      const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      const val = start.toISOString().split('T')[0]
                      opts.push(<option key={val} value={val}>Week of {fmt(start)} – {fmt(end)}</option>)
                      d.setDate(d.getDate() + 7)
                    }
                    return opts
                  })()}
                </select>
              </div>

              <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="f-grp">
                  <label>Bin Situation</label>
                  <select name="bin_situation" {...sel}>
                    <option value="own">I have my own bins</option>
                    <option value="rental">I need to rent bin(s)</option>
                    <option value="unsure">Not sure yet</option>
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

              {/* Bin rental selection */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1.1rem", marginBottom: "0.85rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem" }}>Bin Rentals</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.25rem" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "0.6rem 0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <input type="checkbox" name="rent_trash" checked={rentTrash} onChange={e => setRentTrash(e.target.checked)} style={{ accentColor: "var(--green-light)", width: "15px", height: "15px" }} />
                      <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.8)" }}>🗑️ Trash Bin Rental</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>$7.99/mo · $25 deposit</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "0.6rem 0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <input type="checkbox" name="rent_recycling" checked={rentRecycling} onChange={e => setRentRecycling(e.target.checked)} style={{ accentColor: "var(--green-light)", width: "15px", height: "15px" }} />
                      <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.8)" }}>♻️ Recycling Bin Rental</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>$3.99/mo · no deposit</span>
                  </label>
                </div>
                {rentTrash && (
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,179,0,0.8)", marginTop: "0.4rem", marginBottom: 0 }}>⚠️ A $25 refundable deposit is required for the trash bin — collected before first pickup.</p>
                )}
              </div>

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

              <div className="f-grp"><label>Referral — Who referred you?</label><input name="referral" placeholder="Enter their name" {...inp} /></div>
              <div className="f-grp"><label>Gate Code / Property Notes</label><textarea name="gate_notes" placeholder="e.g. gate code #1234, dogs in yard..." {...inp} /></div>
              <div className="f-grp"><label>Additional Notes</label><textarea name="notes" placeholder="Questions about billing, bin rental, etc..." {...inp} /></div>

              {err && <p style={{ color: "#f87171", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{err}</p>}

              <button type="submit" className="btn btn-green" disabled={loading}
                style={{ width: "100%", fontSize: "0.9rem", padding: "1rem", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Submitting…" : "Submit Request"}
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
