import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import adminCatalogRoutes from './routes/admin-catalog.js'
import insuranceRoutes from './routes/insurance.js'

// Routes
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
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
import aiRoutes from './routes/ai.js'
import passportRoutes from './routes/passport.js'
import playdatesRoutes from './routes/playdates.js'
import communitiesRoutes from './routes/communities.js'
import bulkImportRoutes from './routes/bulk-import.js'
import packagesRoutes from './routes/packages.js'
import catalogRoutes from './routes/catalog.js'
import aiSubscriptionsRoutes from './routes/ai-subscriptions.js'
import { startAiTrialExpiryCron, startAccountDeletionCron, startRetentionCron } from './lib/cron.js'
import settingsRoutes from './routes/settings.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import webhooksRoutes from './routes/webhooks.js'
import adminSubscriptionsRoutes from './routes/admin-subscriptions.js'
import adminAiPlansRoutes from './routes/ai-plans-admin.js'
import userRightsRoutes from './routes/user-rights.js'
import userConsentsRoutes from './routes/user-consents.js'

const app = Fastify({ logger: process.env.NODE_ENV === 'development' })

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
const ALLOWED_ORIGINS = [
  'https://globipet.com', 'https://www.globipet.com',
  'https://globipet.pages.dev',
  'http://localhost:5173', 'http://localhost:3000',
]
await app.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

await app.register(jwt, { secret: JWT_SECRET })

// ─── Rate limiting: generic default + strict for auth ───
await app.register(rateLimit, {
  max: 200,               // generic ceiling per IP per window
  timeWindow: '1 minute',
  errorResponseBuilder: (_req, ctx) => ({
    statusCode: 429,
    message: `Πολλά αιτήματα. Δοκίμασε ξανά σε ${Math.ceil(ctx.ttl / 1000)} δευτερόλεπτα.`,
  }),
})
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

// ─── Αυστηρά όρια στα ευαίσθητα endpoints ───────────────
// Το γενικό όριο των 200/λεπτό δεν προστατεύει από brute force σε
// login / register / forgot-password. Εδώ ορίζονται ανά διαδρομή.
const STRICT_LIMITS: Record<string, { max: number; window: string }> = {
  '/api/auth/login':           { max: 8,  window: '15 minutes' },
  '/api/auth/register':        { max: 5,  window: '1 hour' },
  '/api/auth/forgot-password': { max: 4,  window: '1 hour' },
  '/api/auth/reset-password':  { max: 6,  window: '1 hour' },
  '/api/auth/google/mobile':   { max: 20, window: '15 minutes' },
  '/api/user-rights/export':   { max: 5,  window: '1 hour' },
}

app.addHook('onRoute', (route) => {
  const rule = STRICT_LIMITS[route.url]
  if (!rule) return
  route.config = {
    ...(route.config || {}),
    rateLimit: {
      max: rule.max,
      timeWindow: rule.window,
      // Το κλειδί περιλαμβάνει και το email όπου υπάρχει, ώστε επίθεση από
      // πολλές IP σε έναν λογαριασμό να μετράει επίσης.
      keyGenerator: (req: any) => {
        const email = (req.body && (req.body as any).email) || ''
        return `${req.ip}:${String(email).toLowerCase().slice(0, 80)}`
      },
      errorResponseBuilder: (_req: any, ctx: any) => ({
        statusCode: 429,
        message: `Πολλές προσπάθειες. Δοκίμασε ξανά σε ${Math.ceil(ctx.ttl / 60000)} λεπτά.`,
      }),
    },
  }
})

// Auth decorator
app.decorate('authenticate', async (req: any, reply: any) => {
  try { await req.jwtVerify() } catch { reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' }) }
})

// Register all routes
const routes = [
  { prefix: '/api/auth', handler: authRoutes },
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
  { prefix: '/api/ai', handler: aiRoutes },
  { prefix: '/api/passport', handler: passportRoutes },
  { prefix: '/api/playdates', handler: playdatesRoutes },
  { prefix: '/api/communities', handler: communitiesRoutes },
  { prefix: '/api/packages', handler: packagesRoutes },
  { prefix: '/api/catalog', handler: catalogRoutes },
  { prefix: '/api/admin/catalog', handler: adminCatalogRoutes },
  { prefix: '/api/ai-subscriptions', handler: aiSubscriptionsRoutes },
  { prefix: '/api/settings', handler: settingsRoutes },
  { prefix: '/api/subscriptions', handler: subscriptionsRoutes },
  { prefix: '/api/webhooks', handler: webhooksRoutes },
  { prefix: '/api/admin/subscriptions', handler: adminSubscriptionsRoutes },
  { prefix: '/api/admin/ai-plans', handler: adminAiPlansRoutes },
  { prefix: '/api/user-rights', handler: userRightsRoutes },
  { prefix: '/api/user-consents', handler: userConsentsRoutes },
  { prefix: '/api', handler: insuranceRoutes },
]

for (const { prefix, handler } of routes) {
  await app.register(handler, { prefix })
}

startAiTrialExpiryCron()
startAccountDeletionCron()   // GDPR Άρθρο 17 — εκτέλεση αιτημάτων διαγραφής
startRetentionCron()         // GDPR Άρθρο 5 §1 ε΄ — επιβολή χρόνων διατήρησης

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = parseInt(process.env.PORT || '4000')
await app.listen({ port, host: '0.0.0.0' })
console.log(`🐾 GlobiPet API running on port ${port}`)
