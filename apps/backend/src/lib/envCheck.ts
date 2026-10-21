/**
 * Έλεγχος μεταβλητών περιβάλλοντος στην εκκίνηση.
 *
 * ΓΙΑΤΙ
 *   Πολλά σημεία έκαναν `process.env.X || ''` και συνέχιζαν: το webhook του
 *   Stripe επαλήθευε με κενό μυστικό, οι πληρωμές Viva έπεφταν στο demo, η
 *   κρυπτογράφηση αποτύγχανε στην πρώτη εγγραφή. Σε παραγωγή ο server ΔΕΝ
 *   ξεκινά μόνο αν λείπει DATABASE_URL ή JWT_SECRET· για
 *   Stripe/Viva ΔΥΝΑΤΟ console.error και συνέχεια· για τα προαιρετικά
 *   (JaaS, R2, email, push κ.λπ.) προειδοποίηση.
 *
 * Τυπώνει ΜΟΝΟ ονόματα μεταβλητών, ποτέ τιμές.
 *
 * Κλήση (index.ts, πριν τον έλεγχο JWT_SECRET):
 *   assertProductionEnv()
 */

type Env = Record<string, string | undefined>

const has = (env: Env, k: string) => typeof env[k] === 'string' && env[k]!.trim() !== ''

/**
 * Απαραίτητες για την εκκίνηση — σε παραγωγή χωρίς αυτές ο server ΔΕΝ ξεκινά.
 * Μόνο ό,τι ο κώδικας χρειάζεται για να λειτουργήσει καθόλου:
 *   - DATABASE_URL (Prisma), JWT_SECRET (index.ts — ήδη process.exit αν λείπει),
 *   - ENCRYPTION_KEY_V2: lib/crypto.ts CURRENT_VERSION = 2, διαβάζει ΑΚΡΙΒΩΣ
 *     `ENCRYPTION_KEY_V${version}` χωρίς fallback σε άλλο όνομα — κάθε νέα
 *     εγγραφή τηλεφώνου/διεύθυνσης αποτυγχάνει χωρίς αυτό.
 */
const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const

/**
 * Απαραίτητες για χρήματα αλλά ΟΧΙ για την εκκίνηση — λείπουν → ΔΥΝΑΤΟ
 * console.error σε κάθε εκκίνηση, ο server συνεχίζει (δεν ξέρουμε αν
 * λείπουν σήμερα στην παραγωγή· ένα throw θα έριχνε όλη την υπηρεσία).
 * Ονόματα ακριβώς όπως τα διαβάζει ο κώδικας (καμία εναλλακτική ονομασία):
 */
const CRITICAL: Array<{ keys: string[]; effect: string }> = [
  // routes/subscriptions, ai-subscriptions, admin-subscriptions, webhooks
  { keys: ['STRIPE_SECRET_KEY'], effect: 'οι συνδρομές Stripe (τροφή/AI) αποτυγχάνουν' },
  // routes/webhooks.ts
  { keys: ['STRIPE_WEBHOOK_SECRET'], effect: 'τα webhooks του Stripe δεν επαληθεύονται — οι συνδρομές δεν ενημερώνονται' },
  // lib/viva.ts createVivaPaymentOrder / getVivaTransaction / refundVivaTransaction
  { keys: ['VIVA_CLIENT_ID', 'VIVA_CLIENT_SECRET', 'VIVA_SOURCE_CODE'], effect: 'οι πληρωμές Viva αποτυγχάνουν' },
  // lib/viva.ts (επιστροφές), routes/orders.ts GET /viva/webhook
  { keys: ['VIVA_MERCHANT_ID', 'VIVA_API_KEY'], effect: 'οι επιστροφές χρημάτων Viva και η επαλήθευση webhook της Viva αποτυγχάνουν' },
]

