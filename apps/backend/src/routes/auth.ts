import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { parseBody, text, email as emailField, phone, language } from '../lib/validate.js'
import prisma from '../lib/prisma.js'
import { encryptField, decryptField, decryptUserFields } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'
import { sendEmailVerificationEmail } from '../lib/email.js'
import { profileSchema, needsBirthDate } from './users.js'

/**
 * ΑΥΤΟΜΑΤΗ ΣΥΝΔΕΣΗ ΠΡΟΣΩΠΙΚΟΥ — ΚΑΤΑΡΓΗΘΗΚΕ (Ε13).
 *
 * Πριν: σε κάθε είσοδο / επιβεβαίωση email / OAuth / επαναφορά κωδικού, κάθε
 * μέλος προσωπικού (provider_staff) με το email του χρήστη και user_id null
 * συνδεόταν αυτόματα με τον λογαριασμό — ο πάροχος έβαζε στο προσωπικό του
 * οποιονδήποτε χωρίς να ερωτηθεί.
 *
 * Τώρα η σύνδεση γίνεται ΜΟΝΟ με αποδοχή πρόσκλησης από τον ίδιο τον χρήστη
 * (routes/staff.ts: GET /staff/invitations, POST /staff/:id/accept|decline).
 * Οι ήδη συνδεδεμένοι λογαριασμοί ΔΕΝ αγγίζονται. Η συνάρτηση μένει ως
 * no-op ώστε οι κλήσεις της (είσοδος, OAuth, επιβεβαίωση, επαναφορά) να μην
 * αλλάξουν σε αυτό το βήμα.
 */
async function autoLinkProviderStaff(_user: { id: string; email: string; email_verified_at?: Date | null }, _req: any) {
  return 0
}

/**
 * Το reset_token αποθηκεύεται ΚΑΤΑΚΕΡΜΑΤΙΣΜΕΝΟ.
 *
 *   Πριν, γραφόταν σε καθαρό κείμενο. Όποιος διάβαζε τη βάση — αντίγραφο
 *   ασφαλείας, διαρροή, εσωτερικός χρήστης — έπαιρνε άμεσα τον λογαριασμό
 *   οποιουδήποτε είχε ζητήσει επαναφορά, χωρίς να χρειάζεται κωδικό.
 *
 *   Τώρα στο email φεύγει το καθαρό τοκεν και στη βάση μένει μόνο το SHA-256
 *   του. Η βάση δεν αρκεί πια: το καθαρό τοκεν δεν ανακτάται από το hash.
 *
 *   SHA-256 χωρίς salt είναι σωστό ΕΔΩ, σε αντίθεση με τους κωδικούς: το
 *   τοκεν έχει 256 bit τυχαιότητας και δεν μαντεύεται με λεξικό.
 */
/**
 * ΚΡΙΣΙΜΟ — ο ρόλος ΔΕΝ διαβάζεται ποτέ αυτούσιος από το αίτημα.
 *
 *   Η εγγραφή έπαιρνε `role` κατευθείαν από το σώμα και το έγραφε στη βάση.
 *   Οποιοσδήποτε μπορούσε να στείλει:
 *
 *     POST /api/auth/register { ..., "role": "admin" }
 *
 *   και να γίνει διαχειριστής. Από εκεί είχε πρόσβαση σε ολόκληρο το
 *   /api/admin — διαχείριση χρηστών, παραγγελίες, και το endpoint που
 *   εκτελεί SQL πάνω στη βάση παραγωγής.
 *
 *   Δεν υπήρχε καμία ένδειξη επίθεσης στον κώδικα· η τρύπα απλώς ήταν
 *   ανοιχτή. Επιτρέπονται πλέον μόνο οι τρεις ρόλοι που μπορεί θεμιτά να
 *   διαλέξει κάποιος στη φόρμα εγγραφής. Ο ρόλος διαχειριστή αποδίδεται
 *   μόνο από άλλον διαχειριστή.
 */
const SELF_ASSIGNABLE_ROLES = ['user', 'service_provider', 'both'] as const

/** Σχήματα εισόδου. Ό,τι δεν δηλώνεται εδώ, δεν φτάνει ποτέ στη βάση. */
const registerSchema = z.object({
  full_name: text(2, 120, 'ονοματεπώνυμο'),
  email: emailField,
  password: z.string().min(8, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
    .max(200, 'Ο κωδικός είναι υπερβολικά μεγάλος'),
  role: z.string().optional(),
  preferred_language: language.optional(),
  phone: phone.optional(),
  birth_date: z.string().optional(),
  /**
   * Αποδοχή Όρων Χρήσης και Πολιτικής Απορρήτου — υποχρεωτική.
   * Ο GDPR (άρθρο 7§1) θέλει να μπορούμε να ΑΠΟΔΕΙΞΟΥΜΕ την αποδοχή· η φόρμα
   * από μόνη της δεν αρκεί, γιατί οποιοσδήποτε μπορεί να καλέσει το API.
   */
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Πρέπει να αποδεχτείς τους Όρους Χρήσης και την Πολιτική Απορρήτου' }),
  }),
})

/**
 * Καταγράφει την αποδοχή όρων στο ιστορικό συγκαταθέσεων.
 *
 * registration  — ο χρήστης τσέκαρε ρητά το κουτί της φόρμας.
 * social_signup — νέος λογαριασμός από Google/Facebook, όπου η φόρμα δείχνει
 *                 «Συνεχίζοντας αποδέχεσαι τους Όρους και την Πολιτική».
 *
 * Αποτυχία εδώ δεν ακυρώνει την εγγραφή (ο λογαριασμός έχει ήδη δημιουργηθεί)
 * αλλά γράφεται στα logs με πρόθεμα [consent], ώστε να εντοπιστεί.
 */
async function recordSignupConsent(req: any, userId: string, source: 'registration' | 'social_signup') {
  try {
    await prisma.userConsent.create({
      data: {
        user_id: userId,
        necessary: true,
        terms_accepted: true,
        privacy_accepted: true,
        source,
        // req.ip (trustProxy, index.ts) — όχι το X-Forwarded-For που γράφει ο client.
        ip_address: req.ip || null,
        user_agent: (req.headers?.['user-agent'] as string) || null,
      },
    })
  } catch (err) {
    console.error('[consent] signup consent not recorded', userId, err)
  }
}

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Ο κωδικός είναι υποχρεωτικός').max(200),
})

const forgotSchema = z.object({ email: emailField })

