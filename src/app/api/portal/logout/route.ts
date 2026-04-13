import { NextResponse } from 'next/server'
import { clearCookieHeader } from '@/lib/portalSession'

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearCookieHeader() } }
  )
}
