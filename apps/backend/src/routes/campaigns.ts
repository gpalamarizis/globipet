import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'
import { createHash } from 'node:crypto'

/**
 * Καμπάνιες — εκπτώσεις, προβολές, στοχευμένο κοινό.
 *
 *   ΔΗΜΟΣΙΑ
 *     GET  /campaigns/placements?page=home     τι banner να δείξει η σελίδα
 *     POST /campaigns/:id/view                 μέτρηση προβολής
 *     POST /campaigns/:id/click                μέτρηση κλικ
 *
 *   ΠΕΛΑΤΗΣ
 *     GET  /campaigns/for-me                   οι προσφορές που τον αφορούν
 *     POST /campaigns/quote                    πόσο πληρώνω τελικά
 *
 *   ΠΑΡΟΧΟΣ
 *     GET    /campaigns/mine                   οι καμπάνιες μου
 *     POST   /campaigns                        δημιουργία
 *     GET    /campaigns/:id                    πλήρη στοιχεία
 *     PATCH  /campaigns/:id                    επεξεργασία
 *     DELETE /campaigns/:id                    διαγραφή
 *     PUT    /campaigns/:id/targets            τι αφορά
 *     PUT    /campaigns/:id/placements         πού προβάλλεται
 *     PUT    /campaigns/:id/audience           σε ποιους
 *
 * Raw SQL ώστε να μην εξαρτάται από το prisma generate.
 */

const PAGES = [
  'home', 'services', 'service_detail', 'marketplace', 'product_detail',
  'social', 'playdates', 'communities', 'events', 'forum',
  'telehealth', 'insurance', 'pets', 'all',
] as const

const SLOTS = ['hero', 'banner', 'sidebar', 'inline', 'popup'] as const
const TARGET_TYPES = ['product', 'service', 'service_package', 'all_products', 'all_services'] as const

/**
 * Επιτρεπόμενες πηγές μέσων.
 *
 * Το media_url καταλήγει σε <iframe> ή <img> στο frontend. Χωρίς λευκή
 * λίστα, κάποιος θα μπορούσε να ενσωματώσει αυθαίρετη σελίδα στο site.
 * Ο έλεγχος γίνεται ΚΑΙ στον server — ο έλεγχος του browser παρακάμπτεται.
 */
const MEDIA_HOSTS = [
  'youtube-nocookie.com', 'youtube.com', 'youtu.be',
  'player.vimeo.com', 'vimeo.com',
  'ytimg.com',        // μικρογραφίες YouTube
  'vumbnail.com',     // μικρογραφίες Vimeo
]

function isAllowedMedia(url: string | null | undefined): boolean {
  if (!url) return true                        // κενό επιτρέπεται
  const u = String(url).trim()
  if (u.startsWith('data:image/')) return true // base64 από το upload
  let host: string
  try { host = new URL(u).hostname.replace(/^www\./, '') }
  catch { return false }                        // ό,τι δεν είναι έγκυρο URL
  // Δικά μας αρχεία από R2 ή Cloudflare
  if (host.endsWith('.r2.cloudflarestorage.com') || host.endsWith('globipet.com')) return true
  if (host.endsWith('.r2.dev') || host.endsWith('.pages.dev')) return true
  return MEDIA_HOSTS.some(h => host === h || host.endsWith('.' + h))
}

