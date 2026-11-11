/**
 * Έλεγχος (και προαιρετικά διαγραφή) ΠΑΛΙΩΝ ιατρικών αρχείων / εικόνων AI
 * υγείας που βρίσκονται ακόμη στο ΔΗΜΟΣΙΟ bucket του R2.
 *
 * Από την αλλαγή του lib/storage.ts οι φάκελοι medical, ai-health,
 * stool-urine γράφονται ΜΟΝΟ στο ιδιωτικό bucket (CF_R2_PRIVATE_BUCKET_NAME).
 * Ό,τι ανέβηκε πριν μένει στο δημόσιο bucket με δημόσιο URL. Αυτό το script:
 *   - χωρίς επιλογές: ΜΟΝΟ λίστα (κλειδί, μέγεθος, ημερομηνία) — δεν αλλάζει τίποτα
 *   - --delete: σβήνει αυτά τα αντικείμενα από το δημόσιο bucket
 *
 * ΔΕΝ αγγίζει τη βάση. Τα παλιά κλειδιά δεν έχουν ιδιοκτήτη (<owner>), άρα
 * δεν μπορούν να γίνουν έγκυρες αναφορές r2priv:// — είναι δεδομένα δοκιμών
 * πριν το launch. Αν κάποια εγγραφή της βάσης τα δείχνει, μετά τη διαγραφή
 * η εικόνα της απλώς δεν φορτώνει.
 *
 * ─── Χρήση (cmd, μεταβλητές από το Railway) ──────────────────────────
 *   cd C:\gp\apps\backend
 *   railway run npx tsx src/scripts/audit-legacy-private-files.ts
 *   railway run npx tsx src/scripts/audit-legacy-private-files.ts --delete
 */
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, PRIVATE_FOLDERS } from '../lib/storage.js'

const DELETE = process.argv.includes('--delete')

async function main() {
  const c = r2()
  if (!c) {
    console.error('Λείπουν οι μεταβλητές CF_R2_* — τρέξε το με «railway run».')
    process.exit(1)
  }
  console.log(`Δημόσιο bucket: ${c.bucket}`)
  console.log(`Ιδιωτικό bucket: ${c.privateBucket ?? '(ΔΕΝ έχει οριστεί)'}`)
  console.log(DELETE ? 'Λειτουργία: ΔΙΑΓΡΑΦΗ\n' : 'Λειτουργία: μόνο λίστα (καμία αλλαγή)\n')

  let found = 0, bytes = 0, deleted = 0, failed = 0
  for (const folder of PRIVATE_FOLDERS) {
    let token: string | undefined
    do {
      const page = await c.s3.send(new ListObjectsV2Command({ Bucket: c.bucket, Prefix: `${folder}/`, ContinuationToken: token }))
      for (const o of page.Contents || []) {
        if (!o.Key) continue
        found++
        bytes += o.Size || 0
        console.log(`${o.LastModified?.toISOString().slice(0, 10) ?? '----------'}  ${String(o.Size ?? 0).padStart(9)}  ${o.Key}`)
        if (DELETE) {
          try { await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: o.Key })); deleted++ }
          catch (e: any) { failed++; console.error(`  ! αποτυχία διαγραφής: ${e?.message}`) }
        }
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
  }

  console.log(`\nΒρέθηκαν ${found} αρχεία (${(bytes / 1024 / 1024).toFixed(2)} MB) στο δημόσιο bucket.`)
  if (DELETE) console.log(`Σβήστηκαν ${deleted}, απέτυχαν ${failed}.`)
  else if (found) console.log('Για διαγραφή: ξανατρέξε με --delete.')
}

main().catch(e => { console.error(e); process.exit(1) })
