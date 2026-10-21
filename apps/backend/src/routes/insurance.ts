import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

/**
 * Πεδία που αλλάζει η διαχείριση. Πριν περνούσε όλο το σώμα στη βάση (id,
 * provider_id σε άλλη εταιρεία, ό,τι άλλο έστελνε ο client) και το website
 * μπορούσε να είναι `javascript:` — γινόταν href στο κουμπί «Αίτηση» του web.
 */
const PROVIDER_FIELDS = ['name', 'name_el', 'logo_url', 'website', 'phone', 'email', 'description', 'is_active', 'display_order'] as const
const PLAN_FIELDS = [
  'provider_id', 'name', 'name_el', 'description', 'tier', 'price_monthly', 'price_annual', 'currency',
  'covers_accidents', 'covers_illness', 'covers_surgery', 'covers_dental', 'covers_preventive',
  'covers_liability', 'covers_death', 'annual_limit', 'per_incident_limit', 'deductible',
  'reimbursement_percent', 'waiting_period_days', 'pet_types', 'max_age_years', 'min_age_months',
  'features', 'exclusions', 'is_active', 'is_featured', 'display_order',
] as const
const FLOAT_FIELDS = new Set(['price_monthly', 'price_annual', 'annual_limit', 'per_incident_limit', 'deductible'])
const INT_FIELDS = new Set(['reimbursement_percent', 'waiting_period_days', 'max_age_years', 'min_age_months', 'display_order'])
const URL_FIELDS = ['website', 'logo_url'] as const

/** Κενό, ή διεύθυνση http(s). Οτιδήποτε άλλο (javascript:, data:) απορρίπτεται. */
function isSafeUrl(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true
  return typeof v === 'string' && /^https?:\/\/[^\s]+$/i.test(v.trim())
}

/** Μόνο τα επιτρεπόμενα πεδία· οι αριθμοί από φόρμα (κείμενο) γίνονται αριθμοί. */
function pickFields(body: any, allowed: readonly string[]): any {
  const out: any = {}
  for (const k of allowed) {
    if (!(k in (body ?? {}))) continue
    let v = body[k]
    if (FLOAT_FIELDS.has(k) || INT_FIELDS.has(k)) {
      if (v === '' || v === null) v = null
      else {
        const n = FLOAT_FIELDS.has(k) ? parseFloat(v) : parseInt(v)
        v = Number.isFinite(n) ? n : null
      }
      // Υποχρεωτικά με default στη βάση: κενό = καμία αλλαγή.
      if (v === null && (k === 'price_monthly' || k === 'waiting_period_days' || k === 'display_order')) continue
    }
    if ((URL_FIELDS as readonly string[]).includes(k) && typeof v === 'string') v = v.trim() || null
    out[k] = v
  }
  return out
}

