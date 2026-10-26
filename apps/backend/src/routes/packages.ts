import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { coordsFromBody } from '../lib/geocode.js'
import { BIRTH_DATE_REQUIRED_MESSAGE } from './users.js'

/** Ανώτατη τιμή (€) υπηρεσίας/πακέτου. */
const MAX_PRICE = 100_000

/**
 * Αυστηρή ανάγνωση τιμής: αριθμός ή αριθμητικό κείμενο (δεκαδικό με «.» ή
 * «,»), πεπερασμένος, 0..MAX_PRICE. Το parseFloat δεχόταν «12abc» ως 12 και
 * δεν είχε άνω όριο. null = μη έγκυρη.
 */
function parsePrice(x: unknown): number | null {
  let n: number
  if (typeof x === 'number') n = x
  else if (typeof x === 'string' && x.trim() !== '') n = Number(x.trim().replace(',', '.'))
  else return null
  return Number.isFinite(n) && n >= 0 && n <= MAX_PRICE ? n : null
}

const packageRoutes: FastifyPluginAsync = async (app) => {

  // ===== PUBLIC =====
  app.get('/service/:serviceId', async (req: any) => {
    const packages = await prisma.servicePackage.findMany({
      where: { service_id: req.params.serviceId, is_active: true },
      orderBy: [{ display_order: 'asc' }, { price: 'asc' }]
    })
    const grouped: Record<string, any[]> = {}
    for (const pkg of packages) {
      const key = pkg.group || 'other'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(pkg)
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

      const cleanTitle = String(title ?? '').trim()
      if (!category || !cleanTitle) {
        return reply.code(400).send({ message: 'Λείπει category ή title' })
      }
      // Βασική τιμή (Service.price): προαιρετική. Ισχύει σε κρατήσεις χωρίς
      // πακέτα και είναι η τιμή συνεδρίας τηλεϊατρικής. Παλιοί πελάτες που
      // δεν τη στέλνουν παίρνουν 0, όπως πριν.
      let basePrice = 0
      if (req.body?.price !== undefined && req.body?.price !== null && req.body?.price !== '') {
        const p = parsePrice(req.body.price)
        if (p === null) return reply.code(400).send({ message: 'Μη έγκυρη τιμή', field: 'price' })
        basePrice = p
      }
      // Προαιρετική τοποθεσία στον χάρτη (latitude/longitude). Παλιοί πελάτες
      // που δεν τη στέλνουν δεν επηρεάζονται.
      const coords = coordsFromBody(req.body)
      if ('error' in coords) return reply.code(400).send({ message: coords.error, field: 'latitude' })

      const requestingUser = await prisma.user.findUnique({ where: { email: userEmail } })
      if (!requestingUser) {
        return reply.code(404).send({ message: 'Χρήστης δεν βρέθηκε' })
      }
      // Ε16: ο απλός χρήστης γίνεται εδώ service_provider — και ο πάροχος που
      // έγινε μόνος του ΔΕΝ εξαιρείται από την πύλη ημερομηνίας γέννησης
      // (users.ts needsBirthDate). Χωρίς ημερομηνία → πρώτα η ημερομηνία
      // (ίδια απάντηση με το authenticate του index.ts), πριν γραφτεί τίποτα.
      if (requestingUser.role === 'user' && !requestingUser.birth_date) {
        return reply.code(403).send({ message: BIRTH_DATE_REQUIRED_MESSAGE, code: 'birth_date_required' })
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
            provider_name: requestingUser.full_name,
            service_type: category,
            category,
            title: cleanTitle,
            // description και city είναι ΥΠΟΧΡΕΩΤΙΚΑ (non-null) στο schema: με
            // κενό πεδίο το `|| null` έριχνε σφάλμα Prisma (500). Κενή
            // περιγραφή → ο τίτλος (όπως το /services/bulk), κενή πόλη → ''.
            description: String(description ?? '').trim() || cleanTitle,
            city: String(city ?? '').trim(),
            price: basePrice,
            country: country || 'GR',
            location: location || null,
            ...coords.data,
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

      if (requestingUser.role === 'user') {
        await prisma.user.update({ where: { email: userEmail }, data: { role: 'service_provider' } })
        // Νέος ρόλος: το cache ελέγχου τοκεν (index.ts) καθαρίζει αμέσως.
        ;(app as any).invalidateAuthCache?.(requestingUser.id)
      }

      return { service: result, packages_count: templatePackages.length }
    })

    // Bulk import from selected catalog templates (with prices)
    provider.post('/bulk', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const { service_id, packages_with_prices } = req.body as any

      // Without this guard a non-array body throws on .map and returns a 500
      // with a stack trace instead of a clear validation error.
      if (!Array.isArray(packages_with_prices) || packages_with_prices.length === 0) {
        return reply.code(400).send({ message: 'packages_with_prices πρέπει να είναι μη κενός πίνακας' })
      }

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
          const price = parseFloat(String(p.price))
          return {
            service_id,
            group: t.group,
            name: t.name,
            description: t.description,
            size: t.size,
            pet_type: t.pet_type,
            breed_group: t.breed_group,
            modality: t.modality,
            // A negative or non-numeric price would flow straight into
            // bookings and the commission split.
            price: Number.isFinite(price) && price >= 0 ? price : 0,
            duration_minutes: parseInt(String(p.duration_minutes ?? t.suggested_duration_minutes)) || 60,
            is_addon: t.is_addon,
            display_order: i,
          }
        })
        .filter(Boolean) as any[]

      if (data.length === 0) {
        return reply.code(400).send({ message: 'Κανένα έγκυρο πρότυπο δεν βρέθηκε' })
      }

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
      // description/city είναι non-null στο schema: null → '' αντί για 500.
      if (body.description !== undefined) data.description = body.description ?? ''
      if (body.city !== undefined) data.city = body.city ?? ''
      // Βασική τιμή (προαιρετική) — ίδιος έλεγχος με το /setup.
      if (body.price !== undefined && body.price !== null && body.price !== '') {
        const p = parsePrice(body.price)
        if (p === null) return reply.code(400).send({ message: 'Μη έγκυρη τιμή', field: 'price' })
        data.price = p
      }
      if (body.country !== undefined) data.country = body.country
      if (body.location !== undefined) data.location = body.location
      const coords = coordsFromBody(body)
      if ('error' in coords) return reply.code(400).send({ message: coords.error, field: 'latitude' })
      Object.assign(data, coords.data)
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
      // Ίδιος κανόνας με το DELETE /services/:id: υπηρεσία με κρατήσεις δεν
      // σβήνεται — από εδώ περνούσε χωρίς έλεγχο.
      const bookings = await prisma.booking.count({ where: { service_id: req.params.id } })
      if (bookings > 0) {
        return reply.code(409).send({
          message: 'Η υπηρεσία έχει κρατήσεις και δεν διαγράφεται. Απενεργοποίησέ την αντί να τη σβήσεις.',
          code: 'SERVICE_HAS_BOOKINGS', bookings,
        })
      }
      await prisma.service.delete({ where: { id: req.params.id } })
      return reply.code(204).send()
    })

    // Custom package CRUD
    provider.post('/', async (req: any, reply) => {
      const userEmail = (req.user as any).email
      const body = req.body as any
      if (!body?.name) {
        return reply.code(400).send({ message: 'Το όνομα είναι υποχρεωτικό' })
      }
      const price = parsePrice(body?.price)
      // parseFloat(undefined) is NaN, which Prisma rejects with an opaque
      // error at write time. Catch it here with a message the UI can show.
      if (price === null) {
        return reply.code(400).send({ message: 'Μη έγκυρη τιμή', field: 'price' })
      }
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
          price, duration_minutes: parseInt(body.duration_minutes) || 60,
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
      // Αρνητική ή μη αριθμητική τιμή θα περνούσε σε κρατήσεις και προμήθειες.
      const newPrice = body.price !== undefined ? parsePrice(body.price) : undefined
      if (newPrice === null) return reply.code(400).send({ message: 'Μη έγκυρη τιμή', field: 'price' })
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
          ...(newPrice !== undefined && { price: newPrice }),
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
