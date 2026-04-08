import type { NextConfig } from "next";

const securityHeaders = [
  // Prevents browsers from MIME-sniffing a response away from the declared content-type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Stops the page being loaded in an iframe — prevents clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Controls how much referrer info is included with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disables browser features that aren't needed on this site
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy — restricts which sources the browser will load resources from.
  // 'unsafe-inline' is required for Next.js inline styles/scripts.
  // fonts.googleapis.com and fonts.gstatic.com for Google Fonts.
  // js.stripe.com for Stripe checkout and setup intent redirects.
  // resend.com is server-side only so not needed here.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://kmvwwxlwzacxvtlqugws.supabase.co https://api.resend.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
