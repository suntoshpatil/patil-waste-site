import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://patilwasteremoval.com'
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/recycling`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/junk-removal`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/promotions`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/faqs`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ]
}
