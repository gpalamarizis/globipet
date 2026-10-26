import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import { Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'
import prisma from './lib/prisma.js'
import { trustProxyHop } from './lib/trustProxy.js'
import adminCatalogRoutes from './routes/admin-catalog.js'
import insuranceRoutes from './routes/insurance.js'

// Routes
import authRoutes from './routes/auth.js'
import usersRoutes, { needsBirthDate, BIRTH_DATE_REQUIRED_MESSAGE } from './routes/users.js'
import petsRoutes from './routes/pets.js'
import productsRoutes from './routes/products.js'
import servicesRoutes from './routes/services.js'
import bookingsRoutes from './routes/bookings.js'
import postsRoutes from './routes/posts.js'
import ordersRoutes from './routes/orders.js'
import cartRoutes from './routes/cart.js'
import uploadRoutes from './routes/upload.js'
import eventsRoutes from './routes/events.js'
import breedsRoutes from './routes/breeds.js'
import healthRoutes from './routes/health.js'
import calendarRoutes from './routes/calendar.js'
import contactRoutes from './routes/contact.js'
import insightsRoutes from './routes/insights.js'
import telehealthRoutes from './routes/telehealth.js'
import loyaltyRoutes from './routes/loyalty.js'
import notificationsRoutes from './routes/notifications.js'
import forumRoutes from './routes/forum.js'
import communityRoutes from './routes/community.js'
import trackerRoutes from './routes/tracker.js'
import reviewsRoutes from './routes/reviews.js'
import wishlistRoutes from './routes/wishlist.js'
import adminRoutes from './routes/admin.js'
import providerRoutes from './routes/provider.js'
import staffRoutes from './routes/staff.js'
import specialtiesRoutes from './routes/specialties.js'
import auditRoutes from './routes/audit.js'
import translationsRoutes from './routes/translations.js'
import campaignRoutes from './routes/campaigns.js'
import customersRoutes from './routes/customers.js'
import aiRoutes from './routes/ai.js'
import passportRoutes from './routes/passport.js'
import playdatesRoutes from './routes/playdates.js'
import communitiesRoutes from './routes/communities.js'
import geocodeRoutes from './routes/geocode.js'
import paymentsRoutes from './routes/payments.js'
import bulkImportRoutes from './routes/bulk-import.js'
import packagesRoutes from './routes/packages.js'
import catalogRoutes from './routes/catalog.js'
import registryRoutes from './routes/registry.js'
import aiSubscriptionsRoutes from './routes/ai-subscriptions.js'
import { startAiTrialExpiryCron, startAccountDeletionCron, startRetentionCron, startStuckRefundsCron } from './lib/cron.js'
import { registerMessageTranslation } from './lib/apiMessages.js'
import { assertProductionEnv } from './lib/envCheck.js'
import settingsRoutes from './routes/settings.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import webhooksRoutes from './routes/webhooks.js'
import adminSubscriptionsRoutes from './routes/admin-subscriptions.js'
import adminRefundsRoutes from './routes/admin-refunds.js'
import adminAiPlansRoutes from './routes/ai-plans-admin.js'
import userRightsRoutes from './routes/user-rights.js'
import userConsentsRoutes from './routes/user-consents.js'
import governanceRoutes from './routes/governance.js'

/**
 * ΤΟ trustProxy ΔΕΝ ΕΙΝΑΙ ΠΡΟΑΙΡΕΤΙΚΟ ΕΔΩ
 *
 *   Ο διακομιστής τρέχει πίσω από τον proxy της Railway — και ίσως ΚΑΙ πίσω
 *   από το Cloudflare (πελάτης → Cloudflare → Railway → εμείς). Χωρίς αυτό, το
 *   request.ip επιστρέφει τη διεύθυνση του proxy και όχι του χρήστη — που
 *   σημαίνει ότι το rate limiting μετράει ΟΛΟΥΣ τους χρήστες ως έναν, και
 *   το ημερολόγιο ελέγχου καταγράφει πάντα την ίδια IP.
 *
 *   ΠΩΣ ΤΟ ΥΠΟΛΟΓΙΖΕΙ ΤΟ FASTIFY (@fastify/proxy-addr): λίστα διευθύνσεων
 *   [socket, X-Forwarded-For από τα ΔΕΞΙΑ προς τα αριστερά]· για i = 0, 1, …
 *   όσο το trust(addrs[i], i) είναι true προχωρά, και το req.ip είναι η
 *   πρώτη διεύθυνση που ΔΕΝ εμπιστευόμαστε (ή η τελευταία της λίστας).
 *
 *   Εμπιστευόμαστε:
 *     i === 0 — το socket: ο proxy της Railway (όπως πριν, `hop < 1`).
 *     i === 1 — ΜΟΝΟ αν είναι διεύθυνση του Cloudflare: το άλμα που πρόσθεσε
 *               η Railway στο XFF είναι τότε ο edge του Cloudflare, και η
 *               επόμενη τιμή (που έγραψε το ίδιο το Cloudflare) είναι η IP
 *               του πελάτη — η ίδια με το CF-Connecting-IP.
 *   Τίποτα άλλο. Το σκέτο `true` θα εμπιστευόταν ολόκληρη την αλυσίδα
 *   X-Forwarded-For, που τη γράφει ο πελάτης (GHSA-444r-cwp2-x5xf). Πλαστό
 *   XFF χωρίς Cloudflare: η Railway προσθέτει την πραγματική IP του
 *   επιτιθέμενου, που δεν είναι του Cloudflare → req.ip = επιτιθέμενος.
 *   Μέσω Cloudflare με πλαστό XFF: το Cloudflare προσθέτει την πραγματική IP
 *   του πελάτη δεξιά από τα πλαστά → req.ip = πελάτης.
 *   Μόνο ΕΝΑ άλμα Cloudflare (i === 1): μια αλυσίδα «IP Cloudflare» που γράφει
 *   ο πελάτης στο XFF δεν μας μεταφέρει πιο αριστερά.
 *
 *   Λίστα (lib/trustProxy.ts): https://www.cloudflare.com/ips/ (ips-v4 / ips-v6). Σταθερή στον
 *   κώδικα — αν το Cloudflare προσθέσει δίκτυο, οι επισκέπτες από αυτό
 *   μετριούνται με την IP του edge (ασφαλές: όχι πλαστοπροσωπία, μόνο
 *   χονδρότερο rate limit) μέχρι να ενημερωθεί.
 *
 *   Ε16: το άλμα 1 (Cloudflare) ισχύει ΜΟΝΟ με TRUST_CLOUDFLARE_PROXY=1 — το
 *   API καλείται σήμερα απευθείας στο *.up.railway.app, και ένα Cloudflare
 *   Worker οποιουδήποτε θα «γινόταν» Cloudflare edge με πλαστό XFF.
 *   Λεπτομέρειες στο lib/trustProxy.ts.
 */
/**
 * Ε16 — logs και χρονικά όρια.
 *
 *   logger: development → όπως πριν (true, όλα)· production → μόνο warn/error,
 *   ΧΩΡΙΣ τις κεφαλίδες authorization/cookie (τοκεν συνεδρίας, cookie OAuth)·
 *   αλλού (test κ.λπ.) → κλειστό, όπως πριν.
 *
 *   Χρονικά όρια (Node http):
 *     requestTimeout 180″ — χρόνος για να ΛΗΦΘΕΙ ολόκληρο το αίτημα (κεφαλίδες +
 *       σώμα). Όχι 60″: το κινητό ανεβάζει βίντεο έως 25MB με timeout 180″
 *       (mobile/src/lib/uploadMedia.ts) — σε αργό δίκτυο 60″ θα το έκοβαν.
 *     connectionTimeout 190″ — αδράνεια socket. Όχι 10″: η αδράνεια μετράει
 *       ΚΑΙ όσο ο server επεξεργάζεται (καμία κίνηση στο socket), οπότε μια
 *       κλήση AI με web_search (routes/ai.ts· το κινητό περιμένει έως 120″)
 *       θα κοβόταν στα 10″. Το slowloris καλύπτεται από τα headersTimeout
 *       (60″, προεπιλογή Node) και requestTimeout.
 *     keepAliveTimeout 65″ — πάνω από το συνήθες 60″ των load balancers, ώστε
 *       να μην κλείνουμε εμείς πρώτοι μια σύνδεση που ο proxy ξαναχρησιμοποιεί.
 */
const IS_PROD = process.env.NODE_ENV === 'production'
const app = Fastify({
  logger: process.env.NODE_ENV === 'development'
    ? true
    : IS_PROD
      ? {
          level: 'warn',
          redact: {
            paths: [
              'req.headers.authorization', 'req.headers.cookie',
              'headers.authorization', 'headers.cookie',
              'res.headers["set-cookie"]',
            ],
            censor: '[redacted]',
          },
        }
      : false,
  trustProxy: trustProxyHop,
  requestTimeout: 180_000,
  connectionTimeout: 190_000,
  keepAliveTimeout: 65_000,
})

// ─── Έλεγχος μεταβλητών περιβάλλοντος (lib/envCheck.ts) ──
// Σε παραγωγή: throw μόνο για DATABASE_URL / JWT_SECRET / ENCRYPTION_KEY_V2·
// Stripe/Viva → δυνατό console.error και συνέχεια.
assertProductionEnv()

// ─── JWT secret hardening ─────────────────────────────
// Refuse to start in production without a strong secret (min 32 chars, no default fallback)
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-min-32-chars-here!!')
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long')
  process.exit(1)
}

