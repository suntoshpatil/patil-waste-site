/* eslint-disable */
import { NextResponse } from 'next/server'

const correct = () => process.env.ADMIN_PASSWORD || 'PatilWaste2024!'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    if (password !== correct()) return NextResponse.json({ ok: false }, { status: 401 })
    const token = Buffer.from(`admin:${Date.now()}:${correct()}`).toString('base64')
    return NextResponse.json({ ok: true, token })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    const decoded = Buffer.from(auth, 'base64').toString()
    const valid = decoded.startsWith('admin:') && decoded.endsWith(`:${correct()}`)
    return NextResponse.json({ ok: valid })
  } catch { return NextResponse.json({ ok: false }, { status: 401 }) }
}
