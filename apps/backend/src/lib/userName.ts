import prisma from './prisma.js'

/**
 * Ονοματεπώνυμο χρήστη από τη βάση.
 *
 * Το JWT κρατά μόνο { id, email, role } (routes/auth.ts) — ΟΧΙ full_name.
 * Όσα routes διάβαζαν `req.user.full_name` έπαιρναν πάντα undefined και
 * έγραφαν ως όνομα πελάτη το πρώτο μέρος του email. Σε σφάλμα βάσης ή
 * χρήστη χωρίς όνομα: το πρώτο μέρος του email, όπως πριν.
 */
export async function fullNameOf(email: string): Promise<string> {
  const row = await prisma.user.findUnique({ where: { email }, select: { full_name: true } }).catch(() => null)
  const name = typeof row?.full_name === 'string' ? row.full_name.trim() : ''
  return name || String(email).split('@')[0]
}

/**
 * Ονοματεπώνυμο και φωτογραφία προφίλ χρήστη από τη βάση (το JWT δεν τα
 * έχει). Ίδιο fallback ονόματος με το fullNameOf· φωτογραφία null όταν
 * λείπει ή σε σφάλμα βάσης.
 */
export async function identityOf(email: string): Promise<{ name: string; photo: string | null }> {
  const row = await prisma.user
    .findUnique({ where: { email }, select: { full_name: true, profile_photo: true } })
    .catch(() => null)
  const name = typeof row?.full_name === 'string' ? row.full_name.trim() : ''
  const photo = typeof row?.profile_photo === 'string' && row.profile_photo.trim() ? row.profile_photo : null
  return { name: name || String(email).split('@')[0], photo }
}