// ─── Security headers via helmet ──────────────────────
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://www.googletagmanager.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https://api.anthropic.com', 'https://api.stripe.com', 'https://api.resend.com', 'https://*.r2.cloudflarestorage.com'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})

// ─── CORS with strict origin whitelist ─────────────────
// Ε16: τα localhost ΜΟΝΟ εκτός παραγωγής — αλλιώς οποιαδήποτε σελίδα σερβίρεται
// τοπικά (π.χ. κακόβουλο εργαλείο στον υπολογιστή του χρήστη) έκανε αιτήματα
// με credentials στο API παραγωγής.
const ALLOWED_ORIGINS = [
  'https://globipet.com', 'https://www.globipet.com',
  'https://globipet.pages.dev',
  ...(IS_PROD ? [] : ['http://localhost:5173', 'http://localhost:3000']),
]
await app.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    // 403 (όχι 500): ο χειριστής σφαλμάτων δεν καταγράφει stack για κάθε ξένο origin.
    return cb(Object.assign(new Error('Not allowed by CORS'), { statusCode: 403 }), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

/**
 * Cookies — χρειάζονται ΜΟΝΟ για το `state` του OAuth.
 *
 * Το state είναι η προστασία απέναντι σε CSRF στη ροή σύνδεσης: πρέπει να
 * δεθεί με τον browser του χρήστη, και το cookie είναι ο μόνος τρόπος να
 * γίνει αυτό. Υπογράφεται, δεν διαβάζεται από JavaScript, και ζει δέκα
 * λεπτά. Η συνεδρία ΔΕΝ περνάει από cookie — παραμένει στο JWT.
 */
await app.register(cookie, { secret: JWT_SECRET })

/**
 * ΑΝΑΚΛΗΣΗ JWT (Ε12) — ο ρόλος και η «έκδοση» διαβάζονται ΑΠΟ ΤΗ ΒΑΣΗ.
 *
 *   Πριν, ένα JWT επτά ημερών ίσχυε ό,τι κι αν γινόταν: αλλαγή κωδικού,
 *   υποβιβασμός διαχειριστή, διαγραφή λογαριασμού. Και ο ρόλος διαβαζόταν από
 *   το ίδιο το τοκεν, οπότε ένας πρώην διαχειριστής κρατούσε το /api/admin.
 *
 *   Τώρα κάθε τοκεν φέρει `tv` (users.token_version). Η τιμή αυξάνεται σε
 *   αλλαγή/επαναφορά κωδικού, «αποσύνδεση παντού», αλλαγή ρόλου/διαγραφή από
 *   διαχειριστή — και κάθε τοκεν με παλιό `tv` απορρίπτεται (401).
 *
 *   Το `trusted` του @fastify/jwt τρέχει σε ΚΑΘΕ req.jwtVerify() — και στο
 *   decorator `authenticate` και στα routes που καλούν απευθείας jwtVerify —
 *   οπότε ο έλεγχος δεν παρακάμπτεται από κανένα σημείο.
 *
 *   Συμβατότητα: τοκεν χωρίς `tv` (εκδόθηκαν πριν από αυτή την αλλαγή, π.χ.
 *   από ήδη εγκατεστημένη εφαρμογή) γίνονται δεκτά όσο το token_version του
 *   χρήστη είναι 0. Ο ρόλος, όμως, έρχεται ΠΑΝΤΑ από τη βάση.
 *
 *   Cache 30″ ανά χρήστη στη μνήμη: ένα ερώτημα ανά χρήστη ανά μισό λεπτό, όχι
 *   ανά αίτημα. Οι αλλαγές σε αυτή τη διεργασία καθαρίζουν αμέσως το cache
 *   (app.invalidateAuthCache)· σε άλλη διεργασία ισχύουν το πολύ σε 30″.
 *
 *   Ε16: στο ίδιο cache και το `needsBd` (λείπει η ημερομηνία γέννησης —
 *   routes/users.ts needsBirthDate, η ΙΔΙΑ συνάρτηση με το πεδίο
 *   needs_birth_date). Καθαρίζει στο PATCH /auth/me/birth-date.
 */
const AUTH_CACHE_TTL_MS = 30_000
const authCache = new Map<string, { at: number; state: { tv: number; role: string; needsBd: boolean } | null }>()

async function loadAuthState(userId: string) {
  const now = Date.now()
  const hit = authCache.get(userId)
  if (hit && now - hit.at < AUTH_CACHE_TTL_MS) return hit.state
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, token_version: true, role: true, birth_date: true } })
  const state = u ? { tv: u.token_version, role: u.role, needsBd: await needsBirthDate(u) } : null
  if (authCache.size > 20_000) {
    for (const [k, v] of authCache) if (now - v.at >= AUTH_CACHE_TTL_MS) authCache.delete(k)
  }
  authCache.set(userId, { at: now, state })
  return state
}

