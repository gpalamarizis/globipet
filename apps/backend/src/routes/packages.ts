import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Public + provider package endpoints.
 * Mounted at /api/packages
 */
const packageRoutes: FastifyPluginAsync = async (app) => {

  // ===== PUBLIC =====

  // Get packages for a service (grouped)
  app.get('/service/:serviceId', async (req: any) => {
    const packages = await prisma.servicePackage.findMany({
      where: {
        service_id: req.params.serviceId,
        is_active: true
      },
      orderBy: [{ display_order: 'asc' }, { price: 'asc' }]
    })

    // Group by `group` field
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

    // List my packages (provider must own the service)
    provider.get('/my', async (req: any) => {
      const userEmail = (req.user as any).email
      const services = await prisma.service.findMany({
        where: { provider_email: userEmail },
        include: {
          packages: {
            orderBy: [{ display_order: 'asc' }, { group: 'asc' }, { price: 'asc' }]
          }
        }
      })
      return { data: services }
    })

    // Create package
    provider.post('/', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const body = req.body as any

      // Verify the service belongs to this provider
      const service = await prisma.service.findUnique({
        where: { id: body.service_id }
      })
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

    // Update package
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

    // Delete package
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

    // Bulk create from preset catalog
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
