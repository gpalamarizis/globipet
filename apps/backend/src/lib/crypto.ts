import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Field-level encryption helper for sensitive personal data (phone, address, etc.).
 *
 * ─── Storage format ────────────────────────────────────────────
 * Encrypted values are stored as ASCII strings in the format:
 *
 *   v<version>:<iv_hex>:<ciphertext_hex>:<authtag_hex>
 *
 * Example:  v1:5f3e8ab...:2a1b...:9c4d...
 *
 * ─── Key management ────────────────────────────────────────────
 * Keys are supplied via environment variables:
 *   ENCRYPTION_KEY_V1=<64 hex characters = 32 bytes = 256 bits>
 *   ENCRYPTION_KEY_V2=... (when rotating)
 *
 * The CURRENT_VERSION constant below drives which key is used for *new* writes.
 * Old records continue to be decrypted with their original version's key,
 * enabling zero-downtime key rotation: bump CURRENT_VERSION, keep the old key
 * available for reads, and re-encrypt records lazily (on next write) or
 * eagerly via a migration script.
 *
 * ─── Threat model ──────────────────────────────────────────────
 * This protects the field values against database-only compromise (a leaked
 * PostgreSQL dump, a rogue database consumer). It does NOT protect against
 * a full backend compromise where the attacker also has ENCRYPTION_KEY_V*
 * environment access.
 *
 * ─── Generating a key ──────────────────────────────────────────
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const CURRENT_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // 96 bits, GCM standard

function loadKey(version: number): Buffer {
  const raw = process.env[`ENCRYPTION_KEY_V${version}`]
  if (!raw) {
    throw new Error(
      `ENCRYPTION_KEY_V${version} is not set in the environment. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    )
  }
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY_V${version} must be exactly 64 hex characters (32 bytes / 256 bits)`)
  }
  return key
}

// Cache keys once loaded — avoids repeated env lookups on every field access
const keyCache = new Map<number, Buffer>()
function getKey(version: number): Buffer {
  let key = keyCache.get(version)
  if (!key) {
    key = loadKey(version)
    keyCache.set(version, key)
  }
  return key
}

/**
 * Encrypt a plaintext string. Returns the serialized `v<n>:iv:ct:tag` string
 * suitable for storing in a PostgreSQL VARCHAR column. Returns null for null
 * input (so existing NULL columns are preserved).
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  const key = getKey(CURRENT_VERSION)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v${CURRENT_VERSION}:${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

/**
 * Decrypt a serialized value produced by `encryptField`. If the input is not
 * in the expected format, it is returned as-is — this makes the function safe
 * to call on legacy (unencrypted) records during the migration window.
 * Returns null for null input.
 */
export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return null
  // Detect encrypted format: starts with "v<digit>:"
  if (!/^v\d+:/.test(String(stored))) {
    return String(stored)  // legacy plaintext — return unchanged
  }
  const parts = String(stored).split(':')
  if (parts.length !== 4) {
    // Malformed — return as-is rather than throwing (defensive)
    return String(stored)
  }
  const [ver, ivHex, ctHex, tagHex] = parts
  const version = parseInt(ver.slice(1), 10)
  try {
    const key = getKey(version)
    const iv = Buffer.from(ivHex, 'hex')
    const ct = Buffer.from(ctHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
    return plaintext.toString('utf8')
  } catch (err) {
    // Key missing, wrong key, or tampered ciphertext — fail loud in dev, quiet in prod
    if (process.env.NODE_ENV === 'development') {
      console.error('decryptField error:', err)
    }
    return null
  }
}

/**
 * Detect whether a stored value is in the encrypted format. Useful for the
 * one-time migration script that upgrades legacy plaintext rows.
 */
export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && /^v\d+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(String(stored))
}

/**
 * Convenience: decrypt a user record's sensitive fields in place. Mutates the
 * passed object. Handles both encrypted and legacy plaintext values.
 */
export function decryptUserFields<T extends { phone?: string | null; address?: string | null }>(user: T): T {
  if (user.phone   !== undefined) (user as any).phone   = decryptField(user.phone)
  if (user.address !== undefined) (user as any).address = decryptField(user.address)
  return user
}
