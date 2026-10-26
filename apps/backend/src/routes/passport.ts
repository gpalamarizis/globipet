import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Strip fields that decide who a medical record belongs to.
 *
 * Every update below already verifies the caller owns the record, but the
 * bodies were passed through untouched — so an owner could move a vaccination
 * or lab result onto a different pet, or rewrite owner_email and hand the row
 * to someone else. Identity is set once at creation and stays put.
 */
function sanitizeMedicalUpdate(body: any) {
  const { id, pet_id, owner_email, created_at, updated_at, ...rest } = (body ?? {}) as any
  return rest
}

/**
 * Πρόσβαση κτηνιάτρου που δεν έχει λήξει. Ο ιδιοκτήτης ορίζει «Λήξη
 * πρόσβασης», αλλά κανένας έλεγχος δεν κοιτούσε το expires_at: η πρόσβαση
 * ίσχυε για πάντα. Χωρίς λήξη (null) = μέχρι ανάκληση, όπως πριν.
 */
function accessNotExpired() {
  return { OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] }
}

/** Μήνυμα 403 όταν υπάρχει πρόσβαση κτηνιάτρου αλλά το email δεν έχει επιβεβαιωθεί. */
export const VET_VERIFY_EMAIL_MSG = 'Επιβεβαίωσε πρώτα το email σου για να δεις τον ιατρικό φάκελο που σου κοινοποιήθηκε.'

/** Κανονική μορφή του email παρόχου: χωρίς κενά, πεζά. */
export function normProviderEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

/** Οι γραμμές πρόσβασης ταιριάζουν με το email χωρίς διάκριση πεζών/κεφαλαίων (παλιές γραμμές μπορεί να είναι μικτές). */
export function providerEmailIs(email: string) {
  return { equals: String(email ?? '').trim(), mode: 'insensitive' as const }
}

/** Το email του χρήστη έχει επιβεβαιωθεί; Διαβάζεται από τη βάση, όχι από το JWT. */
export async function isEmailVerified(userId: string | undefined, email: string | undefined): Promise<boolean> {
  const where = userId ? { id: String(userId) } : email ? { email: String(email) } : null
  if (!where) return false
  const u = await prisma.user.findUnique({ where: where as any, select: { email_verified_at: true } })
  return !!u?.email_verified_at
}

/**
 * Πρόσβαση κτηνιάτρου/παρόχου στον φάκελο ενός ζώου.
 *
 *   Η γραμμή πρόσβασης ταιριάζει με το email του token. Όμως το POST
 *   /auth/register δίνει token ΠΡΙΝ την επιβεβαίωση του email, οπότε όποιος
 *   έκανε εγγραφή με το email ενός κτηνιάτρου έπαιρνε τον ιατρικό φάκελο.
 *   Τώρα χρειάζεται και επιβεβαιωμένο email (email_verified_at από τη βάση).
 *
 *   'ok' = εγκεκριμένη, μη ληγμένη πρόσβαση + επιβεβαιωμένο email
 *   'unverified' = υπάρχει πρόσβαση αλλά το email δεν έχει επιβεβαιωθεί
 *   null = καμία πρόσβαση
 */
export async function vetPassportAccess(petId: string, email: string | undefined, userId?: string): Promise<'ok' | 'unverified' | null> {
  if (!email || !petId) return null
  const row = await prisma.petPassportAccess.findFirst({
    where: { pet_id: petId, provider_email: providerEmailIs(email), status: 'approved', ...accessNotExpired() },
    select: { id: true },
  })
  if (!row) return null
  return (await isEmailVerified(userId, email)) ? 'ok' : 'unverified'
}