await app.register(jwt, {
  secret: JWT_SECRET,
  trusted: async (_req: any, decoded: any) => {
    const id = decoded?.id
    if (typeof id !== 'string' || !id) return false
    const state = await loadAuthState(id)
    if (!state) return false                       // ο λογαριασμός διαγράφηκε
    const tv = decoded.tv === undefined ? 0 : decoded.tv
    if (tv !== state.tv) return false              // ανακλήθηκε
    decoded.role = state.role                      // req.user.role = ρόλος της βάσης
    return true
  },
})

app.decorate('invalidateAuthCache', (userId: string) => { authCache.delete(userId) })

/**
 * Κλειδί ορίου «ανά χρήστη»: το id από ΕΠΑΛΗΘΕΥΜΕΝΟ JWT, αλλιώς η IP.
 * Μόνο υπογραφή/λήξη εδώ (συγχρονικά, χωρίς βάση) — αρκεί για να μην μπορεί
 * κανείς να κατασκευάσει ψεύτικα id και να πολλαπλασιάσει τους «κουβάδες».
 */
function userOrIpKey(req: any): string {
  const h = req.headers?.authorization
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    try {
      const p: any = app.jwt.verify(h.slice(7))
      if (p?.id) return `u:${p.id}`
    } catch { /* άκυρο τοκεν → IP */ }
  }
  return `ip:${req.ip}`
}

