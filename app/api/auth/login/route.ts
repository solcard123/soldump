import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/hash'
import { createJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { emailOrUsername, password } = await req.json()
    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const token = await createJWT({ sub: user.id, email: user.email, username: user.username })
  const res = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, walletAddress: user.walletAddress } })
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
