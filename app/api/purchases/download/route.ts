import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDownloadToken } from '@/lib/download-tokens'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/purchases/download  { sku: string }
export async function POST(req: NextRequest) {
  try {
    const jwt = req.cookies.get('token')?.value
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyJWT(jwt)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const { sku } = body || {}
    if (!sku) return NextResponse.json({ error: 'Missing sku' }, { status: 400 })

    const purchase = await prisma.purchase.findFirst({ where: { userId: payload.sub, sku } })
    if (!purchase) return NextResponse.json({ error: 'Not purchased' }, { status: 404 })

    const downloadToken = createDownloadToken(payload.sub, sku)
    return NextResponse.json({ downloadToken })
  } catch (e:any) {
    console.error('[DOWNLOAD TOKEN ERROR]', e)
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 })
  }
}
