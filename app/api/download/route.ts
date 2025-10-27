import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { validateAndConsumeDownloadToken } from '@/lib/download-tokens'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'

// GET /api/download?token=...&sku=GT3RS-ACCESS
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams
  const token = search.get('token')
  const sku = search.get('sku') || 'GT3RS-ACCESS'
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const jwt = req.cookies.get('token')?.value
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJWT(jwt)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const valid = validateAndConsumeDownloadToken(token, payload.sub, sku)
  if (!valid) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })

  const filePath = path.join(process.cwd(), 'public', 'software.txt')
  try {
    await stat(filePath)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
  const stream = createReadStream(filePath)
  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="software.txt"'
    }
  })
}
