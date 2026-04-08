import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Junk Removal & Yard Cleanup | Southern NH & Northern MA',
  description: 'Junk removal and yard cleanup serving Bedford, Merrimack, Amherst, Milford, Manchester, Nashua, Londonderry, Windham, Hudson, Pelham, Litchfield, Derry NH and Lowell, Chelmsford, Tyngsborough, Dracut MA. Free quote, fast scheduling, no contracts.',
  keywords: 'junk removal Bedford NH, junk removal Merrimack NH, junk removal Amherst NH, junk removal Milford NH, junk removal Manchester NH, junk removal Nashua NH, junk removal Londonderry NH, junk removal Windham NH, junk removal Hudson NH, junk removal Pelham NH, junk removal Derry NH, junk removal Lowell MA, junk removal Chelmsford MA, junk removal Tyngsborough MA, junk removal Dracut MA, yard cleanup southern NH, bulk item removal NH, furniture removal NH',
  alternates: { canonical: 'https://patilwasteremoval.com/junk-removal' },
}

export default function JunkRemovalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
