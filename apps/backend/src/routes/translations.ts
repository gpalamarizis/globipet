import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'
import {
  SUPPORTED, TRANSLATABLE, PROVIDER_OWNED, normLang,
} from '../lib/i18n.js'

/**
 * Διαχείριση μεταφράσεων.
 *
 *   GET    /translations/config              Τι μεταφράζεται και σε ποιες γλώσσες
 *   GET    /translations/:entity/:id         Όλες οι μεταφράσεις μιας εγγραφής
 *   PUT    /translations/:entity/:id         Αποθήκευση (μαζικά, ανά γλώσσα)
 *   DELETE /translations/:entity/:id/:lang   Διαγραφή μιας γλώσσας
 *   GET    /translations/missing/:entity     Τι λείπει — για τον πάροχο και τον admin
 *
 * ΔΙΚΑΙΩΜΑΤΑ
 *   Περιεχόμενο πλατφόρμας (φυλές, πλάνα, πρότυπα)  → μόνο admin
 *   Περιεχόμενο παρόχου (υπηρεσίες, προϊόντα)       → ο ίδιος ο πάροχος
 *
 * Raw SQL ώστε να μην εξαρτάται από το prisma generate.
 */

/** Πού βρίσκεται ο ιδιοκτήτης κάθε οντότητας παρόχου. */
const OWNERSHIP: Record<string, { table: string; emailCol: string; via?: string }> = {
  service:         { table: 'services',         emailCol: 'provider_email' },
  product:         { table: 'products',         emailCol: 'provider_email' },
  service_package: { table: 'service_packages', emailCol: 'provider_email', via: 'services' },
}

