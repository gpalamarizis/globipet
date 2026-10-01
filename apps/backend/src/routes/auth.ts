import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { parseBody, text, email as emailField, phone, language } from '../lib/validate.js'
import prisma from '../lib/prisma.js'
import { encryptField, decryptField, decryptUserFields } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'

/**
 * Auto-link any provider_staff records that were pre-created by an employer
 * for this email address but have not yet been linked to a user account.
 *
 * Flow:
 *   1. Provider adds their employee by email (creates a ProviderStaff row
 *      with `email` set but `user_id` = null).
 *   2. Employee later signs up on GlobiPet (via password / Google / Facebook).
 *   3. This function runs and fills in `user_id` on every matching staff row,
 *      so the employee lands with the staff dashboard ready.
 *
 * Case-insensitive email match. Safe to call on every login too — a no-op
 * when there is nothing to link.
 */
async function autoLinkProviderStaff(userId: string, userEmail: string, req: any) {
  const email = userEmail.trim().toLowerCase()
  const unlinked = await (prisma as any).providerStaff.findMany({
    where: {
      user_id: null,
      email: { equals: email, mode: 'insensitive' },
    },
    select: { id: true, service_id: true, provider_email: true, full_name: true },
  })
  if (!unlinked.length) return 0

  await (prisma as any).providerStaff.updateMany({
    where: { id: { in: unlinked.map((s: any) => s.id) } },
    data: { user_id: userId, updated_at: new Date() },
  })

  // One audit line per linked record so employers can see who was auto-linked
  for (const s of unlinked) {
    await audit(req, {
      action: 'staff_auto_link',
      resource: 'provider_staff',
      resource_id: s.id,
      metadata: {
        service_id: s.service_id,
        provider_email: s.provider_email,
        staff_name: s.full_name,
      },
    })
  }
  return unlinked.length
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
})

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Ο κωδικός είναι υποχρεωτικός').max(200),
})

