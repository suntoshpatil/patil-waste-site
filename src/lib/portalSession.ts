import { createHmac, timingSafeEqual } from 'crypto'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const SECRET = process.env.SESSION_SECRET || 'dev-fallback-secret-change-in-prod'
const COOKIE_NAME = 'portal_session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

function sign(customerId: string, issuedAt: number): string {
  return createHmac('sha256', SECRET)
    .update(`${customerId}.${issuedAt}`)
    .digest('hex')
}

export function makeSessionToken(customerId: string): string {
  const issuedAt = Date.now()
  const hmac = sign(customerId, issuedAt)
  return `${customerId}.${issuedAt}.${hmac}`
}

export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [customerId, issuedAtStr, hmac] = parts
    if (!customerId || !issuedAtStr || !hmac) return null

    const issuedAt = parseInt(issuedAtStr, 10)
    if (isNaN(issuedAt)) return null

    // Check TTL
    if (Date.now() - issuedAt > TTL_MS) return null

    // Timing-safe HMAC comparison
    const expected = sign(customerId, issuedAt)
    const a = Buffer.from(hmac, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null

    return customerId
  } catch {
    return null
  }
}

export function getSessionCustId(cookies: ReadonlyRequestCookies): string | null {
  const token = cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export function sessionCookieHeader(token: string): string {
  const maxAge = Math.floor(TTL_MS / 1000)
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
