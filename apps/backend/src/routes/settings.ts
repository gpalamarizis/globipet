import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getCommissionRates, setCommissionRates } from '../lib/commission.js'

const SETTING_KEY = 'food_subscription_discount_percent'

const settingsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /settings/food-subscription-discount — public, used by storefront to show current discount
  app.get('/food-subscription-discount', async (req, reply) => {
    const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
    return reply.send({ data: { discount_percent: setting ? parseFloat(setting.value) : 0 } })
  })

  // PATCH /admin/settings/food-subscription-discount — admin sets the global %
  app.patch('/admin/food-subscription-discount', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { discount_percent } = req.body as { discount_percent: number }
    if (discount_percent == null || discount_percent < 0 || discount_percent > 100) {
      return reply.code(400).send({ message: 'discount_percent πρέπει να είναι 0-100' })
    }
    const setting = await prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: String(discount_percent) },
      create: { key: SETTING_KEY, value: String(discount_percent) },
    })
    return reply.send({ data: { discount_percent: parseFloat(setting.value) } })
  })
  // GET /settings/commission-rates — admin only
  app.get('/commission-rates', { preHandler: [(app as any).authenticate, isAdmin] }, async (req, reply) => {
    const rates = await getCommissionRates()
    return reply.send({ data: rates })
  })

  // PATCH /settings/commission-rates — admin only, partial update
  app.patch('/commission-rates', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const body = req.body as Record<string, number>
    for (const [key, val] of Object.entries(body)) {
      if (typeof val !== 'number' || val < 0 || val > 100) {
        return reply.code(400).send({ message: `Μη έγκυρη τιμή για ${key}: πρέπει να είναι 0-100` })
      }
    }
    const rates = await setCommissionRates(body)
    return reply.send({ data: rates })
  })
  // ─── CONTENT MANAGEMENT ──────────────────────────────────────────

  const DEFAULT_CONTENT: Record<string, any> = {
    home: {
      hero_title_1: 'Η καλύτερη φροντίδα για τους',
      hero_title_2: 'καλύτερους φίλους σου',
      hero_subtitle: 'Το all-in-one pet super-app για κατοικίδια και ιδιοκτήτες',
      hero_cta: 'Ξεκινήστε Τώρα',
      stat_users: '50K+',
      stat_users_label: 'Χρήστες',
      stat_providers: '2K+',
      stat_providers_label: 'Πάροχοι',
      stat_pets: '120K+',
      stat_pets_label: 'Κατοικίδια',
      stat_rating: '4.9★',
      stat_rating_label: 'Βαθμολογία',
      marquee_text: 'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο',
      services_title: 'Υπηρεσίες',
      services_subtitle: 'Βρες τον καλύτερο πάροχο κοντά σου',
    },
    general: {
      site_name: 'GlobiPet',
      tagline: '#1 Pet Super-App',
      footer_slogan: 'Best care for the best human\'s friends',
      contact_email: 'info@globipet.com',
    },
    legal: {
      page_title: 'Νομική Υποστήριξη Κατοικιδίων',
      page_subtitle: 'AI νομικός σύμβουλος + σύνδεση με εξειδικευμένους δικηγόρους',
    },
    telehealth: {
      page_title: 'Τηλεϊατρική',
      page_subtitle: 'Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία',
    },
  }

  // GET /settings/content/:section — public
  app.get('/content/:section', async (req: any, reply) => {
    const { section } = req.params
    const setting = await prisma.appSetting.findUnique({ where: { key: `content_${section}` } })
    const defaults = DEFAULT_CONTENT[section] || {}
    if (!setting) return reply.send({ data: defaults })
    try {
      const stored = JSON.parse(setting.value)
      return reply.send({ data: { ...defaults, ...stored } })
    } catch {
      return reply.send({ data: defaults })
    }
  })

  // GET /settings/content — admin: all sections
  app.get('/content', { preHandler: [(app as any).authenticate, isAdmin] }, async (req, reply) => {
    const settings = await prisma.appSetting.findMany({ where: { key: { startsWith: 'content_' } } })
    const result: Record<string, any> = { ...DEFAULT_CONTENT }
    for (const s of settings) {
      const section = s.key.replace('content_', '')
      try { result[section] = { ...(DEFAULT_CONTENT[section] || {}), ...JSON.parse(s.value) } } catch {}
    }
    return reply.send({ data: result })
  })

  // PATCH /settings/content/:section — admin only
  app.patch('/content/:section', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { section } = req.params
    const body = req.body as Record<string, string>
    const existing = await prisma.appSetting.findUnique({ where: { key: `content_${section}` } })
    let current: Record<string, any> = {}
    if (existing) { try { current = JSON.parse(existing.value) } catch {} }
    const merged = { ...current, ...body }
    await prisma.appSetting.upsert({
      where: { key: `content_${section}` },
      update: { value: JSON.stringify(merged) },
      create: { key: `content_${section}`, value: JSON.stringify(merged) },
    })
    return reply.send({ data: merged })
  })
}

export default settingsRoutes