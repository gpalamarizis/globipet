import { createPublicKey, createVerify, type KeyObject } from 'crypto'

/**
 * Επαλήθευση του identityToken της «Σύνδεσης με Apple» (iOS).
 *
 * Χωρίς εξωτερική βιβλιοθήκη: τα δημόσια κλειδιά της Apple (JWKS) φορτώνονται
 * από https://appleid.apple.com/auth/keys και αποθηκεύονται 6 ώρες· άγνωστο
 * kid → νέα φόρτωση (η Apple αλλάζει κλειδιά).
 *
 * Έλεγχοι: υπογραφή RS256 · iss = https://appleid.apple.com · aud = ένα από
 * τα bundle IDs μας (APPLE_BUNDLE_IDS, προεπιλογή com.globipet.app) · exp ·
 * nonce (SHA-256, αν ο client έστειλε) · email παρόν.
 */

const APPLE_ISS = 'https://appleid.apple.com'
const JWKS_URL = 'https://appleid.apple.com/auth/keys'
const CACHE_MS = 6 * 60 * 60 * 1000

let cache: { at: number; keys: Map<string, KeyObject> } | null = null

async function loadKeys(force = false): Promise<Map<string, KeyObject>> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.keys
  const res = await fetch(JWKS_URL)
  if (!res.ok) throw new Error(`apple jwks ${res.status}`)
  const body = await res.json() as { keys: any[] }
  const keys = new Map<string, KeyObject>()
  for (const jwk of body.keys ?? []) {
    try { keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' })) } catch { /* αγνόηση */ }
  }
  cache = { at: Date.now(), keys }
  return keys
}

function b64urlJson(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

export function appleAudiences(): string[] {
  const ids = (process.env.APPLE_BUNDLE_IDS || 'com.globipet.app').split(',').map(s => s.trim()).filter(Boolean)
  return [...new Set(ids)]
}

export type AppleClaims = { sub: string; email: string | null; email_verified: boolean; is_private_email: boolean }

export async function verifyAppleIdentityToken(token: string, expectedNonceSha256?: string | null): Promise<AppleClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed')
  const header = b64urlJson(parts[0])
  const payload = b64urlJson(parts[1])
  if (header.alg !== 'RS256' || !header.kid) throw new Error('alg')

  let keys = await loadKeys()
  let key = keys.get(header.kid)
  if (!key) { keys = await loadKeys(true); key = keys.get(header.kid) }
  if (!key) throw new Error('kid')

  const v = createVerify('RSA-SHA256')
  v.update(`${parts[0]}.${parts[1]}`)
  v.end()
  if (!v.verify(key, Buffer.from(parts[2], 'base64url'))) throw new Error('signature')

  if (payload.iss !== APPLE_ISS) throw new Error('iss')
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.some((a: string) => appleAudiences().includes(a))) throw new Error('aud')
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < now - 60) throw new Error('exp')
  if (expectedNonceSha256 && payload.nonce && payload.nonce !== expectedNonceSha256) throw new Error('nonce')
  if (!payload.sub) throw new Error('sub')

  const ev = payload.email_verified
  const priv = payload.is_private_email
  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null,
    email_verified: ev === true || ev === 'true',
    is_private_email: priv === true || priv === 'true',
  }
}
