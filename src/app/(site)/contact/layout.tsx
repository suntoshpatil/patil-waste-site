import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Patil Waste Removal. Call or text (802) 416-9484 or send a message. Serving Bedford, Merrimack, Amherst & Milford NH.',
  alternates: { canonical: 'https://patilwasteremoval.com/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
