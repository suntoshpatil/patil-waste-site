// In-memory rate limiter for portal PIN attempts.
// Tracks failed attempts per email. In serverless this resets per cold-start,
// but still prevents rapid brute-force within a single warm instance.
// Attempts are keyed by lowercase email to prevent bypass via casing.

interface AttemptRecord {
  count: number
  lockedUntil: number  // epoch ms, 0 if not locked
}

const attempts = new Map<string, AttemptRecord>()

const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000  // 15 minutes

export function checkRateLimit(email: string): { allowed: boolean; remainingMs?: number; remaining?: number } {
  const key = email.toLowerCase().trim()
  const rec = attempts.get(key)

  if (rec && rec.lockedUntil > Date.now()) {
    return { allowed: false, remainingMs: rec.lockedUntil - Date.now() }
  }

  const count = rec?.lockedUntil && rec.lockedUntil <= Date.now() ? 0 : (rec?.count ?? 0)
  const remaining = MAX_ATTEMPTS - count
  return { allowed: true, remaining }
}

export function recordFailedAttempt(email: string): { locked: boolean; remaining: number } {
  const key = email.toLowerCase().trim()
  const rec = attempts.get(key)

  // Reset if previous lock has expired
  const count = rec?.lockedUntil && rec.lockedUntil <= Date.now() ? 1 : (rec?.count ?? 0) + 1

  if (count >= MAX_ATTEMPTS) {
    attempts.set(key, { count, lockedUntil: Date.now() + LOCK_MS })
    return { locked: true, remaining: 0 }
  }

  attempts.set(key, { count, lockedUntil: 0 })
  return { locked: false, remaining: MAX_ATTEMPTS - count }
}

export function clearAttempts(email: string) {
  attempts.delete(email.toLowerCase().trim())
}
