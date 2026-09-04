import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * The public contact form.
 *
 * ContactPage has always posted to /api/contact. No such route existed, so
 * every message anyone sent through the website was answered with a generic
 * "something went wrong" and lost — including, presumably, sales enquiries.
 *
 * Messages are stored as well as emailed. Resend can be down, an API key can
 * expire, and a contact form that depends entirely on a third party to
 * remember anything is a contact form that quietly drops mail.
 */

const MAX = { name: 120, email: 200, subject: 200, message: 5000 }

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

const contactRoutes: FastifyPluginAsync = async (app) => {

  app.post('/', async (req: any, reply) => {
    const b = (req.body ?? {}) as any
    const name = String(b.name || '').trim().slice(0, MAX.name)
    const email = String(b.email || '').trim().toLowerCase().slice(0, MAX.email)
    const subject = String(b.subject || '').trim().slice(0, MAX.subject)
    const message = String(b.message || '').trim().slice(0, MAX.message)

    if (!name || !email || !message) {
      return reply.code(400).send({ message: 'Συμπλήρωσε όνομα, email και μήνυμα' })
    }
    if (!looksLikeEmail(email)) {
      return reply.code(400).send({ message: 'Μη έγκυρο email' })
    }

    // A bot filling every field in a form usually fills the honeypot too.
    // The response is a success either way, so it learns nothing.
    if (b.website || b.company) {
      return { success: true }
    }

    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip || null

    const saved = await prisma.contactMessage.create({
      data: {
        name, email, subject: subject || null, message,
        ip_address: ip,
        user_agent: (req.headers['user-agent'] || '').toString().slice(0, 300) || null,
        // Attribute it to the account when the sender happens to be logged in.
        user_email: (req.user as any)?.email ?? null,
      },
    })

    // Email is the notification, not the record. A failure here does not lose
    // the message and does not fail the request.
    const apiKey = process.env.RESEND_API_KEY
    const to = process.env.CONTACT_TO_EMAIL || 'info@globipet.com'
    const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
    if (apiKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          // So hitting reply in the mail client answers the person who wrote.
          reply_to: email,
          subject: subject ? `[GlobiPet] ${subject}` : `[GlobiPet] Μήνυμα από ${name}`,
          html: `<p><strong>${name}</strong> &lt;${email}&gt;</p>`
              + (subject ? `<p><strong>Θέμα:</strong> ${subject}</p>` : '')
              + `<hr><p style="white-space:pre-line">${message.replace(/</g, '&lt;')}</p>`,
        }),
      }).catch(err => console.error('[contact] notification email failed:', err?.message))
    } else {
      console.warn('[contact] RESEND_API_KEY not set — message stored but nobody was notified')
    }

    return { success: true, id: saved.id }
  })

  // ─── Admin ─────────────────────────────────────────────────────────

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
  }

  app.get('/messages', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any) => {
    const { status, limit } = req.query ?? {}
    const take = Math.min(Math.max(parseInt(limit) || 100, 1), 500)
    const data = await prisma.contactMessage.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take,
    })
    const unread = await prisma.contactMessage.count({ where: { status: 'new' } })
    return { data, unread }
  })

  app.patch('/messages/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { status, notes } = (req.body ?? {}) as any
    const ALLOWED = ['new', 'read', 'replied', 'archived']
    const data: any = {}
    if (status !== undefined) {
      if (!ALLOWED.includes(status)) {
        return reply.code(400).send({ message: 'Μη έγκυρη κατάσταση', allowed: ALLOWED })
      }
      data.status = status
    }
    if (notes !== undefined) data.notes = notes ? String(notes).slice(0, 2000) : null
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    const updated = await prisma.contactMessage.update({ where: { id: req.params.id }, data })
    return { data: updated }
  })

  app.delete('/messages/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default contactRoutes
