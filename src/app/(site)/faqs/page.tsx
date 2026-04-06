
"use client"
import { useState } from "react"
export default function FAQs() {
  const faqs = [
    ["What areas do you service?","We currently serve Bedford, Merrimack, Amherst, Milford, and surrounding areas. We are expanding — contact us if you are in a nearby town."],
    ["When do I need to put my bins out?","We ask customers to have their trash rolled out to the end of the driveway by 8am the morning of their scheduled pickup. If you would like to skip a week, let us know by 5pm the day before."],
    ["Can I use my own trash bins?","Yes! As long as they are sturdy enough for our drivers to pick up and dump. Our drivers cannot be held liable if parts of your bins break — that is why we offer bin rentals."],
    ["How does bin rental work?","We offer high-grade bin rentals guaranteed to last 10 years. A monthly rental fee is added as a line item on top of your plan cost. You can also use your own bins as long as they are compatible."],
    ["What is garage-side pickup?","Garage-side pickup means our driver comes to your garage or the side of your home — you do not need to drag your bin to the curb. It is $10/mo standard or $5/mo for seniors 65+."],
    ["Do you offer quarterly billing?","Yes! You can pay quarterly (3 months upfront) instead of monthly — same price, just paid in one cycle."],
    ["Is there a contract required?","No! Our plans are month-to-month or pay-by-quarter with no long-term contract required. We earn your business every single pickup."],
    ["What payment methods do you accept?","We accept credit/debit cards via Stripe, Venmo, Zelle, and cash."],
    ["What can NOT be picked up?","We cannot pick up explosives, firearms, hazardous waste (chemicals, paints, gas, oil), medical waste, yard waste, or construction materials. Many of these can be scheduled separately — contact us for a quote."],
  ]
  const [open, setOpen] = useState<number|null>(null)
  return (
    <>
      <div style={{background:"var(--black)",paddingTop:"57px"}}>
        <div className="section" style={{textAlign:"center"}}>
          <div className="section-inner">
            <span className="eyebrow">Got Questions?</span>
            <h1 className="d1" style={{color:"var(--white)"}}>FAQs</h1>
          </div>
        </div>
      </div>
      <section className="section" style={{background:"var(--black)"}}>
        <div className="section-inner" style={{maxWidth:"760px"}}>
          {faqs.map(([q, a], i) => (
            <div key={i} className="faq-item" style={{borderColor:"rgba(255,255,255,0.07)"}}>
              <div className="faq-q" style={{color:"rgba(255,255,255,0.88)"}} onClick={() => setOpen(open===i?null:i)}>
                {q}<span className="faq-plus" style={{transform:open===i?"rotate(45deg)":"none"}}>+</span>
              </div>
              {open===i && <div className="faq-a" style={{display:"block"}}>{a}</div>}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