const forgotSchema = z.object({ email: emailField })

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
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const monthDiff = now.getMonth() - dob.getMonth()
    // Αν δεν έχουν κλείσει ακόμα τα γενέθλια φέτος, ο χρόνος δεν μετράει.
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
    if (age < 15) {
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
        // Every new account starts a 30-day AI trial automatically.
        // The AI feature gate reads `ai_subscription_status` and treats
        // 'trial' the same as an active paid subscription.
        ai_subscription_status: 'trial',
        ai_trial_started_at: new Date(),
      }
    })
    // Auto-link any provider_staff records pre-created by an employer for
    // this email. If a provider added their employee's email before the
    // employee registered, this links the account so the employee immediately
    // sees the staff dashboard on first login.
    await autoLinkProviderStaff(user.id, user.email, req)

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    decryptUserFields(userSafe) // return plaintext to caller
    await audit(req, { action: 'register', resource: 'user', resource_id: user.id })
    return { user: userSafe, token }
  })

  // Login
  app.post('/login', async (req, reply) => {
    const parsed = parseBody(loginSchema, req.body, reply)
    if (!parsed) return
    const { email, password } = parsed
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) {
      await audit(req, { action: 'login', resource: 'user', outcome: 'failure', metadata: { reason: 'no_such_user', email } })
      return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await audit(req, { action: 'login', resource: 'user', outcome: 'failure', metadata: { reason: 'wrong_password' } })
      return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    }
    // Pick up any staff records the employer added for this email after the
    // user's original registration. Silent no-op when there is nothing new.
    await autoLinkProviderStaff(user.id, user.email, req)
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    decryptUserFields(userSafe)
    await audit(req, { action: 'login', resource: 'user', resource_id: user.id })
    return { user: userSafe, token }
  })

  // Me
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = (req.user as any)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const { password_hash: _, ...userSafe } = user as any
    return decryptUserFields(userSafe)
  })

  // Update me (PATCH /auth/me or PATCH /users/me - whichever your frontend uses)
  // The web store calls PATCH /users/me, but we'll also add PATCH /auth/me for safety
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = (req.user as any)
    const allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language']
    const updateData: any = {}
    for (const key of allowedFields) {
      if ((req.body as any)[key] !== undefined) updateData[key] = (req.body as any)[key]
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'No fields to update' })
    }
    // Encrypt sensitive fields before write
    if ('phone' in updateData) updateData.phone = encryptField(updateData.phone)
    const user = await prisma.user.update({ where: { id }, data: updateData })
    const { password_hash: _, ...userSafe } = user as any
    decryptUserFields(userSafe)
    return userSafe
  })

  // Refresh
  app.post('/refresh', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { id, email, role } = req.user as any
    const token = app.jwt.sign({ id, email, role }, { expiresIn: '7d' })
    return { token }
  })

  // ─── GOOGLE OAUTH FOR MOBILE APPS ────────────────────────────────
  // Mobile app sends Google's access_token + user info from native OAuth flow
  // Backend verifies the token and creates/updates user, returns JWT
  app.post('/google/mobile', async (req: any, reply) => {
    try {
      const { access_token, user: googleUserData } = req.body as any

      if (!access_token || !googleUserData?.email) {
        return reply.code(400).send({ message: 'Λείπουν δεδομένα' })
      }

      // Verify the access_token by calling Google's userinfo endpoint
      // This ensures the token is valid and belongs to this user
      const verifyRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!verifyRes.ok) {
        return reply.code(401).send({ message: 'Μη έγκυρο Google token' })
      }
      const verifiedUser = await verifyRes.json() as any

      // Make sure the email matches what client sent (prevent token swapping)
      if (verifiedUser.email !== googleUserData.email) {
        return reply.code(401).send({ message: 'Email mismatch' })
      }

      // Get preferred language from Google locale
      const googleLocale = (verifiedUser.locale || googleUserData.locale || '').toLowerCase().split('-')[0]
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(googleLocale) ? googleLocale : 'el'

      // Find or create user
      let user = await prisma.user.findUnique({ where: { email: verifiedUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: verifiedUser.email,
            full_name: verifiedUser.name || googleUserData.full_name,
            profile_photo: verifiedUser.picture || googleUserData.profile_photo,
            role: 'user',
            preferred_language: preferredLang,
            // Every new OAuth-created account starts a 30-day AI trial too.
            ai_subscription_status: 'trial',
            ai_trial_started_at: new Date(),
          }
        })
      } else if (!user.profile_photo && (verifiedUser.picture || googleUserData.profile_photo)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profile_photo: verifiedUser.picture || googleUserData.profile_photo }
        })
      }

      const { password_hash: _, ...userSafe } = user as any
      decryptUserFields(userSafe) // return plaintext to caller
      // Auto-link staff records the employer pre-created for this email
      await autoLinkProviderStaff(user.id, user.email, req)
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
      return { user: userSafe, token }
    } catch (err: any) {
      console.error('Google mobile OAuth error:', err)
      return reply.code(500).send({ message: 'Σφάλμα διακομιστή' })
    }
  })

  // ─── FACEBOOK OAUTH FOR MOBILE APPS ──────────────────────────────
  // Mobile app sends Facebook's access_token from the native FB SDK.
  // Backend verifies the token with Graph API's /me endpoint, then
  // creates/updates the user and returns a JWT.
  app.post('/facebook/mobile', async (req: any, reply) => {
    try {
      const { access_token } = req.body as any
      if (!access_token) {
        return reply.code(400).send({ message: 'Λείπει το access token' })
      }

      // Verify the token by hitting Graph API. Fields we ask for:
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

      if (!fbUser.email) {
        // Some FB users deny the email permission — we cannot create an
        // account without an email address as the primary key.
        return reply.code(400).send({
          message: 'Απαιτείται πρόσβαση στο email σας. Παρακαλώ επιτρέψτε την κοινοποίηση email και ξαναδοκιμάστε.'
        })
      }

      // Map Facebook locale (e.g. "el_GR") to our supported languages
      const fbLocale = (fbUser.locale || '').toLowerCase().split('_')[0]
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(fbLocale) ? fbLocale : 'el'

      const fbPicture = fbUser.picture?.data?.url || null

      let user = await prisma.user.findUnique({ where: { email: fbUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: fbUser.email,
            full_name: fbUser.name || 'Facebook User',
            profile_photo: fbPicture,
            role: 'user',
            preferred_language: preferredLang,
            // Every new OAuth-created account starts a 30-day AI trial too.
            ai_subscription_status: 'trial',
            ai_trial_started_at: new Date(),
          }
        })
      } else if (!user.profile_photo && fbPicture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profile_photo: fbPicture }
        })
      }

      const { password_hash: _, ...userSafe } = user as any
      decryptUserFields(userSafe) // return plaintext to caller
      // Auto-link staff records the employer pre-created for this email
      await autoLinkProviderStaff(user.id, user.email, req)
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
      return { user: userSafe, token }
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
      const googleUser = await userRes.json() as any

      // Try to read preferred language from Google profile (locale field)
      const googleLocale = (googleUser.locale || '').toLowerCase().split('-')[0]
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(googleLocale) ? googleLocale : 'el'

      let user = await prisma.user.findUnique({ where: { email: googleUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            full_name: googleUser.name,
            profile_photo: googleUser.picture,
            role: 'user',
            preferred_language: preferredLang,
            // Every new OAuth-created account starts a 30-day AI trial too.
            ai_subscription_status: 'trial',
            ai_trial_started_at: new Date(),
          }
        })
      } else if (!user.profile_photo && googleUser.picture) {
        user = await prisma.user.update({ where: { id: user.id }, data: { profile_photo: googleUser.picture } })
      }

      const { password_hash: _, ...userSafe } = user as any
      decryptUserFields(userSafe) // return plaintext to caller
      // Auto-link staff records the employer pre-created for this email
      await autoLinkProviderStaff(user.id, user.email, req)
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
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(fbLocale) ? fbLocale : 'el'

      let user = await prisma.user.findUnique({ where: { email: fbUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: fbUser.email,
            full_name: fbUser.name,
            profile_photo: fbUser.picture?.data?.url,
            role: 'user',
            preferred_language: preferredLang,
            // Every new OAuth-created account starts a 30-day AI trial too.
            ai_subscription_status: 'trial',
            ai_trial_started_at: new Date(),
          }
        })
      }

      const { password_hash: _, ...userSafe } = user as any
      decryptUserFields(userSafe) // return plaintext to caller
      // Auto-link staff records the employer pre-created for this email
      await autoLinkProviderStaff(user.id, user.email, req)
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

    const { password_hash: _, ...userSafe } = user as any
    decryptUserFields(userSafe)
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    await audit(req, { action: 'oauth_exchange', resource: 'user', resource_id: user.id })
    return { user: userSafe, token }
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

    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
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
      })
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
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash, reset_token: null, reset_token_expires: null }
    })
    await audit(req, { action: 'password_reset_complete', resource: 'user', resource_id: user.id })
    return { message: 'Ο κωδικός άλλαξε επιτυχώς' }
  })

}

export default authRoutes
