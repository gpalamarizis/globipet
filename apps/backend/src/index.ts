import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

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
import aiRoutes from './routes/ai.js'

const app = Fastify({ logger: process.env.NODE_ENV === 'development' })

// Plugins
await app.register(helmet, { contentSecurityPolicy: false })
await app.register(cors, { origin: process.env.APP_URL || 'http://localhost:3000', credentials: true })
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-min-32-chars-here!!' })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

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
  { prefix: '/api/provider', handler: providerRoutes },
  { prefix: '/api/ai', handler: aiRoutes },
]

for (const { prefix, handler } of routes) {
  await app.register(handler, { prefix })
}

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = parseInt(process.env.PORT || '4000')
await app.listen({ port, host: '0.0.0.0' })
console.log(`🐾 GlobiPet API running on port ${port}`)
