import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDownloadToken } from '@/lib/download-tokens'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function json(msg: any, status = 200) { return NextResponse.json(msg, { status }) }

// Simple health/debug
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  if (url.searchParams.get('debug') === '1') {
    return json({ ok: true, methods: ['GET','POST'], now: Date.now() })
  }
  const sku = url.searchParams.get('sku')
  if (!sku) return json({ purchased: false })
  const token = req.cookies.get('token')?.value
  if (!token) return json({ purchased: false })
  const payload = await verifyJWT(token)
  if (!payload) return json({ purchased: false })
  const purchase = await prisma.purchase.findFirst({ where: { userId: payload.sub, sku } })
  return json({ purchased: !!purchase })
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return json({ error: 'Unauthorized' }, 401)
    const payload = await verifyJWT(token)
    if (!payload) return json({ error: 'Unauthorized' }, 401)

    let body: any
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { product, sku, priceWei, txHash } = body || {}
    if (!product || !sku) return json({ error: 'Missing fields' }, 400)

    const existing = await prisma.purchase.findFirst({ where: { userId: payload.sub, sku } })
    if (existing) return json({ error: 'Already purchased' }, 409)

    const purchase = await prisma.purchase.create({ data: { product, sku, priceWei: priceWei || '0', txHash, userId: payload.sub } })
    const downloadToken = createDownloadToken(payload.sub, sku)
    return json({ purchase, downloadToken })
  } catch (e:any) {
    console.error('[PURCHASES POST ERROR]', e)
    return json({ error: 'Server error', detail: e?.message }, 500)
  }
}
