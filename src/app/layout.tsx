import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = 'https://patilwasteremoval.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Patil Waste Removal | Trash & Recycling Pickup — Bedford, Merrimack, Amherst & Milford NH',
    template: '%s | Patil Waste Removal',
  },
  description: 'Reliable weekly curbside trash and recycling pickup in Bedford, Merrimack, Amherst, and Milford NH. No contracts, no surprise fees. Starting at $42/mo. Sign up online.',
  keywords: ['trash pickup Bedford NH', 'garbage pickup Merrimack NH', 'recycling pickup Amherst NH', 'curbside waste removal NH', 'weekly trash service Milford NH', 'Patil Waste Removal'],
  authors: [{ name: 'Patil Waste Removal' }],
  openGraph: {
    type: 'website',
    siteName: 'Patil Waste Removal',
    title: 'Patil Waste Removal | Trash & Recycling Pickup — Bedford NH',
    description: 'Reliable weekly curbside trash and recycling pickup in Bedford, Merrimack, Amherst, and Milford NH. No contracts, no surprise fees. Starting at $42/mo.',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Patil Waste Removal — Trash & Recycling Pickup NH' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Patil Waste Removal | Trash & Recycling Pickup NH',
    description: 'Weekly curbside trash and recycling pickup in Bedford, Merrimack, Amherst & Milford NH. Starting at $42/mo.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
}

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Patil Waste Removal',
  description: 'Reliable weekly curbside trash and recycling pickup in Bedford, Merrimack, Amherst, and Milford NH.',
  url: SITE_URL,
  telephone: '+18024169484',
  email: 'patilwasteremoval@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '80 Palomino Ln',
    addressLocality: 'Bedford',
    addressRegion: 'NH',
    postalCode: '03110',
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 42.9434, longitude: -71.5153 },
  areaServed: [
    { '@type': 'City', name: 'Bedford', containedInPlace: { '@type': 'State', name: 'New Hampshire' } },
    { '@type': 'City', name: 'Merrimack', containedInPlace: { '@type': 'State', name: 'New Hampshire' } },
    { '@type': 'City', name: 'Amherst', containedInPlace: { '@type': 'State', name: 'New Hampshire' } },
    { '@type': 'City', name: 'Milford', containedInPlace: { '@type': 'State', name: 'New Hampshire' } },
  ],
  priceRange: '$$',
  openingHours: 'Mo-Fr 07:00-17:00',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Waste Removal Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Weekly Curbside Trash Pickup', description: 'Weekly trash pickup starting at $42/mo' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Recycling Pickup', description: 'Weekly trash and recycling pickup at $52/mo' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Junk Removal', description: 'Junk and bulk item removal — request a free quote' } },
    ],
  },
  sameAs: [`${SITE_URL}`],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