// ─── Αυστηρά όρια στα ευαίσθητα endpoints ───────────────
// Το γενικό όριο των 200/λεπτό δεν προστατεύει από brute force σε
// login / register / forgot-password. Εδώ ορίζονται ανά διαδρομή.
//
// ΣΕΙΡΑ (Ε12): το hook onRoute που γράφει το `config.rateLimit` ΠΡΕΠΕΙ να
// μπει ΠΡΙΝ το register του @fastify/rate-limit. Το plugin διαβάζει το config
// στο δικό του onRoute, και τα onRoute τρέχουν με τη σειρά που προστέθηκαν.
// Πριν, το hook ήταν μετά: το plugin έβλεπε κενό config, έβαζε μόνο το γενικό
// 200/λεπτό, και ΚΑΝΕΝΑ από τα παρακάτω όρια δεν ίσχυε.
//
// key: 'ip' (προεπιλογή) ή 'user' (id από επαληθευμένο JWT, αλλιώς IP).
// Το login έχει ΕΠΙΠΛΕΟΝ ανεξάρτητο όριο ανά email (LOGIN_PER_EMAIL, πιο
// κάτω): επίθεση από πολλές IP σε έναν λογαριασμό μετράει κι αυτή.
// register / contact / forgot-password: ΜΟΝΟ ανά IP (ένα όριο ανά email θα
// επέτρεπε σε τρίτο να «κλειδώσει» την επαναφορά κωδικού κάποιου άλλου).
type LimitRule = { max: number; window: string; key?: 'ip' | 'user'; methods?: string[] }
const STRICT_LIMITS: Record<string, LimitRule> = {
  '/api/auth/login':           { max: 20, window: '15 minutes' },
  '/api/auth/register':        { max: 5,  window: '1 hour' },
  '/api/auth/forgot-password': { max: 4,  window: '1 hour' },
  '/api/auth/reset-password':  { max: 6,  window: '1 hour' },
  '/api/auth/google/mobile':   { max: 20, window: '15 minutes' },
  '/api/auth/facebook/mobile': { max: 20, window: '15 minutes' },
  '/api/auth/refresh':         { max: 30, window: '15 minutes', key: 'user' },
  '/api/auth/verify-email':    { max: 10, window: '1 hour' },
  '/api/auth/resend-verification': { max: 3, window: '1 hour', key: 'user' },
  '/api/auth/me/birth-date': { max: 10, window: '1 hour', key: 'user' },
  '/api/auth/logout-all':      { max: 10, window: '1 hour', key: 'user' },
  '/api/users/me/password':    { max: 5,  window: '15 minutes', key: 'user' },
  '/api/user-rights/export':   { max: 5,  window: '1 hour' },
  // GPS collars report on a schedule, not continuously. This is generous for
  // a real device and still caps how fast an unauthenticated caller can probe
  // device tokens or flood the location table.
  '/api/tracker/ingest':       { max: 60, window: '1 minute' },
  // A public form with no limit is a spam relay.
  '/api/contact':              { max: 5,  window: '1 hour' },
  // Κάθε κλήση καταναλώνει το κοινό όριο 1/δευτ. του Nominatim για όλη την
  // εφαρμογή. Και οι δύο μορφές URL (με/χωρίς τελική κάθετο).
  '/api/geocode':              { max: 20, window: '1 minute' },
  '/api/geocode/':             { max: 20, window: '1 minute' },
  // Ίδια πηγή (lib/geocode → Nominatim) για τις κοινότητες: ίδιο όριο.
  '/api/communities/geocode':  { max: 20, window: '1 minute' },
  // Δημόσιο: κάθε κλήση ρωτά τη Viva.
  '/api/payments/return':      { max: 30, window: '1 minute' },
  // Δημόσιο webhook της Viva (POST ειδοποίηση + GET επαλήθευση κλειδιού).
  '/api/orders/viva/webhook':  { max: 120, window: '1 minute' },
  // Ε16: ανέβασμα αρχείων (R2 — κόστος αποθήκευσης/εύρους): 30 / 10′ ανά χρήστη.
  // Και οι δύο μορφές URL (το '/' με πρόθεμα καταχωρείται και με τελική κάθετο).
  '/api/upload':               { max: 30, window: '10 minutes', key: 'user', methods: ['POST'] },
  '/api/upload/':              { max: 30, window: '10 minutes', key: 'user', methods: ['POST'] },
  // Ε16: νέα τηλεσυμβουλευτική → email στον πάροχο (εξερχόμενα): ανά χρήστη.
  '/api/telehealth':           { max: 20, window: '1 hour', key: 'user', methods: ['POST'] },
  '/api/telehealth/':          { max: 20, window: '1 hour', key: 'user', methods: ['POST'] },
  // Ε16: OAuth — κάθε callback/exchange ρωτά Google/Facebook (εξερχόμενα).
  '/api/auth/google/callback':   { max: 30, window: '1 minute' },
  '/api/auth/facebook/callback': { max: 30, window: '1 minute' },
  '/api/auth/exchange':          { max: 30, window: '1 minute' },
}
// Κάθε κλήση AI κοστίζει (Anthropic/OpenAI): 20/λεπτό ανά χρήστη, για όλα τα POST /api/ai/*.
const AI_LIMIT: LimitRule = { max: 20, window: '1 minute', key: 'user' }
// Δεύτερο, ανεξάρτητο όριο του login ανά email (μετά την ανάλυση του σώματος).
const LOGIN_PER_EMAIL = { max: 8, window: '15 minutes' }