/** Ε13: PATCH /auth/me/birth-date — μόνο YYYY-MM-DD (το <input type="date"> και το κινητό στέλνουν αυτό). */
const birthDateSchema = z.object({
  birth_date: z.string({ required_error: 'Η ημερομηνία γέννησης είναι υποχρεωτική' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Μη έγκυρη ημερομηνία γέννησης'),
})

const resetSchema = z.object({
  // Το τοκεν παράγεται από εμάς με 32 τυχαία bytes σε δεκαεξαδικό.
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Μη έγκυρος σύνδεσμος επαναφοράς'),
  password: z.string().min(8, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες').max(200),
})

function safeRole(input: unknown): string {
  return typeof input === 'string' && (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(input)
    ? input
    : 'user'
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Σταθερός χρόνος στο login (Ε12): για ανύπαρκτο χρήστη ή λογαριασμό χωρίς
 * κωδικό γίνεται κι εκεί ένα bcrypt.compare (κόστος 12, όπως οι πραγματικοί
 * κωδικοί). Χωρίς αυτό, η απάντηση «λάθος στοιχεία» ερχόταν ~250ms γρηγορότερα
 * όταν το email δεν υπήρχε — και η διαφορά αρκούσε για απαρίθμηση λογαριασμών.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 12)

/** Το JWT της συνεδρίας: `tv` = users.token_version, ώστε να ανακαλείται (βλ. index.ts). */
type SessionUser = { id: string; email: string; role: string; token_version?: number | null }
function sessionClaims(user: SessionUser) {
  return { id: user.id, email: user.email, role: user.role, tv: user.token_version ?? 0 }
}

/**
 * Ο χρήστης όπως επιστρέφεται στον client.
 *
 * Έξω μένουν ΟΛΑ τα μυστικά: κωδικός, hash του reset και του τοκεν
 * επαλήθευσης, token_version. (Πριν έφευγαν τα hash του reset_token σε κάθε
 * login.) Προστίθεται `email_verified` για τη μπάρα «Επιβεβαίωσε το email σου».
 */
async function toSafeUser(user: any) {
  const {
    password_hash: _p, reset_token: _r, reset_token_expires: _re,
    email_verify_token: _v, email_verify_expires: _ve, token_version: _tv,
    ...safe
  } = user
  decryptUserFields(safe)
  safe.email_verified = !!user.email_verified_at
  // Ε13: λογαριασμός χωρίς ημερομηνία γέννησης (Google/Facebook, παλιοί
  // λογαριασμοί) → ο client ζητά την ημερομηνία πριν από οτιδήποτε άλλο
  // (PATCH /auth/me/birth-date). Προσθετικό πεδίο.
  // Ε16: ίδια συνάρτηση με την επιβολή του index.ts (authenticate → 403
  // birth_date_required): service_provider εξαιρείται ΜΟΝΟ αν τον ρόλο τον
  // έδωσε διαχειριστής.
  safe.needs_birth_date = await needsBirthDate(user)
  return safe
}

/** Ελάχιστη ηλικία εγγραφής — βλ. το σχόλιο στο POST /register. */
const MIN_AGE = 15

/** Συμπληρωμένα έτη στις `now` (ίδιος υπολογισμός σε εγγραφή και σε PATCH /me/birth-date). */
function ageInYears(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  // Αν δεν έχουν κλείσει ακόμα τα γενέθλια φέτος, ο χρόνος δεν μετράει.
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
  return age
}

const UNDER_AGE_MESSAGE = 'Πρέπει να είσαι τουλάχιστον 15 ετών για να χρησιμοποιήσεις το GlobiPet. Ο λογαριασμός σου κλείνει και θα διαγραφεί.'
const UNDER_AGE_REASON = 'under_age'
/** Περιθώριο πριν τη διαγραφή λογαριασμού κάτω των 15 (διόρθωση από διαχειριστή). */
const UNDER_AGE_GRACE_MS = 14 * 24 * 3600_000

/**
 * Ε13: λογαριασμός που έκλεισε επειδή ο χρήστης δήλωσε ηλικία κάτω των 15.
 * Μέχρι να τον σβήσει το cron (lib/cron, 03:00) καμία νέα σύνδεση: αλλιώς θα
 * έπαιρνε τοκεν και θα ακύρωνε το αίτημα από το /user-rights/cancel-delete.
 * Και το 'failed' (το cron απέτυχε) μετράει — ο λογαριασμός υπάρχει ακόμα —
 * όπως και το 'executing' (Ε15: η διαγραφή εκτελείται τώρα).
 */
async function isUnderAgeClosed(userId: string): Promise<boolean> {
  const n = await prisma.accountDeletionRequest.count({
    where: { user_id: userId, reason: UNDER_AGE_REASON, status: { in: ['pending', 'failed', 'executing'] } },
  })
  return n > 0
}

/** Ο σύνδεσμος επαλήθευσης ζει 48 ώρες. */
const EMAIL_VERIFY_TTL_MS = 48 * 3600_000

const verifySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Μη έγκυρος σύνδεσμος επιβεβαίωσης'),
})

/**
 * Νέο τοκεν επαλήθευσης: στη βάση το SHA-256, στο email το καθαρό (όπως το
 * reset). Η αποστολή δεν περιμένεται — η sendEmail δεν πετάει ποτέ.
 * Βάση URL: APP_URL, η ίδια με το email επαναφοράς κωδικού.
 */
async function issueEmailVerification(user: { id: string; email: string; full_name: string }) {
  const token = randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: user.id },
    data: { email_verify_token: hashResetToken(token), email_verify_expires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS) },
  })
  const APP_URL = process.env.APP_URL || 'https://globipet.com'
  void sendEmailVerificationEmail(user.email, { name: user.full_name, url: `${APP_URL}/verify-email?token=${token}` })
}

/**
 * Το 30ήμερο AI trial δίνεται ΜΙΑ φορά, τη στιγμή που το email αποδεικνύεται
 * δικό του (Ε12) — όχι πια στην εγγραφή, όπου έφτανε ένα ψεύτικο email για
 * ατελείωτα δωρεάν trials. Υπό συνθήκη: μόνο αν δεν έχει πάρει/αγοράσει ήδη.
 */
async function grantTrialOnVerification(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId, ai_subscription_status: 'none', ai_trial_started_at: null },
    data: { ai_subscription_status: 'trial', ai_trial_started_at: new Date() },
  })
}

const SUPPORTED_LANGS = ['el', 'en', 'es', 'fr', 'zh']

/**
 * Εύρεση ή δημιουργία λογαριασμού από Google/Facebook με ΕΠΑΛΗΘΕΥΜΕΝΟ email.
 *
 *   Νέος λογαριασμός → επαληθευμένος αμέσως, με trial.
 *   Υπάρχων, ΑΝΕΠΙΒΕΒΑΙΩΤΟΣ λογαριασμός κωδικού → κάποιος τον έφτιαξε με αυτό
 *   το email χωρίς να το αποδείξει. Ο κάτοχος του email (που μόλις το απέδειξε
 *   μέσω του παρόχου) παίρνει τον λογαριασμό: ο κωδικός μηδενίζεται, όλα τα
 *   ενεργά τοκεν ακυρώνονται (token_version+1) — ο «προ-καταληψίας» χάνει την
 *   πρόσβαση. Ο κάτοχος μπορεί να ορίσει κωδικό από το «Ξέχασα τον κωδικό».
 */
