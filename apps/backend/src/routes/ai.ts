import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '../lib/prisma.js'
import { serverError } from '../lib/errors.js'
import { normLang } from '../lib/i18n.js'
import { audit } from '../lib/audit.js'
import { bookingStart } from '../lib/cancellation.js'
import { resolveForAi } from '../lib/storage.js'

const TRIAL_DAYS = 30

/**
 * ΚΟΣΤΟΣ AI — κάθε κλήση χρεώνει τον λογαριασμό Anthropic της πλατφόρμας.
 *
 *   · Ημερήσιο όριο κλήσεων ανά χρήστη (ώρα Ελλάδας): δοκιμαστική 15,
 *     ενεργή συνδρομή 60, διαχειριστής χωρίς όριο. Χωρίς νέο πίνακα: κάθε
 *     κλήση γράφει audit `ai_call` και η μέτρηση γίνεται εκεί.
 *   · Όριο μήκους σε κάθε κείμενο εισόδου (ερώτηση/πλαίσιο/σημειώσεις 2000,
 *     τα υπόλοιπα 400) — ένα τεράστιο κείμενο ήταν τεράστια χρέωση.
 *   · Το web_search έως 3 αναζητήσεις ανά κλήση (κάθε αναζήτηση χρεώνεται
 *     και φέρνει χιλιάδες tokens αποτελεσμάτων στην είσοδο).
 */
const AI_DAILY_LIMIT: Record<string, number> = { trial: 15, active: 60 }
const AI_CALL_ACTION = 'ai_call'
const MSG_AI_DAILY_LIMIT = 'Έφτασες το ημερήσιο όριο χρήσης AI — δοκίμασε ξανά αύριο'
const MSG_TEXT_TOO_LONG = 'Κάποιο κείμενο είναι πολύ μεγάλο'
const MSG_AI_RECORD_FAILED = 'Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή — δοκίμασε ξανά σε λίγο'
const LONG_TEXT = 2000
const SHORT_TEXT = 400

/** Τα μεσάνυχτα της σημερινής μέρας στην Ελλάδα (θερινή/χειμερινή ώρα). */
function athensDayStart(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  return bookingStart(ymd, '00:00') ?? new Date(now.getTime() - 86_400_000)
}

/**
 * Πεδία κειμένου του σώματος με όριο. Σφάλμα αν κάποιο υπερβαίνει το όριο ή
 * δεν είναι απλή τιμή (αντικείμενο/πίνακας θα γινόταν κείμενο στο prompt).
 */
function textLimitError(body: any, limits: Record<string, number>): { message: string; field: string; max: number } | null {
  for (const [field, max] of Object.entries(limits)) {
    const v = body?.[field]
    if (v === undefined || v === null) continue
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return { message: MSG_TEXT_TOO_LONG, field, max }
    if (String(v).length > max) return { message: MSG_TEXT_TOO_LONG, field, max }
  }
  return null
}

