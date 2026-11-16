import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { parseBody, phone as phoneSchema } from '../lib/validate.js'
import { viewerOf, type Viewer } from '../lib/publicView.js'
import { blockedEmailsFor } from '../lib/blocks.js'
import { isAllowedImageUrl } from '../lib/storage.js'
import { getRequestLang } from '../lib/i18n.js'
import { langOfUser } from '../lib/notifyText.js'
import { sendPushToUser } from '../lib/push.js'
import { broadcastToUser } from './notifications.js'
import { audit } from '../lib/audit.js'
import { fullNameOf } from '../lib/userName.js'
import {
  SPECIES, SEXES, SIZES, TRISTATE, ENERGY, SOURCES, MAX_PHOTOS,
  rulesFor, checkListing, ageWeeks, ageYears, normaliseMicrochip,
} from '../lib/adoptionRules.js'
import { guideFor, ackLabel, buildContract, pick, type Lang, type L, type AckKey } from '../lib/adoptionContent.js'

/**
 * ΥΙΟΘΕΣΙΑ ΖΩΩΝ
 *
 *   Αγγελίες από οργανισμούς (καταφύγια/φιλοζωικά που είναι πάροχοι) και
 *   από ιδιώτες · αιτήσεις με ερωτηματολόγιο · μηνύματα ανάμεσα στις δύο
 *   πλευρές · ολοκλήρωση με τις επιβεβαιώσεις που ζητά ο νόμος της χώρας ·
 *   υπόδειγμα συμφωνητικού · μεταφορά στα «Κατοικίδιά μου» · εποπτεία admin.
 *
 * ΙΔΙΩΤΙΚΟΤΗΤΑ (ίδια λογική με playdates/publicView)
 *   Κανένα email δεν επιστρέφεται σε τρίτο. Ο client μαθαίνει μόνο
 *   is_mine / my_role. Το τηλέφωνο του αιτούντα το βλέπει μόνο ο
 *   καταχωρίζων· η ιδιωτική σημείωση μόνο ο καταχωρίζων.
 *
 * ΧΡΗΜΑΤΑ
 *   Καμία πληρωμή δεν περνά από την GlobiPet. Ιδιώτες: μόνο δωρεάν.
 *   Οργανισμοί: προαιρετική κάλυψη εξόδων, πληρωτέα απευθείας σε αυτούς.
 */

const ORG_SERVICE_TYPES = ['shelter', 'adoption']
const OPEN_APP = ['pending', 'reviewing', 'approved']

// ─── Βοηθητικά ─────────────────────────────────────────────────────────

type Org = { service_id: string; name: string; verified: boolean; phone: string | null; email: string | null }

/** Ο οργανισμός του χρήστη, αν είναι πάροχος καταφυγίου/φιλοζωικού. */
async function orgOf(email: string, role: string | undefined): Promise<Org | null> {
  if (!email || !['service_provider', 'both', 'admin'].includes(String(role))) return null
  const svc = await prisma.service.findFirst({
    where: {
      provider_email: email, is_active: true,
      OR: [
        { service_type: { in: ORG_SERVICE_TYPES } },
        { official_shelter: { isNot: null } },
        { welfare_organisation: { isNot: null } },
      ],
    },
    select: {
      id: true, provider_name: true, title: true, is_verified: true, contact_phone: true, contact_email: true,
      official_shelter: { select: { id: true } }, welfare_organisation: { select: { id: true } },
    },
    orderBy: { created_at: 'asc' },
  })
  if (!svc) return null
  return {
    service_id: svc.id,
    name: (svc.title || svc.provider_name || '').slice(0, 255),
    verified: !!(svc.is_verified || svc.official_shelter || svc.welfare_organisation),
    phone: svc.contact_phone ?? null,
    email: svc.contact_email ?? null,
  }
}

const T = (lang: Lang, row: L) => pick(row, lang)

/** Ειδοποίηση (in-app + live + push) στη γλώσσα του παραλήπτη. Ποτέ δεν πετά. */
async function notify(email: string, type: string, title: L, message: (lang: Lang) => string, link: string) {
  try {
    const lang = await langOfUser(email) as Lang
    const notification = await prisma.notification.create({
      data: { user_email: email, title: T(lang, title), message: message(lang).slice(0, 500), type, link },
    })
    broadcastToUser(email, { type: 'notification', notification })
    void sendPushToUser(email, { title: notification.title, body: notification.message, url: link, data: { type } })
  } catch (err: any) {
    console.error(`[adoption] notification ${type} to ${email} failed:`, err?.message)
  }
}

const N = {
  newApplication: { el: 'Νέα αίτηση υιοθεσίας', en: 'New adoption application', es: 'Nueva solicitud de adopción', fr: 'Nouvelle demande d’adoption', zh: '新的领养申请' },
  approved: { el: 'Η αίτησή σου εγκρίθηκε', en: 'Your application was approved', es: 'Tu solicitud ha sido aprobada', fr: 'Votre demande a été acceptée', zh: '你的申请已通过' },
  rejected: { el: 'Ενημέρωση για την αίτησή σου', en: 'Update on your application', es: 'Novedades sobre tu solicitud', fr: 'Mise à jour de votre demande', zh: '你的申请有更新' },
  reviewing: { el: 'Η αίτησή σου εξετάζεται', en: 'Your application is under review', es: 'Tu solicitud está en revisión', fr: 'Votre demande est en cours d’examen', zh: '你的申请正在审核' },
  completed: { el: 'Η υιοθεσία ολοκληρώθηκε 🎉', en: 'Adoption completed 🎉', es: 'Adopción completada 🎉', fr: 'Adoption finalisée 🎉', zh: '领养已完成 🎉' },
  withdrawn: { el: 'Ανάκληση αίτησης', en: 'Application withdrawn', es: 'Solicitud retirada', fr: 'Demande retirée', zh: '申请已撤回' },
  message: { el: 'Νέο μήνυμα για υιοθεσία', en: 'New adoption message', es: 'Nuevo mensaje de adopción', fr: 'Nouveau message d’adoption', zh: '新的领养消息' },
} satisfies Record<string, L>