const translationsRoutes: FastifyPluginAsync = async (app) => {

  // Δημόσιο: τι υποστηρίζεται
  app.get('/config', async () => ({
    data: {
      languages: SUPPORTED,
      entities: Object.entries(TRANSLATABLE).map(([entity, fields]) => ({
        entity, fields, providerOwned: PROVIDER_OWNED.has(entity),
      })),
    },
  }))

  // ── Από εδώ και κάτω απαιτείται σύνδεση ─────────────────────────────
  app.register(async (secured) => {
    secured.addHook('preHandler', async (req: any, reply: any) => {
      try { await (app as any).authenticate(req, reply) }
      catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
    })

    /**
     * Επιβεβαιώνει ότι ο χρήστης μπορεί να επεξεργαστεί τη συγκεκριμένη
     * εγγραφή. Ο admin τα πάντα· ο πάροχος μόνο τα δικά του.
     */
    async function canEdit(req: any, reply: any, entity: string, id: string) {
      const user = req.user as any
      if (!TRANSLATABLE[entity]) {
        reply.code(400).send({ message: 'Άγνωστη οντότητα', entity }); return false
      }
      if (user.role === 'admin') return true

      if (!PROVIDER_OWNED.has(entity)) {
        reply.code(403).send({ message: 'Το περιεχόμενο αυτό διαχειρίζεται μόνο ο διαχειριστής' })
        return false
      }

      const own = OWNERSHIP[entity]
      // Τα πακέτα δεν έχουν δικό τους provider_email — κληρονομούν από την υπηρεσία.
      const rows = own.via
        ? await prisma.$queryRaw<Array<{ email: string }>>`
            SELECT s.provider_email AS email
              FROM service_packages sp JOIN services s ON s.id = sp.service_id
             WHERE sp.id = ${id}`
        : entity === 'service'
          ? await prisma.$queryRaw<Array<{ email: string }>>`
              SELECT provider_email AS email FROM services WHERE id = ${id}`
          : await prisma.$queryRaw<Array<{ email: string }>>`
              SELECT provider_email AS email FROM products WHERE id = ${id}`

      if (!rows.length) { reply.code(404).send({ message: 'Η εγγραφή δεν βρέθηκε' }); return false }
      if (rows[0].email !== user.email) {
        audit(req, { action: 'permission_denied', resource: 'translation',
                     resourceId: id, outcome: 'denied', metadata: { entity } })
        reply.code(403).send({ message: 'Η εγγραφή δεν σου ανήκει' }); return false
      }
      return true
    }

    // ── Ανάγνωση ──────────────────────────────────────────────────────
    secured.get('/:entity/:id', async (req: any, reply) => {
      const { entity, id } = req.params
      if (!TRANSLATABLE[entity]) {
        return reply.code(400).send({ message: 'Άγνωστη οντότητα', entity })
      }
      const rows = await prisma.$queryRaw<Array<{ field: string; lang: string; value: string; updated_at: Date }>>`
        SELECT field, lang, value, updated_at
          FROM translations
         WHERE entity = ${entity} AND entity_id = ${id}
         ORDER BY lang, field`

      // Δομή { el: { name: '…' }, en: { name: '…' } } — έτοιμη για φόρμα
      const byLang: Record<string, Record<string, string>> = {}
      for (const r of rows) {
        if (!byLang[r.lang]) byLang[r.lang] = {}
        byLang[r.lang][r.field] = r.value
      }
      return { data: byLang, fields: TRANSLATABLE[entity], languages: SUPPORTED }
    })

    // ── Αποθήκευση ────────────────────────────────────────────────────
    // Σώμα: { el: { name: '…', description: '…' }, en: { … } }
    secured.put('/:entity/:id', async (req: any, reply) => {
      const { entity, id } = req.params
      if (!(await canEdit(req, reply, entity, id))) return

      const allowed = TRANSLATABLE[entity]
      const body = req.body || {}
      const email = (req.user as any).email

      let saved = 0, removed = 0
      const touched: string[] = []

      for (const lang of Object.keys(body)) {
        const l = normLang(lang)
        if (l !== lang) {
          return reply.code(400).send({ message: 'Μη υποστηριζόμενη γλώσσα', lang })
        }
        const fields = body[lang] || {}
        for (const field of Object.keys(fields)) {
          if (!allowed.includes(field)) {
            return reply.code(400).send({ message: 'Μη μεταφράσιμο πεδίο', field, allowed })
          }
          const raw = fields[field]
          const value = raw === null || raw === undefined ? '' : String(raw).trim()

          if (!value) {
            // Κενό σημαίνει «σβήσε τη μετάφραση» — επιστροφή στο πρωτότυπο.
            const n: number = await prisma.$executeRaw`
              DELETE FROM translations
               WHERE entity = ${entity} AND entity_id = ${id}
                 AND field = ${field} AND lang = ${l}`
            removed += n
            continue
          }

          await prisma.$executeRaw`
            INSERT INTO translations
              (id, entity, entity_id, field, lang, value, created_by, source, created_at, updated_at)
            VALUES
              (gen_random_uuid()::varchar, ${entity}, ${id}, ${field}, ${l},
               ${value}, ${email}, 'manual', now(), now())
            ON CONFLICT (entity, entity_id, field, lang)
            DO UPDATE SET value = EXCLUDED.value,
                          created_by = EXCLUDED.created_by,
                          updated_at = now()`
          saved++
          touched.push(`${l}.${field}`)
        }
      }

      audit(req, { action: 'update', resource: 'translation', resourceId: id,
                   metadata: { entity, saved, removed, fields: touched } })

      return { success: true, saved, removed }
    })

    // ── Διαγραφή γλώσσας ──────────────────────────────────────────────
    secured.delete('/:entity/:id/:lang', async (req: any, reply) => {
      const { entity, id, lang } = req.params
      if (!(await canEdit(req, reply, entity, id))) return
      const l = normLang(lang)

      const n: number = await prisma.$executeRaw`
        DELETE FROM translations
         WHERE entity = ${entity} AND entity_id = ${id} AND lang = ${l}`

      audit(req, { action: 'delete', resource: 'translation', resourceId: id,
                   metadata: { entity, lang: l, removed: n } })

      return { success: true, removed: n }
    })

    // ── Τι λείπει ─────────────────────────────────────────────────────
    // Χρήσιμο και για τον πάροχο: «ποιες υπηρεσίες μου δεν έχουν αγγλικά».
    secured.get('/missing/:entity', async (req: any, reply) => {
      const { entity } = req.params
      const lang = normLang(req.query?.lang || 'en')
      const user = req.user as any

      if (!TRANSLATABLE[entity]) {
        return reply.code(400).send({ message: 'Άγνωστη οντότητα', entity })
      }

      // Οι πάροχοι βλέπουν μόνο τα δικά τους.
      const own = PROVIDER_OWNED.has(entity) && user.role !== 'admin'
      if (!PROVIDER_OWNED.has(entity) && user.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
      }

      let rows: Array<{ id: string; label: string }> = []
      if (entity === 'service') {
        rows = await prisma.$queryRaw`
          SELECT s.id, s.title AS label FROM services s
           WHERE (${own} = false OR s.provider_email = ${user.email})
             AND NOT EXISTS (SELECT 1 FROM translations t
                              WHERE t.entity='service' AND t.entity_id=s.id
                                AND t.field='title' AND t.lang=${lang})
           ORDER BY s.title LIMIT 200`
      } else if (entity === 'product') {
        rows = await prisma.$queryRaw`
          SELECT p.id, p.name AS label FROM products p
           WHERE (${own} = false OR p.provider_email = ${user.email})
             AND NOT EXISTS (SELECT 1 FROM translations t
                              WHERE t.entity='product' AND t.entity_id=p.id
                                AND t.field='name' AND t.lang=${lang})
           ORDER BY p.name LIMIT 200`
      } else if (entity === 'service_package') {
        rows = await prisma.$queryRaw`
          SELECT sp.id, sp.name AS label
            FROM service_packages sp JOIN services s ON s.id = sp.service_id
           WHERE (${own} = false OR s.provider_email = ${user.email})
             AND NOT EXISTS (SELECT 1 FROM translations t
                              WHERE t.entity='service_package' AND t.entity_id=sp.id
                                AND t.field='name' AND t.lang=${lang})
           ORDER BY sp.name LIMIT 200`
      } else if (entity === 'catalog_template') {
        rows = await prisma.$queryRaw`
          SELECT ct.id, ct.name AS label FROM catalog_templates ct
           WHERE NOT EXISTS (SELECT 1 FROM translations t
                              WHERE t.entity='catalog_template' AND t.entity_id=ct.id
                                AND t.field='name' AND t.lang=${lang})
           ORDER BY ct.category, ct.display_order LIMIT 200`
      } else {
        return reply.code(400).send({ message: 'Δεν υποστηρίζεται αναφορά για αυτή την οντότητα' })
      }

      return { data: rows, lang, total: rows.length }
    })
  })
}

export default translationsRoutes
