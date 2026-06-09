import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const packageRoutes: FastifyPluginAsync = async (app) => {

  // ===== PUBLIC =====
  app.get('/service/:serviceId', async (req: any) => {
    const packages = await prisma.servicePackage.findMany({
      where: { service_id: req.params.serviceId, is_active: true },
      orderBy: [{ display_order: 'asc' }, { price: 'asc' }]
    })
    const grouped: Record<string, any[]> = {}
    for (const pkg of packages) {
      if (!grouped[pkg.group]) grouped[pkg.group] = []
      grouped[pkg.group].push(pkg)
    }
    return { data: packages, grouped }
  })

  // ===== PROVIDER (authenticated) =====
  app.register(async (provider) => {
    provider.addHook('preHandler', async (req: any, reply) => {
      try {
        await (app as any).authenticate(req, reply)
      } catch {
        return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
      }
    })

    // List my services + packages
    provider.get('/my', async (req: any) => {
      const userEmail = (req.user as any).email
      const services = await prisma.service.findMany({
        where: { provider_email: userEmail },
        include: {
          packages: { orderBy: [{ display_order: 'asc' }, { group: 'asc' }, { price: 'asc' }] }
        }
      })
      return { data: services }
    })

    // Onboarding: create service + packages (with custom prices)
    provider.post('/setup', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const {
        category, title, description, city, country, location,
        home_visits, emergency_available, years_experience,
        specializations, pet_types, languages,
        packages_with_prices, // [{ template_id, price, duration_minutes? }]
      } = req.body as any

      if (!category || !title) {
        return reply.code(400).send({ message: 'Λείπει category ή title' })
      }

      // Look up the templates from DB
      let templatePackages: any[] = []
      if (Array.isArray(packages_with_prices) && packages_with_prices.length > 0) {
        const templateIds = packages_with_prices.map((p: any) => p.template_id).filter(Boolean)
        const templates = await prisma.catalogTemplate.findMany({
          where: { id: { in: templateIds } }
        })
        const templatesById = new Map(templates.map(t => [t.id, t]))

        templatePackages = packages_with_prices
          .map((p: any) => {
            const t = templatesById.get(p.template_id)
            if (!t) return null
            return {
              group: t.group,
              name: t.name,
              description: t.description,
              size: t.size,
              pet_type: t.pet_type,
              breed_group: t.breed_group,
              modality: t.modality,
              price: parseFloat(String(p.price)) || 0,
              duration_minutes: parseInt(String(p.duration_minutes ?? t.suggested_duration_minutes)) || 60,
              is_addon: t.is_addon,
            }
          })
          .filter(Boolean)
      }

      const result = await prisma.$transaction(async (tx) => {
        const service = await tx.service.create({
          data: {
            provider_email: userEmail,
            category,
            title,
            description: description || null,
            city: city || null,
            country: country || 'GR',
            location: location || null,
            home_visits: !!home_visits,
            emergency_available: !!emergency_available,
            years_experience: parseInt(years_experience) || 0,
            specializations: Array.isArray(specializations) ? specializations : (specializations ? String(specializations).split(',').map((s: string) => s.trim()) : []),
            pet_types: Array.isArray(pet_types) ? pet_types : (pet_types ? String(pet_types).split(',').map((s: string) => s.trim()) : []),
            languages: Array.isArray(languages) ? languages : (languages ? String(languages).split(',').map((s: string) => s.trim()) : ['el','en']),
            is_active: true,
          }
        })

        if (templatePackages.length > 0) {
          await tx.servicePackage.createMany({
            data: templatePackages.map((p: any, i: number) => ({ ...p, service_id: service.id, display_order: i }))
          })
        }

        return tx.service.findUnique({
          where: { id: service.id },
          include: { packages: true }
        })
      })

      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user && user.role === 'user') {
        await prisma.user.update({ where: { email: userEmail }, data: { role: 'service_provider' } })
      }

      return { service: result, packages_count: templatePackages.length }
    })

    // Bulk import from selected catalog templates (with prices)
    provider.post('/bulk', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const { service_id, packages_with_prices } = req.body as any

      const service = await prisma.service.findUnique({ where: { id: service_id } })
      if (!service || service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }

      const templateIds = packages_with_prices.map((p: any) => p.template_id).filter(Boolean)
      const templates = await prisma.catalogTemplate.findMany({ where: { id: { in: templateIds } } })
      const templatesById = new Map(templates.map(t => [t.id, t]))

      const data = packages_with_prices
        .map((p: any, i: number) => {
          const t = templatesById.get(p.template_id)
          if (!t) return null
          return {
            service_id,
            group: t.group,
            name: t.name,
            description: t.description,
            size: t.size,
            pet_type: t.pet_type,
            breed_group: t.breed_group,
            modality: t.modality,
            price: parseFloat(String(p.price)) || 0,
            duration_minutes: parseInt(String(p.duration_minutes ?? t.suggested_duration_minutes)) || 60,
            is_addon: t.is_addon,
            display_order: i,
          }
        })
        .filter(Boolean) as any[]

      const created = await prisma.servicePackage.createMany({ data })
      return { count: created.count }
    })

    // Update existing service basic info
    provider.patch('/services/:id', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const service = await prisma.service.findUnique({ where: { id: req.params.id } })
      if (!service || service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      const body = req.body as any
      const data: any = {}
      if (body.title !== undefined) data.title = body.title
      if (body.description !== undefined) data.description = body.description
      if (body.city !== undefined) data.city = body.city
      if (body.country !== undefined) data.country = body.country
      if (body.location !== undefined) data.location = body.location
      if (body.home_visits !== undefined) data.home_visits = !!body.home_visits
      if (body.emergency_available !== undefined) data.emergency_available = !!body.emergency_available
      if (body.years_experience !== undefined) data.years_experience = parseInt(body.years_experience) || 0
      if (body.is_active !== undefined) data.is_active = !!body.is_active
      if (body.cover_image !== undefined) data.cover_image = body.cover_image
      if (body.specializations !== undefined) {
        data.specializations = Array.isArray(body.specializations)
          ? body.specializations
          : String(body.specializations).split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      if (body.pet_types !== undefined) {
        data.pet_types = Array.isArray(body.pet_types)
          ? body.pet_types
          : String(body.pet_types).split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      if (body.languages !== undefined) {
        data.languages = Array.isArray(body.languages)
          ? body.languages
          : String(body.languages).split(',').map((s: string) => s.trim()).filter(Boolean)
      }

      const updated = await prisma.service.update({
        where: { id: req.params.id },
        data,
        include: { packages: true }
      })
      return updated
    })

    provider.delete('/services/:id', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const service = await prisma.service.findUnique({ where: { id: req.params.id } })
      if (!service || service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      await prisma.service.delete({ where: { id: req.params.id } })
      return reply.code(204).send()
    })

    // Custom package CRUD
    provider.post('/', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const body = req.body as any
      const service = await prisma.service.findUnique({ where: { id: body.service_id } })
      if (!service || service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα σε αυτή την υπηρεσία' })
      }
      const pkg = await prisma.servicePackage.create({
        data: {
          service_id: body.service_id,
          group: body.group, name: body.name, description: body.description || null,
          size: body.size || null, pet_type: body.pet_type || null,
          breed_group: body.breed_group || null, modality: body.modality || null,
          price: parseFloat(body.price), duration_minutes: parseInt(body.duration_minutes) || 60,
          is_addon: !!body.is_addon, is_active: body.is_active !== false,
          display_order: parseInt(body.display_order) || 0,
        }
      })
      return pkg
    })

    provider.patch('/:id', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: req.params.id }, include: { service: true }
      })
      if (!pkg || pkg.service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      const body = req.body as any
      const updated = await prisma.servicePackage.update({
        where: { id: req.params.id },
        data: {
          ...(body.group && { group: body.group }),
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.size !== undefined && { size: body.size }),
          ...(body.pet_type !== undefined && { pet_type: body.pet_type }),
          ...(body.breed_group !== undefined && { breed_group: body.breed_group }),
          ...(body.modality !== undefined && { modality: body.modality }),
          ...(body.price !== undefined && { price: parseFloat(body.price) }),
          ...(body.duration_minutes !== undefined && { duration_minutes: parseInt(body.duration_minutes) }),
          ...(body.is_addon !== undefined && { is_addon: !!body.is_addon }),
          ...(body.is_active !== undefined && { is_active: !!body.is_active }),
          ...(body.display_order !== undefined && { display_order: parseInt(body.display_order) }),
        }
      })
      return updated
    })

    provider.delete('/:id', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: req.params.id }, include: { service: true }
      })
      if (!pkg || pkg.service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      await prisma.servicePackage.delete({ where: { id: req.params.id } })
      return reply.code(204).send()
    })
  })
}

export default packageRoutes
