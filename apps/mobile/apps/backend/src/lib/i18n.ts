/**
 * i18n helper for backend responses.
 * Reads user's preferred language from:
 *  1. ?lang= query parameter
 *  2. Accept-Language header
 *  3. Falls back to 'el'
 */

const SUPPORTED = ['el', 'en', 'es', 'fr', 'zh']

export function getRequestLang(req: any): string {
  // Priority 1: query param ?lang=en
  if (req.query?.lang && SUPPORTED.includes(req.query.lang)) {
    return req.query.lang
  }
  // Priority 2: Accept-Language header (e.g. "en-US,en;q=0.9,el;q=0.8")
  const header = req.headers?.['accept-language'] as string | undefined
  if (header) {
    const langs = header.split(',').map(s => s.trim().split(';')[0].split('-')[0].toLowerCase())
    for (const lang of langs) {
      if (SUPPORTED.includes(lang)) return lang
    }
  }
  return 'el'
}

/**
 * Applies translation to an object by overwriting base fields with translated ones.
 * E.g. translateRecord({ name: 'Α', name_translations: { en: 'A' } }, 'en')
 *   →  { name: 'A', name_translations: {...} }
 *
 * @param record - The database record
 * @param lang - Target language code
 * @param fields - Array of field names to translate (e.g. ['name', 'description'])
 */
export function translateRecord<T extends Record<string, any>>(
  record: T | null,
  lang: string,
  fields: string[] = ['name', 'description', 'title', 'provider_name']
): T | null {
  if (!record) return record
  if (lang === 'el') return record  // EL is the default, no translation needed

  const result: any = { ...record }
  for (const field of fields) {
    const translationsKey = `${field}_translations`
    const translations = record[translationsKey]
    if (translations && typeof translations === 'object' && translations[lang]) {
      result[field] = translations[lang]
    }
  }
  return result as T
}

/**
 * Apply translateRecord to an array of records
 */
export function translateRecords<T extends Record<string, any>>(
  records: T[],
  lang: string,
  fields?: string[]
): T[] {
  return records.map(r => translateRecord(r, lang, fields)!)
}
