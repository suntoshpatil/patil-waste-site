import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Junk Removal — Request a Free Quote',
  description: 'Need to get rid of large items? Patil Waste Removal offers junk and bulk item removal in Bedford, Merrimack, Amherst & Milford NH. Request a free quote online.',
  alternates: { canonical: 'https://patilwasteremoval.com/junk-removal' },
}

export default function JunkRemovalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