async function upsertOAuthUser(req: any, p: { email: string; name?: string | null; photo?: string | null; lang: string; provider: 'google' | 'facebook' }) {
  const now = new Date()
  // Χωρίς διάκριση πεζών/κεφαλαίων: παλιοί λογαριασμοί OAuth γράφτηκαν με το
  // email όπως το έδινε ο πάροχος (το Facebook κρατά τα κεφαλαία του χρήστη).
  let user = await prisma.user.findFirst({
    where: { email: { equals: p.email, mode: 'insensitive' } },
    orderBy: { created_at: 'asc' },
  })
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: p.email,
        full_name: (p.name || '').trim().slice(0, 120) || (p.provider === 'facebook' ? 'Facebook User' : p.email.split('@')[0]),
        profile_photo: p.photo || null,
        role: 'user',
        preferred_language: p.lang,
        email_verified_at: now,
        // Every new OAuth-created account starts a 30-day AI trial — the
        // provider has already verified the email.
        ai_subscription_status: 'trial',
        ai_trial_started_at: now,
      }
    })
    await recordSignupConsent(req, user.id, 'social_signup')
  } else {
    const data: any = {}
    const claimed = !user.email_verified_at
    if (claimed) {
      data.email_verified_at = now
      data.email_verify_token = null
      data.email_verify_expires = null
      if (user.password_hash) {
        data.password_hash = null
        data.token_version = { increment: 1 }
      }
    }
    if (!user.profile_photo && p.photo) data.profile_photo = p.photo
    if (Object.keys(data).length) user = await prisma.user.update({ where: { id: user.id }, data })
    if (claimed) {
      ;(req.server as any)?.invalidateAuthCache?.(user.id)
      await grantTrialOnVerification(user.id)
      user = (await prisma.user.findUnique({ where: { id: user.id } }))!
      await audit(req, {
        action: 'email_verified', resource: 'user', resource_id: user.id,
        metadata: { via: p.provider, password_cleared: 'password_hash' in data },
      })
    }
  }
  await autoLinkProviderStaff(user, req)
  return user
}

/**
 * Λίστα επιτρεπόμενων Google client IDs (aud/azp του τοκεν).
 * GOOGLE_CLIENT_IDS (με κόμμα) ∪ GOOGLE_CLIENT_ID ∪ το webClientId του
 * mobile/app.json (`extra.googleWebClientId`). Τα Android/iOS client IDs
 * ΠΡΕΠΕΙ να μπουν στο GOOGLE_CLIENT_IDS (δεν υπάρχουν στο app.json).
 */
const MOBILE_GOOGLE_WEB_CLIENT_ID = '26367014154-8aqhrgd9l9nr6brcjimfgahnq095vpvu.apps.googleusercontent.com'
function googleClientIds(): string[] {
  const ids = [
    ...(process.env.GOOGLE_CLIENT_IDS || '').split(','),
    process.env.GOOGLE_CLIENT_ID || '',
    MOBILE_GOOGLE_WEB_CLIENT_ID,
  ].map(s => s.trim()).filter(Boolean)
  return [...new Set(ids)]
}

/**
 * Προσωρινοί κωδικοί μίας χρήσης για την ολοκλήρωση του OAuth.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΟΥΝ
 *   Πριν, το callback έστελνε τον χρήστη πίσω με το JWT ΚΑΙ ολόκληρο το
 *   προφίλ μέσα στο URL. Αυτό κατέληγε στο ιστορικό του browser, στην
 *   κεφαλίδα Referer προς κάθε τρίτο script, και στα logs του Cloudflare
 *   και του Railway. Ένα τοκεν επτά ημερών, σε τέσσερα σημεία που δεν
 *   ελέγχουμε.
 *
 *   Τώρα στο URL ταξιδεύει ένας τυχαίος κωδικός που ζει δύο λεπτά και
 *   καταναλώνεται με την πρώτη χρήση. Το JWT φεύγει στο σώμα της απάντησης
 *   του /auth/exchange, που δεν καταγράφεται πουθενά.
 *
 * ΠΕΡΙΟΡΙΣΜΟΣ
 *   Η μνήμη είναι της διεργασίας. Με πολλαπλά instances ή με επανεκκίνηση
 *   μέσα στο δίλεπτο, ο κωδικός χάνεται και ο χρήστης ξαναμπαίνει. Για ένα
 *   instance, που είναι η τρέχουσα διάταξη, δουλεύει.
 */
const OAUTH_CODE_TTL_MS = 120_000
const oauthCodes = new Map<string, { userId: string; expires: number }>()

function issueOAuthCode(userId: string): string {
  const code = randomBytes(32).toString('hex')
  oauthCodes.set(code, { userId, expires: Date.now() + OAUTH_CODE_TTL_MS })
  // Καθάρισμα ληγμένων με την ευκαιρία — ο πίνακας μένει μικρός χωρίς timer.
  const now = Date.now()
  for (const [k, v] of oauthCodes) if (v.expires < now) oauthCodes.delete(k)
  return code
}

/** Καταναλώνει τον κωδικό: επιτυχία το πολύ μία φορά. */
function consumeOAuthCode(code: string): string | null {
  const entry = oauthCodes.get(code)
  if (!entry) return null
  oauthCodes.delete(code)
  if (entry.expires < Date.now()) return null
  return entry.userId
}

/**
 * Το `state` του OAuth προστατεύει από CSRF: εμποδίζει έναν επιτιθέμενο να
 * ξεκινήσει ροή σύνδεσης και να την ολοκληρώσει μέσα στον browser του
 * θύματος, συνδέοντας τον δικό του λογαριασμό Google με τη συνεδρία του.
 *
 * Πριν, η τιμή διαβαζόταν από το query αλλά ΔΕΝ παραγόταν και ΔΕΝ
 * επαληθευόταν ποτέ. Τώρα παράγεται, μπαίνει σε υπογεγραμμένο cookie που
 * δεν διαβάζεται από JavaScript, και ελέγχεται στην επιστροφή.
 */
const STATE_COOKIE = 'gp_oauth_state'
const STATE_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
  signed: true,
}

function setStateCookie(reply: any): string {
  const state = randomBytes(16).toString('hex')
  reply.setCookie(STATE_COOKIE, state, STATE_COOKIE_OPTS)
  return state
}

/** true μόνο αν το state της επιστροφής ταιριάζει με το cookie. */
function checkStateCookie(req: any, reply: any, state: unknown): boolean {
  const raw = req.cookies?.[STATE_COOKIE]
  reply.clearCookie(STATE_COOKIE, { path: '/' })
  if (!raw || typeof state !== 'string') return false
  const unsigned = req.unsignCookie(raw)
  return unsigned.valid && unsigned.value === state
}

