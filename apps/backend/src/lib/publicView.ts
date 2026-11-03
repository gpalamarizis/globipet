/**
 * Δημόσιες απαντήσεις χωρίς το email του παρόχου/πωλητή.
 *
 * Το provider_email είναι το προσωπικό email του λογαριασμού του παρόχου
 * (συχνά gmail). Οι δημόσιοι κατάλογοι (υπηρεσίες, προϊόντα, κριτικές) το
 * έδιναν σε οποιονδήποτε — αρκούσε ένα GET για να μαζέψει κανείς τα email
 * όλων των παρόχων. Το βλέπουν πλέον μόνο ο διαχειριστής και ο ίδιος ο
 * πάροχος. Για επικοινωνία υπάρχουν τα contact_* που ορίζει ο πάροχος, και
 * οι κρατήσεις/αγορές γίνονται με το id της υπηρεσίας/του προϊόντος.
 */
export type Viewer = { email?: string; role?: string } | null

/** Ο συνδεδεμένος θεατής, αν υπάρχει έγκυρο τοκεν· αλλιώς null (ποτέ σφάλμα). */
export async function viewerOf(req: any): Promise<Viewer> {
  if (!req?.headers?.authorization) return null
  try { await req.jwtVerify(); return (req.user as any) ?? null } catch { return null }
}

export function canSeeProvider(viewer: Viewer, providerEmail?: string | null): boolean {
  return viewer?.role === 'admin' || (!!viewer?.email && !!providerEmail && viewer.email === providerEmail)
}

/** Η εγγραφή χωρίς provider_email, εκτός αν ο θεατής είναι διαχειριστής ή ο ίδιος ο πάροχος. */
export function withoutProviderEmail<T>(row: T, viewer: Viewer): T {
  if (!row || typeof row !== 'object') return row
  const r = row as any
  if (canSeeProvider(viewer, r.provider_email)) return row
  const { provider_email: _hidden, ...rest } = r
  return rest as T
}
