import { AsyncLocalStorage } from 'node:async_hooks'
import prisma from './prisma.js'

/**
 * Διεκδίκηση μιας επιστροφής χρημάτων σε επίπεδο ΒΑΣΗΣ.
 *
 * ΓΙΑΤΙ
 *   Ο έλεγχος «έχει ήδη επιστραφεί;» (audit) → επιστροφή στη Viva → καταγραφή
 *   (audit) δεν είναι ατομικός. Μέσα σε μία διεργασία τον προστάτευε ένα Set
 *   στη μνήμη (refundsInFlight), αλλά με δύο instances του API (ή επανεκκίνηση
 *   στη μέση) δύο webhooks της ίδιας συναλλαγής μπορούσαν να περάσουν μαζί τον
 *   έλεγχο και να κάνουν ΔΥΟ επιστροφές.
 *
 * ΠΩΣ
 *   pg_try_advisory_xact_lock(<χώρος>, hashtext(key)) μέσα σε συναλλαγή βάσης:
 *   ένα κλείδωμα του PostgreSQL που κρατιέται όσο ζει η συναλλαγή και
 *   απελευθερώνεται μόνο του στο commit/rollback (και αν πέσει η σύνδεση).
 *   Καμία αλλαγή στο σχήμα. Το «try» δεν περιμένει: αν το κρατά άλλος, η
 *   επιστροφή αυτή τη στιγμή γίνεται αλλού και ο καλών παίρνει
 *   `{ locked: false }` — ακριβώς όπως πριν με το Set.
 *
 *   Η δουλειά (`fn`) τρέχει με τον κοινό client: οι εγγραφές της (audit)
 *   δεσμεύονται αμέσως, ΠΡΙΝ λυθεί το κλείδωμα, άρα όποιος το πάρει μετά
 *   βλέπει ήδη την καταγραφή της επιστροφής.
 *
 *   Η συναλλαγή έχει μεγάλο timeout γιατί μέσα της γίνεται κλήση στη Viva.
 *   Αν το commit αποτύχει ΑΦΟΥ τελείωσε η δουλειά, ισχύει το αποτέλεσμα της
 *   δουλειάς (η επιστροφή έγινε και καταγράφηκε) — δεν πετιέται σφάλμα.
 *
 * ΣΥΝΔΕΣΕΙΣ (pool)
 *   Όσο τρέχει το `fn`, η συναλλαγή του κλειδώματος ΚΡΑΤΑ μία σύνδεση του
 *   pool, και οι κλήσεις του `fn` (audit, ενημερώσεις) θέλουν ΑΛΛΗ. Με Ν
 *   ταυτόχρονα κλειδώματα και connection_limit ≤ Ν, όλες οι συνδέσεις
 *   κρατιούνται από κλειδώματα και οι κλήσεις του `fn` περιμένουν μέχρι το
 *   pool_timeout (10″). Τότε: πριν την επιστροφή → σφάλμα, καμία κλήση στη
 *   Viva (ασφαλές)· ΜΕΤΑ την επιστροφή → η καταγραφή της (audit, που δεν
 *   πετάει) ΧΑΝΕΤΑΙ, και ο έλεγχος «έχει ήδη επιστραφεί;» δεν την ξέρει.
 *   Γι' αυτό τα κλειδώματα μιας διεργασίας τρέχουν ΕΝΑ-ΕΝΑ (ουρά πριν πάρουν
 *   σύνδεση): το πολύ μία σύνδεση κρατιέται από κλείδωμα, και το `fn` βρίσκει
 *   πάντα δεύτερη αν connection_limit ≥ 2. Με connection_limit=1 (π.χ.
 *   pgbouncer) καμία επιστροφή δεν μπορεί να ολοκληρωθεί σωστά — προειδοποίηση
 *   στην εκκίνηση. Ένθετη κλήση (μέσα σε `fn`) δεν περιμένει την ουρά (αλλιώς
 *   θα περίμενε τον εαυτό της).
 *
 *   Όριο: αν η Viva αργήσει πάνω από το timeout της συναλλαγής (120″), το
 *   κλείδωμα λύνεται ενώ το `fn` τρέχει ακόμη. Οι ροές προστατεύονται και από
 *   ατομικές διεκδικήσεις κατάστασης (registered/paid → refunding), όχι μόνο
 *   από το κλείδωμα.
 */
const REFUND_LOCK_SPACE = 'globipet:refund'

/** Ουρά: ένα κλείδωμα επιστροφής τη φορά ανά διεργασία (βλ. ΣΥΝΔΕΣΕΙΣ). */
let lockQueue: Promise<void> = Promise.resolve()
const insideLock = new AsyncLocalStorage<true>()

/**
 * Μέγιστη αναμονή στην ουρά. Πέρα από αυτή το αίτημα αποτυγχάνει με
 * προσωρινό σφάλμα ΧΩΡΙΣ κλήση στη Viva (ο χρήστης ξαναδοκιμάζει), αντί να
 * περιμένει επ' αόριστον πίσω από μια αργή επιστροφή.
 */
const QUEUE_WAIT_MS = 60_000

/** Η ουρά των επιστροφών είναι απασχολημένη: τίποτα δεν έγινε — προσωρινό. */
export class RefundQueueBusyError extends Error {
  constructor() { super('Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο') }
}

async function serialised<R>(run: () => Promise<R>): Promise<R> {
  if (insideLock.getStore()) return run()
  const prev = lockQueue
  let release!: () => void
  const mine = new Promise<void>(r => { release = r })
  // Ο επόμενος περιμένει ΚΑΙ τον προηγούμενο: αν εμείς εγκαταλείψουμε την
  // αναμονή, η σειρά δεν σπάει (δεν τρέχει ταυτόχρονα με τον prev).
  lockQueue = prev.then(() => mine)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const ready = await Promise.race([
      prev.then(() => true),
      new Promise<false>(r => { timer = setTimeout(() => r(false), QUEUE_WAIT_MS) }),
    ])
    if (!ready) throw new RefundQueueBusyError()
    return await insideLock.run(true, run)
  } finally {
    if (timer) clearTimeout(timer)
    release()
  }
}

{
  const m = /[?&]connection_limit=(\d+)/.exec(process.env.DATABASE_URL ?? '')
  if (m && Number(m[1]) < 2) {
    console.warn('[refundLock] DATABASE_URL connection_limit < 2: refunds hold one connection and need a second — refunds will time out. Use connection_limit >= 2.')
  }
}

export type LockResult<T> = { locked: true; value: T } | { locked: false }

export async function withRefundLock<T>(key: string, fn: () => Promise<T>): Promise<LockResult<T>> {
  return serialised(() => withRefundLockNow(key, fn))
}

async function withRefundLockNow<T>(key: string, fn: () => Promise<T>): Promise<LockResult<T>> {
  let finished = false
  let value: T | undefined
  try {
    const got = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext(${REFUND_LOCK_SPACE}), hashtext(${key})) AS locked`
      if (!rows[0]?.locked) return false
      value = await fn()
      finished = true
      return true
    }, { maxWait: 10_000, timeout: 120_000 })
    return got ? { locked: true, value: value as T } : { locked: false }
  } catch (err) {
    if (finished) return { locked: true, value: value as T }
    throw err
  }
}