function uid() {
  return (globalThis as any).crypto?.randomUUID?.() ??
         Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const campaignRoutes: FastifyPluginAsync = async (app) => {

  // ══ ΔΗΜΟΣΙΑ ════════════════════════════════════════════════════════

  /**
   * Τα banner μιας σελίδας.
   *
   * Επιστρέφει μόνο ενεργές καμπάνιες εντός διαστήματος. Οι στοχευμένες
   * (με κοινό) ΔΕΝ εμφανίζονται εδώ — μόνο στο /for-me, αφού απαιτούν
   * ταυτοποίηση του πελάτη.
   */
  app.get('/placements', async (req: any) => {
    const page = String(req.query?.page || 'home')
    const slot = req.query?.slot ? String(req.query.slot) : null

    const rows = await prisma.$queryRaw<any[]>`
      SELECT p.id, p.campaign_id, p.page, p.slot, p.media_type, p.media_url,
             p.link_url, p.headline, p.subtext, p.cta_label, p.display_order,
             c.title, c.discount_type, c.discount_value, c.ends_at
        FROM campaign_placements p
        JOIN campaigns c ON c.id = p.campaign_id
       WHERE p.is_active AND c.is_active
         AND now() BETWEEN c.starts_at AND c.ends_at
         AND (p.page = ${page} OR p.page = 'all')
         AND (${slot}::text IS NULL OR p.slot = ${slot})
         -- Οι στοχευμένες καμπάνιες δεν προβάλλονται δημόσια
         AND NOT EXISTS (SELECT 1 FROM campaign_audience a WHERE a.campaign_id = c.id)
       ORDER BY c.boost DESC, p.display_order, p.created_at DESC
       LIMIT 20`

    return { data: rows, page, total: rows.length }
  })

  /**
   * Impression counters.
   *
   * These were public with no filter of any kind, so a loop could push a
   * campaign's views and clicks to any number. The provider then judged
   * whether the campaign was worth the money on figures someone had made up.
   *
   * A row in campaign_impressions makes each count idempotent per visitor per
   * day. The visitor is a hash of IP and user agent — enough to stop casual
   * inflation without keeping an address on file, which would be personal
   * data we have no reason to store.
   */
  function visitorHash(req: any): string {
    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
      || req.ip || 'unknown'
    const ua = (req.headers['user-agent'] || '').toString().slice(0, 200)
    return createHash('sha256')
      .update(`${ip}|${ua}|${process.env.JWT_SECRET || 'globipet'}`)
      .digest('hex')
      .slice(0, 32)
  }

  async function countOnce(req: any, campaignId: string, kind: 'view' | 'click') {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    try {
      await prisma.campaignImpression.create({
        data: { campaign_id: campaignId, visitor_hash: visitorHash(req), kind, day: today },
      })
    } catch {
      // Unique violation — this visitor already counted today. Not an error.
      return false
    }
    const column = kind === 'view' ? 'views' : 'clicks'
    await prisma.$executeRawUnsafe(
      `UPDATE campaigns SET ${column} = ${column} + 1 WHERE id = $1`, campaignId)
    return true
  }

  app.post('/:id/view', async (req: any) => {
    const counted = await countOnce(req, req.params.id, 'view')
    return { ok: true, counted }
  })

  app.post('/:id/click', async (req: any) => {
    const counted = await countOnce(req, req.params.id, 'click')
    return { ok: true, counted }
  })

  // ══ ΑΠΑΙΤΕΙΤΑΙ ΣΥΝΔΕΣΗ ═════════════════════════════════════════════
  app.register(async (secured) => {
    secured.addHook('preHandler', async (req: any, reply: any) => {
      try { await (app as any).authenticate(req, reply) }
      catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
    })

    /** Επιβεβαιώνει ότι η καμπάνια ανήκει στον χρήστη. */
    async function owns(req: any, reply: any, id: string) {
      const user = req.user as any
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, owner_email FROM campaigns WHERE id = ${id}`
      if (!rows.length) { reply.code(404).send({ message: 'Η καμπάνια δεν βρέθηκε' }); return null }
      if (rows[0].owner_email !== user.email && user.role !== 'admin') {
        audit(req, { action: 'permission_denied', resource: 'campaign',
                     resourceId: id, outcome: 'denied' })
        reply.code(403).send({ message: 'Η καμπάνια δεν σου ανήκει' }); return null
      }
      return rows[0]
    }

    // ── Οι προσφορές που αφορούν ΕΜΕΝΑ ────────────────────────────────
    secured.get('/for-me', async (req: any) => {
      const email = (req.user as any).email
      const rows = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT c.id, c.title, c.description, c.discount_type,
               c.discount_value, c.min_order, c.ends_at, c.owner_email,
               EXISTS (SELECT 1 FROM campaign_audience a
                        WHERE a.campaign_id = c.id AND a.customer_email = ${email})
                 AS personal
          FROM campaigns c
         WHERE c.is_active
           AND now() BETWEEN c.starts_at AND c.ends_at
           AND c.discount_type IS NOT NULL
           AND (NOT EXISTS (SELECT 1 FROM campaign_audience a WHERE a.campaign_id = c.id)
                OR EXISTS (SELECT 1 FROM campaign_audience a
                            WHERE a.campaign_id = c.id AND a.customer_email = ${email}))
         ORDER BY personal DESC, c.ends_at
         LIMIT 50`
      return { data: rows }
    })

    /**
     * Πόσο πληρώνω τελικά.
     *
     * Σώμα: { items: [{ type, id, price, qty }] }
     * Επιστρέφει την τιμή κάθε είδους μετά την έκπτωση, και τι εφαρμόστηκε.
     *
     * ΚΑΝΟΝΑΣ: μία έκπτωση ανά είδος — η ΜΕΓΑΛΥΤΕΡΗ. Δεν σωρεύονται,
     * γιατί δύο καμπάνιες 50% θα μηδένιζαν την τιμή.
     */
    secured.post('/quote', async (req: any, reply) => {
      const email = (req.user as any).email
      const items = Array.isArray(req.body?.items) ? req.body.items : null
      if (!items) return reply.code(400).send({ message: 'Αναμένεται πίνακας items' })
      if (items.length > 100) return reply.code(400).send({ message: 'Πάρα πολλά είδη' })

      const out: any[] = []
      let subtotal = 0, totalDiscount = 0

      for (const it of items) {
        const type = String(it.type || '')
        const id = String(it.id || '')
        const price = Number(it.price) || 0
        const qty = Math.max(1, Number(it.qty) || 1)
        const line = price * qty
        subtotal += line

        if (!['product', 'service', 'service_package'].includes(type) || !id) {
          out.push({ ...it, line, discount: 0, final: line, campaign: null })
          continue
        }

        const allType = type === 'product' ? 'all_products' : 'all_services'

        const found = await prisma.$queryRaw<any[]>`
          SELECT c.id, c.title, c.discount_type, c.discount_value, c.min_order, c.boost
            FROM campaigns c
            JOIN campaign_targets t ON t.campaign_id = c.id
           WHERE c.is_active
             AND now() BETWEEN c.starts_at AND c.ends_at
             AND c.discount_type IS NOT NULL
             AND (t.target_type = ${allType}
                  OR (t.target_type = ${type} AND t.target_id = ${id}))
             AND (c.min_order IS NULL OR c.min_order <= ${line})
             AND (NOT EXISTS (SELECT 1 FROM campaign_audience a WHERE a.campaign_id = c.id)
                  OR EXISTS (SELECT 1 FROM campaign_audience a
                              WHERE a.campaign_id = c.id AND a.customer_email = ${email}))`

        // Η μεγαλύτερη έκπτωση σε ευρώ κερδίζει — όχι το μεγαλύτερο ποσοστό,
        // γιατί 10% σε 200 € είναι περισσότερα από 5 € σταθερά.
        let best: any = null, bestOff = 0
        for (const c of found) {
          const off = c.discount_type === 'percent'
            ? line * (Number(c.discount_value) / 100)
            : Math.min(Number(c.discount_value) * qty, line)
          if (off > bestOff) { bestOff = off; best = c }
        }

        const discount = Math.round(bestOff * 100) / 100
        totalDiscount += discount
        out.push({
          ...it, line, discount, final: Math.round((line - discount) * 100) / 100,
          campaign: best ? { id: best.id, title: best.title,
                             type: best.discount_type, value: best.discount_value } : null,
        })
      }

      return {
        data: {
          items: out,
          subtotal: Math.round(subtotal * 100) / 100,
          discount: Math.round(totalDiscount * 100) / 100,
          total: Math.round((subtotal - totalDiscount) * 100) / 100,
        },
      }
    })

    // ── Διαχείριση ────────────────────────────────────────────────────
    secured.get('/mine', async (req: any) => {
      const user = req.user as any
      const rows = await prisma.$queryRaw<any[]>`
        SELECT c.*,
               (SELECT count(*)::int FROM campaign_targets t WHERE t.campaign_id = c.id)    AS targets,
               (SELECT count(*)::int FROM campaign_placements p WHERE p.campaign_id = c.id) AS placements,
               (SELECT count(*)::int FROM campaign_audience a WHERE a.campaign_id = c.id)   AS audience,
               (c.is_active AND now() BETWEEN c.starts_at AND c.ends_at) AS live
          FROM campaigns c
         WHERE c.owner_email = ${user.email}
         ORDER BY c.created_at DESC`
      return { data: rows }
    })

    secured.get('/:id', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      const [full] = await prisma.$queryRaw<any[]>`SELECT * FROM campaigns WHERE id = ${req.params.id}`
      const targets = await prisma.$queryRaw<any[]>`
        SELECT id, target_type, target_id FROM campaign_targets WHERE campaign_id = ${req.params.id}`
      const placements = await prisma.$queryRaw<any[]>`
        SELECT * FROM campaign_placements WHERE campaign_id = ${req.params.id} ORDER BY display_order`
      const audience = await prisma.$queryRaw<any[]>`
        SELECT customer_email FROM campaign_audience WHERE campaign_id = ${req.params.id}`
      return { data: { ...full, targets, placements, audience: audience.map(a => a.customer_email) } }
    })

    secured.post('/', async (req: any, reply) => {
      const user = req.user as any
      const b = req.body || {}

      if (!b.title?.trim()) return reply.code(400).send({ message: 'Ο τίτλος είναι υποχρεωτικός' })
      if (!b.starts_at || !b.ends_at) {
        return reply.code(400).send({ message: 'Απαιτούνται ημερομηνίες έναρξης και λήξης' })
      }
      if (new Date(b.ends_at) <= new Date(b.starts_at)) {
        return reply.code(400).send({ message: 'Η λήξη πρέπει να είναι μετά την έναρξη' })
      }
      // Έκπτωση: ή και τα δύο ή κανένα
      const hasType = !!b.discount_type, hasValue = b.discount_value != null && b.discount_value !== ''
      if (hasType !== hasValue) {
        return reply.code(400).send({ message: 'Συμπλήρωσε και τύπο και ποσό έκπτωσης, ή κανένα' })
      }
      if (hasType) {
        if (!['percent', 'amount'].includes(b.discount_type)) {
          return reply.code(400).send({ message: 'Ο τύπος πρέπει να είναι percent ή amount' })
        }
        const v = Number(b.discount_value)
        if (!(v > 0)) return reply.code(400).send({ message: 'Το ποσό πρέπει να είναι θετικό' })
        if (b.discount_type === 'percent' && v > 100) {
          return reply.code(400).send({ message: 'Το ποσοστό δεν μπορεί να ξεπερνά το 100' })
        }
      }

      const id = uid()
      await prisma.$executeRaw`
        INSERT INTO campaigns
          (id, owner_email, owner_type, title, description, discount_type, discount_value,
           min_order, starts_at, ends_at, boost, is_active, created_at, updated_at)
        VALUES
          (${id}, ${user.email}, ${user.role === 'admin' ? 'platform' : 'provider'},
           ${String(b.title).trim()}, ${b.description ?? null},
           ${hasType ? b.discount_type : null},
           ${hasType ? Number(b.discount_value) : null},
           ${b.min_order != null && b.min_order !== '' ? Number(b.min_order) : null},
           ${new Date(b.starts_at)}, ${new Date(b.ends_at)},
           ${Number(b.boost) || 0}, ${b.is_active !== false}, now(), now())`

      audit(req, { action: 'create', resource: 'campaign', resourceId: id,
                   metadata: { title: b.title, discount: b.discount_type } })

      const [row] = await prisma.$queryRaw<any[]>`SELECT * FROM campaigns WHERE id = ${id}`
      return reply.code(201).send({ data: row })
    })

    secured.patch('/:id', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      const b = req.body || {}
      const id = req.params.id

      // Ενημερώνουμε πεδίο-πεδίο, μόνο ό,τι στάλθηκε.
      if ('title' in b)       await prisma.$executeRaw`UPDATE campaigns SET title = ${String(b.title).trim()} WHERE id = ${id}`
      if ('description' in b) await prisma.$executeRaw`UPDATE campaigns SET description = ${b.description ?? null} WHERE id = ${id}`
      if ('boost' in b)       await prisma.$executeRaw`UPDATE campaigns SET boost = ${Number(b.boost) || 0} WHERE id = ${id}`
      if ('is_active' in b)   await prisma.$executeRaw`UPDATE campaigns SET is_active = ${!!b.is_active} WHERE id = ${id}`
      if ('min_order' in b)   await prisma.$executeRaw`UPDATE campaigns SET min_order = ${b.min_order === '' || b.min_order == null ? null : Number(b.min_order)} WHERE id = ${id}`
      if ('starts_at' in b)   await prisma.$executeRaw`UPDATE campaigns SET starts_at = ${new Date(b.starts_at)} WHERE id = ${id}`
      if ('ends_at' in b)     await prisma.$executeRaw`UPDATE campaigns SET ends_at = ${new Date(b.ends_at)} WHERE id = ${id}`

      if ('discount_type' in b || 'discount_value' in b) {
        const t = b.discount_type || null
        const v = b.discount_value === '' || b.discount_value == null ? null : Number(b.discount_value)
        if ((t === null) !== (v === null)) {
          return reply.code(400).send({ message: 'Συμπλήρωσε και τύπο και ποσό έκπτωσης, ή κανένα' })
        }
        if (t && !['percent', 'amount'].includes(t)) {
          return reply.code(400).send({ message: 'Ο τύπος πρέπει να είναι percent ή amount' })
        }
        if (t === 'percent' && v! > 100) {
          return reply.code(400).send({ message: 'Το ποσοστό δεν μπορεί να ξεπερνά το 100' })
        }
        await prisma.$executeRaw`
          UPDATE campaigns SET discount_type = ${t}, discount_value = ${v} WHERE id = ${id}`
      }

      await prisma.$executeRaw`UPDATE campaigns SET updated_at = now() WHERE id = ${id}`
      audit(req, { action: 'update', resource: 'campaign', resourceId: id,
                   metadata: { fields: Object.keys(b) } })

      const [row] = await prisma.$queryRaw<any[]>`SELECT * FROM campaigns WHERE id = ${id}`
      return { data: row }
    })

    secured.delete('/:id', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      await prisma.$executeRaw`DELETE FROM campaigns WHERE id = ${req.params.id}`
      audit(req, { action: 'delete', resource: 'campaign', resourceId: req.params.id })
      return { success: true }
    })

    // ── Τι αφορά ──────────────────────────────────────────────────────
    secured.put('/:id/targets', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      const list = Array.isArray(req.body?.targets) ? req.body.targets : null
      if (!list) return reply.code(400).send({ message: 'Αναμένεται πίνακας targets' })

      for (const t of list) {
        if (!TARGET_TYPES.includes(t.target_type)) {
          return reply.code(400).send({ message: 'Άγνωστος τύπος στόχου', type: t.target_type, allowed: TARGET_TYPES })
        }
        const isAll = String(t.target_type).startsWith('all_')
        if (isAll && t.target_id) {
          return reply.code(400).send({ message: 'Οι στόχοι all_* δεν δέχονται αναγνωριστικό' })
        }
        if (!isAll && !t.target_id) {
          return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό στόχου', type: t.target_type })
        }
      }

      await prisma.$executeRaw`DELETE FROM campaign_targets WHERE campaign_id = ${req.params.id}`
      for (const t of list) {
        await prisma.$executeRaw`
          INSERT INTO campaign_targets (id, campaign_id, target_type, target_id, created_at)
          VALUES (${uid()}, ${req.params.id}, ${t.target_type}, ${t.target_id ?? null}, now())
          ON CONFLICT (campaign_id, target_type, target_id) DO NOTHING`
      }
      return { success: true, saved: list.length }
    })

    // ── Πού προβάλλεται ───────────────────────────────────────────────
    secured.put('/:id/placements', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      const list = Array.isArray(req.body?.placements) ? req.body.placements : null
      if (!list) return reply.code(400).send({ message: 'Αναμένεται πίνακας placements' })

      const seen = new Set<string>()
      for (const p of list) {
        if (!PAGES.includes(p.page)) {
          return reply.code(400).send({ message: 'Άγνωστη σελίδα', page: p.page, allowed: PAGES })
        }
        const slot = p.slot || 'banner'
        if (!SLOTS.includes(slot)) {
          return reply.code(400).send({ message: 'Άγνωστη θέση', slot, allowed: SLOTS })
        }
        const key = `${p.page}|${slot}`
        if (seen.has(key)) {
          return reply.code(400).send({ message: 'Διπλή θέση στην ίδια σελίδα', page: p.page, slot })
        }
        seen.add(key)
        if (p.media_type === 'video' && !p.media_url) {
          return reply.code(400).send({ message: 'Το βίντεο απαιτεί αρχείο ή σύνδεσμο' })
        }
        if (!isAllowedMedia(p.media_url)) {
          return reply.code(400).send({
            message: 'Μη επιτρεπόμενη πηγή. Υποστηρίζονται YouTube, Vimeo, ή αρχεία που ανέβασες.',
            url: p.media_url,
          })
        }
        // Ο σύνδεσμος προορισμού πρέπει να είναι εσωτερική διαδρομή.
        if (p.link_url && !String(p.link_url).startsWith('/')) {
          return reply.code(400).send({ message: 'Ο σύνδεσμος πρέπει να είναι εσωτερική διαδρομή' })
        }
      }

      await prisma.$executeRaw`DELETE FROM campaign_placements WHERE campaign_id = ${req.params.id}`
      let i = 0
      for (const p of list) {
        await prisma.$executeRaw`
          INSERT INTO campaign_placements
            (id, campaign_id, page, slot, media_type, media_url, link_url,
             headline, subtext, cta_label, display_order, is_active, created_at, updated_at)
          VALUES
            (${uid()}, ${req.params.id}, ${p.page}, ${p.slot || 'banner'},
             ${p.media_type || 'image'}, ${p.media_url ?? null}, ${p.link_url ?? null},
             ${p.headline ?? null}, ${p.subtext ?? null}, ${p.cta_label ?? null},
             ${i++}, ${p.is_active !== false}, now(), now())`
      }
      return { success: true, saved: list.length }
    })

    // ── Σε ποιους ─────────────────────────────────────────────────────
    secured.put('/:id/audience', async (req: any, reply) => {
      const c = await owns(req, reply, req.params.id)
      if (!c) return
      const emails = Array.isArray(req.body?.emails) ? req.body.emails : null
      if (!emails) return reply.code(400).send({ message: 'Αναμένεται πίνακας emails' })
      if (emails.length > 5000) return reply.code(400).send({ message: 'Πάρα πολλοί παραλήπτες' })

      await prisma.$executeRaw`DELETE FROM campaign_audience WHERE campaign_id = ${req.params.id}`
      for (const e of emails) {
        const email = String(e).trim().toLowerCase()
        if (!email) continue
        await prisma.$executeRaw`
          INSERT INTO campaign_audience (id, campaign_id, customer_email, created_at)
          VALUES (${uid()}, ${req.params.id}, ${email}, now())
          ON CONFLICT (campaign_id, customer_email) DO NOTHING`
      }
      audit(req, { action: 'update', resource: 'campaign_audience',
                   resourceId: req.params.id, metadata: { count: emails.length } })
      return { success: true, saved: emails.length }
    })
  })
}

export default campaignRoutes
