/**
 * Φύλακας για τα seed scripts που ΣΒΗΝΟΥΝ ή γεμίζουν τη βάση με δοκιμαστικά.
 *
 * Το seed-launch-data ξεκινά με `user.deleteMany()` (και κρατήσεις, ζώα,
 * παραγγελίες…). Ένα `npx tsx src/scripts/seed-launch-data.ts` με το
 * DATABASE_URL της παραγωγής στο περιβάλλον έσβηνε ολόκληρη την πλατφόρμα και
 * έφτιαχνε λογαριασμούς (και admin) με γνωστό, σταθερό κωδικό.
 *
 * Κανόνας: εκτέλεση μόνο σε τοπική βάση και όχι με NODE_ENV=production, εκτός
 * αν δοθεί ρητά ALLOW_SEED=yes. Οι κωδικοί των λογαριασμών έρχονται από το
 * SEED_PASSWORD (τουλάχιστον 12 χαρακτήρες), ποτέ από τον κώδικα.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function assertSeedAllowed(script: string): void {
  if (process.env.ALLOW_SEED === 'yes') {
    console.warn(`⚠️  ${script}: ALLOW_SEED=yes — εκτέλεση χωρίς έλεγχο περιβάλλοντος.`)
    return
  }
  const reasons: string[] = []
  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production')
  let host = ''
  try { host = new URL(process.env.DATABASE_URL || '').hostname } catch { host = '' }
  if (!LOCAL_HOSTS.has(host)) reasons.push(`DATABASE_URL δεν δείχνει σε τοπική βάση (host: ${host || 'άγνωστος'})`)
  if (reasons.length) {
    console.error(`❌ ${script}: άρνηση εκτέλεσης — ${reasons.join(', ')}.`)
    console.error('   Αν είσαι ΣΙΓΟΥΡΟΣ για τη βάση-στόχο, όρισε ALLOW_SEED=yes.')
    process.exit(1)
  }
}

/** Ο κωδικός των δοκιμαστικών λογαριασμών, από το περιβάλλον. */
export function seedPassword(script: string): string {
  const p = process.env.SEED_PASSWORD || ''
  if (p.length < 12) {
    console.error(`❌ ${script}: όρισε SEED_PASSWORD (τουλάχιστον 12 χαρακτήρες) για τους δοκιμαστικούς λογαριασμούς.`)
    process.exit(1)
  }
  return p
}
