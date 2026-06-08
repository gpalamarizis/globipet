import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { CATALOG_PRESETS, type CategoryKey } from '../lib/catalog-presets.js'

/**
 * Public + provider package endpoints.
 * Mounted at /api/packages
 */
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

    // ===== NEW: Onboarding wizard =====
    // Creates a Service + initial packages in one call.
    // Called from the registration wizard or "Setup my services" flow.
    provider.post('/setup', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const userName = (req.user as any).full_name || userEmail

      const {
        category,
        title,
        description,
        city,
        country,
        location,
        home_visits,
        emergency_available,
        years_experience,
        specializations,
        pet_types,
        languages,
        preset_keys,    // array of indices into CATALOG_PRESETS[category]
        custom_packages // array of custom packages
      } = req.body as any

      if (!category || !title) {
        return reply.code(400).send({ message: 'Λείπει category ή title' })
      }

      // Build packages list — combine selected presets + custom
      const presetList = CATALOG_PRESETS[category as CategoryKey] || []
      const fromPresets = Array.isArray(preset_keys)
        ? preset_keys
            .map((idx: number) => presetList[idx])
            .filter(Boolean)
        : []
      const fromCustom = Array.isArray(custom_packages) ? custom_packages : []
      const allPackages = [...fromPresets, ...fromCustom]

      // Create service + packages in transaction
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

        if (allPackages.length > 0) {
          await tx.servicePackage.createMany({
            data: allPackages.map((p: any, i: number) => ({
              service_id: service.id,
              group: p.group || 'service',
              name: p.name,
              description: p.description || null,
              size: p.size || null,
              pet_type: p.pet_type || null,
              breed_group: p.breed_group || null,
              modality: p.modality || null,
              price: parseFloat(String(p.price)) || 0,
              duration_minutes: parseInt(String(p.duration_minutes)) || 60,
              is_addon: !!p.is_addon,
              display_order: i,
            }))
          })
        }

        return tx.service.findUnique({
          where: { id: service.id },
          include: { packages: true }
        })
      })

      // Make sure user role is service_provider (if registered as 'user')
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user && user.role === 'user') {
        await prisma.user.update({
          where: { email: userEmail },
          data: { role: 'service_provider' }
        })
      }

      return { service: result, packages_count: allPackages.length }
    })

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
          group: body.group,
          name: body.name,
          description: body.description || null,
          size: body.size || null,
          pet_type: body.pet_type || null,
          breed_group: body.breed_group || null,
          modality: body.modality || null,
          price: parseFloat(body.price),
          duration_minutes: parseInt(body.duration_minutes) || 60,
          is_addon: !!body.is_addon,
          is_active: body.is_active !== false,
          display_order: parseInt(body.display_order) || 0,
        }
      })
      return pkg
    })

    provider.patch('/:id', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: req.params.id },
        include: { service: true }
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
        where: { id: req.params.id },
        include: { service: true }
      })
      if (!pkg || pkg.service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      await prisma.servicePackage.delete({ where: { id: req.params.id } })
      return reply.code(204).send()
    })

    provider.post('/bulk', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const { service_id, packages } = req.body as any

      const service = await prisma.service.findUnique({ where: { id: service_id } })
      if (!service || service.provider_email !== userEmail) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }

      const created = await prisma.servicePackage.createMany({
        data: packages.map((p: any, i: number) => ({
          service_id,
          group: p.group,
          name: p.name,
          description: p.description || null,
          size: p.size || null,
          pet_type: p.pet_type || null,
          breed_group: p.breed_group || null,
          modality: p.modality || null,
          price: parseFloat(p.price),
          duration_minutes: parseInt(p.duration_minutes) || 60,
          is_addon: !!p.is_addon,
          display_order: p.display_order ?? i,
        }))
      })
      return { count: created.count }
    })
  })
}

export default packageRoutes
