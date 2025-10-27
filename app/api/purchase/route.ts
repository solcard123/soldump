import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDownloadToken } from '@/lib/download-tokens'

export const dynamic = 'force-dynamic'
// (token store moved to lib/download-tokens.ts)
export const revalidate = 0

// GET /api/purchase?sku=...
export async function GET(req: NextRequest) {
  const sku = new URL(req.url).searchParams.get('sku')
  if (!sku) return NextResponse.json({ purchased: false })
  const authToken = req.cookies.get('token')?.value
  if (!authToken) return NextResponse.json({ purchased: false })
  const payload = await verifyJWT(authToken)
  if (!payload) return NextResponse.json({ purchased: false })
  const purchase = await prisma.purchase.findFirst({ where: { userId: payload.sub, sku } })
  return NextResponse.json({ purchased: !!purchase, debug: purchase ? 'FOUND' : 'NOT_FOUND' })
}

// POST create purchase (Actualmente NO procesa pago on-chain: 'priceWei' y 'txHash' son datos que vendrían de la transacción real.)
export async function POST(req: NextRequest) {
  // Deprecated: use /api/purchases
  return NextResponse.json({ error: 'Deprecated. Use /api/purchases' }, { status: 410 })
  /*try {
  const authToken = req.cookies.get('token')?.value
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userPayload = await verifyJWT(authToken)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any = null
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { product, sku, priceWei, txHash } = body || {}
    if (!product || !sku || !priceWei) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const existing = await prisma.purchase.findFirst({ where: { userId: userPayload.sub, sku } })
  if (existing) return NextResponse.json({ error: 'Already purchased', code: 'ALREADY' }, { status: 409 })

  console.log('[API] Creating purchase', { userId: userPayload.sub, sku })
  const purchase = await prisma.purchase.create({ data: { product, sku, priceWei, txHash, userId: userPayload.sub } })
  // Generar token descarga válido 5 min
  const downloadToken = createDownloadToken(userPayload.sub, sku)
  console.log('[API] Purchase created, returning token')
  return NextResponse.json({ purchase, downloadToken })
  } catch (e) {
    console.error('[API] Purchase error', e)
  return NextResponse.json({ error: 'Server error', detail: (e as any)?.message }, { status: 500 })
  }*/
}

// Export helper to be used by other route (download)
// validate moved to lib (validateAndConsumeDownloadToken)