export default async function insuranceRoutes(app: FastifyInstance) {

  // Inline admin check
  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /insurance/providers
  app.get('/insurance/providers', async (req: any, reply) => {
    const lang = getRequestLang(req)
    const providers = await prisma.insuranceProvider.findMany({
      where: { is_active: true },
      include: {
        plans: {
          where: { is_active: true },
          orderBy: [{ display_order: 'asc' }, { price_monthly: 'asc' }],
        },
      },
      orderBy: { display_order: 'asc' },
    })
    // Translate providers themselves, then translate the nested plans array
    // of each provider. translateRecords is a no-op if no translations exist.
    const translatedProviders = await translateRecords('insurance_provider', providers, lang)
    for (const p of translatedProviders) {
      if (p.plans?.length) {
        p.plans = await translateRecords('insurance_plan', p.plans, lang)
      }
    }
    return reply.send({ data: translatedProviders })
  })

  // GET /insurance/plans
  app.get('/insurance/plans', async (req: any, reply) => {
    const lang = getRequestLang(req)
    const { pet_type, tier, max_price, covers_surgery, covers_dental } = req.query
    const plans = await prisma.insurancePlan.findMany({
      where: {
        is_active: true,
        ...(pet_type && { pet_types: { has: pet_type } }),
        ...(tier && { tier }),
        ...(max_price && { price_monthly: { lte: parseFloat(max_price) } }),
        ...(covers_surgery === 'true' && { covers_surgery: true }),
        ...(covers_dental === 'true' && { covers_dental: true }),
      },
      include: {
        provider: { select: { id: true, name: true, name_el: true, logo_url: true, website: true, phone: true } },
      },
      orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
    })
    // Translate the plan itself, then its nested provider (which is a
    // single record, so translateRecord — singular).
    const translatedPlans = await translateRecords('insurance_plan', plans, lang)
    for (const p of translatedPlans) {
      if (p.provider) {
        // Το translateRecord επιστρέφει `T | null`. Εδώ το p.provider είναι
        // ήδη ελεγμένο ως μη κενό και η συνάρτηση επιστρέφει την εγγραφή
        // αυτούσια αν δεν βρει μετάφραση, οπότε το null δεν προκύπτει ποτέ.
        p.provider = (await translateRecord('insurance_provider', p.provider, lang)) ?? p.provider
      }
    }
    return reply.send({ data: translatedPlans })
  })

  // GET /insurance/plans/:id
  app.get('/insurance/plans/:id', async (req: any, reply) => {
    const lang = getRequestLang(req)
    const plan = await prisma.insurancePlan.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    })
    if (!plan) return reply.code(404).send({ message: 'Not found' })
    const translated: any = await translateRecord('insurance_plan', plan, lang)
    if (translated?.provider) {
      translated.provider = await translateRecord('insurance_provider', translated.provider, lang)
    }
    return reply.send({ data: translated })
  })

  // ============ ADMIN ROUTES ============

  // POST /admin/insurance/providers
  app.post('/admin/insurance/providers', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const data = pickFields(req.body, PROVIDER_FIELDS)
    if (!URL_FIELDS.every(k => isSafeUrl(data[k]))) return reply.code(400).send({ message: 'Μη έγκυρη διεύθυνση (URL)' })
    if (!data.name) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const provider = await prisma.insuranceProvider.create({ data })
    return reply.code(201).send({ data: provider })
  })

  // PATCH /admin/insurance/providers/:id
  app.patch('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const data = pickFields(req.body, PROVIDER_FIELDS)
    if (!URL_FIELDS.every(k => isSafeUrl(data[k]))) return reply.code(400).send({ message: 'Μη έγκυρη διεύθυνση (URL)' })
    const provider = await prisma.insuranceProvider.update({ where: { id: req.params.id }, data })
    return reply.send({ data: provider })
  })

  // DELETE /admin/insurance/providers/:id
  app.delete('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.insuranceProvider.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })

  // POST /admin/insurance/plans
  app.post('/admin/insurance/plans', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const data = pickFields(req.body, PLAN_FIELDS)
    if (!data.provider_id || !data.name || !data.tier || data.price_monthly == null) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }
    const plan = await prisma.insurancePlan.create({ data })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/insurance/plans/:id
  app.patch('/admin/insurance/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.insurancePlan.update({ where: { id: req.params.id }, data: pickFields(req.body, PLAN_FIELDS) })
    return reply.send({ data: plan })
  })

  // DELETE /admin/insurance/plans/:id
  app.delete('/admin/insurance/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.insurancePlan.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })

  // POST /insurance/bulk-import
  app.post('/insurance/bulk-import', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { providers = [], plans = [] } = req.body
    const results = { providers_created: 0, plans_created: 0, errors: [] as any[] }

    for (let i = 0; i < providers.length; i++) {
      const row = providers[i]
      try {
        if (!row.name) throw new Error('Λείπει το όνομα εταιρείας')
        if (!isSafeUrl(row.website) || !isSafeUrl(row.logo_url)) throw new Error('Μη έγκυρη διεύθυνση (URL)')
        await prisma.insuranceProvider.upsert({
          where: { name: row.name },
          update: { name_el: row.name_el, website: row.website, phone: row.phone, email: row.email, description: row.description, logo_url: row.logo_url, display_order: parseInt(row.display_order) || 0 },
          create: { name: row.name, name_el: row.name_el, website: row.website, phone: row.phone, email: row.email, description: row.description, logo_url: row.logo_url, display_order: parseInt(row.display_order) || 0, is_active: true },
        })
        results.providers_created++
      } catch (err: any) {
        results.errors.push({ type: 'provider', row: i + 1, error: err.message })
      }
    }

    for (let i = 0; i < plans.length; i++) {
      const row = plans[i]
      try {
        if (!row.provider_name || !row.plan_name || !row.tier || !row.price_monthly) {
          throw new Error('Λείπουν υποχρεωτικά πεδία')
        }
        const provider = await prisma.insuranceProvider.findFirst({ where: { name: row.provider_name } })
        if (!provider) throw new Error(`Δεν βρέθηκε εταιρεία: ${row.provider_name}`)

        await prisma.insurancePlan.create({
          data: {
            provider_id: provider.id,
            name: row.plan_name,
            name_el: row.plan_name_el || null,
            tier: row.tier,
            price_monthly: parseFloat(row.price_monthly),
            price_annual: row.price_annual ? parseFloat(row.price_annual) : null,
            covers_accidents: row.covers_accidents === 'TRUE' || row.covers_accidents === true,
            covers_illness: row.covers_illness === 'TRUE' || row.covers_illness === true,
            covers_surgery: row.covers_surgery === 'TRUE' || row.covers_surgery === true,
            covers_dental: row.covers_dental === 'TRUE' || row.covers_dental === true,
            covers_preventive: row.covers_preventive === 'TRUE' || row.covers_preventive === true,
            covers_liability: row.covers_liability === 'TRUE' || row.covers_liability === true,
            covers_death: row.covers_death === 'TRUE' || row.covers_death === true,
            annual_limit: row.annual_limit ? parseFloat(row.annual_limit) : null,
            deductible: row.deductible ? parseFloat(row.deductible) : null,
            reimbursement_percent: row.reimbursement_pct ? parseInt(row.reimbursement_pct) : null,
            waiting_period_days: row.waiting_days ? parseInt(row.waiting_days) : 14,
            pet_types: row.pet_types ? row.pet_types.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            is_active: true,
          }
        })
        results.plans_created++
      } catch (err: any) {
        results.errors.push({ type: 'plan', row: i + 1, name: row.plan_name, error: err.message })
      }
    }

    return reply.send(results)
  })
}