const authRoutes: FastifyPluginAsync = async (app) => {

  // Register
  app.post('/register', async (req, reply) => {
    const parsed = parseBody(registerSchema, req.body, reply)
    if (!parsed) return
    const { full_name, email, password, role, preferred_language, phone, birth_date } = parsed
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      await audit(req, { action: 'register', resource: 'user', outcome: 'failure', metadata: { reason: 'email_taken', email } })
      return reply.code(409).send({ message: 'Email ήδη χρησιμοποιείται' })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
    }

    /**
     * Ελάχιστη ηλικία 15 ετών.
     *
     * Ο GDPR αφήνει σε κάθε κράτος να ορίσει το όριο συγκατάθεσης ανηλίκου
     * ανάμεσα σε 13 και 16· η Ελλάδα το έχει θέσει στα 15. Κάτω από αυτό
     * απαιτείται συγκατάθεση γονέα, που η πλατφόρμα δεν υποστηρίζει.
     *
     * Ο έλεγχος γίνεται ΕΔΩ και όχι μόνο στη φόρμα: το frontend είναι
     * ευκολία για τον χρήστη, δεν είναι δικλείδα — οποιοσδήποτε μπορεί να
     * στείλει αίτημα κατευθείαν στο API.
     */
    const dob = birth_date ? new Date(birth_date) : null
    if (!dob || Number.isNaN(dob.getTime())) {
      return reply.code(400).send({ message: 'Η ημερομηνία γέννησης είναι υποχρεωτική' })
    }
    const age = ageInYears(dob)
    if (age < MIN_AGE) {
      await audit(req, { action: 'register', resource: 'user', outcome: 'failure', metadata: { reason: 'under_age' } })
      return reply.code(403).send({ message: 'Πρέπει να είσαι τουλάχιστον 15 ετών για να δημιουργήσεις λογαριασμό' })
    }
    if (age > 120) {
      return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία γέννησης' })
    }
    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        password_hash,
        role: safeRole(role),
        preferred_language: preferred_language || 'el',
        birth_date: dob,
        // Sensitive fields encrypted at rest
        phone: encryptField(phone) as any,
        // Ε12: ΚΑΝΕΝΑ trial και καμία σύνδεση προσωπικού εδώ. Ο λογαριασμός
        // είναι ενεργός, αλλά το email δεν έχει αποδειχθεί (email_verified_at
        // null). Το trial και η σύνδεση με εγγραφές προσωπικού γίνονται στο
        // POST /auth/verify-email.
      }
    })
    await recordSignupConsent(req, user.id, 'registration')
    // Αποτυχία εδώ δεν ακυρώνει την εγγραφή — ο χρήστης έχει «Ξαναστείλε».
    try { await issueEmailVerification(user) }
    catch (err) { console.error('[auth] verification email not issued', user.id, err) }

    const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
    await audit(req, { action: 'register', resource: 'user', resource_id: user.id })
    return { user: await toSafeUser(user), token }
  })

  // Login
  app.post('/login', async (req, reply) => {
    const parsed = parseBody(loginSchema, req.body, reply)
    if (!parsed) return
    const { email, password } = parsed
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH) // σταθερός χρόνος (βλ. DUMMY_PASSWORD_HASH)
      await audit(req, { action: 'login', resource: 'user', outcome: 'failure', metadata: { reason: 'no_such_user', email } })
      return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await audit(req, { action: 'login', resource: 'user', outcome: 'failure', metadata: { reason: 'wrong_password' } })
      return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    }
    if (await isUnderAgeClosed(user.id)) {
      await audit(req, { action: 'login', resource: 'user', resource_id: user.id, outcome: 'failure', metadata: { reason: 'under_age_closed' } })
      return reply.code(403).send({ message: UNDER_AGE_MESSAGE })
    }
    // Pick up any staff records the employer added for this email after the
    // user's original registration. Silent no-op when there is nothing new
    // — and when the email is not verified yet.
    await autoLinkProviderStaff(user, req)
    const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
    await audit(req, { action: 'login', resource: 'user', resource_id: user.id })
    return { user: await toSafeUser(user), token }
  })

  // Me
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = (req.user as any)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    return await toSafeUser(user)
  })

  // Update me (PATCH /auth/me or PATCH /users/me - whichever your frontend uses)
  // The web store calls PATCH /users/me, but we'll also add PATCH /auth/me for safety
  //
  // Ε12: ίδιο σχήμα με το PATCH /users/me (users.ts → profileSchema): μήκη,
  // website μόνο http(s), profile_photo μόνο https από το R2. Σε λειτουργία
  // strip — άγνωστα πεδία αγνοούνται σιωπηλά, όπως πριν (συμβατότητα).
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = (req.user as any)
    const parsed = parseBody(profileSchema.strip(), req.body, reply)
    if (!parsed) return
    const updateData: any = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) updateData[key] = value
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'No fields to update' })
    }
    // Encrypt sensitive fields before write
    if ('phone'   in updateData) updateData.phone   = encryptField(updateData.phone)
    if ('address' in updateData) updateData.address = encryptField(updateData.address)
    const user = await prisma.user.update({ where: { id }, data: updateData })
    return await toSafeUser(user)
  })

  /**
   * Ε13 — Ημερομηνία γέννησης για λογαριασμούς χωρίς αυτήν (Google/Facebook,
   * παλιοί λογαριασμοί). Το PATCH /auth/me ΔΕΝ τη δέχεται (profileSchema, strip).
   *
   *   · Ορίζεται ΜΟΝΟ όταν είναι κενή — μία φορά, ατομικά (updateMany υπό
   *     συνθήκη birth_date = null). Μετά δεν αλλάζει από εδώ: 409.
   *   · Ίδιο όριο και ίδιος υπολογισμός με την εγγραφή (MIN_AGE, ageInYears).
   *   · Κάτω των 15 → 403. Ο λογαριασμός ΔΕΝ ενεργοποιείται: η ημερομηνία δεν
   *     αποθηκεύεται, καταχωρείται αίτημα διαγραφής (reason 'under_age',
   *     scheduled_for = τώρα + 14 ημέρες — UNDER_AGE_GRACE_MS — ώστε ένα λάθος
   *     έτος να μπορεί να διορθωθεί από διαχειριστή πριν τη μη αναστρέψιμη
   *     διαγραφή· μετά το εκτελεί το cron της 03:00 με την κοινή
   *     eraseUserAccount), όλες οι συνεδρίες ακυρώνονται (token_version+1) και
   *     καμία νέα σύνδεση δεν γίνεται δεκτή (isUnderAgeClosed).
   *
   *   ΓΙΑΤΙ ΑΙΤΗΜΑ ΚΑΙ ΟΧΙ ΑΜΕΣΗ eraseUserAccount: η διαγραφή είναι
   *   μη αναστρέψιμη και ένα λάθος έτος (π.χ. 2015 αντί 1985) από παλιό
   *   χρήστη με παραγγελίες/συνδρομές θα τα έσβηνε στη στιγμή· επίσης η
   *   eraseUserAccount μπορεί να αποτύχει στη μέση (Stripe) και το cron έχει
   *   ήδη επανάληψη και καταγραφή. Μέχρι την εκτέλεση ο λογαριασμός είναι
   *   κλειστός και εξαιρείται από τα μαζικά email (admin.ts: pending).
   */
  app.patch('/me/birth-date', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id } = req.user as any
    const parsed = parseBody(birthDateSchema, req.body, reply)
    if (!parsed) return
    const dob = new Date(parsed.birth_date)
    // Ημερομηνία που δεν υπάρχει (π.χ. 2001-02-30) δεν «γυρίζει» ίδια.
    if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== parsed.birth_date) {
      return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία γέννησης' })
    }
    const now = new Date()
    // Μελλοντική ημερομηνία = λάθος πληκτρολόγησης, όχι ανήλικος — 400, όχι κλείσιμο.
    if (dob.getTime() > now.getTime()) {
      return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία γέννησης' })
    }
    const age = ageInYears(dob, now)
    if (age > 120) return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία γέννησης' })

    const current = await prisma.user.findUnique({ where: { id }, select: { id: true, birth_date: true } })
    if (!current) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    if (current.birth_date) return reply.code(409).send({ message: 'Η ημερομηνία γέννησης έχει ήδη οριστεί' })

    if (age < MIN_AGE) {
      // Διαγραφή σε 14 ημέρες, ΟΧΙ αμέσως: περιθώριο ώστε διαχειριστής να
      // διορθώσει λάθος δήλωση (π.χ. 2015 αντί 1985) ακυρώνοντας το αίτημα.
      // Ο λογαριασμός μένει κλειστός (isUnderAgeClosed) σε όλο το διάστημα.
      const scheduledFor = new Date(now.getTime() + UNDER_AGE_GRACE_MS)
      // Υπάρχον εκκρεμές αίτημα (του ίδιου του χρήστη, 30 ημερών) → γίνεται
      // under_age· η ημερομηνία του μόνο ΠΡΟΣ ΤΑ ΠΙΣΩ (ποτέ αργότερα από όσο ήταν).
      const moved = await prisma.accountDeletionRequest.updateMany({
        where: { user_id: id, status: 'pending' },
        data: { reason: UNDER_AGE_REASON },
      })
      if (moved.count > 0) {
        await prisma.accountDeletionRequest.updateMany({
          where: { user_id: id, status: 'pending', scheduled_for: { gt: scheduledFor } },
          data: { scheduled_for: scheduledFor },
        })
      } else {
        await prisma.accountDeletionRequest.create({
          data: { user_id: id, reason: UNDER_AGE_REASON, status: 'pending', scheduled_for: scheduledFor },
        })
      }
      await prisma.user.update({ where: { id }, data: { token_version: { increment: 1 } } })
      ;(app as any).invalidateAuthCache?.(id)
      // Χωρίς την ημερομηνία στο audit — δεδομένο ανηλίκου που δεν κρατάμε.
      await audit(req, { action: 'birth_date_under_age', resource: 'user', resource_id: id, outcome: 'failure', metadata: { deletion_scheduled_for: scheduledFor.toISOString() } })
      return reply.code(403).send({ message: UNDER_AGE_MESSAGE, account_closed: true })
    }

    const done = await prisma.user.updateMany({ where: { id, birth_date: null }, data: { birth_date: dob } })
    if (done.count === 0) return reply.code(409).send({ message: 'Η ημερομηνία γέννησης έχει ήδη οριστεί' })
    // Ε16: η πύλη του authenticate (index.ts) κρατά στο cache ότι λείπει η
    // ημερομηνία — καθαρίζει ΑΜΕΣΩΣ, αλλιώς τα επόμενα αιτήματα θα έπαιρναν
    // 403 birth_date_required για έως 30″.
    ;(app as any).invalidateAuthCache?.(id)
    await audit(req, { action: 'birth_date_set', resource: 'user', resource_id: id })
    const user = await prisma.user.findUnique({ where: { id } })
    return await toSafeUser(user)
  })

  // Refresh — ξαναδιαβάζει τον χρήστη: διαγραμμένος ή ανακλημένος → 401
  // (το authenticate το έχει ήδη ελέγξει), νέο τοκεν με τον ΤΡΕΧΟΝΤΑ ρόλο.
  app.post('/refresh', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = req.user as any
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, token_version: true } })
    if (!user) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
    return { token }
  })

  /**
   * Αποσύνδεση από ΟΛΕΣ τις συσκευές (Ε12).
   *
   * Με stateless JWT δεν γίνεται να ακυρωθεί μόνο ένα τοκεν· η απλή
   * αποσύνδεση του client μένει τοπική. Αυτό αυξάνει το token_version και
   * κάθε τοκεν που έχει εκδοθεί ως τώρα — και αυτό της κλήσης — παύει να ισχύει.
   */
  app.post('/logout-all', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { id } = req.user as any
    await prisma.user.update({ where: { id }, data: { token_version: { increment: 1 } } })
    ;(app as any).invalidateAuthCache?.(id)
    // Οι συσκευές push του χρήστη σβήνονται (best-effort): μια συσκευή που
    // αποσυνδέθηκε δεν πρέπει να λαμβάνει πια ειδοποιήσεις. Το κινητό
    // ξαναδηλώνεται μόνο του στην επόμενη σύνδεση/εκκίνηση.
    await prisma.pushSubscription.deleteMany({ where: { user_id: id } })
      .catch((e: any) => console.error('[logout-all] push cleanup failed:', e?.message))
    await audit(req, { action: 'logout_all', resource: 'user', resource_id: id })
    return { message: 'Αποσυνδέθηκες από όλες τις συσκευές' }
  })

  /**
   * Επαλήθευση email από τον σύνδεσμο του email (Ε12).
   *
   * Χωρίς σύνδεση: ο σύνδεσμος μπορεί να ανοίξει σε άλλο browser ή από το
   * κινητό. Το τοκεν είναι 256 bit, μίας χρήσης, 48 ωρών, και στη βάση μένει
   * μόνο το hash του. Στην επιτυχία: AI trial (μία φορά) και σύνδεση με τις
   * εγγραφές προσωπικού που έχει ετοιμάσει ο εργοδότης για αυτό το email.
   */
  app.post('/verify-email', async (req: any, reply) => {
    const parsed = parseBody(verifySchema, req.body, reply)
    if (!parsed) return
    const hash = hashResetToken(parsed.token.toLowerCase())
    const user = await prisma.user.findFirst({
      where: { email_verify_token: hash, email_verify_expires: { gt: new Date() } },
    })
    if (!user) {
      await audit(req, { action: 'email_verify', resource: 'user', outcome: 'failure', metadata: { reason: 'invalid_or_expired_token' } })
      return reply.code(400).send({ message: 'Μη έγκυρος ή ληγμένος σύνδεσμος επιβεβαίωσης' })
    }
    // Ατομικά: μόνο όποιο αίτημα βρει ακόμα το τοκεν το καταναλώνει.
    const done = await prisma.user.updateMany({
      where: { id: user.id, email_verify_token: hash },
      data: { email_verified_at: user.email_verified_at ?? new Date(), email_verify_token: null, email_verify_expires: null },
    })
    if (done.count === 0) return reply.code(400).send({ message: 'Μη έγκυρος ή ληγμένος σύνδεσμος επιβεβαίωσης' })
    await grantTrialOnVerification(user.id)
    await autoLinkProviderStaff({ ...user, email_verified_at: user.email_verified_at ?? new Date() }, req)
    await audit(req, { action: 'email_verified', resource: 'user', resource_id: user.id, metadata: { via: 'link' } })
    return { message: 'Το email σου επιβεβαιώθηκε', email_verified: true }
  })

  /** Νέος σύνδεσμος επαλήθευσης για τον συνδεδεμένο χρήστη (όριο: index.ts). */
  app.post('/resend-verification', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id } = req.user as any
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, full_name: true, email_verified_at: true } })
    if (!user) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    if (user.email_verified_at) return { message: 'Το email σου είναι ήδη επιβεβαιωμένο', email_verified: true }
    await issueEmailVerification(user)
    await audit(req, { action: 'email_verify_resend', resource: 'user', resource_id: user.id })
    return { message: 'Σου στείλαμε νέο email επιβεβαίωσης', email_verified: false }
  })

  // ─── GOOGLE OAUTH FOR MOBILE APPS ────────────────────────────────
  // Mobile app sends Google's id_token (νέες εκδόσεις) και/ή access_token
  // (ήδη εγκατεστημένες) από τη native ροή.
  //
  // Ε12 — ΕΛΕΓΧΟΣ AUDIENCE. Πριν, αρκούσε ΟΠΟΙΟΔΗΠΟΤΕ έγκυρο access token
  // Google: το userinfo επιβεβαιώνει μόνο ότι το τοκεν είναι ζωντανό, όχι για
  // ποια εφαρμογή εκδόθηκε. Μια τρίτη εφαρμογή («Σύνδεση με Google» σε
  // οποιοδήποτε site) που έπαιρνε τοκεν από το θύμα, μπορούσε να το φέρει εδώ
  // και να μπει στον λογαριασμό του. Τώρα το tokeninfo της Google πρέπει να
  // δείχνει aud/azp από τη λίστα μας (googleClientIds) και επιβεβαιωμένο email.
  app.post('/google/mobile', async (req: any, reply) => {
    try {
      const { access_token, id_token, user: googleUserData } = (req.body ?? {}) as any

      if ((typeof access_token !== 'string' || !access_token) && (typeof id_token !== 'string' || !id_token)) {
        return reply.code(400).send({ message: 'Λείπουν δεδομένα' })
      }
      const allowed = googleClientIds()
      if (!allowed.length) {
        console.error('[auth] GOOGLE_CLIENT_IDS/GOOGLE_CLIENT_ID δεν έχουν οριστεί — η σύνδεση Google από κινητό απορρίπτεται')
        return reply.code(503).send({ message: 'Η σύνδεση με Google δεν είναι διαθέσιμη αυτή τη στιγμή' })
      }

      const useId = typeof id_token === 'string' && !!id_token
      const infoUrl = new URL('https://oauth2.googleapis.com/tokeninfo')
      infoUrl.searchParams.set(useId ? 'id_token' : 'access_token', useId ? id_token : access_token)
      const infoRes = await fetch(infoUrl.toString())
      if (!infoRes.ok) {
        return reply.code(401).send({ message: 'Μη έγκυρο Google token' })
      }
      const info = await infoRes.json() as any
      // id_token: το aud ΠΡΕΠΕΙ να είναι δικό μας. access token: aud ή azp
      // (ο client που το ζήτησε — π.χ. το Android client ID).
      const audOk = allowed.includes(String(info.aud ?? ''))
        || (!useId && allowed.includes(String(info.azp ?? '')))
      const issOk = !useId || info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com'
      if (!audOk || !issOk) {
        console.warn('[auth] google/mobile: token for foreign client rejected', { aud: info.aud, azp: info.azp })
        await audit(req, { action: 'oauth_login', resource: 'user', outcome: 'failure', metadata: { provider: 'google', reason: 'audience_mismatch', aud: info.aud ?? null } })
        return reply.code(401).send({ message: 'Μη έγκυρο Google token' })
      }
      const verifiedEmail = typeof info.email === 'string' ? info.email.trim().toLowerCase() : ''
      if (!verifiedEmail) return reply.code(401).send({ message: 'Μη έγκυρο Google token' })
      if (!(info.email_verified === true || info.email_verified === 'true')) {
        return reply.code(403).send({ message: 'Το email του λογαριασμού Google δεν είναι επιβεβαιωμένο' })
      }

      // Make sure the email matches what client sent (prevent token swapping)
      if (googleUserData?.email && String(googleUserData.email).trim().toLowerCase() !== verifiedEmail) {
        return reply.code(401).send({ message: 'Email mismatch' })
      }

      // Όνομα/φωτογραφία/γλώσσα: από το id_token ή, για access token, από το
      // userinfo με το ήδη ελεγμένο τοκεν. Η φωτογραφία ΠΟΤΕ από τον client.
      let profile: any = useId ? info : {}
      if (!useId) {
        const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (uRes.ok) profile = await uRes.json() as any
      }

      // Get preferred language from Google locale
      const googleLocale = String(profile.locale || googleUserData?.locale || '').toLowerCase().split('-')[0]
      const preferredLang = SUPPORTED_LANGS.includes(googleLocale) ? googleLocale : 'el'

      const user = await upsertOAuthUser(req, {
        email: verifiedEmail,
        name: profile.name || (typeof googleUserData?.full_name === 'string' ? googleUserData.full_name : null),
        photo: typeof profile.picture === 'string' && profile.picture.startsWith('https://') ? profile.picture : null,
        lang: preferredLang,
        provider: 'google',
      })
      if (await isUnderAgeClosed(user.id)) return reply.code(403).send({ message: UNDER_AGE_MESSAGE })
      const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
      return { user: await toSafeUser(user), token }
    } catch (err: any) {
      console.error('Google mobile OAuth error:', err)
      return reply.code(500).send({ message: 'Σφάλμα διακομιστή' })
    }
  })

  // ─── FACEBOOK OAUTH FOR MOBILE APPS ──────────────────────────────
  // Mobile app sends Facebook's access_token from the native FB SDK.
  //
  // Ε12 — ΕΛΕΓΧΟΣ ΕΦΑΡΜΟΓΗΣ. Το /me δέχεται τοκεν ΟΠΟΙΑΣΔΗΠΟΤΕ εφαρμογής
  // Facebook. Πρώτα το debug_token (με app access token) επιβεβαιώνει ότι το
  // τοκεν είναι έγκυρο ΚΑΙ εκδόθηκε για τη δική μας εφαρμογή (app_id).
  app.post('/facebook/mobile', async (req: any, reply) => {
    try {
      const { access_token } = (req.body ?? {}) as any
      if (typeof access_token !== 'string' || !access_token) {
        return reply.code(400).send({ message: 'Λείπει το access token' })
      }

      const appId = (process.env.FACEBOOK_APP_ID || '').trim()
      const appSecret = (process.env.FACEBOOK_APP_SECRET || '').trim()
      if (!appId || !appSecret) {
        console.error('[auth] FACEBOOK_APP_ID/FACEBOOK_APP_SECRET δεν έχουν οριστεί — η σύνδεση Facebook από κινητό απορρίπτεται')
        return reply.code(503).send({ message: 'Η σύνδεση με Facebook δεν είναι διαθέσιμη αυτή τη στιγμή' })
      }

      const dbg = new URL('https://graph.facebook.com/v18.0/debug_token')
      dbg.searchParams.set('input_token', access_token)
      dbg.searchParams.set('access_token', `${appId}|${appSecret}`)
      const dbgRes = await fetch(dbg.toString())
      const dbgData = dbgRes.ok ? (await dbgRes.json() as any)?.data : null
      if (!dbgData?.is_valid || String(dbgData.app_id ?? '') !== appId) {
        console.warn('[auth] facebook/mobile: token rejected', { app_id: dbgData?.app_id ?? null, valid: !!dbgData?.is_valid })
        await audit(req, { action: 'oauth_login', resource: 'user', outcome: 'failure', metadata: { provider: 'facebook', reason: 'app_mismatch_or_invalid' } })
        return reply.code(401).send({ message: 'Μη έγκυρο Facebook token' })
      }

      // Fields we ask for:
      //   id       — Facebook's stable user id
      //   email    — requires 'email' permission (we always request it)
      //   name     — full name
      //   picture  — profile photo (large, ~200x200)
      //   locale   — used to seed preferred_language
      const url = new URL('https://graph.facebook.com/v18.0/me')
      url.searchParams.set('fields', 'id,email,name,picture.type(large),locale')
      url.searchParams.set('access_token', access_token)

      const verifyRes = await fetch(url.toString())
      if (!verifyRes.ok) {
        return reply.code(401).send({ message: 'Μη έγκυρο Facebook token' })
      }
      const fbUser = await verifyRes.json() as any
      if (dbgData.user_id && fbUser.id && String(dbgData.user_id) !== String(fbUser.id)) {
        return reply.code(401).send({ message: 'Μη έγκυρο Facebook token' })
      }

      if (!fbUser.email) {
        // Some FB users deny the email permission — we cannot create an
        // account without an email address as the primary key.
        return reply.code(400).send({
          message: 'Απαιτείται πρόσβαση στο email σας. Παρακαλώ επιτρέψτε την κοινοποίηση email και ξαναδοκιμάστε.'
        })
      }

      // Map Facebook locale (e.g. "el_GR") to our supported languages
      const fbLocale = (fbUser.locale || '').toLowerCase().split('_')[0]
      const preferredLang = SUPPORTED_LANGS.includes(fbLocale) ? fbLocale : 'el'

      const fbPicture = fbUser.picture?.data?.url || null

      // Το Facebook δίνει μόνο επιβεβαιωμένο κύριο email → θεωρείται επαληθευμένο.
      const user = await upsertOAuthUser(req, {
        email: String(fbUser.email).trim().toLowerCase(),
        name: fbUser.name || 'Facebook User',
        photo: fbPicture,
        lang: preferredLang,
        provider: 'facebook',
      })
      if (await isUnderAgeClosed(user.id)) return reply.code(403).send({ message: UNDER_AGE_MESSAGE })
      const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
      return { user: await toSafeUser(user), token }
    } catch (err: any) {
      console.error('Facebook mobile OAuth error:', err)
      return reply.code(500).send({ message: 'Σφάλμα διακομιστή' })
    }
  })

  // ─── GOOGLE OAUTH ───────────────────────────────────────────────

  app.get('/google', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: setStateCookie(reply),
    })
    reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  app.get('/google/callback', async (req: any, reply) => {
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    try {
      const { code, state } = req.query
      if (!code) return reply.redirect(`${APP_URL}/login?error=no_code`)
      if (!checkStateCookie(req, reply, state)) {
        await audit(req, { action: 'oauth_login', resource: 'user', outcome: 'failure', metadata: { provider: 'google', reason: 'state_mismatch' } })
        return reply.redirect(`${APP_URL}/login?error=state_mismatch`)
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) return reply.redirect(`${APP_URL}/login?error=token_failed`)

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (!userRes.ok) return reply.redirect(`${APP_URL}/login?error=google_failed`)
      const googleUser = await userRes.json() as any
      // Ε12: μόνο επιβεβαιωμένο από τη Google email — αλλιώς κάποιος με
      // ανεπιβεβαίωτο email τρίτου στη Google θα έπαιρνε τον λογαριασμό του.
      if (!googleUser.email || googleUser.verified_email !== true) {
        await audit(req, { action: 'oauth_login', resource: 'user', outcome: 'failure', metadata: { provider: 'google', reason: 'email_not_verified' } })
        return reply.redirect(`${APP_URL}/login?error=google_unverified`)
      }

      // Try to read preferred language from Google profile (locale field)
      const googleLocale = (googleUser.locale || '').toLowerCase().split('-')[0]
      const preferredLang = SUPPORTED_LANGS.includes(googleLocale) ? googleLocale : 'el'

      const user = await upsertOAuthUser(req, {
        email: String(googleUser.email).trim().toLowerCase(),
        name: googleUser.name,
        photo: googleUser.picture,
        lang: preferredLang,
        provider: 'google',
      })
      if (await isUnderAgeClosed(user.id)) return reply.redirect(`${APP_URL}/login?error=under_age`)
      reply.redirect(`${APP_URL}/auth/complete?code=${issueOAuthCode(user.id)}`)
    } catch (err: any) {
      console.error('Google OAuth error:', err)
      reply.redirect(`${APP_URL}/login?error=google_failed`)
    }
  })

  // ─── FACEBOOK OAUTH ─────────────────────────────────────────────

  app.get('/facebook', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || '',
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL || '',
      scope: 'email,public_profile',
      response_type: 'code',
      state: setStateCookie(reply),
    })
    reply.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`)
  })

  app.get('/facebook/callback', async (req: any, reply) => {
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    try {
      const { code, state } = req.query
      if (!code) return reply.redirect(`${APP_URL}/login?error=no_code`)
      if (!checkStateCookie(req, reply, state)) {
        await audit(req, { action: 'oauth_login', resource: 'user', outcome: 'failure', metadata: { provider: 'facebook', reason: 'state_mismatch' } })
        return reply.redirect(`${APP_URL}/login?error=state_mismatch`)
      }

      const tokenRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL || '')}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`
      )
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) return reply.redirect(`${APP_URL}/login?error=fb_token_failed`)

      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture,locale&access_token=${tokens.access_token}`
      )
      const fbUser = await userRes.json() as any

      if (!fbUser.email) return reply.redirect(`${APP_URL}/login?error=fb_no_email`)

      // Try to read preferred language from Facebook profile (locale field, e.g. "el_GR")
      const fbLocale = (fbUser.locale || '').toLowerCase().split('_')[0]
      const preferredLang = SUPPORTED_LANGS.includes(fbLocale) ? fbLocale : 'el'

      // Το τοκεν εδώ προέρχεται από ΔΙΚΗ ΜΑΣ ανταλλαγή code (client_secret),
      // άρα ανήκει στην εφαρμογή μας· το Facebook δίνει μόνο επιβεβαιωμένο email.
      const user = await upsertOAuthUser(req, {
        email: String(fbUser.email).trim().toLowerCase(),
        name: fbUser.name,
        photo: fbUser.picture?.data?.url,
        lang: preferredLang,
        provider: 'facebook',
      })
      if (await isUnderAgeClosed(user.id)) return reply.redirect(`${APP_URL}/login?error=under_age`)
      reply.redirect(`${APP_URL}/auth/complete?code=${issueOAuthCode(user.id)}`)
    } catch (err: any) {
      console.error('Facebook OAuth error:', err)
      reply.redirect(`${APP_URL}/login?error=facebook_failed`)
    }
  })

  /**
   * Ανταλλαγή του προσωρινού κωδικού με το πραγματικό τοκεν.
   *
   * Καλείται μία φορά από τη σελίδα /auth/complete, αμέσως μετά την
   * επιστροφή από Google ή Facebook. Ο κωδικός καταναλώνεται εδώ: δεύτερη
   * κλήση με τον ίδιο κωδικό αποτυγχάνει, ακόμα κι αν κάποιος τον βρει
   * στο ιστορικό του browser.
   */
  app.post('/exchange', async (req: any, reply) => {
    const { code } = (req.body ?? {}) as any
    if (typeof code !== 'string' || !code) {
      return reply.code(400).send({ message: 'Λείπει ο κωδικός' })
    }

    const userId = consumeOAuthCode(code)
    if (!userId) {
      await audit(req, { action: 'oauth_exchange', resource: 'user', outcome: 'failure', metadata: { reason: 'invalid_or_expired_code' } })
      return reply.code(400).send({ message: 'Ο σύνδεσμος έληξε. Δοκιμάστε ξανά.' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(400).send({ message: 'Ο λογαριασμός δεν βρέθηκε' })
    if (await isUnderAgeClosed(user.id)) return reply.code(403).send({ message: UNDER_AGE_MESSAGE })

    const token = app.jwt.sign(sessionClaims(user), { expiresIn: '7d' })
    await audit(req, { action: 'oauth_exchange', resource: 'user', resource_id: user.id })
    return { user: await toSafeUser(user), token }
  })

  // Forgot password
  app.post('/forgot-password', async (req: any, reply) => {
    const parsed = parseBody(forgotSchema, req.body, reply)
    if (!parsed) return
    const { email } = parsed
    const user = await prisma.user.findUnique({ where: { email } })
    // Always return success message to prevent user enumeration
    if (!user) {
      await audit(req, { action: 'password_reset_request', resource: 'user', outcome: 'failure', metadata: { reason: 'no_such_user', email } })
      return { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }
    }

    // Cryptographically secure token (256 bits of entropy) instead of Math.random
    const { randomBytes } = await import('crypto')
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: hashResetToken(token), reset_token_expires: expires }
    })

    const RESEND_KEY = process.env.RESEND_API_KEY
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    // Localized email subjects/content based on user's preferred language
    const lang = user.preferred_language || 'el'
    const emailContent: Record<string, { subject: string; title: string; body: string; cta: string; expiry: string }> = {
      el: {
        subject: 'Επαναφορά κωδικού GlobiPet',
        title: 'Επαναφορά κωδικού',
        body: 'Κάντε κλικ στον παρακάτω σύνδεσμο για να αλλάξετε τον κωδικό σας:',
        cta: 'Αλλαγή κωδικού',
        expiry: 'Ο σύνδεσμος λήγει σε 1 ώρα. Αν δεν ζητήσατε αλλαγή κωδικού, αγνοήστε αυτό το email.',
      },
      en: {
        subject: 'GlobiPet Password Reset',
        title: 'Password Reset',
        body: 'Click the link below to reset your password:',
        cta: 'Reset Password',
        expiry: 'This link expires in 1 hour. If you did not request a password reset, please ignore this email.',
      },
      es: {
        subject: 'Restablecer contraseña GlobiPet',
        title: 'Restablecer contraseña',
        body: 'Haz clic en el siguiente enlace para restablecer tu contraseña:',
        cta: 'Restablecer contraseña',
        expiry: 'Este enlace expira en 1 hora. Si no solicitaste el cambio, ignora este email.',
      },
      fr: {
        subject: 'Réinitialisation du mot de passe GlobiPet',
        title: 'Réinitialiser le mot de passe',
        body: 'Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:',
        cta: 'Réinitialiser',
        expiry: 'Ce lien expire dans 1 heure. Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
      },
      zh: {
        subject: 'GlobiPet 密码重置',
        title: '重置密码',
        body: '点击下方链接重置您的密码:',
        cta: '重置密码',
        expiry: '此链接1小时后过期。如果您未请求重置密码,请忽略此邮件。',
      },
    }
    const c = emailContent[lang] || emailContent.el

    // Ε12: ΔΕΝ περιμένουμε το Resend. Η απάντηση για υπαρκτό email έπαιρνε
    // όσο ο γύρος προς το Resend (εκατοντάδες ms) και για ανύπαρκτο ήταν
    // άμεση — η διαφορά χρόνου μαρτυρούσε ποια email είναι εγγεγραμμένα.
    if (RESEND_KEY) {
      void fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'GlobiPet <noreply@globipet.com>',
          to: email,
          subject: c.subject,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <img src="${APP_URL}/logo.png" alt="GlobiPet" style="height:50px;margin-bottom:20px"/>
              <h2>${c.title}</h2>
              <p>${c.body}</p>
              <a href="${resetUrl}" style="display:inline-block;background:#E65100;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">${c.cta}</a>
              <p style="color:#666;font-size:14px">${c.expiry}</p>
            </div>
          `
        })
      }).catch((err: any) => console.error('[auth] reset email failed:', err?.message))
    }

    return { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }
  })

  // Reset password
  app.post('/reset-password', async (req: any, reply) => {
    const parsed = parseBody(resetSchema, req.body, reply)
    if (!parsed) return
    const { token, password } = parsed
    if (!token || !password) return reply.code(400).send({ message: 'Λείπουν στοιχεία' })
    if (typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
    }
    const user = await prisma.user.findFirst({
      where: { reset_token: hashResetToken(token), reset_token_expires: { gt: new Date() } }
    })
    if (!user) {
      await audit(req, { action: 'password_reset_complete', resource: 'user', outcome: 'failure', metadata: { reason: 'invalid_or_expired_token' } })
      return reply.code(400).send({ message: 'Μη έγκυρος ή ληγμένος σύνδεσμος' })
    }

    const bcryptMod = await import('bcryptjs')
    const password_hash = await bcryptMod.hash(password, 12)
    // Ε12: token_version+1 → κάθε συνεδρία που υπήρχε (π.χ. αυτού που έκλεψε
    // τον κωδικό) τελειώνει. Ο σύνδεσμος ήρθε στο email, άρα αποδεικνύει και
    // την κατοχή του: ανεπιβεβαίωτος λογαριασμός γίνεται επαληθευμένος.
    const newlyVerified = !user.email_verified_at
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash, reset_token: null, reset_token_expires: null,
        token_version: { increment: 1 },
        ...(newlyVerified ? { email_verified_at: new Date(), email_verify_token: null, email_verify_expires: null } : {}),
      }
    })
    ;(app as any).invalidateAuthCache?.(user.id)
    // Οι συσκευές push του χρήστη σβήνονται (best-effort): μια συσκευή που
    // αποσυνδέθηκε δεν πρέπει να λαμβάνει πια ειδοποιήσεις. Το κινητό
    // ξαναδηλώνεται μόνο του στην επόμενη σύνδεση/εκκίνηση.
    await prisma.pushSubscription.deleteMany({ where: { user_id: user.id } })
      .catch((e: any) => console.error('[reset-password] push cleanup failed:', e?.message))
    if (newlyVerified) {
      await grantTrialOnVerification(user.id)
      await autoLinkProviderStaff({ ...user, email_verified_at: new Date() }, req)
    }
    await audit(req, { action: 'password_reset_complete', resource: 'user', resource_id: user.id })
    return { message: 'Ο κωδικός άλλαξε επιτυχώς' }
  })

}

export default authRoutes
