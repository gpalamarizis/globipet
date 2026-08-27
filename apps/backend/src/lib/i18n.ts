import prisma from './prisma.js'

/**
 * Μεταφράσεις περιεχομένου βάσης.
 *
 * ΙΣΤΟΡΙΚΟ
 *   Η προηγούμενη υλοποίηση διάβαζε πεδία `name_translations` σε κάθε
 *   εγγραφή. Αυτές οι στήλες δεν δημιουργήθηκαν ποτέ, οπότε το
 *   `translateRecords` επέστρεφε πάντα το πρωτότυπο. Αντικαταστάθηκε από
 *   τον πίνακα `translations`, με κλειδί (οντότητα, εγγραφή, πεδίο, γλώσσα).
 *
 * ΓΙΑΤΙ ΠΙΝΑΚΑΣ
 *   Νέα γλώσσα σημαίνει νέες γραμμές, όχι migration σε δέκα πίνακες.
 *   Επιτρέπει το ερώτημα «ποιες υπηρεσίες μου δεν έχουν αγγλικά».
 *
 * ΑΡΧΗ ΠΟΥ ΔΙΕΠΕΙ ΤΑ ΠΑΝΤΑ
 *   Ποτέ κενό. Αν λείπει η μετάφραση, επιστρέφεται το πρωτότυπο.
 *
 * ΤΙ ΔΕΝ ΜΕΤΑΦΡΑΖΕΤΑΙ ΠΟΤΕ
 *   Περιεχόμενο χρήστη: δημοσιεύσεις, μηνύματα, ονόματα ζώων, ιατρικά.
 */

export const SUPPORTED = ['el', 'en'] as const
export type Lang = typeof SUPPORTED[number]
export const DEFAULT_LANG: Lang = 'el'

/** Οντότητες που επιτρέπεται να μεταφραστούν, με τα πεδία τους. */
export const TRANSLATABLE: Record<string, string[]> = {
  // Περιεχόμενο πλατφόρμας — μόνο admin
  breed:              ['name', 'description'],
  achievement:        ['name', 'description'],
  insurance_provider: ['name', 'description'],
  insurance_plan:     ['name', 'description'],
  ai_plan:            ['name', 'description'],
  catalog_template:   ['name', 'description'],
  specialty:          ['name'],
  // Περιεχόμενο παρόχου — ο ίδιος ο πάροχος
  service:            ['title', 'description', 'provider_name'],
  service_package:    ['name', 'description'],
  product:            ['name', 'description'],
}

export const PROVIDER_OWNED = new Set(['service', 'service_package', 'product'])

export function normLang(input?: string | null): Lang {
  const code = String(input || '').slice(0, 2).toLowerCase()
  return (SUPPORTED as readonly string[]).includes(code) ? (code as Lang) : DEFAULT_LANG
}

/**
 * Η γλώσσα του αιτήματος.
 * Σειρά: ?lang → προτίμηση χρήστη → Accept-Language → ελληνικά.
 *
 * Η προτίμηση του χρήστη έλειπε από την προηγούμενη υλοποίηση: κάποιος που
 * είχε ορίσει αγγλικά στο προφίλ του έβλεπε ελληνικά, εκτός αν ο browser
 * του έτυχε να τα ζητά.
 */
export function getRequestLang(req: any): Lang {
  if (req?.query?.lang) return normLang(req.query.lang)

  const pref = (req?.user as any)?.preferred_language
  if (pref) return normLang(pref)

  const header = req?.headers?.['accept-language'] as string | undefined
  if (header) {
    for (const l of header.split(',').map(s => s.trim().split(';')[0].split('-')[0].toLowerCase())) {
      if ((SUPPORTED as readonly string[]).includes(l)) return l as Lang
    }
  }
  return DEFAULT_LANG
}

type Row = { entity_id: string; field: string; value: string }

/**
 * Φορτώνει μεταφράσεις για πολλές εγγραφές με ΕΝΑ ερώτημα.
 * Λίστα 50 υπηρεσιών θα έκανε 100 ερωτήματα αν ζητούσαμε κάθε πεδίο χωριστά.
 */
export async function loadTranslations(
  entity: string, ids: string[], lang: Lang,
): Promise<Map<string, Record<string, string>>> {
  const out = new Map<string, Record<string, string>>()
  if (!ids.length) return out

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT entity_id, field, value
      FROM translations
     WHERE entity = ${entity} AND lang = ${lang}
       AND entity_id = ANY(${ids}::text[])`

  for (const r of rows) {
    if (!out.has(r.entity_id)) out.set(r.entity_id, {})
    out.get(r.entity_id)![r.field] = r.value
  }
  return out
}

/**
 * Μεταφράζει λίστα εγγραφών.
 * Το πρωτότυπο διατηρείται σε `_original`, ώστε ο πάροχος να βλέπει τι έγραψε.
 */
export async function translateRecords<T extends Record<string, any>>(
  entity: string, records: T[], lang: string | Lang,
): Promise<T[]> {
  const l = normLang(lang)
  const fields = TRANSLATABLE[entity]
  if (!fields || !records?.length) return records

  const ids = records.map(r => r.id).filter(Boolean)
  const map = await loadTranslations(entity, ids, l)
  if (!map.size) return records

  return records.map(rec => {
    const t = map.get(rec.id)
    if (!t) return rec
    const copy: any = { ...rec }
    const original: Record<string, any> = {}
    for (const f of fields) {
      const v = t[f]
      if (v !== undefined && v !== null && v !== '') {
        original[f] = rec[f]
        copy[f] = v
      }
    }
    if (Object.keys(original).length) copy._original = original
    return copy
  })
}

/** Μία εγγραφή. */
export async function translateRecord<T extends Record<string, any>>(
  entity: string, record: T | null, lang: string | Lang,
): Promise<T | null> {
  if (!record) return record
  const [out] = await translateRecords(entity, [record], lang)
  return out ?? record
}
