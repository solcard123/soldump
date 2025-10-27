// Simple in-memory download token management (dev only). For production, persist in DB.
import crypto from 'crypto'

type TokenData = { userId: string; sku: string; expires: number }
const tokens = new Map<string, TokenData>()

export function createDownloadToken(userId: string, sku: string, ttlMs = 5 * 60 * 1000) {
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, { userId, sku, expires: Date.now() + ttlMs })
  return token
}

export function validateAndConsumeDownloadToken(token: string, userId: string, sku: string) {
  const entry = tokens.get(token)
  if (!entry) return false
  if (entry.userId !== userId || entry.sku !== sku) return false
  if (Date.now() > entry.expires) {
    tokens.delete(token)
    return false
  }
  tokens.delete(token)
  return true
}

export function clearExpiredTokens() {
  const now = Date.now()
  for (const [tk, data] of tokens) {
    if (data.expires < now) tokens.delete(tk)
  }
}
