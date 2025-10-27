import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/purchase?sku=...
export async function GET(req: NextRequest) {
  const sku = new URL(req.url).searchParams.get('sku')
  if (!sku) return NextResponse.json({ purchased: false })
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ purchased: false })
  const payload = await verifyJWT(token)
  if (!payload) return NextResponse.json({ purchased: false })
  const purchase = await prisma.purchase.findFirst({ where: { userId: payload.sub, sku } })
  return NextResponse.json({ purchased: !!purchase })
}
