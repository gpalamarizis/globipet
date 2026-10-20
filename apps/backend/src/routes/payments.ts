import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getVivaTransaction, isVivaDefinitiveRejection } from '../lib/viva.js'

/**
 * Κοινή επιστροφή από τη Viva.
 *
 * ΓΙΑΤΙ
 *   Η Viva στέλνει τον πελάτη μετά την πληρωμή στη Success/Failure URL που
 *   ορίζεται ΜΙΑ φορά στην πηγή πληρωμής (Sales → Online payments →
 *   Websites/Apps). Μία διεύθυνση για όλα: παραγγελίες, κρατήσεις,
 *   τηλεϊατρική, εκδηλώσεις. Ορίζουμε λοιπόν και τις δύο σε
 *   https://globipet.com/payment/return και από εδώ βρίσκουμε σε ποια σελίδα
 *   επιβεβαίωσης ανήκει η πληρωμή.
 *
 * GET /payments/return?t=<transactionId>&s=<orderCode>
 *   → { path } π.χ. "/bookings/<id>/confirmation"
 *
 *   · Με `t`: ρωτάμε τη Viva για τη συναλλαγή και διαβάζουμε το merchantTrns
 *     (το δικό μας αναγνωριστικό). Δουλεύει και αφού το webhook έχει ήδη
 *     γράψει το transaction id στη θέση του orderCode.
 *   · Χωρίς `t` (π.χ. ο πελάτης πάτησε «Ακύρωση»): ψάχνουμε το `s` στα
 *     αποθηκευμένα orderCode — η πληρωμή δεν έγινε, άρα είναι ακόμη εκεί.
 *   · Δεν επιστρέφει τίποτα άλλο από τη διαδρομή· η σελίδα επιβεβαίωσης κάνει
 *     τον δικό της έλεγχο δικαιωμάτων και πληρωμής.
 */
const TXN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE_RE = /^\d{6,20}$/

async function pathForMerchantTrns(m: string): Promise<string | null> {
  const ev = /^ev:([^:]+):/.exec(m)
  const regId = ev ? ev[1] : m
  const reg = await prisma.eventRegistration.findUnique({ where: { id: regId }, select: { event_id: true } })
  if (reg) return `/events/${reg.event_id}/confirmation`
  if (ev) return null
  if (await prisma.order.findUnique({ where: { id: m }, select: { id: true } })) return `/orders/${m}/confirmation`
  if (await prisma.booking.findUnique({ where: { id: m }, select: { id: true } })) return `/bookings/${m}/confirmation`
  if (await prisma.telehealthConsultation.findUnique({ where: { id: m }, select: { id: true } })) return `/telehealth/${m}/confirmation`
  return null
}

async function pathForOrderCode(code: string): Promise<string | null> {
  const o = await prisma.order.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (o) return `/orders/${o.id}/confirmation`
  const b = await prisma.booking.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (b) return `/bookings/${b.id}/confirmation`
  const c = await prisma.telehealthConsultation.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (c) return `/telehealth/${c.id}/confirmation`
  const r = await prisma.eventRegistration.findFirst({ where: { viva_order_code: code }, select: { event_id: true } })
  if (r) return `/events/${r.event_id}/confirmation`
  return null
}

const routes: FastifyPluginAsync = async (app) => {
  app.get('/return', async (req: any, reply) => {
    const t = typeof req.query?.t === 'string' ? req.query.t : ''
    const s = typeof req.query?.s === 'string' ? req.query.s : ''
    if (t && !TXN_RE.test(t)) return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
    if (s && !CODE_RE.test(s)) return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })

    if (t) {
      try {
        const tx = await getVivaTransaction(t)
        const m = String(tx?.merchantTrns ?? '')
        const p = m ? await pathForMerchantTrns(m) : null
        if (p) return { path: p }
      } catch (e: any) {
        // Προσωρινό σφάλμα Viva: ο browser ξαναδοκιμάζει. Οριστική άρνηση:
        // συνεχίζουμε με το orderCode.
        if (!isVivaDefinitiveRejection(e)) {
          if (!s) return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
      }
    }
    if (s) {
      const p = await pathForOrderCode(s)
      if (p) return { path: p }
    }
    return reply.code(404).send({ message: 'Δεν βρέθηκε' })
  })
}

export default routes