const routes: FastifyPluginAsync = async (app) => {

  // ─── HELPERS ──────────────────────────────────────────────────────
  async function assertPetOwner(petId: string, email: string) {
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) throw { statusCode: 404, message: 'Κατοικίδιο δεν βρέθηκε' }
    if (pet.owner_email !== email) throw { statusCode: 403, message: 'Δεν έχετε δικαίωμα' }
    return pet
  }

  /**
   * ΚΡΙΣΙΜΟ — τα πεδία που ορίζει ο ΔΙΑΚΟΜΙΣΤΗΣ δεν επιτρέπεται να
   * υπερισχύσουν από το σώμα του αιτήματος.
   *
   *   Οι εγγραφές γράφονταν ως:
   *
   *     data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any
   *
   *   Στη JavaScript το τελευταίο κλειδί κερδίζει, οπότε το spread ΣΒΗΝΕ τα
   *   δύο προηγούμενα. Ο έλεγχος ιδιοκτησίας γινόταν στο ζώο του URL, αλλά
   *   η εγγραφή πήγαινε σε όποιο ζώο έγραφε ο πελάτης στο σώμα:
   *
   *     POST /passport/medication/<δικό-μου-ζώο>
   *     { "name": "...", "pet_id": "<ζώο-άλλου>" }
   *
   *   Το ίδιο και με το owner_email: μπορούσε να αποδώσει ιατρική εγγραφή
   *   σε τρίτο πρόσωπο.
   *
   *   Τώρα το σώμα καθαρίζεται από τα πεδία που ανήκουν στον διακομιστή και
   *   μπαίνει ΠΡΩΤΟ, ώστε να μην μπορεί να τα πατήσει.
   */
  /**
   * Όρια τιμών στον ιατρικό φάκελο.
   *
   *   Τα endpoints έπαιρναν κάθε πεδίο χωρίς όριο. Το Prisma απορρίπτει
   *   λάθος τύπους, αλλά δέχεται χαρά ένα όνομα φαρμάκου ενός μεγαβάιτ ή
   *   σημειώσεις που γεμίζουν τη στήλη. Δεν είναι παραβίαση ασφαλείας —
   *   είναι τρόπος να φουσκώσει η βάση και να σπάσουν οι οθόνες.
   *
   *   Κόβουμε αντί να απορρίπτουμε: μια ιατρική εγγραφή που χάνεται επειδή
   *   το πεδίο ήταν δύο χαρακτήρες πάνω από το όριο είναι χειρότερη από μια
   *   που αποθηκεύτηκε κομμένη.
   */
  const MAX_TEXT = 2000
  const MAX_SHORT = 255
  const SHORT_FIELDS = ['name', 'title', 'type', 'brand', 'dosage', 'frequency',
    'unit', 'result', 'severity', 'status', 'veterinarian', 'clinic', 'lab']

  function clampStrings(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') {
        out[k] = v.trim().slice(0, SHORT_FIELDS.includes(k) ? MAX_SHORT : MAX_TEXT)
      } else if (Array.isArray(v)) {
        // Οι λίστες αρχείων και ευρημάτων: το πολύ 50 στοιχεία, κάθε ένα
        // σύντομο. Χωρίς όριο, μια λίστα χιλίων URL περνάει αυτούσια.
        out[k] = v.slice(0, 50).map(x => typeof x === 'string' ? x.trim().slice(0, 1000) : x)
      } else {
        out[k] = v
      }
    }
    return out
  }

  function bodyOf(raw: unknown): Record<string, any> {
    // Ο τύπος επιστροφής είναι χαλαρός, γι' αυτό κάθε κλήση Prisma παρακάτω
    // φέρει `as any`: ο client έχει αυστηρό τύπο ανά μοντέλο και το spread
    // ενός γενικού αντικειμένου σβήνει την πληροφορία των υποχρεωτικών
    // πεδίων. Ο έλεγχος τιμών παραμένει — τον κάνει το Prisma στην εκτέλεση.
    const { id, pet_id, owner_email, created_at, updated_at, ...rest } =
      (raw ?? {}) as Record<string, any>
    return clampStrings(rest)
  }

  // ─── GET FULL PASSPORT ────────────────────────────────────────────
  app.get('/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    // Owner or approved vet can view
    const access = pet.owner_email === email ? 'ok' : await vetPassportAccess(petId, email, (req.user as any)?.id)
    if (access === 'unverified') return reply.code(403).send({ message: VET_VERIFY_EMAIL_MSG })
    if (access !== 'ok') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const [vaccinations, healthRecords, pedigree, travelDocs,
           medications, labResults, imaging, surgeries, allergies,
           chronicConditions, dentalRecords, weightRecords, geneticTests,
           vitalSigns, accessList] = await Promise.all([
      prisma.vaccination.findMany({ where: { pet_id: petId }, orderBy: { date_administered: 'desc' } }),
      prisma.healthRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petPedigree.findUnique({ where: { pet_id: petId } }),
      prisma.petTravelDocument.findMany({ where: { pet_id: petId }, orderBy: { departure_date: 'desc' } }),
      prisma.petMedication.findMany({ where: { pet_id: petId }, orderBy: { start_date: 'desc' } }),
      prisma.petLabResult.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petImaging.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petSurgery.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petAllergy.findMany({ where: { pet_id: petId }, orderBy: { created_at: 'desc' } }),
      prisma.petChronicCondition.findMany({ where: { pet_id: petId }, orderBy: { diagnosed_date: 'desc' } }),
      prisma.petDentalRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petWeightRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'asc' } }),
      prisma.petGeneticTest.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petVitalSigns.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      pet.owner_email === email ? prisma.petPassportAccess.findMany({ where: { pet_id: petId } }) : [],
    ])

    return {
      pet, vaccinations, healthRecords, pedigree, travelDocs,
      medications, labResults, imaging, surgeries, allergies,
      chronicConditions, dentalRecords, weightRecords, geneticTests,
      vitalSigns, accessList,
    }
  })

  // ─── PDF EXPORT ──────────────────────────────────────────────────
  /**
   * Βραχύβιος υπογεγραμμένος σύνδεσμος για το έγγραφο εκτύπωσης.
   *
   * ΓΙΑΤΙ
   *   Το έγγραφο ανοίγει σε νέα καρτέλα (web) ή στον browser του κινητού.
   *   Εκεί δεν υπάρχει κεφαλίδα Authorization, οπότε ένας απλός σύνδεσμος
   *   έπαιρνε 401. Ο client ζητά πρώτα (με τη σύνδεσή του) έναν σύνδεσμο που
   *   ισχύει 5 λεπτά για ΕΝΑ ζώο και ΕΝΑΝ χρήστη.
   *
   *   Το token ΔΕΝ είναι JWT: με JWT θα γινόταν δεκτό και ως κανονική
   *   σύνδεση σε κάθε άλλο endpoint. Είναι HMAC-SHA256 με το JWT_SECRET και
   *   δικό του πρόθεμα σκοπού, οπότε ισχύει μόνο εδώ.
   */
  const PDF_TTL_MS = 5 * 60 * 1000
  const pdfSecret = () => process.env.JWT_SECRET || 'dev-secret-min-32-chars-here!!'
  const pdfSig = (payload: string) =>
    createHmac('sha256', pdfSecret()).update(`passport-pdf|${payload}`).digest('base64url')
  // Στο token μπαίνει το id του χρήστη, όχι το email: το URL καταγράφεται σε
  // logs (proxy, Railway) και δεν θέλουμε εκεί προσωπικά δεδομένα.
  function signPdfToken(petId: string, userId: string): string {
    const payload = Buffer.from(JSON.stringify({ p: petId, u: userId, x: Date.now() + PDF_TTL_MS })).toString('base64url')
    return `${payload}.${pdfSig(payload)}`
  }
  /** Το id του χρήστη αν το token είναι έγκυρο, μη ληγμένο και για αυτό το ζώο. */
  function verifyPdfToken(token: string, petId: string): string | null {
    const [payload, sig] = String(token).split('.')
    if (!payload || !sig) return null
    const want = Buffer.from(pdfSig(payload))
    const got = Buffer.from(sig)
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null
    try {
      const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
      if (d?.p !== petId || typeof d?.u !== 'string' || !(Number(d?.x) > Date.now())) return null
      return d.u
    } catch { return null }
  }

  app.post('/:petId/pdf-link', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, id: userId } = req.user as any
    const { petId } = req.params as any
    const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { owner_email: true } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const access = pet.owner_email === email ? 'ok' : await vetPassportAccess(petId, email, userId)
    if (access === 'unverified') return reply.code(403).send({ message: VET_VERIFY_EMAIL_MSG })
    if (access !== 'ok') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const path = `/passport/${encodeURIComponent(petId)}/pdf?t=${signPdfToken(petId, String(userId))}`
    const base = process.env.PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api'
    // path: σχετικό με τη βάση του api του client (που ξέρει τη δική του)· url: πλήρες.
    return { path, url: `${base}${path}`, expires_in: PDF_TTL_MS / 1000 }
  })

  app.get('/:petId/pdf', async (req: any, reply) => {
    const { petId } = req.params as any
    // Δύο τρόποι: υπογεγραμμένος σύνδεσμος (?t=) ή κανονική σύνδεση (Bearer).
    let email: string
    let pdfUserId: string | undefined
    const t = (req.query as any)?.t
    if (t) {
      const userId = verifyPdfToken(String(t), petId)
      const owner = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
        : null
      if (!owner) return reply.code(401).send({ message: 'Ο σύνδεσμος έληξε. Πάτησε ξανά «Εξαγωγή PDF».' })
      // Η πρόσβαση ξαναελέγχεται παρακάτω (μπορεί να ανακλήθηκε στο μεταξύ).
      email = owner.email
      pdfUserId = userId!
    } else {
      await (app as any).authenticate(req, reply)
      if (reply.sent) return reply
      email = (req.user as any).email
      pdfUserId = (req.user as any).id
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const access = pet.owner_email === email ? 'ok' : await vetPassportAccess(petId, email, pdfUserId)
    if (access === 'unverified') return reply.code(403).send({ message: VET_VERIFY_EMAIL_MSG })
    if (access !== 'ok') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const [vaccinations, healthRecords, medications, labResults, imaging, surgeries, allergies, chronicConditions, dentalRecords, weightRecords] = await Promise.all([
      prisma.vaccination.findMany({ where: { pet_id: petId }, orderBy: { date_administered: 'desc' } }),
      prisma.healthRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petMedication.findMany({ where: { pet_id: petId }, orderBy: { start_date: 'desc' } }),
      prisma.petLabResult.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petImaging.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petSurgery.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petAllergy.findMany({ where: { pet_id: petId } }),
      prisma.petChronicCondition.findMany({ where: { pet_id: petId } }),
      prisma.petDentalRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petWeightRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'asc' } }),
    ])

    // Κάθε τιμή από τη βάση/τον χρήστη περνά από escape πριν μπει στο HTML (αποτροπή stored XSS).
    const esc = (v: unknown) => v == null ? '' : String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    // Κωδικοί της βάσης → ελληνικές ετικέτες, ίδιες με τα el κείμενα του web
    // (web/src/lib/i18n.ts: pgPassport.*, cmpAddPet.species.*, pets.male/female).
    // Άγνωστη τιμή → η ωμή τιμή. Το αποτέλεσμα περνά πάντα από esc.
    const EL_LABELS: Record<string, Record<string, string>> = {
      species: { dog: 'Σκύλος', cat: 'Γάτα', bird: 'Πτηνό', rabbit: 'Κουνέλι', fish: 'Ψάρι', reptile: 'Ερπετό', horse: 'Άλογο', other: 'Άλλο' },
      gender: { male: 'Αρσενικό', female: 'Θηλυκό' },
      vacType: { core: 'Core', non_core: 'Non-Core', rabies: 'Λύσσα', other: 'Άλλο' },
      labType: {
        blood_count: 'Αιματολογικό', biochemistry: 'Βιοχημικός Έλεγχος', urine: 'Ούρων', fecal: 'Κοπράνων',
        biopsy: 'Βιοψία', culture: 'Καλλιέργεια', hormone: 'Ορμόνες', serology: 'Ορολογία', other: 'Άλλο',
      },
      imgType: {
        xray: 'Ακτινογραφία (X-Ray)', ultrasound: 'Υπερηχογράφημα', ct: 'CT Scan', mri: 'MRI',
        endoscopy: 'Ενδοσκόπηση', echocardiogram: 'Ηχοκαρδιογράφημα', other: 'Άλλο',
      },
      severity: { mild: 'Ήπια', moderate: 'Μέτρια', severe: 'Σοβαρή', anaphylactic: 'Αναφυλακτική' },
      dentalProc: { cleaning: 'Καθαρισμός', extraction: 'Εξαγωγή', xray: 'Ακτινογραφία Δοντιών', root_canal: 'Ριζοθεραπεία', other: 'Άλλο' },
    }
    const lbl = (group: string, v: unknown): unknown =>
      v == null || v === '' ? v : (EL_LABELS[group]?.[String(v)] ?? v)
    const section = (title: string, rows: string) => rows ? `<h2>${title}</h2><table>${rows}</table>` : ''
    const row = (label: string, val: any) => val ? `<tr><td>${esc(label)}</td><td>${esc(val)}</td></tr>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ιατρικός Φάκελος - ${esc(pet.name)}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:900px;margin:0 auto}
  h1{color:#E65100;border-bottom:3px solid #E65100;padding-bottom:8px;margin-bottom:16px}
  h2{color:#333;border-left:4px solid #E65100;padding-left:8px;margin-top:24px;margin-bottom:8px;font-size:14px;text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th{background:#E65100;color:white;padding:6px 8px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}
  tr:nth-child(even){background:#fafafa}
  .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:24px}
  .pet-info{font-size:13px;line-height:1.8}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold}
  .badge-red{background:#fee2e2;color:#dc2626}
  .badge-yellow{background:#fef9c3;color:#ca8a04}
  .badge-green{background:#dcfce7;color:#16a34a}
  .footer{margin-top:40px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px;text-align:center}
  @media print{body{padding:0} @page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div>
    <h1>🐾 Ιατρικός Φάκελος</h1>
    <div class="pet-info">
      <strong>${esc(pet.name)}</strong> &nbsp;|&nbsp; ${esc(lbl('species', pet.species) || '')} ${esc(pet.breed || '')}<br>
      Ηλικία: ${pet.age != null ? esc(pet.age) + ' έτη' : 'Άγνωστη'} &nbsp;|&nbsp; Φύλο: ${esc(lbl('gender', pet.gender) || '-')}<br>
      Αρ. Μικροτσίπ: ${esc(pet.microchip_number || '-')}<br>
      Ιδιοκτήτης: ${esc(pet.owner_email)}
    </div>
  </div>
  <div style="text-align:right;font-size:10px;color:#999">
    Εκτυπώθηκε: ${new Date().toLocaleDateString('el-GR')}<br>
    GlobiPet · globipet.com
  </div>
</div>

${allergies.length ? `<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:10px;margin-bottom:16px">
  <strong>⚠️ ΑΛΛΕΡΓΙΕΣ:</strong> ${allergies.map(a => `${esc(a.allergen)} (${esc(lbl('severity', a.severity))})`).join(', ')}
