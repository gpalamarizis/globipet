import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

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
        p.provider = await translateRecord('insurance_provider', p.provider, lang)
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
    const provider = await prisma.insuranceProvider.create({ data: req.body })
    return reply.code(201).send({ data: provider })
  })

  // PATCH /admin/insurance/providers/:id
  app.patch('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const provider = await prisma.insuranceProvider.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: provider })
  })

  // DELETE /admin/insurance/providers/:id
  app.delete('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.insuranceProvider.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })

  // POST /admin/insurance/plans
  app.post('/admin/insurance/plans', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.insurancePlan.create({ data: req.body })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/insurance/plans/:id
  app.patch('/admin/insurance/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.insurancePlan.update({ where: { id: req.params.id }, data: req.body })
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
