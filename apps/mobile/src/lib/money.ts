import { dateLocale } from './dates'

/**
 * Ε18 — Ποσό σε € στη μορφή της γλώσσας (el/es/fr «4,99 €», en «€4.99»,
 * zh «€4.99»), ίδιο με το fmtEur του web (Intl.NumberFormat + dateLocale).
 *
 * Το Hermes του SDK 54 (RN 0.81) υποστηρίζει Intl.NumberFormat με
 * style 'currency' σε Android και iOS. Αν παρ' όλα αυτά λείπει ή πετάξει
 * σφάλμα, γυρνάμε σε toFixed(2) με κόμμα και € μετά για el/es/fr.
 */
const COMMA_LANGS = ['el', 'es', 'fr']

export function fmtEur(value: unknown, lang: string | null | undefined): string {
  const n = Number(value)
  const v = Number.isFinite(n) ? n : 0
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return new Intl.NumberFormat(dateLocale(lang), { style: 'currency', currency: 'EUR' }).format(v)
    }
  } catch { /* fallback παρακάτω */ }
  const l = String(lang ?? '').slice(0, 2)
  return COMMA_LANGS.includes(l) ? `${v.toFixed(2).replace('.', ',')} €` : `€${v.toFixed(2)}`
}