const strictError = (_req: any, ctx: any) => ({
  statusCode: 429,
  message: `Πολλές προσπάθειες. Δοκίμασε ξανά σε ${Math.ceil(ctx.ttl / 60000)} λεπτά.`,
})

let loginEmailLimiter: ((req: any, opts?: { increment?: boolean }) => Promise<any>) | null = null

/**
 * Ε16: οι διαδρομές AI δέχονται εικόνα base64 έως ~7MB (routes/ai.ts
 * AI_IMAGE_MAX_BASE64)· το γενικό όριο σώματος του Fastify (1MB) τις απέρριπτε
 * πριν φτάσουν στον δικό τους έλεγχο. Μόνο για /api/ai/*.
 */
const AI_BODY_LIMIT = 8 * 1024 * 1024

app.addHook('onRoute', (route) => {
  const methods = Array.isArray(route.method) ? route.method : [route.method]
  if (route.url.startsWith('/api/ai/') && route.bodyLimit === undefined) route.bodyLimit = AI_BODY_LIMIT
  const strict = STRICT_LIMITS[route.url]
  const rule = (strict && (!strict.methods || methods.some(m => strict.methods!.includes(String(m).toUpperCase()))) ? strict : undefined)
    ?? (route.url.startsWith('/api/ai/') && methods.includes('POST') ? AI_LIMIT : undefined)
  if (!rule) return
  route.config = {
    ...(route.config || {}),
    rateLimit: {
      max: rule.max,
      timeWindow: rule.window,
      ...(rule.key === 'user' ? { keyGenerator: userOrIpKey } : {}),
      errorResponseBuilder: strictError,
    },
  } as any

  if (route.url === '/api/auth/login') {
    // Το σώμα έχει αναλυθεί πια στο preHandler — στο onRequest (όπου τρέχει
    // το plugin) το req.body είναι ακόμα undefined.
    //
    // Μετρά ΜΟΝΟ τις αποτυχημένες προσπάθειες: εδώ γίνεται μόνο ανάγνωση
    // (increment:false) και η αύξηση γίνεται στο onResponse όταν η απάντηση
    // είναι 401 (λάθος στοιχεία). Πριν μετρούσε κάθε login, οπότε ένας
    // χρήστης με πολλές συσκευές/επανασυνδέσεις κλειδωνόταν χωρίς λάθος.
    // Η 9η προσπάθεια μετά από 8 αποτυχίες μέσα σε 15' → 429.
    const loginEmail = (req: any) => String(req.body?.email ?? '').trim().toLowerCase().slice(0, 255)
    const perEmail = async (req: any, reply: any) => {
      if (!loginEmail(req) || !loginEmailLimiter) return
      const r = await loginEmailLimiter(req, { increment: false })
      // Η απάντηση δεν δίνει `current`· remaining = max − αποτυχίες.
      if (r && !r.isAllowed && r.remaining <= 0) {
        reply.header('retry-after', r.ttlInSeconds)
        return reply.code(429).send(strictError(req, r))
      }
    }
    const countFailure = async (req: any, reply: any) => {
      if (reply.statusCode !== 401 || !loginEmail(req) || !loginEmailLimiter) return
      await loginEmailLimiter(req).catch(() => {})
    }
    const ph = route.preHandler
    route.preHandler = Array.isArray(ph) ? [perEmail, ...ph] : ph ? [perEmail, ph] : [perEmail]
    const or = route.onResponse
    route.onResponse = Array.isArray(or) ? [...or, countFailure] : or ? [or, countFailure] : [countFailure]
  }
})

