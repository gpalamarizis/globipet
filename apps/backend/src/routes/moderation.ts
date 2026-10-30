import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

/**
 * Αναφορά περιεχομένου και αποκλεισμός χρήστη.
 *
 * ΓΙΑΤΙ: App Store Review Guideline 1.2 (και πολιτική UGC του Google Play) —
 * κάθε εφαρμογή με περιεχόμενο χρηστών πρέπει να έχει (α) τρόπο αναφοράς
 * προσβλητικού περιεχομένου, (β) αποκλεισμό χρηστών, (γ) δράση εντός 24 ωρών.
 *
 *   Αναφορά  → αποθηκεύεται στο υπάρχον inbox επικοινωνίας του admin
 *              (contact_messages, θέμα «[Αναφορά] …») + email στο info@.
 *              Ο admin διαγράφει από το panel (τα DELETE των posts/forum
 *              δέχονται ήδη admin).
 *   Αποκλεισμός → user_blocks. Ο θεατής δεν βλέπει πια περιεχόμενο του
 *              αποκλεισμένου (βλ. lib/blocks.ts). Το email του αποκλεισμένου
 *              δεν επιστρέφεται ποτέ στον client.
 *
 * Το περιεχόμενο αναγνωρίζεται με (type, id) — ο client δεν ξέρει email.
 */

type Kind = 'post' | 'comment' | 'topic' | 'reply' | 'community_message'
const KINDS: Kind[] = ['post', 'comment', 'topic', 'reply', 'community_message']

const KIND_LABEL: Record<Kind, string> = {
  post: 'Δημοσίευση',
  comment: 'Σχόλιο',
  topic: 'Θέμα forum',
  reply: 'Απάντηση forum',
  community_message: 'Μήνυμα κοινότητας',
}

