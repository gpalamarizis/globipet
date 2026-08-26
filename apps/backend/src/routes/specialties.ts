import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Ειδικότητες ανά κατηγορία παρόχου.
 *
 *   GET /specialties                    όλες, ομαδοποιημένες ανά κατηγορία
 *   GET /specialties?category=veterinary  μόνο μιας κατηγορίας
 *
 * Οι τιμές έρχονται από τον πίνακα specialties ώστε ο πάροχος να ΕΠΙΛΕΓΕΙ
 * και να μη γράφει ελεύθερο κείμενο — αλλιώς «Χειρουργική», «χειρουργικη»
 * και «Χειρουργός» γίνονται τρεις τιμές και η αναζήτηση σπάει.
 *
 * Δημόσιο endpoint: το χρειάζεται και η σελίδα αναζήτησης, όχι μόνο ο πάροχος.
 * Χρησιμοποιεί $queryRaw ώστε να μην εξαρτάται από το prisma generate.
 */

type Row = {
  id: string
  category: string
  group: string | null
  name: string
  name_en: string | null
  display_order: number
}

const specialtiesRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', async (req: any) => {
    const category = String(req.query?.category || '').trim()

    const rows = category
      ? await prisma.$queryRaw<Row[]>`
          SELECT id, category, "group", name, name_en, display_order
            FROM specialties
           WHERE is_active = true AND category = ${category}
           ORDER BY display_order, name`
      : await prisma.$queryRaw<Row[]>`
          SELECT id, category, "group", name, name_en, display_order
            FROM specialties
           WHERE is_active = true
           ORDER BY category, display_order, name`

    if (category) {
      // Ομαδοποίηση για το dropdown: { "Χειρουργική": [...], "Κλινική": [...] }
      const groups: Record<string, Row[]> = {}
      for (const r of rows) {
        const g = r.group || 'Λοιπά'
        if (!groups[g]) groups[g] = []
        groups[g].push(r)
      }
      return { data: rows, groups, total: rows.length }
    }

    const byCategory: Record<string, Row[]> = {}
    for (const r of rows) {
      if (!byCategory[r.category]) byCategory[r.category] = []
      byCategory[r.category].push(r)
    }
    return { data: rows, byCategory, total: rows.length }
  })

  // Οι διαθέσιμες κατηγορίες, με πλήθος — χρήσιμο για φίλτρα αναζήτησης
  app.get('/categories', async () => {
    const rows = await prisma.$queryRaw<Array<{ category: string; n: bigint }>>`
      SELECT category, count(*)::bigint AS n
        FROM specialties WHERE is_active = true
       GROUP BY category ORDER BY category`
    return { data: rows.map(r => ({ category: r.category, count: Number(r.n) })) }
  })
}

export default specialtiesRoutes
