import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ user: null })
  const payload = await verifyJWT(token)
  if (!payload) return NextResponse.json({ user: null })
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, walletAddress: user.walletAddress } })
}
