/**
 * One-time migration: encrypt existing User.phone and User.address values.
 *
 * Idempotent: skips any row whose value is already in the encrypted format
 * (detected by leading "v<digit>:"). Safe to re-run.
 *
 * ─── Prerequisites ────────────────────────────────────────────
 * 1. ENCRYPTION_KEY_V1 must be set in the environment (64 hex chars).
 * 2. Run against a backup or during a maintenance window if you have
 *    concurrent writes going in.
 *
 * ─── Usage ────────────────────────────────────────────────────
 *   cd C:\gp\apps\backend
 *   npx tsx src/scripts/encrypt-existing.ts
 *
 *   Add --dry-run to see what would be encrypted without touching the DB:
 *   npx tsx src/scripts/encrypt-existing.ts --dry-run
 */
import prisma from '../lib/prisma.js'
import { encryptField, isEncrypted } from '../lib/crypto.js'

const DRY_RUN = process.argv.includes('--dry-run')

interface Report {
  scanned: number
  alreadyEncrypted: number
  encrypted: number
  emptyOrNull: number
  errors: number
}

async function migrateUsers(): Promise<Report> {
  const r: Report = { scanned: 0, alreadyEncrypted: 0, encrypted: 0, emptyOrNull: 0, errors: 0 }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, address: true },
  })
  r.scanned = users.length
  console.log(`Scanning ${r.scanned} users…`)

  for (const u of users) {
    const patch: any = {}
    let needsWrite = false

    // Phone
    if (u.phone === null || u.phone === '') {
      r.emptyOrNull++
    } else if (isEncrypted(u.phone)) {
      r.alreadyEncrypted++
    } else {
      patch.phone = encryptField(u.phone)
      needsWrite = true
    }

    // Address
    if (u.address === null || u.address === '') {
      // don't double-count if phone was also empty
    } else if (isEncrypted(u.address)) {
      // don't double-count if phone was already encrypted
    } else {
      patch.address = encryptField(u.address)
      needsWrite = true
    }

    if (needsWrite) {
      if (DRY_RUN) {
        console.log(`  [dry-run] would encrypt user ${u.email} (${Object.keys(patch).join(', ')})`)
        r.encrypted++
      } else {
        try {
          await prisma.user.update({ where: { id: u.id }, data: patch })
          console.log(`  ✓ encrypted user ${u.email} (${Object.keys(patch).join(', ')})`)
          r.encrypted++
        } catch (err: any) {
          console.error(`  ✗ FAILED user ${u.email}: ${err.message}`)
          r.errors++
        }
      }
    }
  }
  return r
}

async function main() {
  console.log(`\nField-level encryption migration${DRY_RUN ? ' (DRY RUN)' : ''}\n`)
  console.log('Users:')
  const users = await migrateUsers()
  console.log(`\nSummary:`)
  console.log(`  Scanned:            ${users.scanned}`)
  console.log(`  Empty/NULL:         ${users.emptyOrNull}`)
  console.log(`  Already encrypted:  ${users.alreadyEncrypted}`)
  console.log(`  ${DRY_RUN ? 'Would encrypt' : 'Encrypted'}:         ${users.encrypted}`)
  console.log(`  Errors:             ${users.errors}`)
  console.log(DRY_RUN ? '\nNo changes were made. Re-run without --dry-run to apply.\n' : '\nDone.\n')
  await prisma.$disconnect()
  process.exit(users.errors > 0 ? 1 : 0)
}

main().catch(async err => {
  console.error('Migration failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})
