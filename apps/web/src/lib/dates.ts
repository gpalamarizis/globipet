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
    return date.toLocaleDateString(lang, opts)
  } catch {
    return date.toLocaleDateString(undefined, opts)
  }
}
