import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { r2, putObject, toDisplayUrl, parsePrivateRef, ownerHashes, PRIVATE_URL_TTL } from '../lib/storage.js'

/**
 * Allowed MIME types and their expected magic bytes (file signatures).
 * A client-provided MIME type is untrusted — we ALSO verify the actual file
 * signature to prevent MIME spoofing attacks (e.g. .exe renamed to .jpg).
 */
const ALLOWED_TYPES: Record<string, { ext: string; magic: number[][] }> = {
  'image/jpeg': { ext: 'jpg', magic: [[0xFF, 0xD8, 0xFF]] },
  'image/png':  { ext: 'png', magic: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]] },
  'image/webp': { ext: 'webp', magic: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF, WEBP checked after
  'image/gif':  { ext: 'gif', magic: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
  'application/pdf': { ext: 'pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  // Βίντεο για banner καμπανιών.
  // MP4: το 'ftyp' βρίσκεται στα bytes 4-7, όχι στην αρχή — τα πρώτα
  // τέσσερα είναι το μήκος του box. Ελέγχεται χωριστά παρακάτω.
  'video/mp4':  { ext: 'mp4',  magic: [[0x66, 0x74, 0x79, 0x70]] },
  'video/webm': { ext: 'webm', magic: [[0x1A, 0x45, 0xDF, 0xA3]] },
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
// Τα βίντεο είναι εγγενώς μεγαλύτερα: 10 δευτερόλεπτα από κινητό είναι
// 8-15MB. Με όριο 5MB κανένα δεν θα περνούσε.
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25 MB
const isVideo = (mime: string) => mime.startsWith('video/')
/**
 * Folders an upload may be filed under.
 *
 * Anything not listed falls back to `uploads`, silently. Five folders the
 * application actually asks for were missing — profiles, posts, communities,
 * ai-health and stool-urine — so profile photos, social images and AI scan
 * uploads all landed in the same bucket as everything else.
 *
 * That matters beyond tidiness: AI scans are health-adjacent images. Keeping
 * them in their own prefix is what makes it possible to apply a separate
 * retention rule to them later, or to purge them for one user without
 * touching their profile picture.
 */
const ALLOWED_FOLDERS = [
  'uploads', 'pets', 'services', 'products', 'avatars', 'profiles',
  'medical', 'reviews', 'community', 'communities', 'posts',
  'ai-uploads', 'ai-health', 'stool-urine', 'campaigns',
]

function verifyMagicBytes(mime: string, body: Buffer): boolean {
  const spec = ALLOWED_TYPES[mime]
  if (!spec) return false
  // Το MP4 έχει το 'ftyp' στο offset 4, όχι στο 0.
  const offset = mime === 'video/mp4' ? 4 : 0
  return spec.magic.some(sig => sig.every((byte, i) => body[offset + i] === byte))
}

function sanitizeFolder(folder: string): string {
  if (!folder || typeof folder !== 'string') return 'uploads'
  return ALLOWED_FOLDERS.includes(folder) ? folder : 'uploads'
}

const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.code(400).send({ message: 'Δεν βρέθηκε αρχείο' })
      // Ο τύπος διαβάζεται ΕΔΩ, όχι παρακάτω: το όριο μεγέθους διαφέρει
      // για βίντεο και πρέπει να είναι γνωστό πριν διαβαστεί η ροή.
      const mime = data.mimetype

      // Read into buffer with size guard
      const chunks: Buffer[] = []
      let total = 0
      for await (const chunk of data.file) {
        total += chunk.length
        if (total > (isVideo(mime) ? MAX_VIDEO_SIZE : MAX_FILE_SIZE)) {
          return reply.code(413).send({ message: `Το αρχείο είναι πολύ μεγάλο (${isVideo(mime) ? "25MB για βίντεο" : "5MB"})` })
        }
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)

      // 1) MIME whitelist check

      if (!ALLOWED_TYPES[mime]) {
        return reply.code(400).send({ message: 'Μη επιτρεπόμενος τύπος αρχείου' })
      }

      // 2) Magic byte verification (defense against MIME spoofing)
      if (!verifyMagicBytes(mime, body)) {
        return reply.code(400).send({ message: 'Το αρχείο δεν αντιστοιχεί στον δηλωμένο τύπο' })
      }

      // 3) Additional WEBP verification (magic bytes only cover RIFF, we need WEBP marker at byte 8-11)
      if (mime === 'image/webp' && body.slice(8, 12).toString('ascii') !== 'WEBP') {
        return reply.code(400).send({ message: 'Το αρχείο δεν είναι έγκυρο WebP' })
      }

      const c = r2()
      if (!c) {
        const base64 = body.toString('base64')
        const dataUrl = `data:${mime};base64,${base64}`
        return { url: dataUrl, key: `base64-${Date.now()}` }
      }

      // 4) Sanitize folder (prevent path traversal)
      const folder = sanitizeFolder((req.query as any).folder)

      // 5) Ασφαλές όνομα: επέκταση από τη λίστα, ΟΧΙ από το όνομα του πελάτη.
      //    Το κλειδί περιέχει το hash του ιδιοκτήτη (lib/storage.ts), ώστε η
      //    διαγραφή λογαριασμού να βρίσκει τα αρχεία του.
      //    Ιατρικοί φάκελοι → ιδιωτικό bucket, url = 'r2priv://…'.
      //    Το url μένει r2priv και για την ήδη εγκατεστημένη εφαρμογή: εκείνη
      //    το στέλνει μόνο στα endpoints AI, που το λύνουν (resolveForAi), και
      //    την προεπισκόπηση τη δείχνει από το τοπικό αρχείο. Ένα δημόσιο http
      //    εδώ θα αναιρούσε το ιδιωτικό bucket.
      const ext = ALLOWED_TYPES[mime].ext
      const up = await putObject(c, folder, (req.user as any)?.email, body, mime, ext)
      if (!up.private) return { url: up.url, key: up.key }
      const preview_url = await toDisplayUrl(up.url)
      return {
        url: up.url, key: up.key, private: true,
        preview_url, preview_expires_at: new Date(Date.now() + PRIVATE_URL_TTL * 1000).toISOString(),
      }

    } catch (err: any) {
      console.error('Upload error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά το upload' })
    }
  })

  /**
   * Προσωρινός σύνδεσμος (10') για ιδιωτικό αρχείο 'r2priv://…'.
   *
   * Πρόσβαση έχουν:
   *   - ο ιδιοκτήτης (το <owner> του κλειδιού = hash του email του)
   *   - ο admin (ρόλος από τη βάση, όχι από το JWT· καταγράφεται)
   *   - κτηνίατρος με εγκεκριμένη, μη ληγμένη πρόσβαση στο διαβατήριο του
   *     `pet_id` — και μόνο για αρχείο που (α) ανήκει στον ιδιοκτήτη του ζώου
   *     και (β) είναι καταχωρημένο σε εγγραφή του ζώου (file_urls). Χωρίς το
   *     (β) η πρόσβαση σε ένα ζώο θα έδινε κάθε αρχείο του ιδιοκτήτη, π.χ.
   *     φωτογραφίες AI που δεν μοιράστηκε ποτέ.
   *
   * Όριο 120/λεπτό ανά IP: ένα διαβατήριο με πολλά αρχεία ζητά έναν σύνδεσμο
   * για το καθένα, αλλά οι πελάτες κρατούν cache μέχρι τη λήξη.
   */
  app.get('/private-url', {
    preHandler: [(app as any).authenticate],
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (req: any, reply) => {
    const { ref, pet_id } = (req.query || {}) as { ref?: unknown; pet_id?: unknown }
    const p = parsePrivateRef(ref)
    if (!p) return reply.code(400).send({ message: 'Μη έγκυρη αναφορά αρχείου' })
    const c = r2()
    if (!c?.privateBucket) return reply.code(503).send({ message: 'Η ιδιωτική αποθήκευση δεν είναι διαθέσιμη' })

    const { email, id } = (req.user || {}) as any
    let allowed = !!email && ownerHashes(email).includes(p.owner)

    if (!allowed && id) {
      const u = await prisma.user.findUnique({ where: { id }, select: { role: true } })
      if (u?.role === 'admin') {
        allowed = true
        console.warn('[upload] admin private-url', email, p.key)
      }
    }

    if (!allowed && email && typeof pet_id === 'string' && pet_id.length <= 64) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_email: true } })
      if (pet && ownerHashes(pet.owner_email).includes(p.owner)) {
        const now = new Date()
        const access = await prisma.petPassportAccess.findFirst({
          where: {
            pet_id, provider_email: email, status: 'approved',
            OR: [{ expires_at: null }, { expires_at: { gt: now } }],
          },
          select: { id: true },
        })
        if (access) {
          const where = { pet_id, file_urls: { has: ref as string } }
          const sel = { select: { id: true } }
          const hits = await Promise.all([
            prisma.petLabResult.findFirst({ where, ...sel }),
            prisma.petImaging.findFirst({ where, ...sel }),
            prisma.petSurgery.findFirst({ where, ...sel }),
            prisma.petDentalRecord.findFirst({ where, ...sel }),
            prisma.petGeneticTest.findFirst({ where, ...sel }),
          ])
          allowed = hits.some(Boolean)
        }
      }
    }

    if (!allowed) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    const url = await toDisplayUrl(ref)
    return { url, expires_at: new Date(Date.now() + PRIVATE_URL_TTL * 1000).toISOString() }
  })
}

export default uploadRoutes
