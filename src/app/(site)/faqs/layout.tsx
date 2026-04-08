import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to common questions about trash pickup, recycling, billing, bin rentals, and service areas for Patil Waste Removal in Bedford, Merrimack, Amherst & Milford NH.',
  alternates: { canonical: 'https://patilwasteremoval.com/faqs' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What areas do you service?', acceptedAnswer: { '@type': 'Answer', text: 'We currently serve Bedford, Merrimack, Amherst, Milford, and surrounding areas in New Hampshire.' } },
    { '@type': 'Question', name: 'When do I need to put my bins out?', acceptedAnswer: { '@type': 'Answer', text: 'Have your trash at the end of the driveway by 8am on your scheduled pickup day. If you need to skip a week, let us know by 5pm the day before.' } },
    { '@type': 'Question', name: 'What is garage-side pickup?', acceptedAnswer: { '@type': 'Answer', text: "Our driver comes to your garage or the side of your home — you don't need to drag your bin to the curb. It's $14.99/mo standard or $5/mo for seniors 65+." } },
    { '@type': 'Question', name: 'Can I use my own trash bins?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! As long as they are sturdy enough for our drivers to pick up and dump. We also offer bin rentals at $7.99/mo for trash and $3.99/mo for recycling.' } },
    { '@type': 'Question', name: 'Do you offer quarterly billing?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! You can pay quarterly (3 months upfront) instead of monthly — same price, just paid in one cycle.' } },
    { '@type': 'Question', name: 'Is there a contract required?', acceptedAnswer: { '@type': 'Answer', text: 'No contracts. Our plans are month-to-month or pay-by-quarter. We earn your business every single pickup.' } },
    { '@type': 'Question', name: 'What payment methods do you accept?', acceptedAnswer: { '@type': 'Answer', text: 'We accept credit/debit cards via Stripe, Venmo, Zelle, and cash. You can also enable auto-pay through your customer portal.' } },
    { '@type': 'Question', name: 'When is my bill due?', acceptedAnswer: { '@type': 'Answer', text: 'Invoices are sent on the 25th of each month and due on the 1st. Your first invoice is prorated based on your start date and due on receipt.' } },
  ],
}

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {children}
    </>
  )
}
