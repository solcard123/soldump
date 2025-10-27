import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change')

export interface JWTPayload {
  sub: string
  email: string
  username: string
}

const ISSUER = '1day1car'
const AUDIENCE = '1day1car-users'

export async function createJWT(payload: JWTPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT<T = JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE })
    return payload as T
  } catch {
    return null
  }
}
