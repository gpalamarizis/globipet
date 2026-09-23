/**
 * Επανακρυπτογράφηση τηλεφώνων και διευθύνσεων με το τρέχον κλειδί.
 *
 * ΠΟΤΕ ΤΡΕΧΕΙ
 *   Μετά από περιστροφή κλειδιού, δηλαδή αφού ανέβει το CURRENT_VERSION στο
 *   lib/crypto.ts και μπει το νέο κλειδί στο περιβάλλον. Μέχρι να τρέξει,
 *   οι παλιές εγγραφές διαβάζονται κανονικά με το παλιό κλειδί — απλώς το
 *   παλιό κλειδί δεν μπορεί να αποσυρθεί.
 *
 * ΤΙ ΚΑΝΕΙ
 *   Διαβάζει κάθε χρήστη με τηλέφωνο ή διεύθυνση, αποκρυπτογραφεί με ό,τι
 *   κλειδί αντιστοιχεί στην έκδοση της τιμής, και ξαναγράφει με το τρέχον.
 *   Οι τιμές που είναι ήδη στην τρέχουσα έκδοση παραλείπονται.
 *
 * ΑΣΦΑΛΕΙΑ
 *   Τρέχει πρώτα ΧΩΡΙΣ αλλαγές. Για να γράψει, θέλει ρητά --apply:
 *
 *     node --env-file=.env dist/scripts/reencrypt-user-fields.js
 *     node --env-file=.env dist/scripts/reencrypt-user-fields.js --apply
 *
 *   Αν μια εγγραφή δεν αποκρυπτογραφείται, ΔΕΝ γράφεται τίποτα πάνω της και
 *   καταγράφεται το id. Καλύτερα να μείνει ως έχει παρά να αντικατασταθεί με
 *   σκουπίδια.
 */
import prisma from '../lib/prisma.js'
import { decryptField, encryptField, isEncrypted } from '../lib/crypto.js'

/** Η έκδοση με την οποία γράφει αυτή τη στιγμή το encryptField. */
const CURRENT_VERSION = Number(
  (encryptField('probe') ?? 'v0:').match(/^v(\d+):/)?.[1] ?? 0,
)

/** Σε ποια έκδοση κλειδιού είναι γραμμένη μια αποθηκευμένη τιμή. */
function versionOf(stored: string | null): number | null {
  if (!stored) return null
  const m = String(stored).match(/^v(\d+):/)
  return m ? Number(m[1]) : 0   // 0 = καθαρό κείμενο, από πριν την κρυπτογράφηση
}

async function main() {
  const apply = process.argv.includes('--apply')

  console.log(`Τρέχουσα έκδοση κλειδιού: v${CURRENT_VERSION}`)
  console.log(apply ? 'ΛΕΙΤΟΥΡΓΙΑ ΕΓΓΡΑΦΗΣ' : 'Δοκιμή χωρίς αλλαγές — πρόσθεσε --apply για να γραφτούν')
  console.log('')

  const users = await prisma.user.findMany({
    where: { OR: [{ phone: { not: null } }, { address: { not: null } }] },
    select: { id: true, phone: true, address: true },
  })

  let needWork = 0
  let updated = 0
  const failed: string[] = []
  const byVersion = new Map<number, number>()

  for (const user of users) {
    const data: { phone?: string | null; address?: string | null } = {}

    for (const field of ['phone', 'address'] as const) {
      const stored = user[field]
      if (!stored) continue

      const version = versionOf(stored)
      byVersion.set(version!, (byVersion.get(version!) ?? 0) + 1)
      if (version === CURRENT_VERSION) continue

      const plain = decryptField(stored)
      if (plain === null) {
        // Το decryptField επιστρέφει null μόνο σε αποτυχία — το καθαρό
        // κείμενο επιστρέφεται αυτούσιο. Άρα εδώ κάτι δεν πάει καλά.
        failed.push(`${user.id}.${field}`)
        continue
      }
      data[field] = encryptField(plain)
    }

    if (Object.keys(data).length === 0) continue
    needWork++

    if (apply) {
      await prisma.user.update({ where: { id: user.id }, data })
      updated++
    }
  }

  console.log(`Χρήστες με ευαίσθητα πεδία: ${users.length}`)
  console.log('Κατανομή τιμών ανά έκδοση:')
  for (const [version, count] of [...byVersion.entries()].sort()) {
    console.log(`  ${version === 0 ? 'καθαρό κείμενο' : 'v' + version}: ${count}`)
  }
  console.log(`Χρειάζονται επανεγγραφή: ${needWork}`)
  console.log(apply ? `Ενημερώθηκαν: ${updated}` : 'Δεν γράφτηκε τίποτα.')

  if (failed.length) {
    console.error(`\nΑΠΕΤΥΧΑΝ ${failed.length} πεδία — ΔΕΝ πειράχτηκαν:`)
    failed.forEach(f => console.error('  ' + f))
    console.error('Το παλιό κλειδί ΔΕΝ πρέπει να αφαιρεθεί όσο υπάρχουν αυτά.')
    process.exitCode = 1
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())

// Χωρίς αυτό, το isEncrypted φαίνεται αχρησιμοποίητο σε strict builds.
void isEncrypted