</div>` : ''}

${chronicConditions.length ? `<div style="background:#fef9c3;border:2px solid #ca8a04;border-radius:8px;padding:10px;margin-bottom:16px">
  <strong>📋 ΧΡΟΝΙΕΣ ΠΑΘΗΣΕΙΣ:</strong> ${chronicConditions.filter(c => c.status === 'active').map(c => esc(c.condition)).join(', ')}
</div>` : ''}

${section('Εμβόλια', vaccinations.map(v => `<tr>
  <td>${esc(v.date_administered)}</td><td>${esc(v.vaccine_name)}</td><td>${esc(lbl('vacType', v.vaccine_type))}</td>
  <td>${esc(v.vet_name || '-')}</td><td>${esc(v.next_due_date || '-')}</td>
</tr>`).join(''))}

${section('Φάρμακα', medications.map(m => `<tr>
  <td>${esc(m.name)} ${esc(m.dosage)}</td><td>${esc(m.frequency)}</td><td>${esc(m.start_date)}→${esc(m.end_date || 'τώρα')}</td>
  <td>${esc(m.prescribed_by || '-')}</td><td>${m.is_active ? '✅ Ενεργό' : '⬛ Ολοκλήρωσε'}</td>
</tr>`).join(''))}

${section('Εξετάσεις', healthRecords.map(h => `<tr>
  <td>${esc(h.date)}</td><td>${esc(h.title)}</td><td>${esc(h.vet_name || '-')}</td>
  <td>${esc(h.clinic_name || '-')}</td><td>${esc(h.description?.slice(0, 100) || '-')}</td>
