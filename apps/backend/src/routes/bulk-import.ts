import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { SUPPORTED } from '../lib/i18n.js'

/**
 * Bulk import from a spreadsheet — administrators only.
 *
 * TRANSLATIONS
 *   The previous version wrote `name_translations` and
 *   `description_translations` JSON columns onto products and services. Those
 *   columns were never created — the platform stores translations in the
 *   `translations` table, keyed by (entity, entity_id, field, lang). So every
 *   imported row that carried a name_en or description_fr threw at write time
 *   and was reported back as "failed", while rows without translations went
 *   through. The import worked right up until someone actually filled in the
 *   translation columns.
 *
 *   Translations now land in the table the rest of the app reads from.
 */

/** Language columns we accept, minus Greek which is the source text. */
const IMPORT_LANGS = (SUPPORTED as readonly string[]).filter(l => l !== 'el')

/**
 * Write one row's translations. Called after the record exists so we have its
 * id. Failures here do not roll back the record — a product with a missing
 * French name is still a usable product, and the caller sees the warning.
 */
async function saveTranslations(
  entity: string,
  entityId: string,
  fields: Record<string, Record<string, string>>,
  createdBy: string,
): Promise<string[]> {
  const warnings: string[] = []
  for (const [field, byLang] of Object.entries(fields)) {
    for (const [lang, value] of Object.entries(byLang)) {
      const text = String(value).trim()
      if (!text) continue
      try {
        await prisma.$executeRaw`
          INSERT INTO translations
            (id, entity, entity_id, field, lang, value, created_by, source, created_at, updated_at)
          VALUES
            (gen_random_uuid()::varchar, ${entity}, ${entityId}, ${field}, ${lang},
             ${text}, ${createdBy}, 'import', now(), now())
          ON CONFLICT (entity, entity_id, field, lang)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
      } catch (err: any) {
        warnings.push(`${field}.${lang}: ${err.message}`)
      }
    }
  }
  return warnings
}

/** Collect `<field>_<lang>` columns out of a spreadsheet row. */
function collectLangColumns(row: any, field: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const lang of IMPORT_LANGS) {
    const v = row[`${field}_${lang}`]
    if (v != null && String(v).trim()) out[lang] = String(v)
  }
  return out
}

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
    if (items.length > 5000) {
      return reply.code(400).send({ message: 'Μέχρι 5000 γραμμές ανά εισαγωγή' })
    }

    const actor = (req.user as any).email
    const results = { created: 0, failed: 0, translated: 0, errors: [] as any[], warnings: [] as any[] }

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      try {
        // Required field validation
        if (!row.name || row.price == null || !row.category) {
          throw new Error('Λείπουν υποχρεωτικά πεδία (name, price, category)')
        }
        const price = parseFloat(row.price)
        if (!Number.isFinite(price) || price < 0) {
          throw new Error('Μη έγκυρη τιμή')
        }

        const data: any = {
          name: String(row.name),
          description: String(row.description || ''),
          price,
          category: String(row.category),
          brand: row.brand ? String(row.brand) : null,
          stock: row.stock ? parseInt(row.stock) : 0,
          image_url: row.image_url ? String(row.image_url) : null,
          target_species: row.target_species
            ? String(row.target_species).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          is_featured: row.is_featured === true || row.is_featured === 'true' || row.is_featured === 1,
        }
        if (row.discount_percentage) data.discount_percentage = parseInt(row.discount_percentage)
        if (row.sale_price) data.sale_price = parseFloat(row.sale_price)
        if (row.provider_email) data.provider_email = String(row.provider_email)

        const product = await prisma.product.create({ data })
        results.created++

        const nameT = collectLangColumns(row, 'name')
        const descT = collectLangColumns(row, 'description')
        if (Object.keys(nameT).length || Object.keys(descT).length) {
          const warn = await saveTranslations('product', product.id,
            { name: nameT, description: descT }, actor)
          results.translated++
          if (warn.length) results.warnings.push({ row: i + 1, name: data.name, warnings: warn })
        }
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
    if (items.length > 5000) {
      return reply.code(400).send({ message: 'Μέχρι 5000 γραμμές ανά εισαγωγή' })
    }

    const actor = (req.user as any).email
    const results = { created: 0, failed: 0, translated: 0, errors: [] as any[], warnings: [] as any[] }

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      try {
        if (!row.provider_name || !row.provider_email || !row.service_type || !row.city) {
          throw new Error('Λείπουν υποχρεωτικά πεδία (provider_name, provider_email, service_type, city)')
        }

        const data: any = {
          provider_name: String(row.provider_name),
          provider_email: String(row.provider_email).toLowerCase(),
          service_type: String(row.service_type),
          // `category` is what the provider dashboard filters on; mirror the
          // service type when the sheet does not give one.
          category: row.category ? String(row.category) : String(row.service_type),
          title: row.title ? String(row.title) : String(row.provider_name),
          description: String(row.description || ''),
          price: parseFloat(row.price) || 0,
          city: String(row.city),
          country: row.country ? String(row.country) : 'GR',
          location: row.location ? String(row.location) : null,
          contact_phone: row.contact_phone ? String(row.contact_phone) : null,
          contact_email: row.contact_email ? String(row.contact_email) : null,
          image_url: row.image_url ? String(row.image_url) : null,
          years_experience: row.years_experience ? parseInt(row.years_experience) : 0,
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
        if (row.latitude) data.latitude = parseFloat(row.latitude)
        if (row.longitude) data.longitude = parseFloat(row.longitude)

        const service = await prisma.service.create({ data })
        results.created++

        // `provider_name` and `title` are both translatable on services; the
        // sheet may carry either.
        const titleT = collectLangColumns(row, 'title')
        const providerT = collectLangColumns(row, 'provider_name')
        const descT = collectLangColumns(row, 'description')
        if (Object.keys(titleT).length || Object.keys(providerT).length || Object.keys(descT).length) {
          const warn = await saveTranslations('service', service.id,
            { title: titleT, provider_name: providerT, description: descT }, actor)
          results.translated++
          if (warn.length) results.warnings.push({ row: i + 1, name: data.provider_name, warnings: warn })
        }
      } catch (err: any) {
        results.failed++
        results.errors.push({ row: i + 1, name: row.provider_name || `Γραμμή ${i + 1}`, error: err.message })
      }
    }

    return results
  })
}

export default bulkImportRoutes
