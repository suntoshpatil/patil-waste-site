'use client'
import { useState, useEffect } from 'react'

const REVIEWS = [
  {
    name: 'Arti Kanwal',
    text: 'This is the best waste removal service I\'ve ever had! They are very professional, prompt and offer great pricing for their services. So glad they service the Milford area! Definitely a 5 Star rating!!',
  },
  {
    name: 'Curtis Denison',
    text: 'Patil has been great to work with. They have been great at communicating any delay pick ups and are reasonably priced. Happy to recommend!',
  },
  {
    name: 'Nick Deres',
    text: 'We\'ve been very happy with their services to date, and they\'ve been responsive to inquiries when needed. Recommended!',
  },
  {
    name: 'Carol Malony',
    text: 'We have been using Patil Waste Removal for six months and recommend them highly to anyone in the Milford area.',
  },
  {
    name: 'Leslie Toomy',
    text: 'Patil Waste Removal was amazing! They responded quickly to my request for service and arrived promptly for the scheduled pickup.',
  },
  {
    name: 'Gail Bannon',
    text: 'Patil Waste Removal has been super professional and very dependable. Excellent customer service in answering all our questions.',
  },
]

export default function ReviewsCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % REVIEWS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const review = REVIEWS[current]

  return (
    <section style={{ background: 'var(--cream)', padding: '5rem 2.5rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
        <span className="eyebrow">What Customers Say</span>
        <h2 className="d2" style={{ marginBottom: '3rem' }}>
          Real Reviews from Real Neighbors
        </h2>

        {/* Card */}
        <div key={current} style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '2.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'fadeIn 0.4s ease' }}>
          {/* Stars */}
          <div style={{ color: '#f59e0b', fontSize: '1.2rem', marginBottom: '1.25rem', letterSpacing: '0.1em' }}>
            ★★★★★
          </div>
          <p style={{ fontSize: '1.05rem', color: '#333', lineHeight: 1.75, marginBottom: '1.5rem', fontStyle: 'italic' }}>
            &ldquo;{review.text}&rdquo;
          </p>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111', letterSpacing: '0.04em' }}>
            — {review.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.25rem' }}>
            Google Review
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Review ${i + 1}`}
              style={{ width: '8px', height: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === current ? 'var(--green)' : '#ccc', padding: 0, transition: 'background 0.2s' }}
            />
          ))}
        </div>

        {/* Prev / Next */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setCurrent(i => (i - 1 + REVIEWS.length) % REVIEWS.length)}
            style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.9rem', color: '#555', fontFamily: 'inherit' }}
          >
            ‹ Prev
          </button>
          <button
            onClick={() => setCurrent(i => (i + 1) % REVIEWS.length)}
            style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.9rem', color: '#555', fontFamily: 'inherit' }}
          >
            Next ›
          </button>
        </div>

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      </div>
    </section>
  )
}
