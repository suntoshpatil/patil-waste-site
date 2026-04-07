"use client"
import { useState } from "react"

export default function FAQs() {
  const categories = [
    {
      label: 'Service & Pickup',
      faqs: [
        ["What areas do you service?", "We currently serve Bedford, Merrimack, Amherst, Milford, and surrounding areas. We are expanding — contact us if you are in a nearby town."],
        ["When do I need to put my bins out?", "Have your trash at the end of the driveway by 8am on your scheduled pickup day. If you need to skip a week, let us know by 5pm the day before."],
        ["What is garage-side pickup?", "Our driver comes to your garage or the side of your home — you don't need to drag your bin to the curb. It's $10/mo standard or $5/mo for seniors 65+."],
        ["What can NOT be picked up?", "We cannot pick up explosives, firearms, hazardous waste (chemicals, paints, gas, oil), medical waste, yard waste, or construction materials. Visit our Junk Removal page to request a quote for larger items."],
      ]
    },
    {
      label: 'Bins & Equipment',
      faqs: [
        ["Can I use my own trash bins?", "Yes! As long as they are sturdy enough for our drivers to pick up and dump. Our drivers cannot be held liable if parts of your bins break — that is why we offer bin rentals."],
        ["How does bin rental work?", "We offer high-grade bin rentals guaranteed to last 10 years. A $7.99/mo rental fee for trash bins and $3.99/mo for recycling bins is added to your plan. A $25 refundable deposit is required for trash bins."],
      ]
    },
    {
      label: 'Billing & Payments',
      faqs: [
        ["Do you offer quarterly billing?", "Yes! You can pay quarterly (3 months upfront) instead of monthly — same price, just paid in one cycle."],
        ["Is there a contract required?", "No contracts. Our plans are month-to-month or pay-by-quarter. We earn your business every single pickup."],
        ["What payment methods do you accept?", "We accept credit/debit cards via Stripe, Venmo, Zelle, and cash. You can also enable auto-pay through your customer portal to be billed automatically each month."],
        ["When is my bill due?", "Invoices are sent on the 25th of each month and due on the 1st. Your first invoice is prorated based on your start date and due on receipt."],
      ]
    },
  ]

  const [open, setOpen] = useState<string | null>(null)

  return (
    <>
      <div style={{ background: 'var(--black)', paddingTop: '57px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 60% at 50% 100%, rgba(46,125,50,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="section" style={{ textAlign: 'center', position: 'relative' }}>
          <div className="section-inner">
            <span className="eyebrow">Got Questions?</span>
            <h1 className="d1" style={{ color: 'var(--white)' }}>FAQs</h1>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px', margin: '0 auto' }}>Everything you need to know about our service.</p>
          </div>
        </div>
      </div>

      <section className="section" style={{ background: 'var(--black)' }}>
        <div className="section-inner" style={{ maxWidth: '780px' }}>
          {categories.map(cat => (
            <div key={cat.label} style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--green-light)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(46,125,50,0.2)' }}>
                {cat.label}
              </div>
              {cat.faqs.map(([q, a]) => {
                const key = q as string
                const isOpen = open === key
                return (
                  <div key={key} className="faq-item" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="faq-q" style={{ color: isOpen ? '#fff' : 'rgba(255,255,255,0.85)' }} onClick={() => setOpen(isOpen ? null : key)}>
                      {q}
                      <span className="faq-plus" style={{ transform: isOpen ? 'rotate(45deg)' : 'none', color: isOpen ? 'var(--green-light)' : 'rgba(255,255,255,0.4)' }}>+</span>
                    </div>
                    {isOpen && <div className="faq-a" style={{ display: 'block', color: 'rgba(255,255,255,0.65)' }}>{a}</div>}
                  </div>
                )
              })}
            </div>
          ))}

          <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '10px', padding: '2rem', textAlign: 'center', marginTop: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>Still have questions?</div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>We actually pick up the phone. Call or text us any time.</p>
            <a href="tel:8024169484" className="btn btn-green" style={{ display: 'inline-block' }}>(802) 416-9484</a>
          </div>
        </div>
      </section>
    </>
  )
}
