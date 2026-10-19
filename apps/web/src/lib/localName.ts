/**
 * Όνομα εγγραφής που έχει `name` και `name_el` (ράτσες, πλάνα AI, ασφάλειες).
 *
 * Το `name_el` είναι μόνο ελληνικά. Οι σελίδες έδειχναν `name_el || name`
 * σε όλες τις γλώσσες, οπότε ο χρήστης με αγγλικά έβλεπε ελληνικά. Το `name`
 * είναι το πρωτότυπο (ή η μετάφρασή του από το backend για τη γλώσσα του
 * αιτήματος). Ελληνικά → `name_el`, αλλιώς `name`· αν λείπει, το άλλο.
 */
export function localName(
  rec: { name?: string | null; name_el?: string | null } | null | undefined,
  lang?: string,
): string {
  if (!rec) return ''
  const isEl = (lang || 'el').toLowerCase().startsWith('el')
  return (isEl ? (rec.name_el || rec.name) : (rec.name || rec.name_el)) || ''
}
