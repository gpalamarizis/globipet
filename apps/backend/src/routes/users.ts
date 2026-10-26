import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { encryptField, decryptUserFields } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'
import { z } from 'zod'
import { parseBody, text, httpUrl, phone, language } from '../lib/validate.js'

/**
 * Ενημέρωση προφίλ.
 *
 * Η λίστα επιτρεπόμενων πεδίων υπήρχε ήδη και είναι σωστή — κρατάει έξω
 * τον ρόλο και το email. Αυτό που έλειπε ήταν έλεγχος ΤΙΜΩΝ: τίποτα δεν
 * εμπόδιζε ένα ονοματεπώνυμο δέκα μεγαβάιτ ή μια «ιστοσελίδα» που ξεκινά
 * με javascript: και γίνεται εκτελέσιμος σύνδεσμος στο δημόσιο προφίλ
 * ενός παρόχου.
 *
 * Όλα προαιρετικά: είναι μερική ενημέρωση, ο χρήστης στέλνει μόνο όσα
 * αλλάζει.
 *
 * Ε12: ΤΟ ΙΔΙΟ σχήμα ισχύει πλέον και στα PATCH /auth/me, PUT /users/me και
 * PATCH /user-rights/rectify (εκεί σε λειτουργία strip, για συμβατότητα). Πριν,
 * αυτά τα τρία έγραφαν ό,τι ερχόταν — η «πόρτα» του javascript: έμενε ανοιχτή.
 *
 * profile_photo: μόνο https από το ΔΙΚΟ ΜΑΣ R2 — εκεί ανεβάζει το /api/upload
 * (lib/storage.ts uploadToR2). Κενό = αφαίρεση. Μια οποιαδήποτε εξωτερική
 * διεύθυνση θα γινόταν pixel παρακολούθησης για όποιον βλέπει το προφίλ.
 *
 * Ε16: πριν γινόταν δεκτό ΚΑΘΕ `*.r2.dev` / `*.r2.cloudflarestorage.com` —
 * δηλαδή το bucket οποιουδήποτε λογαριασμού Cloudflare (ένας επιτιθέμενος
 * ανεβάζει ό,τι θέλει στο δικό του pub-xxx.r2.dev). Τώρα ακριβώς οι δύο μορφές
 * URL που παράγει το lib/storage.ts:
 *   · `${CF_R2_PUBLIC_URL}/<key>` (ίδιος host και, αν έχει, ίδιο πρόθεμα path)
 *   · `https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${CF_R2_BUCKET_NAME}/<key>`
 *     (όταν δεν έχει οριστεί δημόσιο URL)
 * Εξάγεται για επαναχρήση (posts / communities κ.λπ.).
 */