</tr>`).join(''))}

${section('Εργαστηριακές Εξετάσεις', labResults.map(l => `<tr>
  <td>${esc(l.date)}</td><td>${esc(l.title)}</td><td>${esc(lbl('labType', l.result_type))}</td>
  <td>${esc(l.vet_name || '-')}</td><td>${l.is_abnormal ? '⚠️ Παθολογικά' : '✅ Φυσιολογικά'}</td>
</tr>`).join(''))}

${section('Απεικονιστικές Εξετάσεις', imaging.map(i => `<tr>
  <td>${esc(i.date)}</td><td>${esc(EL_LABELS.imgType[i.imaging_type] ?? i.imaging_type.toUpperCase())}</td><td>${esc(i.body_region || '-')}</td>
  <td>${esc(i.vet_name || '-')}</td><td>${esc(i.findings?.slice(0, 100) || '-')}</td>
</tr>`).join(''))}

${section('Χειρουργεία', surgeries.map(s => `<tr>
  <td>${esc(s.date)}</td><td>${esc(s.procedure)}</td><td>${esc(s.surgeon_name || '-')}</td>
  <td>${esc(s.clinic_name || '-')}</td><td>${esc(s.outcome || '-')}</td>
</tr>`).join(''))}

${section('Οδοντιατρικά', dentalRecords.map(d => `<tr>
  <td>${esc(d.date)}</td><td>${esc(lbl('dentalProc', d.procedure))}</td><td>${esc(d.vet_name || '-')}</td>
  <td>${esc(d.findings || '-')}</td><td>${esc(d.next_due || '-')}</td>
