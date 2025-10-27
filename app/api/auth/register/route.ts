import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'
import { createJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json()
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({ data: { email, username, password: hashed } })

    const token = await createJWT({ sub: user.id, email: user.email, username: user.username })

  const res = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, walletAddress: user.walletAddress } })
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