// ─── Rate limiting: generic default + strict for auth ───
await app.register(rateLimit, {
  max: 200,               // generic ceiling per IP per window
  timeWindow: '1 minute',
  errorResponseBuilder: (_req, ctx) => ({
    statusCode: 429,
    message: `Πολλά αιτήματα. Δοκίμασε ξανά σε ${Math.ceil(ctx.ttl / 1000)} δευτερόλεπτα.`,
  }),
})
loginEmailLimiter = (app as any).createRateLimit({
  max: LOGIN_PER_EMAIL.max,
  timeWindow: LOGIN_PER_EMAIL.window,
  keyGenerator: (req: any) => `login-email:${String(req.body?.email ?? '').trim().toLowerCase().slice(0, 255)}`,
})
// 25 MB: όσο και το MAX_VIDEO_SIZE του routes/upload.ts.
//
// Ήταν 10 MB, οπότε κάθε βίντεο 10–25 MB απορριπτόταν ΕΔΩ, πριν φτάσει
// στον έλεγχο της διαδρομής — και η ανάλυση συναισθήματος από βίντεο
// αποτύγχανε χωρίς κατανοητό μήνυμα. Τα δύο όρια πρέπει να συμφωνούν:
// το multipart είναι η εξωτερική πύλη, ο έλεγχος της διαδρομής κρίνει
// εικόνα ή βίντεο και επιβάλλει το σωστό όριο για το καθένα.
//
// Ε16: και όρια πλήθους — το μόνο που διαβάζει multipart είναι το POST
// /api/upload (routes/upload.ts: ένα req.file(), το `folder` έρχεται στο
// query). Χωρίς αυτά, ένα αίτημα με χιλιάδες μέρη/πεδία κρατούσε τον parser.
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 10, parts: 12 } })

/**
 * Ε16 — ΠΥΛΗ ΗΜΕΡΟΜΗΝΙΑΣ ΓΕΝΝΗΣΗΣ ΣΤΟΝ SERVER (απόφαση ιδιοκτήτη).
 *
 *   Πριν, το `needs_birth_date` ήταν μόνο σημαία για τον client: ένας
 *   λογαριασμός Google/Facebook χωρίς ημερομηνία (άρα πιθανώς κάτω των 15)
 *   χρησιμοποιούσε όλο το API κατευθείαν. Τώρα κάθε διαδρομή με `authenticate`
 *   απαντά 403 `{ message, code: 'birth_date_required' }` όσο λείπει η
 *   ημερομηνία — εκτός από όσα χρειάζονται για να τη δώσει, να διαβάσει τα
 *   νομικά, να ασκήσει δικαιώματα GDPR και να αποσυνδεθεί:
 *     /api/auth/*            (me, me/birth-date, refresh, logout-all,
 *                             resend-verification· PATCH /auth/me μόνο για
 *                             preferred_language — η αλλαγή γλώσσας)
 *     /api/user-rights/*     (GDPR: εξαγωγή, διαγραφή, διόρθωση)
 *     /api/user-consents/*   (συγκαταθέσεις — οθόνη consents / cookies)
 *     DELETE /api/notifications/push/register (αποσύνδεση συσκευής)
 *     POST /api/notifications/push/register (καταχώριση συσκευής — ο νέος
 *                             χρήστης OAuth την κάνει πριν δώσει ημερομηνία,
 *                             αλλιώς δεν θα λάμβανε ποτέ ειδοποιήσεις push)
 *   Ποιος εξαιρείται: routes/users.ts needsBirthDate (admin· service_provider
 *   μόνο αν τον ρόλο τον έδωσε διαχειριστής).
 *   Δημόσιες διαδρομές (χωρίς authenticate) δεν επηρεάζονται.
 */
function birthDateGateAllows(req: any): boolean {
  const url: string = req.routeOptions?.url ?? ''
  const method = String(req.method || '').toUpperCase()
  if (url.startsWith('/api/user-rights/') || url === '/api/user-consents' || url.startsWith('/api/user-consents/')) return true
  if (url === '/api/notifications/push/register' && (method === 'DELETE' || method === 'POST')) return true
  if (url.startsWith('/api/auth/')) {
    if (url === '/api/auth/me' && method !== 'GET') {
      const b = req.body
      return !!b && typeof b === 'object' && !Array.isArray(b) &&
        Object.keys(b).length > 0 && Object.keys(b).every(k => k === 'preferred_language')
    }
    return true
  }
  return false
}