export function isAllowedPhotoUrl(v: string): boolean {
  if (v === '') return true
  let u: URL
  try { u = new URL(v) } catch { return false }
  if (u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  const host = u.hostname.toLowerCase()
  const pub = process.env.CF_R2_PUBLIC_URL?.trim()
  if (pub) {
    try {
      const p = new URL(pub)
      const prefix = p.pathname.replace(/\/+$/, '')
      if (p.protocol === 'https:' && p.hostname.toLowerCase() === host &&
          (prefix === '' || u.pathname.startsWith(prefix + '/'))) return true
    } catch { /* κακή τιμή env */ }
  }
  const account = process.env.CF_R2_ACCOUNT_ID?.trim().toLowerCase()
  const bucket = process.env.CF_R2_BUCKET_NAME?.trim()
  if (account && bucket && host === `${account}.r2.cloudflarestorage.com` &&
      u.pathname.startsWith(`/${bucket}/`)) return true
  return false
}

export const profileSchema = z.object({
  full_name: text(2, 120, 'ονοματεπώνυμο').optional(),
  bio: z.string().trim().max(2000, 'Το βιογραφικό ξεπερνά τους 2000 χαρακτήρες').optional(),
  phone: phone.optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  website: httpUrl.optional(),
  profile_photo: z.string().trim().max(1000)
    .refine(isAllowedPhotoUrl, 'Μη έγκυρη διεύθυνση φωτογραφίας').optional(),
  preferred_language: language.optional(),
  address: z.string().trim().max(500).optional(),
}).strict()

/**
 * Ε16: απάντηση 403 όταν λείπει η ημερομηνία γέννησης (index.ts authenticate,
 * packages.ts /setup): `{ message, code: 'birth_date_required' }`. Ο client
 * ανοίγει την οθόνη ημερομηνίας γέννησης αντί για μήνυμα σφάλματος.
 */
export const BIRTH_DATE_REQUIRED_MESSAGE = 'Συμπλήρωσε πρώτα την ημερομηνία γέννησής σου για να συνεχίσεις.'

/**
 * Ε13/Ε16 — ποιος χρειάζεται ημερομηνία γέννησης (ΜΙΑ συνάρτηση για όλους:
 * το πεδίο `needs_birth_date` του auth.ts/users.ts ΚΑΙ η επιβολή στο
 * `authenticate` του index.ts — ώστε σημαία και 403 να συμφωνούν πάντα).
 *
 *   · Έχει ημερομηνία → όχι.
 *   · admin → όχι (εξαίρεση ιδιοκτήτη).
 *   · service_provider → όχι ΜΟΝΟ αν τον ρόλο τον έδωσε διαχειριστής
 *     (roleAssignedByAdmin). Πάροχος που έγινε μόνος του (εγγραφή — εκεί η
 *     ημερομηνία είναι ήδη υποχρεωτική —, ή παλιό POST /packages/setup)
 *     → ναι.
 *   · user / both → ναι.
 */
export async function needsBirthDate(user: { id?: string | null; birth_date?: unknown; role?: unknown }): Promise<boolean> {
  if (user.birth_date) return false
  const role = String(user.role ?? '')
  if (role === 'admin') return false
  if (role === 'service_provider' && user.id) return !(await roleAssignedByAdmin(user.id))
  return true
}

/**
 * Ο ρόλος service_provider δόθηκε από διαχειριστή;
 *
 *   Δεν υπάρχει στήλη γι' αυτό (καμία αλλαγή στο schema). Το πιο αξιόπιστο
 *   υπάρχον σήμα είναι το audit των δύο διαδρομών της διαχείρισης (admin.ts):
 *     · POST  /admin/users     → action 'admin_user_create', metadata.role
 *     · PATCH /admin/users/:id → action 'admin_user_update', metadata.fields ∋ 'role'
 *       και (από Ε16) metadata.role = η νέα τιμή
 *   Μετράει η ΠΙΟ ΠΡΟΣΦΑΤΗ τέτοια εγγραφή: αν έχει metadata.role, πρέπει να
 *   είναι 'service_provider'· παλιές εγγραφές update χωρίς metadata.role
 *   (πριν το Ε16) → αρκεί ότι ο ρόλος άλλαξε από διαχειριστή και ο τρέχων
 *   είναι service_provider.
 *   και μόνο με actor_role = 'admin' (ο ρόλος του actor έρχεται από τη βάση,
 *   index.ts `trusted`). Ερώτημα ΜΟΝΟ για πάροχο χωρίς ημερομηνία· το
 *   αποτέλεσμα κρατιέται στο cache ελέγχου τοκεν (index.ts, 30″).
 *
 *   Τα 'admin_user_create' / 'admin_user_update' είναι στο AUDIT_STATE_ACTIONS
 *   (lib/cron), ώστε το RETENTION των audit_logs να μην τα σβήνει.
 */
export async function roleAssignedByAdmin(userId: string): Promise<boolean> {
  try {
    const row = await prisma.auditLog.findFirst({
      where: {
        resource: 'user', resource_id: userId, actor_role: 'admin', outcome: 'success',
        OR: [
          { action: 'admin_user_create' },
          { action: 'admin_user_update', metadata: { path: ['fields'], array_contains: ['role'] } },
        ],
      },
      orderBy: { created_at: 'desc' },
      select: { action: true, metadata: true },
    })
    if (!row) return false
    const role = (row.metadata as any)?.role
    if (typeof role === 'string') return role === 'service_provider'
    // Παλιά εγγραφή update (χωρίς metadata.role): ο ρόλος άλλαξε από διαχειριστή.
    return row.action === 'admin_user_update'
  } catch (err) {
    // Αποτυχία ανάγνωσης → ΔΕΝ εξαιρείται (ασφαλής πλευρά: ζητείται ημερομηνία).
    console.error('[birth-date] roleAssignedByAdmin', userId, (err as any)?.message ?? err)
    return false
  }
}

/**
 * Ε12: ο χρήστης προς τον client ΧΩΡΙΣ μυστικά (κωδικός, hash reset/επαλήθευσης,
 * token_version) και με `email_verified` — όπως το toSafeUser του auth.ts.
 */
async function safeUser(user: any) {
  const {
    password_hash: _p, reset_token: _r, reset_token_expires: _re,
    email_verify_token: _v, email_verify_expires: _ve, token_version: _tv,
    ...safe
  } = user
  decryptUserFields(safe)
  safe.email_verified = !!user.email_verified_at
  // Ε13: όπως το toSafeUser — λείπει η ημερομηνία γέννησης (PATCH /auth/me/birth-date)·
  // Ε16: όχι για admin ή service_provider που τον όρισε διαχειριστής (needsBirthDate).
  safe.needs_birth_date = await needsBirthDate(user)
  return safe
}

const passwordChangeSchema = z.object({
  current_password: z.string({
    required_error: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί',
    invalid_type_error: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί',
  }).min(1, 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί').max(1000),
  new_password: z.string({
    required_error: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί',
    invalid_type_error: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί',
  }).min(8, 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
    .max(200, 'Ο κωδικός είναι υπερβολικά μεγάλος'),
})

const usersRoutes: FastifyPluginAsync = async (app) => {

  // GET /users/me — returns the current user with sensitive fields decrypted
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    return await safeUser(user)
  })

  // PUT /users/me — legacy full-update endpoint
  // Kept for backward compatibility with older clients.
  // Ε12: ίδιοι έλεγχοι τιμών με το PATCH (profileSchema), σε strip.
  app.put('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email, id } = req.user as any
    const parsed = parseBody(
      profileSchema.pick({ full_name: true, bio: true, phone: true, city: true, country: true, website: true }).strip(),
      req.body, reply,
    )
    if (!parsed) return
    const { full_name, bio, phone, city, country, website } = parsed
    const user = await prisma.user.update({
      where: { email },
      data: {
        full_name, bio, city, country, website,
        // Encrypt sensitive fields before write
        phone: encryptField(phone) as any,
      },
    })
    const safe = await safeUser(user)
    await audit(req, {
      action: 'profile_update',
      resource: 'user',
      resource_id: id,
      subject_email: email,
      metadata: { via: 'PUT /users/me', fields: ['full_name','bio','phone','city','country','website'] },
    })
    return safe
  })

  // PATCH /users/me — recommended partial-update endpoint used by the web/mobile client
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email, id } = req.user as any
    const parsed = parseBody(profileSchema, req.body, reply)
    if (!parsed) return

    // Μόνο τα πεδία που στάλθηκαν πραγματικά — το zod αφήνει τα υπόλοιπα
    // undefined και το Prisma θα τα έγραφε ως null.
    const updateData: any = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) updateData[key] = value
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'Δεν υπάρχουν πεδία για ενημέρωση' })
    }
    // Encrypt sensitive fields before write
    if ('phone'   in updateData) updateData.phone   = encryptField(updateData.phone)
    if ('address' in updateData) updateData.address = encryptField(updateData.address)

    const user = await prisma.user.update({ where: { email }, data: updateData })
    const safe = await safeUser(user)
    await audit(req, {
      action: 'profile_update',
      resource: 'user',
      resource_id: id,
      subject_email: email,
      metadata: { via: 'PATCH /users/me', fields: Object.keys(updateData) },
    })
    return safe
  })

  // POST /users/me/password — user changes their own password
  // Ε16: zod — μόνο κείμενα (αριθμός/αντικείμενο/πίνακας δεν φτάνει ποτέ στο
  // bcrypt), νέος κωδικός 8–200 όπως στην εγγραφή/επαναφορά (auth.ts).
  app.post('/me/password', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email, id } = req.user as any
    const parsed = parseBody(passwordChangeSchema, req.body, reply)
    if (!parsed) return
    const { current_password, new_password } = parsed

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) {
      await audit(req, { action: 'password_change', resource: 'user', resource_id: id, subject_email: email, outcome: 'failure', metadata: { reason: 'oauth_only_account' } })
      return reply.code(400).send({ message: 'Δεν είναι δυνατή η αλλαγή κωδικού για αυτόν τον χρήστη (πιθανώς συνδέθηκε με Google/Facebook)' })
    }

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) {
      await audit(req, { action: 'password_change', resource: 'user', resource_id: id, subject_email: email, outcome: 'failure', metadata: { reason: 'wrong_current_password' } })
      return reply.code(400).send({ message: 'Λανθασμένος τρέχων κωδικός' })
    }

    const same = await bcrypt.compare(new_password, user.password_hash)
    if (same) {
      return reply.code(400).send({ message: 'Ο νέος κωδικός είναι ίδιος με τον τρέχοντα' })
    }

    const password_hash = await bcrypt.hash(new_password, 12)
    // Ε12: token_version+1 → κάθε ΑΛΛΗ συνεδρία (π.χ. συσκευή που χάθηκε ή
    // όποιος είχε τον παλιό κωδικό) τελειώνει. Αυτή η συσκευή παίρνει νέο
    // τοκεν στην απάντηση (`token`, προσθετικό πεδίο) και μένει συνδεδεμένη.
    const updated = await prisma.user.update({
      where: { email },
      data: { password_hash, token_version: { increment: 1 } },
      select: { id: true, email: true, role: true, token_version: true },
    })
    ;(app as any).invalidateAuthCache?.(updated.id)
    // Οι συσκευές push σβήνονται (best-effort): οι ΑΛΛΕΣ συνεδρίες μόλις
    // τελείωσαν και δεν πρέπει να λαμβάνουν ειδοποιήσεις. Το κινητό
    // ξαναδηλώνεται μόνο του στην επόμενη εκκίνηση· στο web ο χρήστης
    // ξαναενεργοποιεί τις ειδοποιήσεις από τις ρυθμίσεις.
    await prisma.pushSubscription.deleteMany({ where: { user_id: updated.id } })
      .catch((e: any) => console.error('[me/password] push cleanup failed:', e?.message))
    const token = app.jwt.sign(
      { id: updated.id, email: updated.email, role: updated.role, tv: updated.token_version },
      { expiresIn: '7d' },
    )

    await audit(req, {
      action: 'password_change',
      resource: 'user',
      resource_id: id,
      subject_email: email,
    })
    return { message: 'Ο κωδικός άλλαξε επιτυχώς', token }
  })
}

export default usersRoutes
