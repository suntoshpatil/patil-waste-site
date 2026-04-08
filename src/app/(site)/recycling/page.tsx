export const metadata = {
  title: 'Recycling Pickup — What We Accept',
  description: 'Learn what we accept for recycling pickup in Bedford, Merrimack, Amherst & Milford NH. Cardboard, plastics, metals, paper and more. Add recycling to your plan for $52/mo.',
  alternates: { canonical: 'https://patilwasteremoval.com/recycling' },
}
import Link from 'next/link'

export default function Recycling() {
  const accepted = [
    { item: 'Cardboard & paperboard', tip: 'Break down boxes flat' },
    { item: 'Newspapers & magazines', tip: 'No need to remove staples' },
    { item: 'Office paper & junk mail', tip: 'Shredded paper is OK' },
    { item: 'Plastic bottles & jugs (1–7)', tip: 'Rinse before placing' },
    { item: 'Glass bottles & jars', tip: 'Place in a box next to your bin or on top — must be easy for driver to separate' },
    { item: 'Aluminum & steel cans', tip: 'Rinse, no need to crush' },
    { item: 'Cartons (milk, juice)', tip: 'Empty and rinse' },
  ]
  const notAccepted = [
    'Plastic bags loose in the bin — must be separated (see note above)',
    'Styrofoam of any kind',
    'Food waste or soiled containers',
    'Electronics or batteries',
    'Hazardous materials',
    'Medical waste',
    'Clothing or textiles',
  ]

  return (
    <>
      {/* Hero */}
      <div style={{ background: 'var(--black)', paddingTop: '57px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(46,125,50,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="section" style={{ textAlign: 'center', position: 'relative' }}>
          <div className="section-inner">
            <span className="eyebrow">Going Green</span>
            <h1 className="d1" style={{ color: 'var(--white)' }}>Recycling</h1>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '560px', margin: '0 auto' }}>
              We make recycling simple. Just toss it in — no sorting needed.
            </p>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <div style={{ background: '#1a1200', borderBottom: '1px solid rgba(255,179,0,0.2)', padding: '1rem 2rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#fbbf24', maxWidth: '700px', marginInline: 'auto' }}>
          ⚠️ <strong>Do NOT bag your recycling.</strong> Loose materials only. <strong>Plastic bags</strong> will jam recycling machines — keep them separated from your bin or place them loose in your trash. <strong>Glass</strong> is accepted but must be easy for the driver to separate: place it in a box next to your bin, or set it on top of the bin so it can be quickly sorted.
        </p>
      </div>

      {/* Accepted / Not Accepted */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="section-inner">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Accepted */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(46,125,50,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>♻️</div>
                <span className="eyebrow" style={{ margin: 0 }}>Accepted Items</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {accepted.map(({ item, tip }) => (
                  <div key={item} style={{ background: 'rgba(46,125,50,0.04)', border: '1px solid rgba(46,125,50,0.15)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111' }}>{item}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '0.1rem' }}>{tip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Not accepted */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(220,38,38,0.08)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🚫</div>
                <span className="eyebrow" style={{ margin: 0, color: 'var(--red)' }}>Not Accepted</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {notAccepted.map(item => (
                  <div key={item} style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.1)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: '0.9rem', color: '#333' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plastic bag note */}
          <div style={{ background: 'rgba(255,179,0,0.05)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '3rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '1px' }}>🛍️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e', marginBottom: '0.3rem' }}>Plastic Bags — We Can Recycle Them, Just Keep Them Separate</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 }}>
                Plastic bags jam recycling machines when mixed with loose recyclables, so they <strong>cannot go loose in your bin</strong>. However, we will accept them if they are <strong>bundled together in a separate bag or tied bundle</strong> placed next to your bin on pickup day — or you can simply toss them in your regular trash.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: 'var(--black)', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 80% at 50% 100%, rgba(46,125,50,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div className="d3" style={{ color: 'var(--white)', marginBottom: '0.75rem' }}>Add Recycling to Your Plan</div>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.75rem' }}>
                Upgrade to Trash & Recycling for just <strong style={{ color: '#fff' }}>$52/mo</strong> — same pickup day, same driver.
              </p>
              <Link href="/signup" className="btn btn-green">Sign Up for Recycling →</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