// Auth decorator — ο έλεγχος έκδοσης/ρόλου γίνεται στο `trusted` του jwt (πιο πάνω).
app.decorate('authenticate', async (req: any, reply: any) => {
  try { await req.jwtVerify() } catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' }) }
  // Ε16: η κατάσταση είναι ήδη στο cache (μόλις τη διάβασε το `trusted`) — καμία νέα ερώτηση.
  const id = (req.user as any)?.id
  const state = typeof id === 'string' && id ? await loadAuthState(id) : null
  if (state?.needsBd && !birthDateGateAllows(req)) {
    return reply.code(403).send({ message: BIRTH_DATE_REQUIRED_MESSAGE, code: 'birth_date_required' })
  }
})

// Register all routes
const routes = [
  { prefix: '/api/auth', handler: authRoutes },
  // calendarRoutes was imported but never registered, so every /api/calendar
  // path answered 404 while the provider dashboard linked straight to them.
  { prefix: '/api/calendar', handler: calendarRoutes },
  // ContactPage has posted here since it was written; the route never existed.
  { prefix: '/api/contact', handler: contactRoutes },
  { prefix: '/api/insights', handler: insightsRoutes },
  { prefix: '/api/users', handler: usersRoutes },
  { prefix: '/api/pets', handler: petsRoutes },
  { prefix: '/api/products', handler: productsRoutes },
  { prefix: '/api/services', handler: servicesRoutes },
  { prefix: '/api/bookings', handler: bookingsRoutes },
  { prefix: '/api/posts', handler: postsRoutes },
  { prefix: '/api/orders', handler: ordersRoutes },
  { prefix: '/api/cart', handler: cartRoutes },
  { prefix: '/api/upload', handler: uploadRoutes },
  { prefix: '/api/events', handler: eventsRoutes },
  { prefix: '/api/breeds', handler: breedsRoutes },
  { prefix: '/api/health-records', handler: healthRoutes },
  { prefix: '/api/telehealth', handler: telehealthRoutes },
  { prefix: '/api/loyalty', handler: loyaltyRoutes },
  { prefix: '/api/notifications', handler: notificationsRoutes },
  { prefix: '/api/forum', handler: forumRoutes },
  { prefix: '/api/community', handler: communityRoutes },
  { prefix: '/api/tracker', handler: trackerRoutes },
  { prefix: '/api/reviews', handler: reviewsRoutes },
  { prefix: '/api/wishlist', handler: wishlistRoutes },
  { prefix: '/api/admin', handler: adminRoutes },
  { prefix: '/api/admin/bulk-import', handler: bulkImportRoutes },
  { prefix: '/api/provider', handler: providerRoutes },
  { prefix: '/api/staff', handler: staffRoutes },
  { prefix: '/api/specialties', handler: specialtiesRoutes },
  { prefix: '/api/audit', handler: auditRoutes },
  { prefix: '/api/translations', handler: translationsRoutes },
  { prefix: '/api/campaigns', handler: campaignRoutes },
  { prefix: '/api/customers', handler: customersRoutes },
  { prefix: '/api/ai', handler: aiRoutes },
  { prefix: '/api/passport', handler: passportRoutes },
  { prefix: '/api/playdates', handler: playdatesRoutes },
  { prefix: '/api/communities', handler: communitiesRoutes },
  { prefix: '/api/geocode', handler: geocodeRoutes },
  { prefix: '/api/payments', handler: paymentsRoutes },
  { prefix: '/api/packages', handler: packagesRoutes },
  { prefix: '/api/catalog', handler: catalogRoutes },
  { prefix: '/api/registry', handler: registryRoutes },
  { prefix: '/api/admin/catalog', handler: adminCatalogRoutes },
  { prefix: '/api/ai-subscriptions', handler: aiSubscriptionsRoutes },
  { prefix: '/api/settings', handler: settingsRoutes },
  { prefix: '/api/subscriptions', handler: subscriptionsRoutes },
  { prefix: '/api/webhooks', handler: webhooksRoutes },
  { prefix: '/api/admin/subscriptions', handler: adminSubscriptionsRoutes },
  { prefix: '/api/admin/refunds', handler: adminRefundsRoutes },
  { prefix: '/api/admin/ai-plans', handler: adminAiPlansRoutes },
  { prefix: '/api/user-rights', handler: userRightsRoutes },
  { prefix: '/api/user-consents', handler: userConsentsRoutes },
  { prefix: '/api/admin/governance', handler: governanceRoutes },
  { prefix: '/api', handler: insuranceRoutes },
]

// Μετάφραση μηνυμάτων API στη γλώσσα του χρήστη.
//
// ΠΡΕΠΕΙ να μπει ΠΡΙΝ τα routes: το hook onSend εφαρμόζεται μόνο σε όσα
// routes εγγράφηκαν μετά από αυτό. Αν μπει στο τέλος, δεν μεταφράζεται
// τίποτα και η αποτυχία είναι σιωπηλή.
registerMessageTranslation(app)

