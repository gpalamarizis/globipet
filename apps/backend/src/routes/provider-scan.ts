import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

/**
 * Ε20 — «Σάρωση παρόχων» (admin): αναζήτηση κτηνιάτρων, pet shops, κομμωτηρίων,
 * ξενοδοχείων κατοικιδίων, εκπαιδευτών σε μια περιοχή μέσω Google Places API (New)
 * Text Search, ώστε η ομάδα να τους προσκαλεί στο GlobiPet.
 *
 *   GET  /api/admin/provider-scan/categories  → σταθερή λίστα κατηγοριών + χρήση μήνα
 *   POST /api/admin/provider-scan/search      { category, area, page_token? }
 *   GET  /api/admin/provider-scan/leads       → οι δικές μας εγγραφές επαφής
 *   PUT  /api/admin/provider-scan/leads/:placeId { status, note?, category?, area? }
 *
 * Όροι Google Maps Platform:
 *   · Αποθηκεύεται ΜΟΝΟ το place_id (επιτρέπεται επ' αόριστον) και δικά μας
 *     δεδομένα (κατάσταση/σημείωση). Όνομα, διεύθυνση, τηλέφωνο κ.λπ. ΔΕΝ
 *     αποθηκεύονται ούτε cache-άρονται — περνούν απευθείας στον admin.
 *   · Το audit γράφει area/category/page, ΟΧΙ αποτελέσματα.
 *
 * Κόστος: τα πεδία phone/website/rating ανεβάζουν το αίτημα σε «Text Search
 * Enterprise» (1.000 δωρεάν/μήνα, μετά $35/1000). Όριο ασφαλείας ανά μήνα
 * (PLACES_MONTHLY_LIMIT, προεπιλογή 900) — μετράει τις εγγραφές audit
 * 'places_search' από την 1η του τρέχοντος μήνα 00:00 UTC, ΠΡΙΝ την κλήση.
 *
 * Μεταβλητές περιβάλλοντος:
 *   GOOGLE_PLACES_API_KEY  — κλειδί API (χωρίς αυτό → 503)· ΠΟΤΕ στον client.
 *   PLACES_MONTHLY_LIMIT   — ακέραιος ≥ 0, προεπιλογή 900.
 *
 * Κατάσταση επαφής: app_settings, κλειδί `place_lead:<place_id>`, τιμή JSON
 * { status, note, category, area, updated_at, updated_by } — χωρίς αλλαγή σχήματος.
 */

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.googleMapsUri',
  'places.businessStatus', 'places.primaryType', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating',
  'places.userRatingCount', 'nextPageToken',
].join(',')
const PAGE_SIZE = 20
const TIMEOUT_MS = 10_000
const DEFAULT_MONTHLY_LIMIT = 900
const AUDIT_ACTION = 'places_search'
const LEAD_PREFIX = 'place_lead:'

interface Category { key: string; term: string; included_type: string | null }
/** Ο όρος μπαίνει στο textQuery: `${term} ${area}`. */
const CATEGORIES: Category[] = [
  { key: 'vet',         term: 'κτηνίατρος',             included_type: 'veterinary_care' },
  { key: 'pet_store',   term: 'pet shop',               included_type: 'pet_store' },
  { key: 'grooming',    term: 'κομμωτήριο σκύλων',      included_type: null },
  { key: 'boarding',    term: 'ξενοδοχείο κατοικιδίων', included_type: null },
  { key: 'training',    term: 'εκπαιδευτής σκύλων',     included_type: null },
  { key: 'pet_sitting', term: 'pet sitter',             included_type: null },
]
const CATEGORY_BY_KEY = new Map(CATEGORIES.map(c => [c.key, c]))

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'registered', 'not_interested'] as const
type LeadStatus = typeof LEAD_STATUSES[number]
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/
const PAGE_TOKEN_RE = /^[A-Za-z0-9_\-=.~+/]{1,2048}$/
const NOTE_MAX = 500
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/

interface Lead {
  status: LeadStatus
  note: string
  category: string | null
  area: string | null
  updated_at: string
  updated_by: string | null
}

function monthlyLimit(): number {
  const raw = process.env.PLACES_MONTHLY_LIMIT
  if (raw == null || raw.trim() === '') return DEFAULT_MONTHLY_LIMIT
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MONTHLY_LIMIT
}

/**
 * Αιτήματα προς Google αυτόν τον μήνα. Ε20: ο μήνας χρέωσης της Google
 * ακολουθεί ώρα Pacific (America/Los_Angeles) — η αρχή του υπολογίζεται εκεί,
 * ώστε ο μετρητής να μη μηδενίζεται νωρίτερα από τη χρέωση.
 */
function pacificMonthStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' })
    .formatToParts(now)
  const y = Number(parts.find(p => p.type === 'year')?.value)
  const m = Number(parts.find(p => p.type === 'month')?.value)
  // 1η του μήνα 00:00 Pacific: δοκιμή και των δύο μετατοπίσεων (PST −8 / PDT −7).
  for (const off of [7, 8]) {
    const cand = new Date(Date.UTC(y, m - 1, 1, off, 0, 0))
    const hh = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23', day: '2-digit' })
      .formatToParts(cand)
    if (hh.find(p => p.type === 'hour')?.value === '00' && hh.find(p => p.type === 'day')?.value === '01') return cand
  }
  return new Date(Date.UTC(y, m - 1, 1, 8, 0, 0))
}
async function monthRequests(): Promise<number> {
  return prisma.auditLog.count({ where: { action: AUDIT_ACTION, created_at: { gte: pacificMonthStart() } } })
}

/** Περιοχή: κενά συμπτυγμένα, 2–80 χαρακτήρες, χωρίς χαρακτήρες ελέγχου. */
function cleanArea(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  if (s.length < 2 || s.length > 80 || CONTROL_RE.test(s)) return null
  return s
}

const str = (v: unknown, max = 500): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : null
/** Μόνο http(s) — οτιδήποτε άλλο (javascript:, data:) → null. */
const httpUrl = (v: unknown): string | null => {
  const s = str(v, 2000)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch { return null }
}
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function parseLead(value: string): Lead | null {
  try {
    const o = JSON.parse(value)
    if (!o || typeof o !== 'object' || !(LEAD_STATUSES as readonly string[]).includes(o.status)) return null
    return {
      status: o.status,
      note: typeof o.note === 'string' ? o.note.slice(0, NOTE_MAX) : '',
      category: typeof o.category === 'string' && CATEGORY_BY_KEY.has(o.category) ? o.category : null,
      area: typeof o.area === 'string' ? o.area.slice(0, 80) : null,
      updated_at: typeof o.updated_at === 'string' ? o.updated_at : '',
      updated_by: typeof o.updated_by === 'string' ? o.updated_by : null,
    }
  } catch { return null }
}

const providerScanRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if (reply.sent) return reply
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  /** Κλειδί ορίου ανά χρήστη: id από επαληθευμένο JWT, αλλιώς IP (όπως index.ts userOrIpKey). */
  const userKey = (req: any): string => {
    const h = req.headers?.authorization
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
      try {
        const p: any = app.jwt.verify(h.slice(7))
        if (p?.id) return `u:${p.id}`
      } catch { /* άκυρο τοκεν → IP */ }
    }
    return `ip:${req.ip}`
  }

  // GET /categories — σταθερή λίστα (οι ετικέτες μεταφράζονται στο web) + χρήση μήνα.
  app.get('/categories', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store')
    return {
      data: CATEGORIES.map(c => ({ key: c.key, included_type: c.included_type })),
      usage: { month_requests: await monthRequests(), month_limit: monthlyLimit() },
      configured: !!process.env.GOOGLE_PLACES_API_KEY,
    }
  })

  // POST /search — Text Search (New). Τα αποτελέσματα ΔΕΝ αποθηκεύονται.
  app.post('/search', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: userKey } },
  }, async (req: any, reply) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return reply.code(503).send({ message: 'Η σάρωση παρόχων δεν έχει ρυθμιστεί (λείπει το κλειδί Google Places).' })
    }
    const b = req.body ?? {}
    const category = typeof b.category === 'string' ? CATEGORY_BY_KEY.get(b.category) : undefined
    if (!category) return reply.code(400).send({ message: 'Μη έγκυρη κατηγορία' })
    const area = cleanArea(b.area)
    if (!area) return reply.code(400).send({ message: 'Η περιοχή πρέπει να έχει 2 έως 80 χαρακτήρες' })
    let pageToken: string | null = null
    if (b.page_token != null && b.page_token !== '') {
      if (typeof b.page_token !== 'string' || !PAGE_TOKEN_RE.test(b.page_token)) {
        return reply.code(400).send({ message: 'Μη έγκυρη σελίδα αποτελεσμάτων' })
      }
      pageToken = b.page_token
    }

    const limit = monthlyLimit()
    const page = pageToken ? 'next' : 'first'
    // Ε20: ΚΡΑΤΗΣΗ πριν την κλήση (όπως το recordAiCall του ai.ts): η εγγραφή
    // γράφεται πρώτα και μετά μετράμε — ταυτόχρονα αιτήματα δεν περνούν όλα το
    // όριο, και καμία κλήση στη Google δεν μένει αμέτρητη. Αποτυχία εγγραφής → 503.
    const u = (req.user as any) ?? {}
    let reservation: { id: string; created_at: Date }
    try {
      reservation = await prisma.auditLog.create({
        data: {
          action: AUDIT_ACTION, resource: 'provider_scan', outcome: 'success', status_code: 200,
          actor_id: u.id ?? null, actor_email: u.email ?? null, actor_role: u.role ?? null,
          metadata: { category: category.key, area, page },
          ip: req.ip || null, user_agent: (req.headers?.['user-agent'] as string) ?? null,
          method: req.method ?? null, path: req.url ? String(req.url).slice(0, 300) : null,
        },
        select: { id: true, created_at: true },
      })
    } catch (err: any) {
      console.error('[provider-scan] reservation failed:', err?.message ?? err)
      return reply.code(503).send({ message: 'Η αναζήτηση στο Google Maps απέτυχε. Δοκίμασε ξανά σε λίγο.' })
    }
    const position = await prisma.auditLog.count({
      where: {
        action: AUDIT_ACTION, created_at: { gte: pacificMonthStart() },
        OR: [
          { created_at: { lt: reservation.created_at } },
          { created_at: reservation.created_at, id: { lte: reservation.id } },
        ],
      },
    })
    if (position > limit) {
      await prisma.auditLog.delete({ where: { id: reservation.id } }).catch(() => {})
      return reply.code(429).send({
        message: 'Συμπληρώθηκε το μηνιαίο όριο αναζητήσεων Google. Δοκίμασε ξανά τον επόμενο μήνα ή αύξησε το όριο.',
        usage: { month_requests: position - 1, month_limit: limit },
      })
    }

    // pageToken: όλες οι άλλες παράμετροι ΙΔΙΕΣ με το προηγούμενο αίτημα —
    // το σώμα χτίζεται πάντα με τον ίδιο τρόπο από category + area.
    const body: Record<string, unknown> = {
      textQuery: `${category.term} ${area}`,
      languageCode: 'el',
      regionCode: 'GR',
      pageSize: PAGE_SIZE,
    }
    if (category.included_type) {
      body.includedType = category.included_type
      body.strictTypeFiltering = true
    }
    if (pageToken) body.pageToken = pageToken

    let json: any = null
    let failure: { code: number; message: string; log: string } | null = null
    try {
      const res = await fetch(PLACES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        failure = {
          code: res.status === 400 && pageToken ? 400 : 502,
          message: res.status === 400 && pageToken
            ? 'Η επόμενη σελίδα δεν είναι πια διαθέσιμη. Κάνε ξανά αναζήτηση.'
            : 'Η αναζήτηση στο Google Maps απέτυχε. Δοκίμασε ξανά σε λίγο.',
          log: `HTTP ${res.status}: ${text.slice(0, 600)}`,
        }
      } else {
        json = await res.json()
      }
    } catch (err: any) {
      const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      failure = {
        code: timeout ? 504 : 502,
        message: timeout
          ? 'Το Google Maps δεν απάντησε εγκαίρως. Δοκίμασε ξανά.'
          : 'Η αναζήτηση στο Google Maps απέτυχε. Δοκίμασε ξανά σε λίγο.',
        log: String(err?.message ?? err),
      }
    }

    // Κάθε κλήση (επιτυχής ή όχι) μετράει στο μηνιαίο όριο — συντηρητικά·
    // η εγγραφή υπάρχει ήδη (κράτηση), εδώ μόνο το αποτέλεσμα.
    if (failure) {
      await prisma.auditLog.update({
        where: { id: reservation.id },
        data: { outcome: 'error', status_code: failure.code, error_message: failure.message.slice(0, 500) },
      }).catch(() => {})
    }

    if (failure) {
      // Ποτέ το κλειδί ή το ωμό σφάλμα της Google στον client — μόνο στα logs.
      console.error(`[provider-scan] Places searchText failed (${category.key}, page=${page}): ${failure.log}`)
      return reply.code(failure.code).send({ message: failure.message })
    }

    const places: any[] = Array.isArray(json?.places) ? json.places : []
    const results = places
      .map(p => ({
        place_id: typeof p?.id === 'string' && PLACE_ID_RE.test(p.id) ? p.id : null,
        name: str(p?.displayName?.text, 300),
        address: str(p?.formattedAddress, 500),
        phone: str(p?.nationalPhoneNumber, 50),
        international_phone: str(p?.internationalPhoneNumber, 50),
        website: httpUrl(p?.websiteUri),
        rating: num(p?.rating),
        ratings_count: num(p?.userRatingCount),
        maps_url: (() => { const u = httpUrl(p?.googleMapsUri); return u && u.startsWith('https://') ? u : null })(),
        business_status: str(p?.businessStatus, 50),
        primary_type: str(p?.primaryType, 100),
      }))
      .filter((r): r is typeof r & { place_id: string } => !!r.place_id)

    // Δικά μας δεδομένα επαφής για τα place_id της σελίδας.
    const keys = results.map(r => LEAD_PREFIX + r.place_id)
    const rows = keys.length ? await prisma.appSetting.findMany({ where: { key: { in: keys } } }) : []
    const leads = new Map<string, Lead>()
    for (const row of rows) {
      const l = parseLead(row.value)
      if (l) leads.set(row.key.slice(LEAD_PREFIX.length), l)
    }

    const nextToken = typeof json?.nextPageToken === 'string' && PAGE_TOKEN_RE.test(json.nextPageToken) ? json.nextPageToken : null
    reply.header('Cache-Control', 'no-store')
    return {
      data: {
        results: results.map(r => {
          const l = leads.get(r.place_id)
          return { ...r, lead: l ? { status: l.status, note: l.note, updated_at: l.updated_at } : null }
        }),
        next_page_token: nextToken,
      },
      usage: { month_requests: position, month_limit: limit },
    }
  })

  // GET /leads — μόνο place_id + δικά μας δεδομένα (κανένα δεδομένο Google).
  app.get('/leads', async (_req, reply) => {
    const rows = await prisma.appSetting.findMany({
      where: { key: { startsWith: LEAD_PREFIX } },
      orderBy: { updated_at: 'desc' },
      take: 1000,
    })
    const data = rows.flatMap(row => {
      const place_id = row.key.slice(LEAD_PREFIX.length)
      const l = parseLead(row.value)
      return l && PLACE_ID_RE.test(place_id) ? [{ place_id, ...l }] : []
    })
    reply.header('Cache-Control', 'no-store')
    return { data }
  })

  // PUT /leads/:placeId — κατάσταση/σημείωση επαφής.
  app.put('/leads/:placeId', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute', keyGenerator: userKey } },
  }, async (req: any, reply) => {
    const placeId = String(req.params?.placeId ?? '')
    if (!PLACE_ID_RE.test(placeId)) return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό τοποθεσίας' })
    const b = req.body ?? {}
    if (!(LEAD_STATUSES as readonly string[]).includes(b.status)) {
      return reply.code(400).send({ message: 'Μη έγκυρη κατάσταση επαφής' })
    }
    if (b.note != null && typeof b.note !== 'string') return reply.code(400).send({ message: 'Μη έγκυρα δεδομένα' })
    const note = typeof b.note === 'string' ? b.note.trim() : undefined
    if (note !== undefined && note.length > NOTE_MAX) {
      return reply.code(400).send({ message: 'Η σημείωση μπορεί να έχει έως 500 χαρακτήρες' })
    }
    if (b.category != null && !(typeof b.category === 'string' && CATEGORY_BY_KEY.has(b.category))) {
      return reply.code(400).send({ message: 'Μη έγκυρη κατηγορία' })
    }
    let area: string | null | undefined
    if (b.area != null && b.area !== '') {
      area = cleanArea(b.area)
      if (!area) return reply.code(400).send({ message: 'Η περιοχή πρέπει να έχει 2 έως 80 χαρακτήρες' })
    }

    const key = LEAD_PREFIX + placeId
    const prevRow = await prisma.appSetting.findUnique({ where: { key } })
    const prev = prevRow ? parseLead(prevRow.value) : null
    const lead: Lead = {
      status: b.status,
      note: note ?? prev?.note ?? '',
      category: (typeof b.category === 'string' ? b.category : null) ?? prev?.category ?? null,
      area: area ?? prev?.area ?? null,
      updated_at: new Date().toISOString(),
      updated_by: (req.user as any)?.email ?? (req.user as any)?.id ?? null,
    }
    const value = JSON.stringify(lead)
    await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    await audit(req, {
      action: 'place_lead_update',
      resource: 'provider_scan',
      resource_id: placeId,
      metadata: { before: prev?.status ?? null, after: lead.status },
    })
    return { data: { place_id: placeId, ...lead } }
  })
}

export default providerScanRoutes
