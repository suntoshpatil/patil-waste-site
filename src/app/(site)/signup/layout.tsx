import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up for Trash Pickup',
  description: 'Sign up for weekly curbside trash and recycling pickup in Bedford, Merrimack, Amherst & Milford NH. Starting at $42/mo. No contracts, no hidden fees.',
  alternates: { canonical: 'https://patilwasteremoval.com/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
