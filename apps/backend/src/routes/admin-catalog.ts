import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Admin endpoints for catalog templates + services + packages of any provider.
 * Mounted at /api/admin/catalog
 */
const adminCatalogRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req: any, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── CATALOG TEMPLATES ───────────────────────────────────────

  app.get('/templates', async (req: any) => {
    const { category } = req.query
    const templates = await prisma.catalogTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { display_order: 'asc' }]
    })
    return { data: templates }
  })

  app.post('/templates', async (req: any) => {
    const body = req.body as any
    const tpl = await prisma.catalogTemplate.create({
      data: {
        category: body.category,
        group: body.group,
        name: body.name,
        description: body.description || null,
        size: body.size || null,
        pet_type: body.pet_type || null,
        breed_group: body.breed_group || null,
        modality: body.modality || null,
        suggested_duration_minutes: parseInt(body.suggested_duration_minutes) || 60,
        is_addon: !!body.is_addon,
        is_active: body.is_active !== false,
        display_order: parseInt(body.display_order) || 0,
      }
    })
    return tpl
  })

  app.patch('/templates/:id', async (req: any) => {
    const body = req.body as any
    const data: any = {}
    for (const f of ['category','group','name','description','size','pet_type','breed_group','modality']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.suggested_duration_minutes !== undefined) data.suggested_duration_minutes = parseInt(body.suggested_duration_minutes) || 60
    if (body.is_addon !== undefined) data.is_addon = !!body.is_addon
    if (body.is_active !== undefined) data.is_active = !!body.is_active
    if (body.display_order !== undefined) data.display_order = parseInt(body.display_order) || 0
    return prisma.catalogTemplate.update({ where: { id: req.params.id }, data })
  })

  app.delete('/templates/:id', async (req: any, reply) => {
    await prisma.catalogTemplate.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── PROVIDER SERVICES (all providers) ───────────────────────

  app.get('/services', async (req: any) => {
    const services = await prisma.service.findMany({
      include: {
        packages: { orderBy: [{ display_order: 'asc' }, { group: 'asc' }] }
      },
      orderBy: { created_at: 'desc' }
    })
    return { data: services }
  })

  app.patch('/services/:id', async (req: any, reply) => {
    const body = req.body as any
    const data: any = {}
    const allowed = ['title','description','city','country','location','category',
      'home_visits','emergency_available','years_experience','is_active','is_verified',
      'cover_image','specializations','pet_types','languages']
    for (const f of allowed) {
      if (body[f] !== undefined) {
        if (['home_visits','emergency_available','is_active','is_verified'].includes(f)) data[f] = !!body[f]
        else if (f === 'years_experience') data[f] = parseInt(body[f]) || 0
        else if (['specializations','pet_types','languages'].includes(f)) {
          data[f] = Array.isArray(body[f]) ? body[f] :
            String(body[f]).split(',').map((s: string) => s.trim()).filter(Boolean)
        }
        else data[f] = body[f]
      }
    }
    const updated = await prisma.service.update({
      where: { id: req.params.id }, data, include: { packages: true }
    })
    return updated
  })

  app.delete('/services/:id', async (req: any, reply) => {
    await prisma.service.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── PROVIDER PACKAGES (all) ─────────────────────────────────

  app.get('/packages', async (req: any) => {
    const { service_id } = req.query
    const packages = await prisma.servicePackage.findMany({
      where: service_id ? { service_id } : undefined,
      include: { service: { select: { id: true, title: true, provider_email: true, category: true } } },
      orderBy: [{ service_id: 'asc' }, { display_order: 'asc' }]
    })
    return { data: packages }
  })

  app.patch('/packages/:id', async (req: any) => {
    const body = req.body as any
    const data: any = {}
    for (const f of ['group','name','description','size','pet_type','breed_group','modality']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.price !== undefined) data.price = parseFloat(body.price) || 0
    if (body.duration_minutes !== undefined) data.duration_minutes = parseInt(body.duration_minutes) || 60
    if (body.is_addon !== undefined) data.is_addon = !!body.is_addon
    if (body.is_active !== undefined) data.is_active = !!body.is_active
    if (body.display_order !== undefined) data.display_order = parseInt(body.display_order) || 0
    return prisma.servicePackage.update({ where: { id: req.params.id }, data })
  })

  app.delete('/packages/:id', async (req: any, reply) => {
    await prisma.servicePackage.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default adminCatalogRoutes
