'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

const links = [
  { href: '/',              label: 'Home' },
  { href: '/services',      label: 'Curbside Services' },
  { href: '/junk-removal',  label: 'Junk Removal' },
  { href: '/recycling',     label: 'Recycling' },
  { href: '/faqs',          label: 'FAQs' },
  { href: '/promotions',    label: 'Promotions' },
  { href: '/contact',       label: 'Contact' },
  { href: '/portal',        label: 'My Account' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const isPortal = path === '/portal'

  // Minimal nav on portal page — just logo + sign up
  if (isPortal) return (
    <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:500, background:'rgba(15,15,15,0.96)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 1.5rem', height:'46px' }}>
      <Link href="/" style={{ display:'flex', alignItems:'center' }}>
        <Logo height={28} />
      </Link>
      <Link href="/signup" style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', textDecoration:'none' }}>
        Not a customer? Sign Up →
      </Link>
    </nav>
  )

  return (
    <>
      <nav className="main-nav" style={{ position:'fixed', top:0, left:0, right:0, zIndex:500, background:'rgba(15,15,15,0.96)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 2.5rem' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center' }}>
          <Logo height={40} />
        </Link>

        {/* Desktop links */}
        <div style={{ display:'flex', alignItems:'center', gap:'2rem' }} className="nav-desktop">
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{ fontSize:'0.78rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: path === l.href ? '#4caf50' : 'rgba(255,255,255,0.65)', transition:'color 0.2s' }}>
              {l.label}
            </Link>
          ))}
          <Link href="/signup" className="btn btn-green" style={{ fontSize:'0.72rem', padding:'0.55rem 1.25rem' }}>Sign Up</Link>
        </div>

        {/* Hamburger */}
        <button onClick={() => setOpen(!open)} aria-label="Menu" style={{ display:'none', flexDirection:'column', gap:'5px', background:'none', border:'none', cursor:'pointer', padding:'4px', zIndex:1 }} className="hamburger">
          <span style={{ display:'block', width:'22px', height:'2px', background:'#fff', borderRadius:'2px', transition:'transform 0.2s', transform: open ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
          <span style={{ display:'block', width:'22px', height:'2px', background:'#fff', borderRadius:'2px', transition:'opacity 0.2s', opacity: open ? 0 : 1 }} />
          <span style={{ display:'block', width:'22px', height:'2px', background:'#fff', borderRadius:'2px', transition:'transform 0.2s', transform: open ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
        </button>

        <style>{`
          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .hamburger { display: flex !important; }
            .main-nav {
              padding-top: 0.55rem !important;
              padding-bottom: 0.55rem !important;
              padding-left: 1.25rem !important;
              padding-right: 1.25rem !important;
            }
          }
        `}</style>
      </nav>

      {/* Mobile menu overlay — outside <nav> so backdrop-filter doesn't affect it */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position:'fixed', top:'60px', left:0, right:0, bottom:0, background:'#0d0d0d', zIndex:490, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', gap:'1.5rem', overflowY:'auto', paddingTop:'2.5rem', paddingBottom:'2rem' }}
        >
          {[...links, { href:'/signup', label:'Sign Up' }].map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ fontSize:'1.8rem', fontFamily:'Bebas Neue, sans-serif', letterSpacing:'0.06em', color: l.href === '/signup' ? '#4caf50' : '#fff' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
