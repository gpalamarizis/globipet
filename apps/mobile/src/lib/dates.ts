/**
 * 'YYYY-MM-DD' (κράτηση/εκδήλωση) ως τοπική ημερομηνία στη γλώσσα του χρήστη.
 *
 * Το new Date('YYYY-MM-DD') είναι UTC και σε ζώνες πίσω από το UTC έδειχνε
 * την προηγούμενη μέρα· εδώ η ημερομηνία φτιάχνεται από τα μέρη της.
 * Άγνωστη μορφή επιστρέφεται ως έχει (ποτέ «Invalid Date»).
 */
export function fmtYmd(
  d: string | null | undefined,
  lang: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' },
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? '')
  if (!m) return d ?? ''
  const date = new Date(+m[1], +m[2] - 1, +m[3])
  if (isNaN(date.getTime())) return d ?? ''
  try {
    return date.toLocaleDateString(dateLocale(lang), opts)
  } catch {
    return date.toLocaleDateString(undefined, opts)
  }
}

/**
 * Ε17 — Σύντομη ημερομηνία στη μορφή της γλώσσας (π.χ. 15/03/2026).
 * Τα αγγλικά ως en-GB (ηη/μμ/εεεε, όπως όλη η Ευρώπη) — όχι μμ/ηη/εεεε.
 * Δέχεται YYYY-MM-DD ή πλήρες ISO· άγνωστη μορφή επιστρέφεται ως έχει.
 */
export const DATE_LOCALE: Record<string, string> = { el: 'el-GR', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
export function dateLocale(lang: string | null | undefined): string {
  return DATE_LOCALE[String(lang ?? '').slice(0, 2)] ?? 'en-GB'
}
export function fmtDateShort(d: string | null | undefined, lang: string): string {
  if (!d) return ''
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  const date = ymd ? new Date(+ymd[1], +ymd[2] - 1, +ymd[3]) : new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString(dateLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** 'YYYY-MM-DD' → τοπική Date (π.χ. για minimumDate του DateField)· αλλιώς undefined. */
export function ymdToDate(d: string | null | undefined): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '')
  if (!m) return undefined
  const date = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(date.getTime()) ? undefined : date
}
