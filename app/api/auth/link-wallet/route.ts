import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyJWT(token)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { walletAddress } = await req.json()
    if (!walletAddress) return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 })

    const updated = await prisma.user.update({
      where: { id: payload.sub },
      data: { walletAddress: walletAddress.toLowerCase() },
      select: { id: true, email: true, username: true, walletAddress: true }
    })

    return NextResponse.json({ user: updated })
  } catch (e:any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Wallet already linked to another user' }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
