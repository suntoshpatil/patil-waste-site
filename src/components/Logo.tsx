import Image from 'next/image'

export default function Logo({ height = 44 }: { height?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Patil Waste Removal LLC"
      height={height}
      width={height * 2.15}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}