/** Δημόσια μορφή αγγελίας — χωρίς email και εσωτερικά πεδία. */
function publicListing(l: any, viewer: Viewer, extra: { is_favorite?: boolean; org?: Org | null; my_application?: any } = {}) {
  const { lister_email, adopter_application_id, hidden_reason, pet_id, ...rest } = l
  const mine = !!viewer?.email && viewer.email === lister_email
  const isAdmin = viewer?.role === 'admin'
  const r = rulesFor(l.country)
  const showChip = mine || isAdmin || r.show_microchip_publicly
  return {
    ...rest,
    microchip_number: showChip ? l.microchip_number : null,
    has_microchip: !!l.microchip_number,
    age_weeks: ageWeeks(new Date(l.birth_date_est)),
    is_mine: mine,
    ...(mine || isAdmin ? { hidden_reason: hidden_reason ?? null } : {}),
    lister: {
      name: l.lister_name,
      type: l.lister_type,
      verified: extra.org?.verified ?? false,
      service_id: l.service_id ?? null,
      ...(extra.org ? { contact_phone: extra.org.phone, contact_email: extra.org.email } : {}),
    },
    ...(extra.is_favorite !== undefined ? { is_favorite: extra.is_favorite } : {}),
    ...(extra.my_application !== undefined ? { my_application: extra.my_application } : {}),
  }
}

/** Οργανισμοί ανά service_id (επαλήθευση + επικοινωνία) για πολλές αγγελίες μαζί. */
async function orgsByService(ids: string[]): Promise<Map<string, Org>> {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return new Map()
  const rows = await prisma.service.findMany({
    where: { id: { in: uniq } },
    select: {
      id: true, provider_name: true, title: true, is_verified: true, contact_phone: true, contact_email: true,
      official_shelter: { select: { id: true } }, welfare_organisation: { select: { id: true } },
    },
  })
  return new Map(rows.map(s => [s.id, {
    service_id: s.id, name: s.title || s.provider_name,
    verified: !!(s.is_verified || s.official_shelter || s.welfare_organisation),
    phone: s.contact_phone ?? null, email: s.contact_email ?? null,
  }]))
}

// ─── Σχήματα ───────────────────────────────────────────────────────────

const MSG = {
  name: 'Το όνομα του ζώου είναι υποχρεωτικό',
  desc: 'Γράψε μια περιγραφή (τουλάχιστον 20 χαρακτήρες)',
  photos: 'Πρόσθεσε 1 έως 8 φωτογραφίες',
  photoUrl: 'Μη έγκυρη φωτογραφία',
  city: 'Συμπλήρωσε την πόλη',
  country: 'Μη έγκυρη χώρα',
  birth: 'Μη έγκυρη ημερομηνία γέννησης',
  chip: 'Μη έγκυρος αριθμός μικροτσίπ (15 ψηφία)',
  ack: 'Πρέπει να δηλώσεις ότι τηρείς τη νομοθεσία της χώρας σου',
}

const listingSchema = z.object({
  name: z.string().trim().min(1, MSG.name).max(80, MSG.name),
  species: z.enum(SPECIES),
  breed: z.string().trim().max(120).optional().nullable(),
  is_mixed: z.boolean().optional().default(false),
  sex: z.enum(SEXES),
  birth_date_est: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, MSG.birth),
  size: z.enum(SIZES).optional().nullable(),
  color: z.string().trim().max(80).optional().nullable(),
  weight_kg: z.number().min(0).max(150).optional().nullable(),
  microchip_number: z.string().trim().max(30).optional().nullable(),
  is_sterilized: z.boolean().optional().default(false),
  is_vaccinated: z.boolean().optional().default(false),
  is_dewormed: z.boolean().optional().default(false),
  health_notes: z.string().trim().max(2000).optional().nullable(),
  special_needs: z.boolean().optional().default(false),
  good_with_kids: z.enum(TRISTATE).optional().default('unknown'),
  good_with_dogs: z.enum(TRISTATE).optional().default('unknown'),
  good_with_cats: z.enum(TRISTATE).optional().default('unknown'),
  house_trained: z.boolean().optional().nullable(),
  energy_level: z.enum(ENERGY).optional().nullable(),
  description: z.string().trim().min(20, MSG.desc).max(5000),
  photos: z.array(z.string().max(1000)).min(1, MSG.photos).max(MAX_PHOTOS, MSG.photos),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, MSG.country),
  city: z.string().trim().min(1, MSG.city).max(120),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  adoption_fee: z.number().min(0).max(100000).optional().default(0),
  fee_currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().default('EUR'),
  fee_breakdown: z.string().trim().max(1000).optional().nullable(),
  requirements: z.string().trim().max(2000).optional().nullable(),
  allows_abroad: z.boolean().optional().default(false),
  bred_by_lister: z.boolean().optional().default(false),
  source: z.enum(SOURCES),
  pet_id: z.string().max(64).optional().nullable(),
  legal_ack: z.literal(true, { errorMap: () => ({ message: MSG.ack }) }),
})

const answersSchema = z.object({
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, MSG.country),
  city: z.string().trim().min(1, MSG.city).max(120),
  housing: z.enum(['house', 'apartment', 'other']),
  ownership: z.enum(['own', 'rent', 'family']),
  landlord_ok: z.boolean().optional().nullable(),
  has_garden: z.boolean(),
  household_adults: z.number().int().min(1).max(20),
  household_children: z.number().int().min(0).max(20),
  children_ages: z.string().trim().max(120).optional().nullable(),
  other_pets: z.string().trim().max(500).optional().nullable(),
  experience: z.string().trim().max(1500).optional().nullable(),
  hours_alone: z.number().int().min(0).max(24),
  reason: z.string().trim().min(10, 'Γράψε γιατί θέλεις να υιοθετήσεις (τουλάχιστον 10 χαρακτήρες)').max(2000),
  agrees_home_visit: z.boolean().optional().default(false),
  agrees_followup: z.boolean().optional().default(false),
})

const applySchema = z.object({
  answers: answersSchema,
  message: z.string().trim().max(2000).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
})

// ─── Routes ────────────────────────────────────────────────────────────

const adoptionRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] }

  async function requireAdmin(req: any, reply: any) {
    if ((req.user as any)?.role !== 'admin') return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
  }

  /**
   * Κανόνες + νομικός οδηγός + ετικέτες επιβεβαιώσεων για μια χώρα, στη
   * γλώσσα του αιτήματος. Δημόσιο: ο οδηγός είναι ενημέρωση για όλους.
   */
  app.get('/rules', async (req: any) => {
    const country = String(req.query?.country || 'GR').toUpperCase().slice(0, 2)
    const lang = getRequestLang(req) as Lang
    const rules = rulesFor(country)
    return {
      rules,
      guide: guideFor(country, lang),
      ack_labels: Object.fromEntries(rules.completion_acks.map(k => [k, ackLabel(k, country, lang)])),
    }
  })

  /** Τι μπορεί να κάνει ο συνδεδεμένος: οργανισμός ή ιδιώτης, προεπιλεγμένη χώρα/πόλη. */
  app.get('/me/context', auth, async (req: any) => {
    const me = req.user as any
    const [user, org] = await Promise.all([
      prisma.user.findUnique({ where: { id: me.id }, select: { city: true, country: true, birth_date: true, full_name: true, phone: true } }),
      orgOf(me.email, me.role),
    ])
    const adult = user?.birth_date ? ageYears(new Date(user.birth_date)) >= 18 : me.role !== 'user'
    return {
      lister_type: org ? 'organisation' : 'individual',
      organisation: org ? { service_id: org.service_id, name: org.name, verified: org.verified } : null,
      is_adult: adult,
      city: user?.city ?? '',
      country: (user?.country || '').length === 2 ? user!.country!.toUpperCase() : '',
      name: user?.full_name ?? '',
    }
  })

  // ─── Λίστα αγγελιών (δημόσια) ─────────────────────────────────────
  app.get('/listings', async (req: any) => {
    const viewer = await viewerOf(req)
    const q = req.query as Record<string, string | undefined>
    const take = Math.min(Math.max(Number(q.limit) || 20, 1), 50)
    const page = Math.max(Number(q.page) || 1, 1)

    const where: any = { is_hidden: false }
    where.status = q.status === 'adopted' ? 'adopted' : { in: ['available', 'reserved'] }
    if (q.species && (SPECIES as readonly string[]).includes(q.species)) where.species = q.species
    if (q.sex && (SEXES as readonly string[]).includes(q.sex)) where.sex = q.sex
    if (q.size && (SIZES as readonly string[]).includes(q.size)) where.size = q.size
    if (q.country && /^[A-Za-z]{2}$/.test(q.country)) where.country = q.country.toUpperCase()
    if (q.city) where.city = { contains: String(q.city).slice(0, 120), mode: 'insensitive' }
    if (q.lister_type === 'organisation' || q.lister_type === 'individual') where.lister_type = q.lister_type
    if (q.good_with_kids === 'yes') where.good_with_kids = 'yes'
    if (q.good_with_dogs === 'yes') where.good_with_dogs = 'yes'
    if (q.good_with_cats === 'yes') where.good_with_cats = 'yes'
    if (q.special_needs === 'true') where.special_needs = true

    // Ηλικιακές ομάδες → εύρος ημερομηνίας γέννησης.
    const now = Date.now()
    const ago = (days: number) => new Date(now - days * 86_400_000)
    if (q.age === 'baby') where.birth_date_est = { gt: ago(182) }
    else if (q.age === 'young') where.birth_date_est = { lte: ago(182), gt: ago(730) }
    else if (q.age === 'adult') where.birth_date_est = { lte: ago(730), gt: ago(2920) }
    else if (q.age === 'senior') where.birth_date_est = { lte: ago(2920) }

    if (q.q) {
      const s = String(q.q).trim().slice(0, 80)
      if (s) where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { breed: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ]
    }

    const blocked = await blockedEmailsFor(viewer?.email)
    if (blocked.length) where.lister_email = { notIn: blocked }

    const lat = Number(q.lat), lng = Number(q.lng)
    const nearest = q.sort === 'nearest' && Number.isFinite(lat) && Number.isFinite(lng)

    let rows: any[]
    let total: number
    if (nearest) {
      // Απόσταση στη μνήμη: λίγες εκατοντάδες ενεργές αγγελίες ανά φίλτρο.
      const all = await prisma.adoptionListing.findMany({ where, take: 500, orderBy: { created_at: 'desc' } })
      const dist = (r: any) => (r.latitude == null || r.longitude == null) ? Number.POSITIVE_INFINITY
        : Math.hypot(r.latitude - lat, (r.longitude - lng) * Math.cos(lat * Math.PI / 180))
      all.sort((a, b) => dist(a) - dist(b))
      total = all.length
      rows = all.slice((page - 1) * take, page * take)
    } else {
      const orderBy = q.sort === 'oldest_animal' ? [{ birth_date_est: 'asc' as const }]
        : q.sort === 'youngest_animal' ? [{ birth_date_est: 'desc' as const }]
        : [{ created_at: 'desc' as const }]
      ;[rows, total] = await Promise.all([
        prisma.adoptionListing.findMany({ where, orderBy, skip: (page - 1) * take, take }),
        prisma.adoptionListing.count({ where }),
      ])
    }

    const [orgs, favs] = await Promise.all([
      orgsByService(rows.map(r => r.service_id)),
      viewer?.email
        ? prisma.adoptionFavorite.findMany({ where: { user_email: viewer.email, listing_id: { in: rows.map(r => r.id) } }, select: { listing_id: true } })
        : Promise.resolve([]),
    ])
    const favSet = new Set(favs.map(f => f.listing_id))
    return {
      data: rows.map(r => publicListing(r, viewer, {
        org: r.service_id ? orgs.get(r.service_id) ?? null : null,
        ...(viewer?.email ? { is_favorite: favSet.has(r.id) } : {}),
      })),
      total, page, limit: take, totalPages: Math.ceil(total / take),
    }
  })

  // ─── Οι αγγελίες μου ──────────────────────────────────────────────
  app.get('/listings/mine', auth, async (req: any) => {
    const me = req.user as any
    const rows = await prisma.adoptionListing.findMany({
      where: { lister_email: me.email },
      orderBy: { created_at: 'desc' },
      include: { applications: { select: { status: true } } },
    })
    const orgs = await orgsByService(rows.map(r => r.service_id ?? ''))
    return {
      data: rows.map(({ applications, ...r }) => ({
        ...publicListing(r, me, { org: r.service_id ? orgs.get(r.service_id) ?? null : null }),
        applications_total: applications.length,
        applications_open: applications.filter(a => OPEN_APP.includes(a.status)).length,
        applications_new: applications.filter(a => a.status === 'pending').length,
      })),
    }
  })

  // ─── Αγαπημένα ────────────────────────────────────────────────────
  app.get('/favorites', auth, async (req: any) => {
    const me = req.user as any
    const favs = await prisma.adoptionFavorite.findMany({
      where: { user_email: me.email, listing: { is_hidden: false } },
      include: { listing: true },
      orderBy: { created_at: 'desc' },
      take: 200,
    })
    const orgs = await orgsByService(favs.map(f => f.listing.service_id ?? ''))
    return { data: favs.map(f => publicListing(f.listing, me, { is_favorite: true, org: f.listing.service_id ? orgs.get(f.listing.service_id) ?? null : null })) }
  })

  app.post('/listings/:id/favorite', auth, async (req: any, reply) => {
    const me = req.user as any
    const listing = await prisma.adoptionListing.findUnique({ where: { id: req.params.id }, select: { id: true, is_hidden: true } })
    if (!listing || listing.is_hidden) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    await prisma.adoptionFavorite.upsert({
      where: { listing_id_user_email: { listing_id: listing.id, user_email: me.email } },
      create: { listing_id: listing.id, user_email: me.email },
      update: {},
    })
    return { is_favorite: true }
  })

  app.delete('/listings/:id/favorite', auth, async (req: any) => {
    const me = req.user as any
    await prisma.adoptionFavorite.deleteMany({ where: { listing_id: req.params.id, user_email: me.email } })
    return { is_favorite: false }
  })

  // ─── Μία αγγελία (δημόσια) ────────────────────────────────────────
  app.get('/listings/:id', async (req: any, reply) => {
    const viewer = await viewerOf(req)
    const l = await prisma.adoptionListing.findUnique({ where: { id: req.params.id } })
    const mine = !!viewer?.email && viewer.email === l?.lister_email
    if (!l || (l.is_hidden && !mine && viewer?.role !== 'admin')) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    if (!mine && viewer?.email) {
      const blocked = await blockedEmailsFor(viewer.email)
      if (blocked.includes(l.lister_email)) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    }
    if (!mine) void prisma.adoptionListing.update({ where: { id: l.id }, data: { views_count: { increment: 1 } } }).catch(() => {})

    const [orgMap, fav, myApp] = await Promise.all([
      orgsByService([l.service_id ?? '']),
      viewer?.email ? prisma.adoptionFavorite.findUnique({ where: { listing_id_user_email: { listing_id: l.id, user_email: viewer.email } } }) : null,
      viewer?.email && !mine ? prisma.adoptionApplication.findUnique({
        where: { listing_id_applicant_email: { listing_id: l.id, applicant_email: viewer.email } },
        select: { id: true, status: true, created_at: true },
      }) : null,
    ])
    return {
      data: publicListing(l, viewer, {
        org: l.service_id ? orgMap.get(l.service_id) ?? null : null,
        ...(viewer?.email ? { is_favorite: !!fav } : {}),
        ...(viewer?.email && !mine ? { my_application: myApp ?? null } : {}),
      }),
    }
  })

  // ─── Δημιουργία αγγελίας ──────────────────────────────────────────
  async function buildListingData(req: any, reply: any, body: z.infer<typeof listingSchema>, existing?: any) {
    const me = req.user as any
    const org = await orgOf(me.email, me.role)
    const lister_type: 'organisation' | 'individual' = existing?.lister_type ?? (org ? 'organisation' : 'individual')

    if (body.photos.some(p => !isAllowedImageUrl(p))) { reply.code(400).send({ message: MSG.photoUrl, field: 'photos' }); return null }
    const chip = normaliseMicrochip(body.microchip_number ?? null)
    if (chip === 'INVALID') { reply.code(400).send({ message: MSG.chip, field: 'microchip_number' }); return null }
    const birth = new Date(`${body.birth_date_est}T00:00:00Z`)
    if (Number.isNaN(birth.getTime()) || birth.getUTCFullYear() < 1990) { reply.code(400).send({ message: MSG.birth, field: 'birth_date_est' }); return null }

    if ((body.latitude == null) !== (body.longitude == null)) { reply.code(400).send({ message: 'Μη έγκυρα δεδομένα', field: 'latitude' }); return null }

    const fee = lister_type === 'individual' ? 0 : Math.round((body.adoption_fee ?? 0) * 100) / 100
    if (lister_type === 'individual' && (body.adoption_fee ?? 0) > 0) {
      reply.code(400).send({ message: 'Οι ιδιώτες δίνουν ζώα μόνο δωρεάν', field: 'adoption_fee' }); return null
    }
    const problem = checkListing({
      lister_type, species: body.species, breed: body.breed ?? null, country: body.country,
      birth_date_est: birth, microchip_number: chip, adoption_fee: fee, fee_breakdown: body.fee_breakdown ?? null,
      bred_by_lister: !!body.bred_by_lister, is_vaccinated: !!body.is_vaccinated, source: body.source,
    })
    if (problem) { reply.code(400).send(problem); return null }

    // Κατοικίδιο του ίδιου (προσυμπλήρωση): μόνο αν του ανήκει.
    let pet_id: string | null = null
    if (body.pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: body.pet_id }, select: { owner_email: true } })
      if (!pet || pet.owner_email !== me.email) { reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει', field: 'pet_id' }); return null }
      pet_id = body.pet_id
    }

    return {
      lister_type,
      service_id: lister_type === 'organisation' ? (existing?.service_id ?? org?.service_id ?? null) : null,
      lister_name: lister_type === 'organisation' && org ? org.name : (existing?.lister_name ?? await fullNameOf(me.email)),
      source: body.source,
      pet_id,
      name: body.name,
      species: body.species,
      breed: body.breed || null,
      is_mixed: !!body.is_mixed,
      sex: body.sex,
      birth_date_est: birth,
      size: body.size ?? null,
      color: body.color || null,
      weight_kg: body.weight_kg ?? null,
      microchip_number: chip,
      is_sterilized: !!body.is_sterilized,
      is_vaccinated: !!body.is_vaccinated,
      is_dewormed: !!body.is_dewormed,
      health_notes: body.health_notes || null,
      special_needs: !!body.special_needs,
      good_with_kids: body.good_with_kids,
      good_with_dogs: body.good_with_dogs,
      good_with_cats: body.good_with_cats,
      house_trained: body.house_trained ?? null,
      energy_level: body.energy_level ?? null,
      description: body.description,
      photos: body.photos,
      country: body.country,
      city: body.city,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      adoption_fee: fee,
      fee_currency: body.fee_currency || 'EUR',
      fee_breakdown: fee > 0 ? (body.fee_breakdown || null) : null,
      requirements: body.requirements || null,
      allows_abroad: !!body.allows_abroad,
      bred_by_lister: !!body.bred_by_lister,
      legal_ack_at: new Date(),
    }
  }

  async function requireAdultLister(req: any, reply: any): Promise<boolean> {
    const me = req.user as any
    if (me.role === 'admin') return true
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { birth_date: true } })
    if (user?.birth_date && ageYears(new Date(user.birth_date)) < 18) {
      reply.code(403).send({ message: 'Πρέπει να είσαι ενήλικος για να δώσεις ή να υιοθετήσεις ζώο' })
      return false
    }
    return true
  }

  app.post('/listings', { ...auth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req: any, reply) => {
    const me = req.user as any
    if (!(await requireAdultLister(req, reply))) return reply
    const body = parseBody(listingSchema, req.body, reply)
    if (!body) return reply
    const data = await buildListingData(req, reply, body)
    if (!data) return reply
    const created = await prisma.adoptionListing.create({ data: { ...data, lister_email: me.email } })
    await audit(req, { action: 'adoption_listing_created', resource: 'adoption_listing', resource_id: created.id } as any).catch(() => {})
    return reply.code(201).send({ data: publicListing(created, me) })
  })

  app.patch('/listings/:id', auth, async (req: any, reply) => {
    const me = req.user as any
    const existing = await prisma.adoptionListing.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    if (existing.lister_email !== me.email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    // Μόνο αλλαγή κατάστασης (απόσυρση / επαναφορά).
    const status = (req.body as any)?.status
    if (status !== undefined && Object.keys(req.body ?? {}).length === 1) {
      if (existing.status === 'adopted') return reply.code(400).send({ message: 'Η αγγελία έχει ήδη ολοκληρωθεί' })
      if (status === 'withdrawn') {
        await prisma.$transaction([
          prisma.adoptionListing.update({ where: { id: existing.id }, data: { status: 'withdrawn' } }),
          prisma.adoptionApplication.updateMany({
            where: { listing_id: existing.id, status: { in: OPEN_APP } },
            data: { status: 'rejected', decision_reason: 'listing_withdrawn', decided_at: new Date() },
          }),
        ])
        return { ok: true, status: 'withdrawn' }
      }
      if (status === 'available' && existing.status === 'withdrawn') {
        await prisma.adoptionListing.update({ where: { id: existing.id }, data: { status: 'available' } })
        return { ok: true, status: 'available' }
      }
      return reply.code(400).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
    }

    if (existing.status === 'adopted') return reply.code(400).send({ message: 'Η αγγελία έχει ήδη ολοκληρωθεί' })
    const body = parseBody(listingSchema, req.body, reply)
    if (!body) return reply
    const data = await buildListingData(req, reply, body, existing)
    if (!data) return reply
    const updated = await prisma.adoptionListing.update({ where: { id: existing.id }, data })
    return { data: publicListing(updated, me) }
  })

  app.delete('/listings/:id', auth, async (req: any, reply) => {
    const me = req.user as any
    const existing = await prisma.adoptionListing.findUnique({ where: { id: req.params.id }, select: { lister_email: true, status: true } })
    if (!existing) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    if (existing.lister_email !== me.email && me.role !== 'admin') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    // Ολοκληρωμένη υιοθεσία: μένει ως ιστορικό του νέου κηδεμόνα (συμφωνητικό).
    if (existing.status === 'adopted' && me.role !== 'admin') return reply.code(400).send({ message: 'Η αγγελία έχει ήδη ολοκληρωθεί' })
    await prisma.adoptionListing.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── Αίτηση υιοθεσίας ─────────────────────────────────────────────
  app.post('/listings/:id/applications', { ...auth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req: any, reply) => {
    const me = req.user as any
    const listing = await prisma.adoptionListing.findUnique({ where: { id: req.params.id } })
    if (!listing || listing.is_hidden) return reply.code(404).send({ message: 'Η αγγελία δεν βρέθηκε' })
    if (listing.lister_email === me.email) return reply.code(400).send({ message: 'Δεν μπορείς να κάνεις αίτηση στη δική σου αγγελία' })
    if (listing.status !== 'available') return reply.code(409).send({ message: 'Η αγγελία δεν δέχεται πλέον αιτήσεις' })

    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { birth_date: true } })
    const minAge = rulesFor(listing.country).adopter_min_age
    if (me.role !== 'admin' && (!user?.birth_date || ageYears(new Date(user.birth_date)) < minAge)) {
      return reply.code(403).send({ message: 'Πρέπει να είσαι ενήλικος για να δώσεις ή να υιοθετήσεις ζώο' })
    }
    const blocked = await blockedEmailsFor(listing.lister_email)
    if (blocked.includes(me.email)) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const body = parseBody(applySchema, req.body, reply)
    if (!body) return reply
    const r = rulesFor(listing.country)
    if (r.adopter_residence_required && !listing.allows_abroad && body.answers.country !== listing.country) {
      return reply.code(400).send({ message: 'Αυτή η αγγελία δέχεται αιτήσεις μόνο από κατοίκους της χώρας του ζώου', field: 'answers.country' })
    }
    if (body.answers.ownership === 'rent' && body.answers.landlord_ok === false) {
      return reply.code(400).send({ message: 'Χρειάζεται η συγκατάθεση του ιδιοκτήτη του σπιτιού', field: 'answers.landlord_ok' })
    }

    const existing = await prisma.adoptionApplication.findUnique({
      where: { listing_id_applicant_email: { listing_id: listing.id, applicant_email: me.email } },
    })
    if (existing && existing.status !== 'withdrawn') return reply.code(409).send({ message: 'Έχεις ήδη κάνει αίτηση για αυτό το ζώο', id: existing.id })

    const name = await fullNameOf(me.email)
    const data = {
      applicant_name: name,
      applicant_phone: body.phone || null,
      answers: body.answers as any,
      message: body.message || null,
      status: 'pending',
      decision_reason: null, decided_at: null, lister_note: null,
    }
    const app_ = existing
      ? await prisma.adoptionApplication.update({ where: { id: existing.id }, data })
      : await prisma.adoptionApplication.create({ data: { ...data, listing_id: listing.id, applicant_email: me.email } })

    void notify(listing.lister_email, 'adoption_application', N.newApplication,
      lang => T(lang, {
        el: `${name} θέλει να υιοθετήσει τον/την ${listing.name}.`,
        en: `${name} would like to adopt ${listing.name}.`,
        es: `${name} quiere adoptar a ${listing.name}.`,
        fr: `${name} souhaite adopter ${listing.name}.`,
        zh: `${name} 想领养 ${listing.name}。`,
      }), `/adoption/applications/${app_.id}`)
    return reply.code(201).send({ data: { id: app_.id, status: app_.status } })
  })

  /** Μορφή αίτησης ανάλογα με το ποιος κοιτά. */
  function shapeApplication(a: any, role: 'lister' | 'applicant' | 'admin') {
    const { applicant_email, lister_note, applicant_phone, listing, messages, ...rest } = a
    return {
      ...rest,
      my_role: role,
      ...(role !== 'applicant' ? { lister_note: lister_note ?? null, applicant_phone: applicant_phone ?? null } : {}),
      ...(listing ? { listing: { id: listing.id, name: listing.name, species: listing.species, photos: listing.photos, status: listing.status, country: listing.country, city: listing.city, lister_name: listing.lister_name, lister_type: listing.lister_type } } : {}),
    }
  }

  app.get('/applications/mine', auth, async (req: any) => {
    const me = req.user as any
    const rows = await prisma.adoptionApplication.findMany({
      where: { applicant_email: me.email },
      include: { listing: true, messages: { where: { read_at: null, sender_role: 'lister' }, select: { id: true } } },
      orderBy: { updated_at: 'desc' },
    })
    return { data: rows.map(r => ({ ...shapeApplication(r, 'applicant'), unread_messages: r.messages.length })) }
  })

  app.get('/applications/received', auth, async (req: any) => {
    const me = req.user as any
    const q = req.query as any
    const where: any = { listing: { lister_email: me.email } }
    if (q.listing_id) where.listing_id = String(q.listing_id)
    if (q.status && typeof q.status === 'string') where.status = { in: q.status.split(',').slice(0, 6) }
    const rows = await prisma.adoptionApplication.findMany({
      where,
      include: { listing: true, messages: { where: { read_at: null, sender_role: 'applicant' }, select: { id: true } } },
      orderBy: [{ created_at: 'desc' }],
      take: 300,
    })
    return { data: rows.map(r => ({ ...shapeApplication(r, 'lister'), unread_messages: r.messages.length })) }
  })

  /** Φόρτωση αίτησης + ρόλος του θεατή, ή απάντηση 403/404. */
  async function loadForParty(req: any, reply: any) {
    const me = req.user as any
    const a = await prisma.adoptionApplication.findUnique({ where: { id: req.params.id }, include: { listing: true } })
    if (!a) { reply.code(404).send({ message: 'Η αίτηση δεν βρέθηκε' }); return null }
    const role: 'lister' | 'applicant' | 'admin' | null =
      a.listing.lister_email === me.email ? 'lister'
        : a.applicant_email === me.email ? 'applicant'
          : me.role === 'admin' ? 'admin' : null
    if (!role) { reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' }); return null }
    return { a, role, me }
  }

  app.get('/applications/:id', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    const lang = getRequestLang(req) as Lang
    const messages = await prisma.adoptionMessage.findMany({ where: { application_id: a.id }, orderBy: { created_at: 'asc' }, take: 500 })
    // Ό,τι έστειλε η άλλη πλευρά διαβάστηκε τώρα.
    if (role !== 'admin') {
      const other = role === 'lister' ? 'applicant' : 'lister'
      void prisma.adoptionMessage.updateMany({ where: { application_id: a.id, sender_role: other, read_at: null }, data: { read_at: new Date() } }).catch(() => {})
    }
    const rules = rulesFor(a.listing.country)
    const orgMap = await orgsByService([a.listing.service_id ?? ''])
    const org = a.listing.service_id ? orgMap.get(a.listing.service_id) ?? null : null
    return {
      data: {
        ...shapeApplication(a, role),
        listing: publicListing(a.listing, ctx.me, { org }),
        messages: messages.map(m => ({ id: m.id, body: m.body, sender_role: m.sender_role, is_mine: m.sender_role === role, created_at: m.created_at, read_at: m.read_at })),
        completion: {
          acks: rules.completion_acks.map(k => ({ key: k, label: ackLabel(k, a.listing.country, lang) })),
          cec_required: rules.cec_required_species.includes(a.listing.species),
        },
        contract_available: ['approved', 'completed'].includes(a.status),
      },
    }
  })

  /** Ο καταχωρίζων αλλάζει κατάσταση / σημείωση. */
  app.patch('/applications/:id', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    if (role !== 'lister') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    const body = parseBody(z.object({
      status: z.enum(['reviewing', 'approved', 'rejected']).optional(),
      lister_note: z.string().trim().max(2000).optional().nullable(),
      decision_reason: z.string().trim().max(1000).optional().nullable(),
      cec_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }), req.body, reply)
    if (!body) return reply

    const data: any = {}
    if (body.lister_note !== undefined) data.lister_note = body.lister_note || null
    if (body.cec_date !== undefined) data.cec_date = body.cec_date ? new Date(`${body.cec_date}T00:00:00Z`) : null

    if (body.status && body.status !== a.status) {
      const allowed: Record<string, string[]> = {
        pending: ['reviewing', 'approved', 'rejected'],
        reviewing: ['approved', 'rejected'],
        approved: ['rejected', 'reviewing'],
      }
      if (!(allowed[a.status] ?? []).includes(body.status)) return reply.code(400).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
      if (body.status === 'approved') {
        if (a.listing.status === 'adopted' || a.listing.status === 'withdrawn') return reply.code(409).send({ message: 'Η αγγελία δεν δέχεται πλέον αιτήσεις' })
        const other = await prisma.adoptionApplication.count({ where: { listing_id: a.listing_id, status: 'approved', id: { not: a.id } } })
        if (other > 0) return reply.code(409).send({ message: 'Υπάρχει ήδη εγκεκριμένη αίτηση για αυτό το ζώο' })
      }
      data.status = body.status
      data.decided_at = new Date()
      if (body.decision_reason !== undefined) data.decision_reason = body.decision_reason || null
    }

    const ops: any[] = [prisma.adoptionApplication.update({ where: { id: a.id }, data })]
    if (data.status === 'approved') ops.push(prisma.adoptionListing.update({ where: { id: a.listing_id }, data: { status: 'reserved' } }))
    if (a.status === 'approved' && data.status && data.status !== 'approved' && a.listing.status === 'reserved') {
      ops.push(prisma.adoptionListing.update({ where: { id: a.listing_id }, data: { status: 'available' } }))
    }
    await prisma.$transaction(ops)

    if (data.status) {
      const key = data.status as 'approved' | 'rejected' | 'reviewing'
      const animal = a.listing.name
      void notify(a.applicant_email, `adoption_${key}`, N[key], lang => key === 'approved'
        ? T(lang, { el: `Ο/Η ${a.listing.lister_name} ενέκρινε την αίτησή σου για τον/την ${animal}. Κανονίστε τα επόμενα βήματα στα μηνύματα.`, en: `${a.listing.lister_name} approved your application for ${animal}. Arrange the next steps in the messages.`, es: `${a.listing.lister_name} ha aprobado tu solicitud para ${animal}. Acordad los siguientes pasos en los mensajes.`, fr: `${a.listing.lister_name} a accepté votre demande pour ${animal}. Organisez la suite dans les messages.`, zh: `${a.listing.lister_name} 已通过你领养 ${animal} 的申请。请在消息中商定后续步骤。` })
        : key === 'rejected'
          ? T(lang, { el: `Η αίτησή σου για τον/την ${animal} δεν προχώρησε αυτή τη φορά.`, en: `Your application for ${animal} did not go ahead this time.`, es: `Tu solicitud para ${animal} no ha salido adelante esta vez.`, fr: `Votre demande pour ${animal} n’a pas abouti cette fois.`, zh: `你领养 ${animal} 的申请这次未能通过。` })
          : T(lang, { el: `Ο/Η ${a.listing.lister_name} εξετάζει την αίτησή σου για τον/την ${animal}.`, en: `${a.listing.lister_name} is reviewing your application for ${animal}.`, es: `${a.listing.lister_name} está revisando tu solicitud para ${animal}.`, fr: `${a.listing.lister_name} examine votre demande pour ${animal}.`, zh: `${a.listing.lister_name} 正在审核你领养 ${animal} 的申请。` }),
      `/adoption/applications/${a.id}`)
    }
    return { ok: true }
  })

  /** Ο αιτών ανακαλεί την αίτησή του. */
  app.post('/applications/:id/withdraw', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    if (role !== 'applicant') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    if (!OPEN_APP.includes(a.status)) return reply.code(400).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
    const ops: any[] = [prisma.adoptionApplication.update({ where: { id: a.id }, data: { status: 'withdrawn' } })]
    if (a.status === 'approved' && a.listing.status === 'reserved') ops.push(prisma.adoptionListing.update({ where: { id: a.listing_id }, data: { status: 'available' } }))
    await prisma.$transaction(ops)
    void notify(a.listing.lister_email, 'adoption_withdrawn', N.withdrawn, lang => T(lang, {
      el: `${a.applicant_name} ανακάλεσε την αίτηση για τον/την ${a.listing.name}.`,
      en: `${a.applicant_name} withdrew their application for ${a.listing.name}.`,
      es: `${a.applicant_name} ha retirado su solicitud para ${a.listing.name}.`,
      fr: `${a.applicant_name} a retiré sa demande pour ${a.listing.name}.`,
      zh: `${a.applicant_name} 撤回了领养 ${a.listing.name} 的申请。`,
    }), `/adoption/applications/${a.id}`)
    return { ok: true }
  })

  /**
   * Ολοκλήρωση υιοθεσίας (καταχωρίζων). Απαιτεί τις επιβεβαιώσεις της χώρας
   * και, στη Γαλλία, certificat d'engagement τουλάχιστον 7 ημέρες πριν.
   */
  app.post('/applications/:id/complete', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    if (role !== 'lister') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    if (a.status !== 'approved') return reply.code(400).send({ message: 'Πρώτα έγκρινε την αίτηση' })
    const body = parseBody(z.object({
      acks: z.array(z.string().max(40)).max(10),
      cec_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }), req.body, reply)
    if (!body) return reply

    const rules = rulesFor(a.listing.country)
    const missing = rules.completion_acks.filter(k => !body.acks.includes(k))
    if (missing.length) return reply.code(400).send({ message: 'Επιβεβαίωσε όλα τα βήματα που ζητά ο νόμος', field: 'acks', missing })

    let cec: Date | null = a.cec_date ? new Date(a.cec_date) : null
    if (body.cec_date) cec = new Date(`${body.cec_date}T00:00:00Z`)
    if (rules.cec_required_species.includes(a.listing.species)) {
      if (!cec) return reply.code(400).send({ message: 'Συμπλήρωσε την ημερομηνία του certificat d’engagement', field: 'cec_date' })
      const days = Math.floor((Date.now() - cec.getTime()) / 86_400_000)
      if (days < 7) return reply.code(400).send({ message: 'Πρέπει να περάσουν 7 ημέρες από το certificat d’engagement', field: 'cec_date' })
    }

    const now = new Date()
    const others = await prisma.adoptionApplication.findMany({
      where: { listing_id: a.listing_id, id: { not: a.id }, status: { in: OPEN_APP } },
      select: { id: true, applicant_email: true },
    })
    await prisma.$transaction([
      prisma.adoptionApplication.update({ where: { id: a.id }, data: { status: 'completed', completed_at: now, completion_acks: body.acks as any, cec_date: cec } }),
      prisma.adoptionListing.update({ where: { id: a.listing_id }, data: { status: 'adopted', adopted_at: now, adopter_application_id: a.id } }),
      prisma.adoptionApplication.updateMany({ where: { id: { in: others.map(o => o.id) } }, data: { status: 'rejected', decision_reason: 'listing_adopted', decided_at: now } }),
    ])
    await audit(req, { action: 'adoption_completed', resource: 'adoption_application', resource_id: a.id, metadata: { listing_id: a.listing_id, country: a.listing.country, acks: body.acks } } as any).catch(() => {})

    void notify(a.applicant_email, 'adoption_completed', N.completed, lang => T(lang, {
      el: `Καλώς ήρθες στην οικογένεια, ${a.listing.name}! Πρόσθεσέ τον/την στα κατοικίδιά σου και δες τα επόμενα βήματα.`,
      en: `Welcome to the family, ${a.listing.name}! Add them to your pets and see the next steps.`,
      es: `¡Bienvenido/a a la familia, ${a.listing.name}! Añádelo/a a tus mascotas y mira los siguientes pasos.`,
      fr: `Bienvenue dans la famille, ${a.listing.name} ! Ajoutez-le à vos animaux et consultez les prochaines étapes.`,
      zh: `欢迎 ${a.listing.name} 加入你的家庭！把它添加到你的宠物中，并查看后续步骤。`,
    }), `/adoption/applications/${a.id}`)
    for (const o of others) {
      void notify(o.applicant_email, 'adoption_rejected', N.rejected, lang => T(lang, {
        el: `Ο/Η ${a.listing.name} βρήκε σπίτι. Ευχαριστούμε για το ενδιαφέρον σου!`,
        en: `${a.listing.name} has found a home. Thank you for your interest!`,
        es: `${a.listing.name} ha encontrado un hogar. ¡Gracias por tu interés!`,
        fr: `${a.listing.name} a trouvé un foyer. Merci de votre intérêt !`,
        zh: `${a.listing.name} 已经找到新家，感谢你的关注！`,
      }), `/adoption/applications/${o.id}`)
    }
    return { ok: true }
  })

  /** Μήνυμα στο νήμα της αίτησης. */
  app.post('/applications/:id/messages', { ...auth, config: { rateLimit: { max: 60, timeWindow: '1 hour' } } }, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    if (role === 'admin') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    if (a.status === 'withdrawn' || (a.status === 'rejected' && role === 'applicant')) {
      return reply.code(400).send({ message: 'Η συζήτηση έχει κλείσει' })
    }
    const body = parseBody(z.object({ body: z.string().trim().min(1, 'Το περιεχόμενο είναι υποχρεωτικό').max(2000) }), req.body, reply)
    if (!body) return reply
    const msg = await prisma.adoptionMessage.create({
      data: { application_id: a.id, sender_email: ctx.me.email, sender_role: role, body: body.body },
    })
    const to = role === 'lister' ? a.applicant_email : a.listing.lister_email
    // Μία ειδοποίηση ανά 10' ανά νήμα — όχι μία για κάθε μήνυμα μιας συζήτησης.
    const recent = await prisma.notification.count({
      where: { user_email: to, type: 'adoption_message', link: `/adoption/applications/${a.id}`, is_read: false, created_at: { gte: new Date(Date.now() - 10 * 60_000) } },
    }).catch(() => 0)
    if (!recent) {
      const from = role === 'lister' ? a.listing.lister_name : a.applicant_name
      void notify(to, 'adoption_message', N.message, () => `${from}: ${body.body.slice(0, 140)}`, `/adoption/applications/${a.id}`)
    }
    return reply.code(201).send({ data: { id: msg.id, body: msg.body, sender_role: msg.sender_role, is_mine: true, created_at: msg.created_at, read_at: null } })
  })

  /** Υπόδειγμα συμφωνητικού με τα στοιχεία της αίτησης (μετά την έγκριση). */
  app.get('/applications/:id/contract', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a } = ctx
    if (!['approved', 'completed'].includes(a.status)) return reply.code(400).send({ message: 'Πρώτα έγκρινε την αίτηση' })
    const lang = getRequestLang(req) as Lang
    const l = a.listing
    return {
      data: buildContract({
        country: l.country,
        listerName: l.lister_name,
        listerType: l.lister_type === 'organisation' ? 'organisation' : 'individual',
        adopterName: a.applicant_name,
        animal: {
          name: l.name, species: l.species, breed: l.breed, sex: l.sex,
          birth: new Date(l.birth_date_est).toISOString().slice(0, 10),
          microchip: l.microchip_number, color: l.color, sterilized: l.is_sterilized,
        },
        fee: l.adoption_fee, currency: l.fee_currency, feeBreakdown: l.fee_breakdown,
        dateIso: (a.completed_at ?? new Date()).toISOString().slice(0, 10),
      }, lang),
    }
  })

  /** Μετά την ολοκλήρωση: το ζώο μπαίνει στα «Κατοικίδιά μου» του νέου κηδεμόνα. */
  app.post('/applications/:id/add-pet', auth, async (req: any, reply) => {
    const ctx = await loadForParty(req, reply)
    if (!ctx) return reply
    const { a, role } = ctx
    if (role !== 'applicant') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    if (a.status !== 'completed') return reply.code(400).send({ message: 'Η υιοθεσία δεν έχει ολοκληρωθεί ακόμη' })
    if (a.pet_created_id) {
      const exists = await prisma.pet.findUnique({ where: { id: a.pet_created_id }, select: { id: true } })
      if (exists) return { data: { pet_id: exists.id, already: true } }
    }
    const l = a.listing
    const PET_SPECIES = new Set(['dog', 'cat', 'bird', 'rabbit', 'reptile'])
    const years = Math.max(0, Math.round((ageWeeks(new Date(l.birth_date_est)) / 52.18) * 10) / 10)
    const pet = await prisma.pet.create({
      data: {
        owner_email: a.applicant_email,
        name: l.name,
        species: PET_SPECIES.has(l.species) ? l.species : 'other',
        breed: l.breed,
        age: years,
        weight: l.weight_kg,
        gender: l.sex === 'unknown' ? null : l.sex,
        color: l.color,
        microchip_number: l.microchip_number,
        vaccination_status: l.is_vaccinated ? 'vaccinated' : null,
        medical_conditions: [],
        image_url: l.photos[0] ?? null,
        is_sterilized: l.is_sterilized,
      },
    })
    await prisma.adoptionApplication.update({ where: { id: a.id }, data: { pet_created_id: pet.id } })
    return reply.code(201).send({ data: { pet_id: pet.id } })
  })

  // ─── Εποπτεία (admin) ─────────────────────────────────────────────
  app.get('/admin/listings', { preHandler: [(app as any).authenticate, requireAdmin] }, async (req: any) => {
    const q = req.query as any
    const where: any = {}
    if (q.hidden === 'true') where.is_hidden = true
    if (q.status) where.status = String(q.status)
    if (q.q) where.OR = [{ name: { contains: String(q.q), mode: 'insensitive' } }, { lister_name: { contains: String(q.q), mode: 'insensitive' } }, { city: { contains: String(q.q), mode: 'insensitive' } }]
    const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
    const page = Math.max(Number(q.page) || 1, 1)
    const [rows, total] = await Promise.all([
      prisma.adoptionListing.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * take, take, include: { _count: { select: { applications: true } } } }),
      prisma.adoptionListing.count({ where }),
    ])
    return { data: rows.map(({ _count, ...r }) => ({ ...r, applications_total: _count.applications })), total, page, limit: take }
  })

  app.patch('/admin/listings/:id', { preHandler: [(app as any).authenticate, requireAdmin] }, async (req: any, reply) => {
    const body = parseBody(z.object({ is_hidden: z.boolean(), hidden_reason: z.string().trim().max(500).optional().nullable() }), req.body, reply)
    if (!body) return reply
    const l = await prisma.adoptionListing.update({
      where: { id: req.params.id },
      data: { is_hidden: body.is_hidden, hidden_reason: body.is_hidden ? (body.hidden_reason || null) : null },
    })
    await audit(req, { action: body.is_hidden ? 'adoption_listing_hidden' : 'adoption_listing_unhidden', resource: 'adoption_listing', resource_id: l.id } as any).catch(() => {})
    return { ok: true }
  })
}

export default adoptionRoutes
export type { AckKey }