function esc(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Συντάκτης και απόσπασμα του περιεχομένου, ή null αν δεν υπάρχει. */
async function resolveContent(kind: Kind, id: string): Promise<{ author_email: string; author_name: string; excerpt: string } | null> {
  switch (kind) {
    case 'post': {
      const r = await prisma.post.findUnique({ where: { id }, select: { author_email: true, author_name: true, content: true } as any }) as any
      return r ? { author_email: r.author_email, author_name: r.author_name, excerpt: String(r.content ?? '') } : null
    }
    case 'comment': {
      const r = await prisma.postComment.findUnique({ where: { id }, select: { author_email: true, author_name: true, content: true } as any }) as any
      return r ? { author_email: r.author_email, author_name: r.author_name, excerpt: String(r.content ?? '') } : null
    }
    case 'topic': {
      const r = await prisma.forumTopic.findUnique({ where: { id }, select: { author_email: true, author_name: true, title: true, content: true } as any }) as any
      return r ? { author_email: r.author_email, author_name: r.author_name, excerpt: `${r.title ?? ''}\n${r.content ?? ''}` } : null
    }
    case 'reply': {
      const r = await prisma.forumReply.findUnique({ where: { id }, select: { author_email: true, author_name: true, content: true } as any }) as any
      return r ? { author_email: r.author_email, author_name: r.author_name, excerpt: String(r.content ?? '') } : null
    }
    case 'community_message': {
      const r = await prisma.communityMessage.findUnique({ where: { id }, select: { author_email: true, author_name: true, content: true, image_url: true } })
      return r ? { author_email: r.author_email, author_name: r.author_name, excerpt: String(r.content ?? r.image_url ?? '') } : null
    }
  }
}

function parseTarget(body: any): { kind: Kind; id: string } | null {
  const kind = String(body?.type ?? '') as Kind
  const id = String(body?.id ?? '').trim()
  if (!KINDS.includes(kind) || !id || id.length > 64) return null
  return { kind, id }
}

const moderationRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] }

  // ─── Αναφορά ───────────────────────────────────────────────────────
  app.post('/report', { ...auth, config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req: any, reply) => {
    const me = req.user as any
    const target = parseTarget(req.body)
    if (!target) return reply.code(400).send({ message: 'Μη έγκυρα δεδομένα' })
    const reason = String((req.body as any)?.reason ?? '').trim().slice(0, 1000)

    const content = await resolveContent(target.kind, target.id)
    if (!content) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const reporter = await prisma.user.findUnique({ where: { email: me.email }, select: { full_name: true } })
    const reporterName = (reporter?.full_name || me.email).slice(0, 120)
    const excerpt = content.excerpt.slice(0, 1500)
    const subject = `[Αναφορά] ${KIND_LABEL[target.kind]} ${target.id}`.slice(0, 200)
    const message = [
      `Τύπος: ${KIND_LABEL[target.kind]} (${target.kind})`,
      `ID: ${target.id}`,
      `Συντάκτης: ${content.author_name} <${content.author_email}>`,
      `Λόγος: ${reason || '—'}`,
      '',
      'Περιεχόμενο:',
      excerpt,
    ].join('\n').slice(0, 5000)

    const saved = await prisma.contactMessage.create({
      data: {
        name: reporterName,
        email: me.email,
        subject,
        message,
        user_email: me.email,
        ip_address: req.ip || null,
        user_agent: (req.headers['user-agent'] || '').toString().slice(0, 300) || null,
      },
    })

    await audit(req, {
      action: 'content_reported', resource: target.kind, resource_id: target.id,
      metadata: { contact_message_id: saved.id },
    } as any).catch(() => {})

    // Ειδοποίηση — η Apple ζητά δράση εντός 24 ωρών.
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const to = process.env.MODERATION_TO_EMAIL || process.env.CONTACT_TO_EMAIL || 'info@globipet.com'
      const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to,
          subject: `[GlobiPet · ΑΝΑΦΟΡΑ — δράση εντός 24 ωρών] ${KIND_LABEL[target.kind]}`,
          html: `<p style="white-space:pre-line">${esc(message)}</p><hr><p>Αναφορά από ${esc(reporterName)} &lt;${esc(me.email)}&gt;</p>`,
        }),
      }).catch(err => console.error('[moderation] notification email failed:', err?.message))
    } else {
      console.warn('[moderation] RESEND_API_KEY not set — report stored but nobody was notified')
    }

    return { success: true }
  })

  // ─── Αποκλεισμός ───────────────────────────────────────────────────
  app.post('/block', auth, async (req: any, reply) => {
    const me = req.user as any
    const target = parseTarget(req.body)
    if (!target) return reply.code(400).send({ message: 'Μη έγκυρα δεδομένα' })
    const content = await resolveContent(target.kind, target.id)
    if (!content) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const blocked = content.author_email.toLowerCase()
    if (blocked === String(me.email).toLowerCase()) {
      return reply.code(400).send({ message: 'Δεν μπορείς να αποκλείσεις τον εαυτό σου' })
    }
    await (prisma as any).userBlock.upsert({
      where: { blocker_email_blocked_email: { blocker_email: me.email, blocked_email: blocked } },
      update: { blocked_name: content.author_name?.slice(0, 120) || null },
      create: { blocker_email: me.email, blocked_email: blocked, blocked_name: content.author_name?.slice(0, 120) || null },
    })
    await audit(req, { action: 'user_blocked', resource: target.kind, resource_id: target.id } as any).catch(() => {})
    return { success: true }
  })

  /** Λίστα αποκλεισμένων — μόνο όνομα, ποτέ email. */
  app.get('/blocks', auth, async (req: any) => {
    const me = req.user as any
    const rows = await (prisma as any).userBlock.findMany({
      where: { blocker_email: me.email },
      orderBy: { created_at: 'desc' },
      select: { id: true, blocked_name: true, created_at: true },
      take: 1000,
    })
    return { data: rows }
  })

  app.delete('/blocks/:id', auth, async (req: any, reply) => {
    const me = req.user as any
    const r = await (prisma as any).userBlock.deleteMany({ where: { id: String(req.params.id), blocker_email: me.email } })
    if (!r.count) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    return { success: true }
  })
}

export default moderationRoutes
