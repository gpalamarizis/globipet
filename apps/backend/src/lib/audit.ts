import prisma from './prisma.js'

/**
 * Καταγραφή ενεργειών — άρθρα 5 §2 και 32 ΓΚΠΔ.
 *
 * ΑΡΧΕΣ ΣΧΕΔΙΑΣΜΟΥ
 *
 *   1. Ποτέ δεν σπάει το αίτημα.
 *      Αν αποτύχει η καταγραφή, ο χρήστης δεν πρέπει να το αντιληφθεί.
 *      Η αποτυχία γράφεται στα logs του server και η ροή συνεχίζει.
 *
 *   2. Ποτέ δεν καταγράφεται περιεχόμενο.
 *      Γράφουμε «ο Χ άνοιξε τον ιατρικό φάκελο του ζώου Ψ», όχι τι έγραφε
 *      ο φάκελος. Αλλιώς η καταγραφή γίνεται δεύτερο αντίγραφο των
 *      δεδομένων, με διπλάσια έκθεση σε παραβίαση.
 *
 *   3. Δεν μπλοκάρει την απόκριση.
 *      Η εγγραφή γίνεται ασύγχρονα· δεν περιμένουμε το αποτέλεσμα.
 *
 *   4. Χρησιμοποιεί raw SQL.
 *      Δεν εξαρτάται από το prisma generate, ώστε να δουλεύει ακόμα κι αν
 *      ο client δεν έχει ενημερωθεί με το νέο μοντέλο.
 */

/** Ενέργειες που καταγράφονται. */
export type AuditAction =
  | 'read' | 'create' | 'update' | 'delete'
  | 'export' | 'login' | 'logout' | 'login_failed'
  | 'password_reset_request' | 'password_reset'
  | 'consent_given' | 'consent_withdrawn'
  | 'deletion_requested' | 'deletion_cancelled' | 'deletion_executed'
  | 'permission_denied'

export type AuditOutcome = 'success' | 'denied' | 'error'

export interface AuditEntry {
  action: AuditAction
  resource: string
  resourceId?: string | null
  /** Το υποκείμενο των δεδομένων — όχι απαραίτητα ο δράστης. */
  subjectEmail?: string | null
  /** Ονόματα πεδίων, πλήθος εγγραφών. ΠΟΤΕ τιμές. */
  metadata?: Record<string, any> | null
  outcome?: AuditOutcome
  errorMessage?: string | null
}

/** Πεδία που δεν επιτρέπεται ποτέ να καταλήξουν στο metadata. */
const FORBIDDEN = new Set([
  'password', 'password_hash', 'token', 'reset_token', 'access_token',
  'refresh_token', 'secret', 'authorization', 'cookie', 'card', 'cvv', 'iban',
])

/**
 * Καθαρίζει το metadata: κρατά μόνο ονόματα πεδίων και αριθμούς.
 * Συμβολοσειρές πάνω από 80 χαρακτήρες κόβονται — δεν θέλουμε περιεχόμενο.
 */
function sanitize(meta: Record<string, any> | null | undefined) {
  if (!meta) return null
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase()
    if (FORBIDDEN.has(key) || [...FORBIDDEN].some(f => key.includes(f))) {
      out[k] = '[παραλείφθηκε]'
      continue
    }
    if (v === null || v === undefined) { out[k] = null; continue }
    if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; continue }
    if (Array.isArray(v)) {
      // Πίνακας πεδίων -> κρατάμε τα ονόματα· πίνακας δεδομένων -> μόνο πλήθος
      out[k] = v.every(x => typeof x === 'string' && x.length <= 40)
        ? v.slice(0, 40)
        : { count: v.length }
      continue
    }
    if (typeof v === 'object') { out[k] = { keys: Object.keys(v).slice(0, 30) }; continue }
    const s = String(v)
    out[k] = s.length > 80 ? s.slice(0, 80) + '…' : s
  }
  return out
}

let warned = false

/**
 * Γράφει μία εγγραφή. Δεν πετάει ποτέ σφάλμα προς τα έξω.
 * Το `req` είναι προαιρετικό — για ενέργειες συστήματος (cron) παραλείπεται.
 */
export function audit(req: any | null, entry: AuditEntry): void {
  const user = req?.user as any | undefined

  const row = {
    id: (globalThis as any).crypto?.randomUUID?.() ??
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
    actor_id:      user?.id ?? null,
    actor_email:   user?.email ?? null,
    actor_role:    user?.role ?? null,
    action:        entry.action,
    resource:      entry.resource,
    resource_id:   entry.resourceId ?? null,
    subject_email: entry.subjectEmail ?? user?.email ?? null,
    metadata:      sanitize(entry.metadata),
    ip:            req?.ip ?? null,
    user_agent:    (req?.headers?.['user-agent'] ?? null)?.toString().slice(0, 400) ?? null,
    method:        req?.method ?? null,
    path:          req?.url ? String(req.url).split('?')[0].slice(0, 300) : null,
    status_code:   entry.outcome === 'denied' ? 403 : entry.outcome === 'error' ? 500 : null,
    outcome:       entry.outcome ?? 'success',
    error_message: entry.errorMessage ? String(entry.errorMessage).slice(0, 500) : null,
  }

  // Ασύγχρονα και σιωπηλά — η καταγραφή δεν καθυστερεί ποτέ την απόκριση.
  prisma.$executeRaw`
    INSERT INTO audit_logs
      (id, actor_id, actor_email, actor_role, action, resource, resource_id,
       subject_email, metadata, ip, user_agent, method, path, status_code,
       outcome, error_message, created_at)
    VALUES
      (${row.id}, ${row.actor_id}, ${row.actor_email}, ${row.actor_role},
       ${row.action}, ${row.resource}, ${row.resource_id}, ${row.subject_email},
       ${row.metadata ? JSON.stringify(row.metadata) : null}::jsonb,
       ${row.ip}, ${row.user_agent}, ${row.method}, ${row.path}, ${row.status_code},
       ${row.outcome}, ${row.error_message}, now())
  `.catch((err: any) => {
    // Δεν σιωπούμε εντελώς: αν λείπει ο πίνακας πρέπει να το μάθουμε.
    if (!warned) {
      warned = true
      console.error('[audit] η καταγραφή απέτυχε — τρέξε τη migration audit_logs:',
                    err?.message?.slice(0, 200))
    }
  })
}

/**
 * Βοηθητικό για ενέργειες συστήματος, χωρίς αίτημα HTTP.
 * Παράδειγμα: το cron που εκτελεί διαγραφές λογαριασμών.
 */
export function auditSystem(entry: AuditEntry & { subjectEmail?: string }): void {
  audit({ user: { id: null, email: 'system', role: 'system' } }, entry)
}
