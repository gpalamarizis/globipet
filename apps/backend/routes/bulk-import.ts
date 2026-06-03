import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const bulkImportRoutes: FastifyPluginAsync = async (app) => {
  // Admin only
  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // POST /admin/bulk-import/products
  app.post('/products', async (req: any, reply) => {
    const { items } = req.body as { items: any[] }
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ message: 'Δεν δόθηκαν προϊόντα' })
    }

    const results = { created: 0, failed: 0, errors: [] as any[] }

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      try {
        // Required field validation
        if (!row.name || !row.price || !row.category) {
          throw new Error('Λείπουν υποχρεωτικά πεδία (name, price, category)')
        }

        // Build translations from EL/EN/ES/FR/ZH columns if provided
        const name_translations: any = {}
        const description_translations: any = {}
        for (const lang of ['en', 'es', 'fr', 'zh']) {
          if (row[`name_${lang}`]) name_translations[lang] = String(row[`name_${lang}`])
          if (row[`description_${lang}`]) description_translations[lang] = String(row[`description_${lang}`])
        }

        const data: any = {
          name: String(row.name),
          description: String(row.description || ''),
          price: parseFloat(row.price),
          category: String(row.category),
          brand: row.brand ? String(row.brand) : null,
          stock: row.stock ? parseInt(row.stock) : 0,
          image_url: row.image_url ? String(row.image_url) : null,
          target_species: row.target_species
            ? String(row.target_species).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          is_featured: row.is_featured === true || row.is_featured === 'true' || row.is_featured === 1,
        }
        if (Object.keys(name_translations).length > 0) data.name_translations = name_translations
        if (Object.keys(description_translations).length > 0) data.description_translations = description_translations
        if (row.discount_percentage) data.discount_percentage = parseInt(row.discount_percentage)
        if (row.sale_price) data.sale_price = parseFloat(row.sale_price)

        await prisma.product.create({ data })
        results.created++
      } catch (err: any) {
        results.failed++
        results.errors.push({ row: i + 1, name: row.name || `Γραμμή ${i + 1}`, error: err.message })
      }
    }

    return results
  })

  // POST /admin/bulk-import/services
  app.post('/services', async (req: any, reply) => {
    const { items } = req.body as { items: any[] }
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ message: 'Δεν δόθηκαν υπηρεσίες' })
    }

    const results = { created: 0, failed: 0, errors: [] as any[] }

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      try {
        if (!row.provider_name || !row.provider_email || !row.service_type || !row.city) {
          throw new Error('Λείπουν υποχρεωτικά πεδία (provider_name, provider_email, service_type, city)')
        }

        // Build translations
        const provider_name_translations: any = {}
        const description_translations: any = {}
        for (const lang of ['en', 'es', 'fr', 'zh']) {
          if (row[`provider_name_${lang}`]) provider_name_translations[lang] = String(row[`provider_name_${lang}`])
          if (row[`description_${lang}`]) description_translations[lang] = String(row[`description_${lang}`])
        }

        const data: any = {
          provider_name: String(row.provider_name),
          provider_email: String(row.provider_email),
          service_type: String(row.service_type),
          description: String(row.description || ''),
          price: parseFloat(row.price) || 0,
          city: String(row.city),
          location: row.location ? String(row.location) : null,
          contact_phone: row.contact_phone ? String(row.contact_phone) : null,
          contact_email: row.contact_email ? String(row.contact_email) : null,
          image_url: row.image_url ? String(row.image_url) : null,
          years_experience: row.years_experience ? parseInt(row.years_experience) : null,
          home_visits: row.home_visits === true || row.home_visits === 'true' || row.home_visits === 1,
          emergency_available: row.emergency_available === true || row.emergency_available === 'true' || row.emergency_available === 1,
          is_verified: row.is_verified === true || row.is_verified === 'true' || row.is_verified === 1,
          specializations: row.specializations
            ? String(row.specializations).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          pet_types: row.pet_types
            ? String(row.pet_types).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          languages: row.languages
            ? String(row.languages).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          available_days: row.available_days
            ? String(row.available_days).split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n))
            : [1, 2, 3, 4, 5],
        }
        if (Object.keys(provider_name_translations).length > 0) data.provider_name_translations = provider_name_translations
        if (Object.keys(description_translations).length > 0) data.description_translations = description_translations
        if (row.latitude) data.latitude = parseFloat(row.latitude)
        if (row.longitude) data.longitude = parseFloat(row.longitude)

        await prisma.service.create({ data })
        results.created++
      } catch (err: any) {
        results.failed++
        results.errors.push({ row: i + 1, name: row.provider_name || `Γραμμή ${i + 1}`, error: err.message })
      }
    }

    return results
  })
}

export default bulkImportRoutes