const aiRoutes: FastifyPluginAsync = async (app) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  /**
   * Require an active AI subscription or a live trial.
   *
   * AiFeatureGuard on the frontend hides these pages, but the endpoints
   * themselves only checked for a valid token. Anyone with an account could
   * call them straight from a terminal and every request bills the platform's
   * Anthropic account — the guard was decoration, not protection.
   *
   * Admins pass through so support can reproduce and test.
   */
  /**
   * Ημερήσιο όριο. Μετρά τις επιτυχείς καταγραφές `ai_call` του χρήστη από
   * τα μεσάνυχτα (ώρα Ελλάδας). Ο διαχειριστής χωρίς όριο. Η καταγραφή
   * γράφεται από τον handler (recordAiCall) ακριβώς πριν την κλήση στο
   * Anthropic — ένα αίτημα που απορρίπτεται στον έλεγχο (400) δεν μετρά.
   * Αυτός ο έλεγχος είναι το γρήγορο «όχι»· το ακριβές όριο υπό ταυτόχρονα
   * αιτήματα το κρατά η recordAiCall (κράτηση + θέση).
   */
  const endpointOf = (req: any) => String(req.routeOptions?.url ?? req.url ?? '').slice(0, 100)

  async function enforceAiDailyLimit(req: any, reply: any, status: string | null) {
    const u = req.user as any
    if (u?.role === 'admin') { req.aiDailyLimit = null; return }
    const kind = status === 'active' ? 'active' : 'trial'
    // Ρυθμίσιμο χωρίς νέα έκδοση: app_settings `ai_daily_limit_trial` /
    // `ai_daily_limit_active` (ακέραιος ≥ 0). Χωρίς ρύθμιση → 15 / 60.
    let limit = AI_DAILY_LIMIT[kind]
    const setting = await prisma.appSetting.findUnique({ where: { key: `ai_daily_limit_${kind}` } }).catch(() => null)
    const override = setting ? Number(setting.value) : NaN
    if (Number.isInteger(override) && override >= 0) limit = override
    req.aiDailyLimit = limit
    const used = await prisma.auditLog.count({
      where: {
        actor_email: u.email, action: AI_CALL_ACTION, outcome: 'success',
        created_at: { gte: athensDayStart() },
      },
    })
    if (used >= limit) {
      await audit(req, {
        action: AI_CALL_ACTION, resource: 'ai', outcome: 'blocked', status_code: 429,
        metadata: { endpoint: endpointOf(req), limit, used },
      })
      return reply.code(429).send({ message: MSG_AI_DAILY_LIMIT, code: 'ai_daily_limit', limit })
    }
  }

  /**
   * Κράτηση μιας κλήσης στο Anthropic (μετρά στο ημερήσιο όριο) — ΠΡΙΝ την κλήση.
   *
   *   Ο έλεγχος του guard (count) και η καταγραφή γίνονταν χωριστά: Ν
   *   ταυτόχρονα αιτήματα έβλεπαν όλα «14 από 15» και περνούσαν όλα. Τώρα:
   *     1) γράφεται η γραμμή ai_call (απευθείας, ΟΧΙ με audit(), που καταπίνει
   *        το σφάλμα — χωρίς καταγραφή το όριο δεν μετρά → 503, όχι κλήση)
   *     2) μετράμε τη ΘΕΣΗ της: γραμμές της μέρας με (created_at, id) ≤ τη δική
   *        μας. Θέση > όριο → η γραμμή σβήνεται και 429.
   *   Η θέση είναι μοναδική ανά γραμμή, οπότε από Ν ταυτόχρονα αιτήματα
   *   περνούν ακριβώς όσα χωρούν (όχι κανένα, όπως με απλό count μετά το insert).
   *   Επιστρέφει true αν η κλήση μπορεί να γίνει· αλλιώς έχει ήδη απαντήσει.
   */
  async function recordAiCall(req: any, reply: any): Promise<boolean> {
    const u = (req.user || {}) as any
    const limit: number | null = req.aiDailyLimit ?? null
    let row: { id: string; created_at: Date }
    try {
      row = await prisma.auditLog.create({
        data: {
          action: AI_CALL_ACTION, resource: 'ai', outcome: 'success',
          actor_id: u.id ?? null, actor_email: u.email ?? null, actor_role: u.role ?? null,
          metadata: { endpoint: endpointOf(req), limit },
          ip: req.ip || null, user_agent: (req.headers?.['user-agent'] as string) ?? null,
          method: req.method ?? null, path: req.url ? String(req.url).slice(0, 300) : null,
        },
        select: { id: true, created_at: true },
      })
    } catch (err: any) {
      console.error('[ai] ai_call reservation failed:', err?.message ?? err)
      reply.code(503).send({ message: MSG_AI_RECORD_FAILED })
      return false
    }
    if (limit === null) return true
    try {
      const position = await prisma.auditLog.count({
        where: {
          actor_email: u.email, action: AI_CALL_ACTION, outcome: 'success',
          created_at: { gte: athensDayStart() },
          OR: [
            { created_at: { lt: row.created_at } },
            { created_at: row.created_at, id: { lte: row.id } },
          ],
        },
      })
      if (position <= limit) return true
    } catch (err: any) {
      console.error('[ai] ai_call count failed:', err?.message ?? err)
      await prisma.auditLog.delete({ where: { id: row.id } }).catch(() => {})
      reply.code(503).send({ message: MSG_AI_RECORD_FAILED })
      return false
    }
    await prisma.auditLog.delete({ where: { id: row.id } }).catch(() => {})
    await audit(req, {
      action: AI_CALL_ACTION, resource: 'ai', outcome: 'blocked', status_code: 429,
      metadata: { endpoint: endpointOf(req), limit, race: true },
    })
    reply.code(429).send({ message: MSG_AI_DAILY_LIMIT, code: 'ai_daily_limit', limit })
    return false
  }

  async function requireAiAccess(req: any, reply: any) {
    const u = req.user as any
    if (u?.role === 'admin') return enforceAiDailyLimit(req, reply, null)

    const user = await prisma.user.findUnique({
      where: { id: u.id },
      select: { id: true, ai_subscription_status: true, ai_trial_started_at: true },
    })
    if (!user) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })

    if (user.ai_subscription_status === 'active') return enforceAiDailyLimit(req, reply, 'active')

    if (user.ai_subscription_status === 'trial' && user.ai_trial_started_at) {
      const elapsedDays = (Date.now() - new Date(user.ai_trial_started_at).getTime()) / 86_400_000
      if (elapsedDays < TRIAL_DAYS) return enforceAiDailyLimit(req, reply, 'trial')
      // Expired mid-session — record it so the rest of the app agrees.
      await prisma.user.update({
        where: { id: user.id },
        data: { ai_subscription_status: 'expired' },
      })
    }

    return reply.code(402).send({
      message: 'Απαιτείται συνδρομή AI για αυτή τη λειτουργία',
      code: 'ai_subscription_required',
    })
  }

  /** Every paid endpoint below goes through authentication then this check. */
  const aiGuard = [(app as any).authenticate, requireAiAccess]

  // Extract the final text block from a response that may include web_search tool blocks
  function extractFinalText(content: any[]): string {
    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text)
    return textBlocks[textBlocks.length - 1] || ''
  }

  function parseJsonResponse(text: string) {
    const cleaned = text.replace(/```json|```/g, '').trim()
    // Claude sometimes adds a short lead-in/trailing note after using tools — extract just the {...} block
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('Δεν βρέθηκε έγκυρο JSON στην απάντηση του AI')
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }

  const webSearchTool = { type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 3 }

  /**
   * Εικόνα σε base64 (data: URI του /upload ή image_base64): μόνο οι τύποι
   * που δέχεται το μοντέλο, και όριο μεγέθους. Πριν, οποιοσδήποτε τύπος
   * `image/*` και οποιοδήποτε μέγεθος περνούσε κατευθείαν στο Anthropic
   * (σφάλμα 500 από εκεί και χρέωση για ένα αίτημα που δεν θα πετύχαινε).
   */
  const AI_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type AiImageType = typeof AI_IMAGE_TYPES[number]
  // ~7MB base64 ≈ 5MB εικόνα — το όριο του μοντέλου ανά εικόνα.
  const AI_IMAGE_MAX_BASE64 = 7_000_000
  const MSG_IMAGE_TYPE = 'Μη επιτρεπόμενος τύπος αρχείου'
  const MSG_IMAGE_SIZE = 'Η εικόνα είναι πολύ μεγάλη (έως 5MB)'

  function base64ImageBlock(mime: string, data: string): { error: string } | { block: any } {
    const m = String(mime || '').toLowerCase()
    if (!(AI_IMAGE_TYPES as readonly string[]).includes(m)) return { error: MSG_IMAGE_TYPE }
    if (typeof data !== 'string' || data.length === 0) return { error: MSG_IMAGE_TYPE }
    if (data.length > AI_IMAGE_MAX_BASE64) return { error: MSG_IMAGE_SIZE }
    return { block: { type: 'image' as const, source: { type: 'base64' as const, media_type: m as AiImageType, data } } }
  }

  /** image_url → μπλοκ εικόνας: data: URI → base64 (με έλεγχο), αλλιώς url. */
  function imageBlockFromUrl(imageUrl: unknown): { error: string } | { block: any } {
    if (typeof imageUrl !== 'string') return { error: MSG_IMAGE_TYPE }
    if (/^data:/i.test(imageUrl)) {
      const m = imageUrl.match(/^data:([^;,]+);base64,(.+)$/)
      if (!m) return { error: MSG_IMAGE_TYPE }
      return base64ImageBlock(m[1], m[2])
    }
    return { block: { type: 'image' as const, source: { type: 'url' as const, url: imageUrl } } }
  }

  /**
   * Γλώσσα των ελεύθερων κειμένων της απάντησης.
   *
   * Τα prompts είναι στα ελληνικά, οπότε το μοντέλο απαντούσε πάντα ελληνικά
   * — και ο χρήστης με αγγλικά/ισπανικά/γαλλικά/κινέζικα διάβαζε ελληνικές
   * παρατηρήσεις και συμβουλές. Το UI στέλνει πλέον προαιρετικό `lang` στο
   * σώμα. Χωρίς `lang` (π.χ. η ήδη εγκατεστημένη εφαρμογή) → ελληνικά, όπως
   * πριν: το prompt μένει αυτούσιο. Οι κωδικοί (emotion, severity,
   * vet_urgency κ.λπ.) και τα πεδία *_el δεν αλλάζουν, ώστε οι παλιοί πελάτες
   * να συνεχίσουν να δουλεύουν.
   */
  const LANG_NAMES: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', zh: 'Simplified Chinese',
  }
  function langInstruction(body: any): string {
    const lang = normLang(body?.lang)
    if (lang === 'el') return ''
    return `\n\nIMPORTANT: Write every free-text value of the JSON (descriptions, observations, findings, causes, advice, recommendations, notes, disclaimer) in ${LANG_NAMES[lang]}. Keep the JSON keys and the fixed code values (e.g. emotion, overall_emotion, severity, vet_urgency) exactly as specified. Fields whose name ends in _el stay in Greek.`
  }

  // Pet Health Analysis — now compares against public veterinary reference data via web search
  app.post('/pet-health', { preHandler: aiGuard }, async (req: any, reply) => {
    const { image_url, analysis_type, breed, species } = req.body as { image_url: string; analysis_type: 'skin' | 'eye'; breed?: string; species?: string }
    if (!image_url || !analysis_type) return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })
    const tooLong = textLimitError(req.body, { analysis_type: SHORT_TEXT, breed: SHORT_TEXT, species: SHORT_TEXT })
    if (tooLong) return reply.code(400).send(tooLong)

    // The /upload endpoint falls back to a base64 data: URI when no storage (R2) is configured.
    // Claude's "url" image source can't fetch data: URIs — convert those to a base64 image block instead.
    const img = imageBlockFromUrl(await resolveForAi(image_url, (req.user as any)?.email))
    if ('error' in img) return reply.code(400).send({ message: img.error })
    const imageContent = img.block

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές (π.χ. veterinary partner, merck vet manual, pet health sites) για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου${breed ? ` (ράτσα: ${breed})` : ''}${species ? ` (είδος: ${species})` : ''}.
Αν χρειάζεται, ψάξε στο διαδίκτυο για να συγκρίνεις τα ευρήματα με δημόσιες κτηνιατρικές πηγές σχετικά με συνήθεις παθήσεις αυτής της ράτσας/είδους.
Επέστρεψε ΜΟΝΟ JSON ως τελική απάντηση. Τα "findings" και "conditions" πρέπει να είναι arrays από ΑΠΛΑ strings (όχι objects):
{"severity":"low"|"medium"|"high","findings":["..."],"conditions":["..."],"comparison_sources":["σύντομη αναφορά πηγής 1","σύντομη αναφορά πηγής 2"],"recommendation":"","urgency":"","disclaimer":"Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."}`

    try {
      if (!(await recordAiCall(req, reply))) return reply
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt + langInstruction(req.body),
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI health error:', err)
      return serverError(reply, err, 'ai-analysis', 'Η ανάλυση δεν ολοκληρώθηκε.')
    }
  })

  // Pet Emotion Analysis - single frame (image URL or base64)
  app.post('/emotion', { preHandler: aiGuard }, async (req: any, reply) => {
    const { image_url, image_base64, media_type, species, context } = req.body as any

    if (!image_url && !image_base64) return reply.code(400).send({ message: 'Απαιτείται εικόνα' })
    const tooLong = textLimitError(req.body, { species: SHORT_TEXT, context: LONG_TEXT })
    if (tooLong) return reply.code(400).send(tooLong)
    // Το κινητό στέλνει image_url από το /upload, που χωρίς R2 επιστρέφει
    // data: URI — η πηγή "url" του Claude δεν το διαβάζει. Μετατροπή σε
    // base64 (με έλεγχο τύπου/μεγέθους), όπως στο /pet-health και στο /stool-urine.
    const img = image_base64
      ? base64ImageBlock(media_type || 'image/jpeg', image_base64)
      : imageBlockFromUrl(await resolveForAi(image_url, (req.user as any)?.email))
    if ('error' in img) return reply.code(400).send({ message: img.error })

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων συντροφιάς.
Αναλύεις εικόνες/frames βίντεο κατοικίδιων ζώων και αξιολογείς:
- Συναισθηματική κατάσταση (happy, calm, anxious, fearful, excited, playful, tired, stressed, neutral)
- Γλώσσα σώματος (στάση, αυτιά, ουρά, μάτια, στόμα)
- Επίπεδο ενέργειας (1-10)
- Συμβουλές για τον ιδιοκτήτη
Όταν χρειάζεται, μπορείς να αναζητήσεις στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους ώστε η σύγκριση να είναι πιο ακριβής.
Απαντάς ΜΟΝΟ σε JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε τη συναισθηματική κατάσταση ${species ? `του ${species}` : 'του κατοικίδιου'} σε αυτή την εικόνα.
${context ? `Πλαίσιο: ${context}` : ''}

Επέστρεψε ΜΟΝΟ JSON:
{
  "emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "emotion_el": "χαρούμενο|ήρεμο|ανήσυχο|φοβισμένο|ενθουσιασμένο|παιχνιδιάρικο|κουρασμένο|αγχωμένο|ουδέτερο",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "body_language": {
    "posture": "περιγραφή στάσης",
    "ears": "περιγραφή αυτιών",
    "tail": "περιγραφή ουράς",
    "eyes": "περιγραφή ματιών",
    "mouth": "περιγραφή στόματος"
  },
  "observations": ["παρατήρηση 1", "παρατήρηση 2"],
  "advice": "συμβουλή για τον ιδιοκτήτη",
  "welfare_score": 1-10
}`

    try {
      const imageContent = img.block

      if (!(await recordAiCall(req, reply))) return reply
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt + langInstruction(req.body),
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion error:', err)
      return serverError(reply, err, 'ai-analysis', 'Η ανάλυση δεν ολοκληρώθηκε.')
    }
  })

  // Pet Emotion - analyze uploaded video frames (multiple frames)
  app.post('/emotion/video', { preHandler: aiGuard }, async (req: any, reply) => {
    const { frames, species, duration_seconds } = req.body as any
    // frames: array of base64 strings (extracted from video on frontend)
    if (!frames || !Array.isArray(frames) || frames.length === 0) return reply.code(400).send({ message: 'Απαιτούνται frames' })
    const tooLong = textLimitError(req.body, { species: SHORT_TEXT, duration_seconds: SHORT_TEXT })
    if (tooLong) return reply.code(400).send(tooLong)

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων. Αναλύεις πολλαπλά frames βίντεο για να αξιολογήσεις τη συνολική συναισθηματική κατάσταση. Όταν χρειάζεται, αναζητάς στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους. Απαντάς ΜΟΝΟ JSON στο τελικό σου μήνυμα.`

    // Αναλύουμε έως 5 frames
    const framesToAnalyze = frames.slice(0, 5)

    // Κάθε frame με τον ίδιο έλεγχο τύπου/μεγέθους με τις μεμονωμένες εικόνες
    // (πριν περνούσε οτιδήποτε, οποιουδήποτε μεγέθους).
    const imageContents: any[] = []
    for (const f of framesToAnalyze) {
      const img = base64ImageBlock('image/jpeg', f)
      if ('error' in img) return reply.code(400).send({ message: img.error })
      imageContents.push(img.block)
    }

    const userPrompt = `Αυτά είναι ${framesToAnalyze.length} frames από βίντεο διάρκειας ${duration_seconds || '?'} δευτερολέπτων ${species ? `ενός ${species}` : 'ενός κατοικίδιου'}.
Ανάλυσε τη συναισθηματική κατάσταση συνολικά.

Επέστρεψε ΜΟΝΟ JSON:
{
  "overall_emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "overall_emotion_el": "ελληνική μετάφραση",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "welfare_score": 1-10,
  "emotion_timeline": [{"frame": 1, "emotion": "...", "note": "..."}],
  "key_observations": ["παρατήρηση 1", "παρατήρηση 2", "παρατήρηση 3"],
  "body_language_summary": "σύνοψη γλώσσας σώματος",
  "advice": "συμβουλές για τον ιδιοκτήτη",
  "needs_attention": true|false,
  "attention_reason": "αιτία αν needs_attention=true"
}`

    try {
      if (!(await recordAiCall(req, reply))) return reply
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt + langInstruction(req.body),
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion video error:', err)
      return serverError(reply, err, 'ai-analysis', 'Η ανάλυση δεν ολοκληρώθηκε.')
    }
  })
  // Stool & Urine Analysis
  app.post('/stool-urine', { preHandler: aiGuard }, async (req: any, reply) => {
    const {
      image_url,
      sample_type,   // 'stool' | 'urine'
      species,       // 'dog' | 'cat'
      breed,
      age_years,
      weight_kg,
      is_sterilized,
      ate_from_street,
      recent_medications,
      diet_change,
      last_normal_stool,
      symptoms,      // free text
      additional_notes,
    } = req.body as any

    if (!image_url || !sample_type || !species) {
      return reply.code(400).send({ message: 'Απαιτούνται image_url, sample_type, species' })
    }
    const tooLong = textLimitError(req.body, {
      sample_type: SHORT_TEXT, species: SHORT_TEXT, breed: SHORT_TEXT, age_years: SHORT_TEXT, weight_kg: SHORT_TEXT,
      is_sterilized: SHORT_TEXT, ate_from_street: SHORT_TEXT, recent_medications: SHORT_TEXT,
      diet_change: SHORT_TEXT, last_normal_stool: SHORT_TEXT,
      symptoms: LONG_TEXT, additional_notes: LONG_TEXT,
    })
    if (tooLong) return reply.code(400).send(tooLong)

    const img = imageBlockFromUrl(await resolveForAi(image_url, (req.user as any)?.email))
    if ('error' in img) return reply.code(400).send({ message: img.error })
    const imageContent = img.block

    const sampleEl = sample_type === 'stool' ? 'περιττώματα' : 'ούρα'
    const speciesEl = species === 'dog' ? 'σκύλου' : 'γάτας'

    const contextParts = [
      `Είδος: ${speciesEl}`,
      breed ? `Ράτσα: ${breed}` : null,
      age_years != null ? `Ηλικία: ${age_years} έτη` : null,
      weight_kg != null ? `Βάρος: ${weight_kg} kg` : null,
      is_sterilized != null ? `Στείρωση: ${is_sterilized ? 'Ναι' : 'Όχι'}` : null,
      ate_from_street ? `Έφαγε κάτι από τον δρόμο πρόσφατα: Ναι` : null,
      recent_medications ? `Πρόσφατα φάρμακα/αντιπαρασιτικά: ${recent_medications}` : null,
      diet_change ? `Αλλαγή διατροφής: ${diet_change}` : null,
      last_normal_stool ? `Τελευταία φυσιολογικά περιττώματα: ${last_normal_stool}` : null,
      symptoms ? `Συμπτώματα που παρατηρήθηκαν: ${symptoms}` : null,
      additional_notes ? `Επιπλέον σημειώσεις: ${additional_notes}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη γαστρεντερολογία και ουρολογία ζώων συντροφιάς.
Αναλύεις φωτογραφίες περιττωμάτων και ούρων σκύλων και γατών λαμβάνοντας υπόψη το ιστορικό του ζώου.
Όταν χρειάζεται, αναζητάς σε αξιόπιστες κτηνιατρικές πηγές (Merck Vet Manual, VCA Hospitals, PetMD, WSAVA guidelines) για να συγκρίνεις τα ευρήματα.
Απαντάς ΜΟΝΟ σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown backticks.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${sampleEl} ${speciesEl}.

ΙΣΤΟΡΙΚΟ ΖΩΟΥ:
${contextParts}

Λάβε υπόψη όλο το ιστορικό κατά την ανάλυση (π.χ. αν έφαγε από τον δρόμο, αν είναι στείρο, αλλαγές διατροφής, φάρμακα).
Αν χρειάζεται, ψάξε σε κτηνιατρικές πηγές για συχνές αιτίες και φυσιολογικό εύρος για αυτό το είδος/ράτσα/ηλικία.

Επέστρεψε ΜΟΝΟ JSON με αυτή τη δομή:
{
  "sample_type": "${sample_type}",
  "severity": "normal"|"mild"|"moderate"|"severe",
  "color": "χρώμα δείγματος",
  "consistency": "σύσταση (μόνο για περιττώματα)",
  "findings": ["εύρημα 1 ως plain string", "εύρημα 2 ως plain string"],
  "likely_causes": ["πιθανή αιτία 1", "πιθανή αιτία 2"],
  "context_factors": ["πώς επηρεάζει το ιστορικό τα ευρήματα"],
  "comparison_sources": ["σύντομη αναφορά πηγής"],
  "recommendation": "σαφής σύσταση για τον ιδιοκτήτη",
  "vet_urgency": "routine"|"within_48h"|"today"|"emergency",
  "vet_urgency_el": "Τακτικό ραντεβού"|"Εντός 48 ωρών"|"Σήμερα"|"Άμεσα / Έκτακτο",
  "home_care": ["τι μπορεί να κάνει ο ιδιοκτήτης στο σπίτι"],
  "warning_signs": ["συμπτώματα που να οδηγούν αμέσως σε κτηνίατρο"],
  "disclaimer": "Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την εξέταση από κτηνίατρο."
}`

    try {
      if (!(await recordAiCall(req, reply))) return reply
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt + langInstruction(req.body),
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI stool/urine error:', err)
      return serverError(reply, err, 'ai-analysis', 'Η ανάλυση δεν ολοκληρώθηκε.')
    }
  })
  // ─── LEGAL Q&A ──────────────────────────────────────────────────
  app.post('/legal', { preHandler: aiGuard }, async (req: any, reply) => {
    const { question, country = 'GR', context } = req.body as any
    if (!question) return reply.code(400).send({ message: 'Απαιτείται ερώτηση' })
    const tooLong = textLimitError(req.body, { question: LONG_TEXT, context: LONG_TEXT, country: SHORT_TEXT })
    if (tooLong) return reply.code(400).send(tooLong)

    const systemPrompt = `Είσαι εξειδικευμένος νομικός σύμβουλος σε θέματα νομοθεσίας κατοικιδίων ζώων στην Ελλάδα.
Έχεις πλήρη γνώση της ελληνικής νομοθεσίας:

ΒΑΣΙΚΗ ΝΟΜΟΘΕΣΙΑ ΕΛΛΑΔΑ:
• Ν. 4830/2021 "Νέο πλαίσιο για τα ζώα συντροφιάς" - Ο κύριος νόμος. Υποχρεωτική στείρωση, μικροτσίπ, εγγραφή στο ΕΜΖΕ, ηλεκτρονικό βιβλιάριο. Πρόστιμα €1.000-€30.000 για παραβάσεις. Απαγόρευση εγκατάλειψης, κακοποίησης, ευθανασίας σε αδέσποτα.
• Ν. 4039/2012 - Προηγούμενος νόμος για αδέσποτα ζώα. Δημοτικά καταφύγια, υιοθεσία, τσιπ.
• Ν. 3170/2003 - Πρώτος νόμος προστασίας ζώων συντροφιάς.
• Ν. 1197/1981 - Αρχικός νόμος προστασίας ζώων.
• ΠΔ 463/1978 - Κανόνες για επικίνδυνα ζώα.

ΥΠΟΧΡΕΩΣΕΙΣ ΙΔΙΟΚΤΗΤΗ (Ν.4830/2021):
• Υποχρεωτικό μικροτσίπ (ISO 11784/11785) εντός 2 μηνών από απόκτηση
• Εγγραφή στο ΕΜΖΕ (Εθνικό Μητρώο Ζώων Συντροφιάς) - μέχρι 31/12/2024 για υπάρχοντα, αμέσως για νέα
• Ηλεκτρονικό βιβλιάριο υγείας
• Υποχρεωτική στείρωση σκύλων & γάτων (εξαίρεση για εκτροφείς με άδεια)
• Εμβόλιο κατά λύσσας για σκύλους
• Σήμα αναγνώρισης (κολάρο με στοιχεία ιδιοκτήτη)

ΕΥΘΥΝΗ ΙΔΙΟΚΤΗΤΗ:
• Αστική ευθύνη (ΑΚ 924) για ζημιές που προκαλεί το ζώο - εκτός αν αποδείξει ανωτέρα βία
• Ποινική ευθύνη για κακοποίηση (φυλάκιση 6 μηνών - 2 χρόνια + πρόστιμο €5.000-€30.000)
• Ευθύνη για θόρυβο/ενόχληση γειτόνων (ΚΟΚ, κανονισμοί πολυκατοικίας)

ΖΩΝΤΑΝΑ ΣΕ ΕΝΟΙΚΙΑΖΟΜΕΝΑ:
• Ο ιδιοκτήτης ΔΕΝ μπορεί να απαγορεύσει γενικώς κατοικίδια αν δεν αναφέρεται στο μισθωτήριο
• Το άρθρο 13 Ν.1493/1984 επιτρέπει ρύθμιση στο μισθωτήριο
• Πρακτικά: αν το συμβόλαιο απαγορεύει, ισχύει. Αν δεν λέει τίποτα, επιτρέπεται
• Ζημιές από κατοικίδιο = ευθύνη μισθωτή

ΑΔΕΣΠΟΤΑ ΖΩΙΑ:
• Απαγορεύεται η θανάτωση / ευθανασία αδέσποτων (εκτός ανίατης νόσου)
• Δήμοι υποχρεούνται σε ΔΤΣΤΕ (Δράσεις Τσιπ-Στείρωση-Τοποθέτηση-Επιστροφή)
• Τροφοδότες αδέσποτων: νόμιμοι, υπό προϋποθέσεις
• Υιοθεσία αδέσποτου: δωρεάν, μέσω δήμου ή φιλοζωικού

ΜΕΤΑΦΟΡΑ - ΤΑΞΙΔΙ:
• Εσωτερικό: μικροτσίπ + εμβόλιο λύσσας + βιβλιάριο
• ΕΕ: EU Pet Passport + μικροτσίπ + λύσσα (21+ ημέρες πριν ταξίδι)
• Αεροπλάνο: κάθε εταιρεία έχει δικές της πολιτικές
• ΜΜΜ (Αττικό Μετρό/ΗΣΑΠ): σε τσάντα μεταφοράς ή κλουβί

ΕΚΤΡΟΦΕΙΑ / ΠΩΛΗΣΗ:
• Υποχρεωτική άδεια εκτροφείου από Κτηνιατρική Αρχή
• Μητρώο ΕΜΖΕ για εκτροφείς
• Πώληση κουταβιών <8 εβδομάδων: ΑΠΑΓΟΡΕΥΕΤΑΙ (πρόστιμο €3.000-€10.000)
• Pet shops: επιτρέπεται μόνο πώληση ψαριών/πτηνών/ερπετών - ΟΧΙ σκύλων/γάτων από Ν.4830/2021

ΠΑΡΟΥΣΙΑ ΣΕ ΔΗΜΟΣΙΟΥΣ ΧΩΡΟΥΣ:
• Σκύλοι σε δημόσιους χώρους: υποχρεωτικά με λουρί & φίμωτρο αν >20kg ή επιθετικής ράτσας
• Παραλίες: αποκλείονται γενικά, εκτός ειδικά σημειωμένων pet-friendly
• Εστιατόρια/καφέ: απόφαση ιδιοκτήτη, δεν υπάρχει γενική απαγόρευση
• Δημόσια κτίρια: απαγορεύονται εκτός ΑμεΑ με σκύλο οδηγό

ΑΠΟΖΗΜΙΩΣΗ / ΔΙΚΑΣΤΙΚΕΣ ΕΝΕΡΓΕΙΕΣ:
• Ατύχημα από αδέσποτο: ευθύνη του Δήμου αν αποδειχθεί αμέλεια
• Θάνατος κατοικιδίου από τρίτο: αστική ευθύνη, αποζημίωση αξίας ζώου + ηθική βλάβη
• Παράνομη κατάσχεση κατοικιδίου: αίτηση αποδοχής στον Εισαγγελέα

Απάντησε ΠΑΝΤΑ:
1. Στα ΕΛΛΗΝΙΚΑ
2. Αναφέροντας συγκεκριμένα άρθρα/νόμους
3. Εξηγώντας πρακτικά βήματα
4. Τονίζοντας ότι δεν αντικαθιστάς δικηγόρο για σοβαρές υποθέσεις
5. Σε JSON format:
{
  "answer": "πλήρης απάντηση σε Markdown",
  "relevant_laws": ["Ν.4830/2021 άρθρο X", "..."],
  "practical_steps": ["βήμα 1", "βήμα 2"],
  "urgency": "low"|"medium"|"high",
  "recommend_lawyer": true|false,
  "disclaimer": "Η απάντηση αυτή παρέχεται για ενημερωτικούς σκοπούς..."
}`

    const userPrompt = `${context ? `Πλαίσιο: ${context}\n` : ''}Ερώτηση: ${question}`

    try {
      if (!(await recordAiCall(req, reply))) return reply
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const text = (response.content[0] as any)?.text || ''
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI legal error:', err)
      return serverError(reply, err, 'ai', 'Η ενέργεια δεν ολοκληρώθηκε.')
    }
  })
}

export default aiRoutes