/**
 * Σφάλματα Prisma που ΔΕΝ πιάστηκαν στο route.
 *
 * Χωρίς αυτό, κάθε λάθος δεδομένο του πελάτη που έφτανε στη βάση (π.χ.
 * κείμενο σε αριθμητικό πεδίο, null σε υποχρεωτική στήλη, ανύπαρκτο id σε
 * findUniqueOrThrow) γινόταν 500 «σφάλμα διακομιστή». Εδώ:
 *   PrismaClientValidationError (λάθος τύπος/λείπει πεδίο) → 400
 *   P2000 (τιμή πολύ μεγάλη για τη στήλη), P2003 (ανύπαρκτη αναφορά) → 400
 *   P2025 (η εγγραφή δεν βρέθηκε) → 404
 * με γενικό μεταφρασμένο μήνυμα (lib/apiMessages) — ποτέ το μήνυμα του Prisma,
 * που περιέχει ονόματα πινάκων/στηλών. Το πλήρες σφάλμα πάει στα logs.
 *   Ε16: P2002 (μοναδικότητα) → 409 «υπάρχει ήδη» (πριν 500 με το μήνυμα του Prisma).
 * Τα υπόλοιπα 4xx (429 του rate limit, 400 του validation του Fastify, 401…)
 * περνούν αυτούσια στον προεπιλεγμένο χειριστή του Fastify.
 *   Ε16: κάθε σφάλμα ≥ 500 (ή χωρίς κωδικό) → ΠΟΤΕ το εσωτερικό err.message
 *   (διαδρομές αρχείων, SQL, απαντήσεις τρίτων) — γενικό μήνυμα + κωδικός
 *   αναφοράς, όπως το lib/errors.ts serverError· το πλήρες σφάλμα στα logs
 *   με τον ίδιο κωδικό. Στο development το μήνυμα μένει ορατό.
 * ΠΡΕΠΕΙ να μπει πριν τα routes (οι υπο-εφαρμογές κληρονομούν τον χειριστή
 * τη στιγμή της εγγραφής τους).
 */
const SERVER_ERROR_MESSAGE = 'Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.'   // ίδιο με lib/errors.ts serverError
app.setErrorHandler((err: any, req, reply) => {
  const prismaStatus =
    err instanceof Prisma.PrismaClientValidationError ? 400
      : err instanceof Prisma.PrismaClientKnownRequestError
        ? (err.code === 'P2000' || err.code === 'P2003' ? 400 : err.code === 'P2025' ? 404 : err.code === 'P2002' ? 409 : 0)
        : 0
  if (!prismaStatus) {
    const raw = Number(err?.statusCode ?? err?.status)
    const sc = raw >= 400 && raw < 600 ? raw : 500
    if (sc >= 500) {
      // Ε16: κανένα εσωτερικό μήνυμα προς τον client.
      const ref = randomBytes(3).toString('hex')
      const detail = err instanceof Error ? (err.stack || err.message) : (() => { try { return JSON.stringify(err) } catch { return String(err) } })()
      console.error(`[unhandled ${sc}] ref=${ref} ${req.method} ${req.url}:`, detail)
      if (process.env.NODE_ENV === 'development') {
        reply.code(sc).send({ message: `${SERVER_ERROR_MESSAGE} [${ref}] ${String(err?.message ?? err)}`, ref })
        return
      }
      reply.code(sc).send({ message: `${SERVER_ERROR_MESSAGE} (κωδικός ${ref})`, ref })
      return
    }
    // 4xx: αμετάβλητη συμπεριφορά — ο επόμενος (προεπιλεγμένος) χειριστής.
    // ΠΡΟΣΟΧΗ: το reply.send() ενός ΜΗ-Error αντικειμένου (π.χ. τα 429 του
    // rate limit ή τα throw { statusCode, message }) στέλνεται ως κανονική
    // απάντηση με status 200 — κρατάμε ρητά τον κωδικό του.
    if (!(err instanceof Error)) {
      reply.code(sc).send(err)
      return
    }
    reply.send(err)
    return
  }
  console.error(`[prisma ${err?.code ?? 'validation'}] ${req.method} ${req.url}:`, String(err?.message ?? err).slice(-600))
  reply.code(prismaStatus).send({
    message: prismaStatus === 404 ? 'Δεν βρέθηκε' : prismaStatus === 409 ? 'Η εγγραφή υπάρχει ήδη' : 'Μη έγκυρα δεδομένα',
  })
})

for (const { prefix, handler } of routes) {
  await app.register(handler, { prefix })
}

startAiTrialExpiryCron()
startAccountDeletionCron()   // GDPR Άρθρο 17 — εκτέλεση αιτημάτων διαγραφής
startRetentionCron()         // GDPR Άρθρο 5 §1 ε΄ — επιβολή χρόνων διατήρησης
startStuckRefundsCron()      // Κολλημένες επιστροφές (`refunding`) — κάθε 15'

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = parseInt(process.env.PORT || '4000')
await app.listen({ port, host: '0.0.0.0' })
console.log(`🐾 GlobiPet API running on port ${port}`)
// deploy trigger 22/10/2026 12:12:57.48