/** Προαιρετικές — λείπουν → προειδοποίηση με τη συνέπεια. */
const OPTIONAL: Array<{ keys: string[]; effect: string }> = [
  { keys: ['ENCRYPTION_KEY_V1'], effect: 'παλιά (V1) κρυπτογραφημένα τηλέφωνα/διευθύνσεις δεν διαβάζονται — απαραίτητο μέχρι το scripts/reencrypt-user-fields να αναφέρει 0 εγγραφές V1' },
  { keys: ['ANTHROPIC_API_KEY'], effect: 'οι λειτουργίες AI αποτυγχάνουν' },
  { keys: ['FRONTEND_URL'], effect: 'οι σύνδεσμοι επιστροφής πληρωμών πάνε στο https://globipet.com' },
  { keys: ['RESEND_API_KEY'], effect: 'δεν στέλνονται email' },
  { keys: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'], effect: 'δεν στέλνονται ειδοποιήσεις push στο web' },
  { keys: ['JAAS_APP_ID', 'JAAS_KID', 'JAAS_PRIVATE_KEY'], effect: 'η τηλεϊατρική χρησιμοποιεί το δημόσιο meet.jit.si αντί για 8x8.vc (JaaS)' },
  { keys: ['CF_R2_ACCOUNT_ID', 'CF_R2_BUCKET_NAME', 'CF_R2_ACCESS_KEY_ID', 'CF_R2_SECRET_ACCESS_KEY'], effect: 'τα αρχεία αποθηκεύονται ως base64 στη βάση αντί για R2' },
]

export function assertProductionEnv(env: Env = process.env): { warnings: string[]; critical: string[] } {
  const isProd = env.NODE_ENV === 'production'
  const errors: string[] = []
  const warnings: string[] = []

  const missing = REQUIRED.filter(k => !has(env, k))
  if (missing.length) errors.push(`λείπουν: ${missing.join(', ')}`)

  const critical: string[] = []

  if (has(env, 'JWT_SECRET') && env.JWT_SECRET!.length < 32) errors.push('JWT_SECRET: τουλάχιστον 32 χαρακτήρες')
  // crypto.ts: Buffer.from(raw, 'hex') πρέπει να δώσει 32 bytes.
  const hex64 = (k: string) => Buffer.from(env[k]!, 'hex').length === 32
  // ENCRYPTION_KEY_V2: χωρίς αυτό αποτυγχάνει η εγγραφή τηλεφώνου/διεύθυνσης — ΔΕΝ
  // σταματά την εκκίνηση (ο υπόλοιπος server πρέπει να μείνει όρθιος).
  if (!has(env, 'ENCRYPTION_KEY_V2')) critical.push('λείπει ENCRYPTION_KEY_V2: η αποθήκευση τηλεφώνου/διεύθυνσης αποτυγχάνει')
  else if (!hex64('ENCRYPTION_KEY_V2')) critical.push('ENCRYPTION_KEY_V2: πρέπει να είναι 64 δεκαεξαδικοί χαρακτήρες')
  // V1 χρειάζεται μόνο για ανάγνωση παλιών τιμών → όχι λόγος να μην ξεκινήσει.
  if (has(env, 'ENCRYPTION_KEY_V1') && !hex64('ENCRYPTION_KEY_V1')) critical.push('ENCRYPTION_KEY_V1: πρέπει να είναι 64 δεκαεξαδικοί χαρακτήρες — τα παλιά (V1) τηλέφωνα/διευθύνσεις δεν διαβάζονται')

  for (const c of CRITICAL) {
    const miss = c.keys.filter(k => !has(env, k))
    if (miss.length) critical.push(`λείπουν ${miss.join(', ')}: ${c.effect}`)
  }
  // Σύνδεση από το ΚΙΝΗΤΟ (routes/auth.ts googleClientIds / facebook/mobile):
  // το τοκεν της Google έχει aud/azp το Android ή το iOS client ID, που δεν
  // υπάρχουν στον κώδικα — χωρίς αυτά κάθε σύνδεση Google από το κινητό
  // απορρίπτεται. Χρειάζονται τουλάχιστον 2 (Android + iOS).
  const googleIds = String(env.GOOGLE_CLIENT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (googleIds.length === 0) {
    critical.push('λείπει GOOGLE_CLIENT_IDS: η σύνδεση με Google από την εφαρμογή κινητού (Android/iOS) σπάει — όρισε τα client IDs Android και iOS χωρισμένα με κόμμα')
  } else if (googleIds.length < 2) {
    warnings.push('GOOGLE_CLIENT_IDS έχει μόνο 1 client ID: η σύνδεση με Google από το κινητό λειτουργεί μόνο στη μία πλατφόρμα — χρειάζονται και το Android και το iOS client ID, χωρισμένα με κόμμα')
  }
  const fbMissing = ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'].filter(k => !has(env, k))
  if (fbMissing.length) {
    critical.push(`λείπουν ${fbMissing.join(', ')}: η σύνδεση με Facebook από την εφαρμογή κινητού σπάει (το τοκεν δεν επαληθεύεται)`)
  }

  if (has(env, 'STRIPE_WEBHOOK_SECRET') && !env.STRIPE_WEBHOOK_SECRET!.startsWith('whsec_')) {
    warnings.push('STRIPE_WEBHOOK_SECRET δεν αρχίζει με whsec_ — έλεγξε ότι είναι το μυστικό του webhook, όχι το κλειδί API')
  }

  const vivaEnv = env.VIVA_ENV || 'demo'
  // lib/viva.ts: ό,τι δεν είναι 'production' πάει στο demo — άρα λάθος τιμή δεν σταματά την εκκίνηση.
  if (vivaEnv !== 'demo' && vivaEnv !== 'production') critical.push("VIVA_ENV: 'demo' ή 'production' — άγνωστη τιμή, οι πληρωμές πάνε στο demo της Viva")
  else if (isProd && vivaEnv !== 'production') warnings.push('VIVA_ENV δεν είναι production — οι πληρωμές πάνε στο περιβάλλον δοκιμών (demo) της Viva')

  for (const o of OPTIONAL) {
    const miss = o.keys.filter(k => !has(env, k))
    if (miss.length) warnings.push(`${miss.join(', ')}: ${o.effect}`)
  }

  for (const w of warnings) console.warn(`[env] ${w}`)
  for (const c of critical) {
    if (isProd) console.error(`[env] !!! ΚΡΙΣΙΜΟ — ${c}`)
    else console.warn(`[env] ${c} (εκτός παραγωγής)`)
  }
  if (errors.length) {
    const msg = `[env] ${errors.join(' · ')}`
    if (isProd) throw new Error(`Λείπουν/άκυρες μεταβλητές περιβάλλοντος για παραγωγή — ${msg}`)
    console.warn(`${msg} (εκτός παραγωγής: συνεχίζει)`)
  }
  return { warnings, critical }
}
