import Link from "next/link"
export const metadata = { title: "Promotions | Patil Waste Removal" }

export default function Promotions() {
  const steps = [
    { n: '1', title: 'You refer a neighbor', desc: 'Tell a friend, neighbor, or coworker about Patil Waste Removal.' },
    { n: '2', title: 'They sign up', desc: 'They mention your name when signing up for any service plan.' },
    { n: '3', title: 'Both of you win', desc: 'You each receive one free month of service — automatically applied.' },
  ]

  return (
    <>
      <div style={{ background: 'var(--black)', paddingTop: '57px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(76,175,80,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="section" style={{ textAlign: 'center', position: 'relative' }}>
          <div className="section-inner">
            <span className="eyebrow">Current Promotion</span>
            <h1 className="d1" style={{ color: 'var(--white)' }}>Refer a Friend,<br /><span style={{ color: 'var(--accent)' }}>Both Get a Free Month</span></h1>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto' }}>
              The best compliment you can give us is telling your neighbors. We make it worth your while.
            </p>
          </div>
        </div>
      </div>

      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="section-inner" style={{ maxWidth: '820px' }}>

          {/* Free month cards */}
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3.5rem' }}>
            {[['You Get', '🎁', 'One free month credited to your next invoice.'], ['Your Friend Gets', '🎉', 'One free month on their very first bill.']].map(([label, emoji, desc]) => (
              <div key={label as string} style={{ background: 'var(--black)', borderRadius: '12px', padding: '2.5rem 2rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{emoji}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '0.5rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-light)', marginBottom: '0.75rem' }}>1 FREE MONTH</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 className="d2" style={{ textAlign: 'center', marginBottom: '2rem' }}>How It Works</h2>
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
              {steps.map(({ n, title, desc }) => (
                <div key={n} style={{ background: 'var(--cream)', borderRadius: '10px', padding: '2rem 1.5rem', border: '1px solid var(--border-light)', position: 'relative' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--green)', lineHeight: 1, marginBottom: '1rem', opacity: 0.25, position: 'absolute', top: '1rem', right: '1.25rem' }}>{n}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--gray)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: 'linear-gradient(135deg, #1a2e1a 0%, #0f1f0f 100%)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <div className="d3" style={{ color: '#fff', marginBottom: '0.75rem' }}>Ready to Start Referring?</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.75rem', maxWidth: '440px', margin: '0 auto 1.75rem' }}>
              Sign up today and start sending referrals. Just have your friends mention your name — we handle the rest.
            </p>
            <Link href="/signup" className="btn btn-accent">Sign Up &amp; Start Referring →</Link>
          </div>

        </div>
      </section>
    </>
  )
}