</tr>`).join(''))}

${section('Ιστορικό Βάρους', weightRecords.map(w => `<tr>
  <td>${esc(w.date)}</td><td>${esc(w.weight_kg)} kg</td><td>BCS: ${esc(w.bcs || '-')}/9</td><td>${esc(w.notes || '-')}</td>
</tr>`).join(''))}

<div class="footer">
  Αυτό το έγγραφο δημιουργήθηκε αυτόματα από το GlobiPet (globipet.com).<br>
  Για επαλήθευση επικοινωνήστε με τον ιδιοκτήτη του ζώου.
</div>
</body></html>`

    reply.header('Content-Type', 'text/html; charset=utf-8')
    // Ιατρικά δεδομένα: χωρίς cache, χωρίς Referer (το URL έχει το token),
    // και χωρίς κανένα script — το έγγραφο είναι μόνο κείμενο και στυλ.
    reply.header('Cache-Control', 'no-store')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('X-Robots-Tag', 'noindex')
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:")
    return reply.send(html)
  })

  // ─── VACCINATIONS ────────────────────────────────────────────────
  app.post('/vaccination/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const { vaccine_name, vaccine_type, date_administered, next_due_date, vet_name, clinic_name, batch_number, notes } = req.body as any
    if (!vaccine_name || !date_administered) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const vac = await prisma.vaccination.create({
      data: { pet_id: req.params.petId, owner_email: email, vaccine_name, vaccine_type: vaccine_type || 'other', date_administered, next_due_date, vet_name, notes }
    })
    return reply.code(201).send(vac)
  })

  app.patch('/vaccination/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.vaccination.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.vaccination.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/vaccination/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.vaccination.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.vaccination.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── HEALTH RECORDS ──────────────────────────────────────────────
  app.post('/health/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const { record_type, title, description, date, vet_name, clinic_name, cost, next_appointment } = req.body as any
    if (!title || !date) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const record = await prisma.healthRecord.create({
      data: { pet_id: req.params.petId, owner_email: email, record_type: record_type || 'examination', title, description: description || '', date, vet_name, clinic_name, cost, next_appointment, attachments: [] }
    })
    return reply.code(201).send(record)
  })

  app.patch('/health/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.healthRecord.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/health/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.healthRecord.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── PEDIGREE ────────────────────────────────────────────────────
  app.put('/pedigree/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const data = req.body as any
    return prisma.petPedigree.upsert({
      where: { pet_id: req.params.petId },
      create: { ...bodyOf(data), certifications: data.certifications || [], pet_id: req.params.petId, owner_email: email } as any,
      update: { ...bodyOf(data), certifications: data.certifications || [] } as any,
    })
  })

  // ─── TRAVEL ──────────────────────────────────────────────────────
  app.post('/travel/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const { travel_type, origin_city, destination_city, destination_country, departure_date, return_date, carrier, booking_ref, notes } = req.body as any
    if (!travel_type || !destination_city || !departure_date) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    return reply.code(201).send(await prisma.petTravelDocument.create({
      data: { pet_id: req.params.petId, owner_email: email, travel_type, origin_city, destination_city, destination_country, departure_date, return_date, carrier, booking_ref, notes }
    }))
  })

  app.delete('/travel/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const doc = await prisma.petTravelDocument.findUnique({ where: { id: req.params.id } })
    if (!doc || doc.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petTravelDocument.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── MEDICATIONS ─────────────────────────────────────────────────
  app.post('/medication/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petMedication.create({ data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.patch('/medication/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petMedication.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petMedication.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/medication/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petMedication.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petMedication.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── LAB RESULTS ─────────────────────────────────────────────────
  app.post('/lab/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petLabResult.create({ data: { file_urls: [], ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.patch('/lab/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petLabResult.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petLabResult.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/lab/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petLabResult.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petLabResult.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── IMAGING ─────────────────────────────────────────────────────
  app.post('/imaging/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petImaging.create({ data: { file_urls: [], ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.patch('/imaging/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petImaging.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petImaging.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/imaging/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petImaging.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petImaging.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── SURGERIES ───────────────────────────────────────────────────
  app.post('/surgery/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petSurgery.create({ data: { file_urls: [], ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.patch('/surgery/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petSurgery.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petSurgery.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/surgery/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petSurgery.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petSurgery.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── ALLERGIES ───────────────────────────────────────────────────
  app.post('/allergy/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petAllergy.create({ data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.delete('/allergy/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petAllergy.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petAllergy.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── CHRONIC CONDITIONS ──────────────────────────────────────────
  app.post('/chronic/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petChronicCondition.create({ data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.patch('/chronic/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petChronicCondition.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petChronicCondition.update({ where: { id: req.params.id }, data: sanitizeMedicalUpdate(req.body) })
  })

  app.delete('/chronic/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petChronicCondition.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petChronicCondition.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── DENTAL ──────────────────────────────────────────────────────
  app.post('/dental/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petDentalRecord.create({ data: { file_urls: [], ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.delete('/dental/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petDentalRecord.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petDentalRecord.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── WEIGHT ──────────────────────────────────────────────────────
  app.post('/weight/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petWeightRecord.create({ data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.delete('/weight/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petWeightRecord.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petWeightRecord.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── GENETIC TESTS ───────────────────────────────────────────────
  app.post('/genetic/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petGeneticTest.create({ data: { breeds_detected: [], conditions_found: [], file_urls: [], ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.delete('/genetic/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petGeneticTest.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petGeneticTest.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── VITAL SIGNS ─────────────────────────────────────────────────
  app.post('/vitals/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    return reply.code(201).send(await prisma.petVitalSigns.create({ data: { ...bodyOf(req.body), pet_id: req.params.petId, owner_email: email } as any }))
  })

  app.delete('/vitals/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petVitalSigns.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petVitalSigns.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // ─── ACCESS MANAGEMENT ───────────────────────────────────────────
  app.get('/access/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const list = await prisma.petPassportAccess.findMany({ where: { pet_id: req.params.petId }, orderBy: { created_at: 'desc' } })
    return reply.send({ data: list })
  })

  app.post('/access/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await assertPetOwner(req.params.petId, email).catch(e => { throw { statusCode: e.statusCode, message: e.message } })
    const { provider_name, reason, expires_at } = req.body as any
    // Πεζά/χωρίς κενά: η πρόσβαση ελέγχεται με το email του λογαριασμού, που
    // αποθηκεύεται πεζό. «Vet@Clinic.gr» δεν θα ταίριαζε ποτέ.
    const provider_email = normProviderEmail((req.body as any)?.provider_email)
    if (!provider_email) return reply.code(400).send({ message: 'Λείπει το email παρόχου' })
    // Μη έγκυρη ημερομηνία έδινε Invalid Date → 500 από το Prisma.
    if (expires_at && Number.isNaN(new Date(expires_at).getTime())) {
      return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία λήξης' })
    }
    const update = { status: 'approved', granted_at: new Date(), reason, expires_at: expires_at ? new Date(expires_at) : null }
    // Παλιές γραμμές μπορεί να έχουν μικτά κεφαλαία: ανανεώνεται η υπάρχουσα
    // (προτιμάται η ήδη πεζή) αντί να γράφεται δεύτερη για τον ίδιο πάροχο.
    const existing = await prisma.petPassportAccess.findMany({
      where: { pet_id: req.params.petId, provider_email: providerEmailIs(provider_email) },
      select: { id: true, provider_email: true },
    })
    const hit = existing.find(a => a.provider_email === provider_email) ?? existing[0]
    const access = hit
      ? await prisma.petPassportAccess.update({ where: { id: hit.id }, data: update })
      : await prisma.petPassportAccess.upsert({
          where: { pet_id_provider_email: { pet_id: req.params.petId, provider_email } },
          create: { pet_id: req.params.petId, owner_email: email, provider_email, provider_name: provider_name || provider_email, ...update },
          update,
        })
    return reply.code(201).send(access)
  })

  app.delete('/access/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petPassportAccess.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petPassportAccess.update({ where: { id: req.params.id }, data: { status: 'revoked' } })
    return reply.code(204).send()
  })

  // Provider: see which pets I have approved access to
  app.get('/my-patients', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, id } = req.user as any
    const accesses = await prisma.petPassportAccess.findMany({
      where: { provider_email: providerEmailIs(email), status: 'approved', ...accessNotExpired() },
      orderBy: { granted_at: 'desc' },
    })
    if (!accesses.length) return reply.send({ data: [] })
    if (!(await isEmailVerified(id, email))) return reply.code(403).send({ message: VET_VERIFY_EMAIL_MSG })
    const petIds = accesses.map(a => a.pet_id)
    const pets = await prisma.pet.findMany({ where: { id: { in: petIds } } })
    return reply.send({ data: pets.map(p => ({ ...p, access: accesses.find(a => a.pet_id === p.id) })) })
  })
}

export default routes