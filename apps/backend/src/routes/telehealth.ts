import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import { createVivaPaymentOrder, getVivaTransaction, isVivaDefinitiveRejection } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { sendTelehealthConfirmedEmail, sendProviderNewTelehealthEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'
import { sendPushToUser } from '../lib/push.js'
import { serverError } from '../lib/errors.js'
import { getJaasConfig, signJaasJwt } from '../lib/jaas.js'
import {
  bookingStart, cancelTelehealth, telehealthCancellationTerms, CancelError, type CancelBy,
  rescheduleBlock, TELEHEALTH_LATE_CANCEL_USE_APP_MESSAGE,
} from '../lib/cancellation.js'
import { fullNameOf } from '../lib/userName.js'
import { refundExtraVivaPayment } from '../lib/extraPaymentRefund.js'

const TELEHEALTH_PAID_NO_DELETE = 'Η συνεδρία έχει πληρωθεί και δεν διαγράφεται. Χρησιμοποίησε ακύρωση.'

/**
 * Ειδοποίηση (in-app + push) για ακύρωση συνεδρίας: στον άλλον — ο πελάτης
 * ακυρώνει → ο πάροχος· ο πάροχος → ο πελάτης· ο admin → και οι δύο. Ο
 * πελάτης μαθαίνει και το ποσό που επιστρέφεται.
 */
function notifyTelehealthCancelled(c: any, by: CancelBy, refund: number) {
  const targets: Array<{ email: string; link: string; refund: string | null }> = []
  if (by !== 'customer') targets.push({ email: c.client_email, link: '/telehealth', refund: refund > 0 ? refund.toFixed(2) : null })
  if (by !== 'provider') targets.push({ email: c.provider_email, link: '/provider', refund: null })
  for (const tg of targets) {
    void (async () => {
      const lang = await langOfUser(tg.email)
      const notification = await prisma.notification.create({
        data: {
          user_email: tg.email,
          title: notifyTitle('telehealth_cancelled', lang),
          message: notifyMsg.telehealthCancelled(lang, c.scheduled_date, c.scheduled_time, tg.refund),
          type: 'telehealth_cancelled',
          link: tg.link,
        },
      })
      broadcastToUser(tg.email, { type: 'notification', notification })
      void sendPushToUser(tg.email, {
        title: notification.title, body: notification.message, url: notification.link ?? '/',
      })
    })().catch(() => {})
  }
}

// Παράθυρο κλήσης: από 30 λεπτά πριν την ώρα της συνεδρίας έως 3 ώρες μετά.
const CALL_OPENS_BEFORE_MS = 30 * 60_000
const CALL_CLOSES_AFTER_MS = 3 * 3_600_000

// Fires once when a consultation is confirmed paid: generates the meeting room,
// sends customer + provider emails, and notifies the provider in-app.
// Exported (top-level) so orders.ts's shared Viva webhook can call it as a fallback
// when a paid merchantTrns id doesn't match an Order (i.e. it's a telehealth payment).
//
// Καλείται ΜΟΝΟ μετά από verifyConsultationPayment === 'ok'. Μόνο απλήρωτη,
// μη ακυρωμένη συνεδρία γίνεται πληρωμένη. Η ίδια συναλλαγή ξανά (payment_ref
// === txn: πριν την πληρωμή το payment_ref κρατά τον orderCode) → τίποτα.
// ΑΛΛΗ συναλλαγή για ήδη πληρωμένη/επιστραμμένη συνεδρία, ή πληρωμή που
// φτάνει αφού ακυρώθηκε → αυτόματη πλήρης επιστροφή μία φορά
// (lib/extraPaymentRefund). Πριν, η επιπλέον πληρωμή έβρισκε count 0 και
// χανόταν, και η καθυστερημένη ξανάνοιγε την ακυρωμένη συνεδρία σε 'scheduled'.
export async function markTelehealthPaid(consultationId: string, transactionId: string): Promise<boolean> {
  const txn = String(transactionId)
  const updated = await prisma.telehealthConsultation.updateMany({
    where: { id: consultationId, payment_status: 'unpaid', status: { not: 'cancelled' } },
    data: {
      payment_status: 'paid',
      status: 'scheduled',
      payment_ref: txn,
      meeting_url: `globipet-th-${consultationId}`,
    },
  })
  if (updated.count === 0) {
    const fresh = await prisma.telehealthConsultation.findUnique({
      where: { id: consultationId }, select: { status: true, payment_status: true, payment_ref: true },
    })
    if (!fresh || fresh.payment_ref === txn) return false
    if (fresh.payment_status === 'paid' && !fresh.payment_ref) {
      console.error(`[viva] consultation ${consultationId} is paid without payment_ref; transaction ${txn} left for manual review`)
      return false
    }
    const why = fresh.payment_status === 'paid'
      ? 'duplicate payment of an already paid consultation'
      : `consultation is ${fresh.status}/${fresh.payment_status}`
    await refundExtraVivaPayment('telehealth', consultationId, txn, why)
    return false
  }

  const consultation = await prisma.telehealthConsultation.findUnique({ where: { id: consultationId } })
  if (!consultation) return true

  sendTelehealthConfirmedEmail(consultation.client_email, {
    customerName: consultation.client_name,
    providerName: consultation.provider_name,
    date: consultation.scheduled_date,
    time: consultation.scheduled_time,
  }).catch(() => {})

  sendProviderNewTelehealthEmail(consultation.provider_email, {
    providerName: consultation.provider_name,
    customerName: consultation.client_name,
    date: consultation.scheduled_date,
    time: consultation.scheduled_time,
    payoutAmount: consultation.provider_payout_amount || 0,
  }).catch(() => {})

  const nLang = await langOfUser(consultation.provider_email)
  prisma.notification.create({
    data: {
      user_email: consultation.provider_email,
      title: notifyTitle('incoming_call', nLang),
      message: notifyMsg.incomingCall(nLang, consultation.client_name, consultation.scheduled_date, consultation.scheduled_time),
      type: 'incoming_call',
      link: `/provider/telehealth/${consultation.id}`,
    },
  }).then(notification => {
    // Standard notification push
    broadcastToUser(consultation.provider_email, { type: 'notification', notification })
    // Η τηλεϊατρική είναι η πιο επείγουσα ειδοποίηση της πλατφόρμας: ο
    // ασθενής έχει ήδη πληρώσει και περιμένει. Πρέπει να φτάσει και με
    // κλειστή εφαρμογή.
    void sendPushToUser(consultation.provider_email, {
      title: notification.title, body: notification.message, url: notification.link ?? '/',
    })
    // Also send dedicated incoming_call event so provider UI can show a prominent alert
    broadcastToUser(consultation.provider_email, {
      type: 'incoming_call',
      consultation_id: consultation.id,
      client_name: consultation.client_name,
      pet_name: consultation.pet_name,
      meeting_url: consultation.meeting_url,
    })
  }).catch(() => {})

  return true
}

// Returns the TelehealthConsultation row if `id` matches one — used by orders.ts's
// shared Viva webhook to detect which kind of payment just succeeded.
export async function findTelehealthById(id: string) {
  return prisma.telehealthConsultation.findUnique({ where: { id } })
}


/**
 * Confirm with Viva that a transaction really paid a given consultation.
 *
 * The verify route below only asked whether the transaction had succeeded.
 * It never asked whether it was for this consultation, or for enough money —
 * so any successful transaction id the caller happened to hold, including a
 * cheap one of their own, could mark a session paid.
 *
 *   'ok'        — επαληθεύτηκε
 *   'not_found' — δεν υπάρχει συνεδρία με αυτό το id
 *   'invalid'   — η Viva απάντησε: η συναλλαγή δεν πληρώνει αυτή τη συνεδρία
 *   'error'     — η βάση δεν απάντησε (πριν: 'not_found', και το webhook
 *                 αγνοούσε την πληρωμή), ή η συνεδρία υπάρχει αλλά η
 *                 επαλήθευση δεν ολοκληρώθηκε (Viva
 *                 5xx/429, timeout, δίκτυο, διαπιστευτήρια): πρέπει να ξαναγίνει
 *                 — το webhook απαντά 503 και το verify 503. Πριν ήταν «άκυρη»
 *                 και η πληρωμή χανόταν.
 */
export async function verifyConsultationPayment(consultationId: string, transactionId: string): Promise<'ok' | 'not_found' | 'invalid' | 'error'> {
  let c
  try {
    c = await prisma.telehealthConsultation.findUnique({ where: { id: consultationId } })
  } catch (err: any) {
    console.error('[viva] consultation lookup error (will retry):', err?.message)
    return 'error'
  }
  if (!c) return 'not_found'
  try {
    const tx = await getVivaTransaction(transactionId)
    if (!tx || tx.statusId !== 'F') return 'invalid'

    const trns = String(tx.merchantTrns ?? tx.MerchantTrns ?? '')
    if (trns !== consultationId) {
      console.error(`[viva] transaction ${transactionId} belongs to ${trns}, not ${consultationId}`)
      return 'invalid'
    }

    const paid = Number(tx.amount ?? tx.Amount ?? 0)
    if (Number.isFinite(paid) && paid + 0.01 < c.price) {
      console.error(`[viva] transaction ${transactionId} paid ${paid}, session costs ${c.price}`)
      return 'invalid'
    }
    return 'ok'
  } catch (err: any) {
    if (isVivaDefinitiveRejection(err)) {
      console.error('[viva] consultation transaction rejected by Viva:', err?.message)
      return 'invalid'
    }
    console.error('[viva] consultation verification error (will retry):', err?.message)
    return 'error'
  }
}

/** Συμβατότητα: «πληρώνει αυτή η συναλλαγή τη συνεδρία;» */
export async function vivaPaidConsultation(consultationId: string, transactionId: string): Promise<boolean> {
  return (await verifyConsultationPayment(consultationId, transactionId)) === 'ok'
}

/** Μορφή του transaction id της Viva (UUID) — όπως στο verify των κρατήσεων. */
const VIVA_TXN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const routes: FastifyPluginAsync = async (app) => {

  // GET /telehealth/available-now — public, returns vets currently online
  app.get('/available-now', async (_req, reply) => {
    const vets = await prisma.service.findMany({
      where: { service_type: 'veterinary', is_active: true, is_available_now: true },
      orderBy: { available_since: 'asc' },
    })
    return reply.send({ data: vets })
  })

  // PATCH /telehealth/availability — provider toggles their own availability
  app.patch('/availability', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, role } = req.user as any
    const { is_available } = req.body as { is_available: boolean }

    // Only providers own a service row, so anyone else calling this is either
    // confused or probing. Reject explicitly instead of silently updating zero rows.
    if (role !== 'admin' && role !== 'service_provider' && role !== 'both') {
      return reply.code(403).send({ message: 'Μόνο πάροχοι μπορούν να αλλάξουν διαθεσιμότητα' })
    }

    const updated = await prisma.service.updateMany({
      where: { provider_email: email, service_type: 'veterinary' },
      data: {
        is_available_now: is_available,
        available_since: is_available ? new Date() : null,
      },
    })

    if (updated.count === 0) {
      return reply.code(404).send({ message: 'Δεν βρέθηκε κτηνιατρική υπηρεσία για αυτόν τον πάροχο' })
    }

    // Broadcast availability change so telehealth page updates in real-time
    broadcastToUser('__all__', {
      type: 'vet_availability_change',
      provider_email: email,
      is_available_now: is_available,
    })

    return reply.send({ ok: true, is_available_now: is_available })
  })

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.telehealthConsultation.findMany({
      where: { OR: [{ client_email: email }, { provider_email: email }] },
      orderBy: { scheduled_date: 'desc' },
    })
    return { data }
  })

  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const consultation = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!consultation) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (consultation.client_email !== email && consultation.provider_email !== email) {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    return { data: consultation }
  })

  // GET /telehealth/:id/call — στοιχεία εισόδου στη βιντεοκλήση.
  //
  // Ίδιοι κανόνες με το meeting_url: μόνο ο πελάτης ή ο πάροχος της
  // συνεδρίας, μόνο όταν έχει πληρωθεί (το meeting_url ορίζεται μόνο από το
  // markTelehealthPaid), και όχι σε ακυρωμένη συνεδρία.
  // Με JaaS ρυθμισμένο: 8x8.vc + JWT (ο πάροχος moderator). Χωρίς: meet.jit.si
  // με το ίδιο δωμάτιο, όπως πριν.
  app.get('/:id/call', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id: userId, email } = req.user as any
    const c = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!c) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const isClient = c.client_email === email
    const isProvider = c.provider_email === email
    if (!isClient && !isProvider) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    // Ακυρωμένη (ή ακύρωση σε εξέλιξη): πρώτα, ώστε το μήνυμα να λέει την
    // αιτία και όχι «δεν έχει πληρωθεί» (μετά την επιστροφή payment_status ≠ paid).
    if (c.status === 'cancelled') {
      return reply.code(409).send({ message: 'Η συνεδρία έχει ακυρωθεί' })
    }
    if (c.payment_status === 'refunding') {
      return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
    }
    if (c.payment_status !== 'paid' || !c.meeting_url) {
      return reply.code(409).send({ message: 'Η συνεδρία δεν έχει πληρωθεί ακόμα' })
    }

    // Παράθυρο εισόδου (ώρα Ελλάδας). Άμεση κλήση = συνεδρία με ώρα τη
    // στιγμή της κράτησης (ή νωρίτερα): το παράθυρο ανοίγει αμέσως και
    // κλείνει 3 ώρες μετά την κράτηση. Αδιάβαστη ημερομηνία: δεν μπλοκάρει.
    const start = bookingStart(c.scheduled_date, c.scheduled_time)
    if (start) {
      const opensAt = start.getTime() - CALL_OPENS_BEFORE_MS
      const closesAt = Math.max(start.getTime(), c.created_at.getTime()) + CALL_CLOSES_AFTER_MS
      const now = Date.now()
      if (now < opensAt || now > closesAt) {
        return reply.code(409).send({
          message: 'Η κλήση είναι διαθέσιμη από 30 λεπτά πριν έως 3 ώρες μετά την ώρα της συνεδρίας',
          opens_at: new Date(opensAt).toISOString(),
          closes_at: new Date(closesAt).toISOString(),
        })
      }
    }

    const jaas = getJaasConfig()
    if (!jaas) {
      return { data: { domain: 'meet.jit.si', room: c.meeting_url, jwt: null, app_id: null } }
    }

    try {
      const u = await prisma.user.findUnique({
        where: { email },
        select: { id: true, full_name: true, profile_photo: true },
      })
      const jwt = signJaasJwt(jaas, c.meeting_url, {
        id: u?.id || userId || email,
        name: u?.full_name || (isProvider ? c.provider_name : c.client_name) || email,
        email,
        avatar: u?.profile_photo || null,
        moderator: isProvider,
      })
      return { data: { domain: '8x8.vc', room: `${jaas.appId}/${c.meeting_url}`, jwt, app_id: jaas.appId } }
    } catch (err) {
      return serverError(reply, err, 'telehealth-call')
    }
  })

  // Create a pending consultation and start Viva Smart Checkout. Payment MUST be confirmed
  // (via /:id/viva/verify or the shared orders.ts webhook fallback) before meeting_url is set.
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { provider_email, service_id, pet_id, pet_name, scheduled_date, scheduled_time, duration, notes } = req.body as any
    if (!provider_email || !scheduled_date || !scheduled_time) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    // The price is read from the provider's service row, never from the body.
    // A client-supplied `price` previously went straight into the Viva charge,
    // so a consultation could be booked for a cent.
    const service = service_id
      ? await prisma.service.findUnique({ where: { id: service_id } })
      : await prisma.service.findFirst({
          where: { provider_email, service_type: 'veterinary', is_active: true },
        })

    if (!service) {
      return reply.code(404).send({ message: 'Η υπηρεσία τηλεϊατρικής δεν βρέθηκε' })
    }
    if (service.provider_email !== provider_email) {
      return reply.code(400).send({ message: 'Η υπηρεσία δεν ανήκει στον συγκεκριμένο πάροχο' })
    }

    // Booking a consultation with yourself would create a payment loop where
    // the platform fee is charged on money moving between the same two hands.
    if (provider_email === email) {
      return reply.code(400).send({ message: 'Δεν μπορείς να κλείσεις ραντεβού με τον εαυτό σου' })
    }

    // A consultation may reference a pet, but only one the caller owns.
    if (pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_email: true } })
      if (!pet || pet.owner_email !== email) {
        return reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      }
    }

    const sessionPrice = service.price ?? 0
    const { rate, platformFee, providerPayout } = await calculateCommission(sessionPrice, 'telehealth')
    const clientName = full_name || await fullNameOf(email)

    const consultation = await prisma.telehealthConsultation.create({
      data: {
        provider_email,
        provider_name: service.provider_name || provider_email,
        // Το JWT δεν έχει full_name: το όνομα από τη βάση (lib/userName).
        client_email: email, client_name: clientName,
        pet_id: pet_id || null, pet_name: pet_name || null,
        service_id: service.id,
        scheduled_date, scheduled_time,
        duration: parseInt(duration) || 30,
        notes: notes || null,
        price: sessionPrice,
        status: 'pending_payment',
        payment_status: 'unpaid',
        commission_rate: rate,
        platform_fee_amount: platformFee,
        provider_payout_amount: providerPayout,
      }
    })

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'
      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        amount: sessionPrice,
        customerEmail: email,
        customerName: clientName,
        orderId: consultation.id,
        description: `GlobiPet τηλεϊατρική με ${service.provider_name || provider_email}`,
        successUrl: `${frontendUrl}/telehealth/${consultation.id}/confirmation`,
        failureUrl: `${frontendUrl}/telehealth/${consultation.id}/confirmation`,
      })
      await prisma.telehealthConsultation.update({
        where: { id: consultation.id },
        data: { payment_ref: String(orderCode) },
      })
      return reply.code(201).send({ data: consultation, checkoutUrl })
    } catch (err: any) {
      console.error('Telehealth Viva checkout error:', err)
      return serverError(reply, err, 'telehealth-checkout', 'Η πληρωμή δεν ξεκίνησε.')
    }
  })

  // Manual verify (called from the confirmation page after Viva redirect)
  app.post('/:id/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id } = req.params
    const { transaction_id } = (req.body ?? {}) as any
    try {
      const consultation = await prisma.telehealthConsultation.findUnique({ where: { id } })
      if (!consultation) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
      // Μόνο ο πελάτης ή ο πάροχος της συνεδρίας: η απάντηση περιέχει το
      // δωμάτιο της κλήσης (meeting_url) και τα στοιχεία της συνεδρίας.
      const { email } = req.user as any
      if (consultation.client_email !== email && consultation.provider_email !== email) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }

      // Ήδη πληρωμένη με ΑΥΤΗ τη συναλλαγή (ή χωρίς συναλλαγή στο αίτημα):
      // χωρίς ερώτηση στη Viva. Με ΑΛΛΗ συναλλαγή συνεχίζει στην επαλήθευση,
      // ώστε η επιπλέον πληρωμή να επιστραφεί (markTelehealthPaid).
      if (consultation.payment_status === 'paid'
        && (!transaction_id || consultation.payment_ref === transaction_id)) {
        return { paid: true, data: consultation }
      }
      // Το transaction id της Viva είναι UUID· οτιδήποτε άλλο δεν φτάνει στη Viva.
      if (transaction_id != null && transaction_id !== ''
        && (typeof transaction_id !== 'string' || !VIVA_TXN_RE.test(transaction_id))) {
        return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
      }
      if (transaction_id) {
        const verdict = await verifyConsultationPayment(String(id), String(transaction_id))
        // Η Viva δεν απάντησε (5xx/δίκτυο): 503, ο πελάτης ξαναδοκιμάζει.
        if (verdict === 'error') {
          return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
        if (verdict === 'ok') {
          await markTelehealthPaid(id, transaction_id)
          const fresh = await prisma.telehealthConsultation.findUnique({ where: { id } })
          // Επιστράφηκε (ακυρωμένη/επιστραμμένη συνεδρία) → paid: false.
          return { paid: fresh?.payment_status === 'paid', data: fresh }
        }
      }
      return { paid: false, data: consultation }
    } catch (err: any) {
      console.error('Telehealth verify error:', err)
      return serverError(reply, err, 'telehealth')
    }
  })

  // Ποιος ακυρώνει: admin, ο πελάτης ή ο πάροχος της συνεδρίας (αλλιώς null).
  const cancelRole = (c: any, user: any): CancelBy | null =>
    user?.role === 'admin' ? 'admin'
      : c.client_email === user?.email ? 'customer'
      : c.provider_email === user?.email ? 'provider'
      : null

  /**
   * GET /telehealth/:id/cancel-preview — τι θα γίνει αν ακυρωθεί τώρα
   * (ίδια πολιτική με τις κρατήσεις). Το web και το κινητό το δείχνουν ΠΡΙΝ
   * την επιβεβαίωση.
   */
  app.get('/:id/cancel-preview', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const c = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!c) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const by = cancelRole(c, req.user)
    if (!by) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    const terms = telehealthCancellationTerms(c, by)
    // Ακύρωση σε εξέλιξη: όχι ξανά (το POST θα έδινε 409).
    if (c.payment_status === 'refunding') return { data: { ...terms, allowed: false, reason: 'in_progress' } }
    // Μερικώς επιστραμμένη ή «πληρωμένη» χωρίς αναφορά πληρωμής: η POST
    // απαντά 409 (μόνο από την υποστήριξη) — το ίδιο και εδώ, πριν την επιβεβαίωση.
    if (terms.allowed && !terms.paid && !['unpaid', 'refunded'].includes(c.payment_status)) {
      return { data: { ...terms, allowed: false, reason: 'contact_support' } }
    }
    return { data: terms }
  })

  // Κοινή εκτέλεση ακύρωσης για POST /:id/cancel και PATCH { status: 'cancelled' }.
  // POST: { data, refund, fee }. PATCH (συμβατότητα): η συνεδρία όπως πριν, με refund/fee.
  const runCancel = async (req: any, reply: any, c: any, by: CancelBy, shape: 'post' | 'patch') => {
    try {
      const r = await cancelTelehealth(req, c.id, by)
      notifyTelehealthCancelled(r.consultation, by, r.terms.refund)
      return shape === 'post'
        ? { data: r.consultation, refund: r.terms.refund, fee: r.terms.fee }
        : { ...r.consultation, refund: r.terms.refund, fee: r.terms.fee }
    } catch (err: any) {
      if (err instanceof CancelError) return reply.code(err.code).send({ message: err.message })
      return serverError(reply, err, 'telehealth-cancel')
    }
  }

  /** POST /telehealth/:id/cancel — πελάτης ή πάροχος της συνεδρίας ή admin, με την πολιτική (lib/cancellation). */
  app.post('/:id/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const c = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!c) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const by = cancelRole(c, req.user)
    if (!by) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return runCancel(req, reply, c, by, 'post')
  })

  // PATCH — whitelisted fields only.
  //
  // The previous version passed req.body straight into the update, so a client
  // could send { payment_status: 'paid', status: 'scheduled' } and hold a paid
  // consultation without ever paying. Payment state is set exclusively by the
  // Viva verify route and the webhook.
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const isClient = existing.client_email === email
    const isProvider = existing.provider_email === email
    if (!isClient && !isProvider) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const body = (req.body ?? {}) as any

    // Ακύρωση: ίδια λογική με το POST /:id/cancel (πολιτική και επιστροφή
    // πληρωμένης). Συμβατότητα με όσους στέλνουν PATCH { status: 'cancelled' }:
    // η απάντηση είναι η συνεδρία όπως πριν, με refund/fee επιπλέον.
    if (body.status === 'cancelled') {
      const by: CancelBy = isClient ? 'customer' : 'provider'
      // Η παλιά εφαρμογή δεν δείχνει τους όρους πριν την ακύρωση: αργή
      // ακύρωση πληρωμένης (με χρέωση) δεν γίνεται από εδώ — ο χρήστης θα
      // έχανε ποσό χωρίς να το έχει δει. Δωρεάν (fee 0) → κανονικά, 100%.
      // Το POST /:id/cancel (νέες εφαρμογές, με προεπισκόπηση) μένει ως έχει.
      const terms = telehealthCancellationTerms(existing, by)
      if (existing.payment_status !== 'refunding' && terms.allowed && terms.paid && terms.fee > 0) {
        return reply.code(409).send({ message: TELEHEALTH_LATE_CANCEL_USE_APP_MESSAGE })
      }
      return runCancel(req, reply, existing, by, 'patch')
    }

    const data: any = {}

    // Both sides may reschedule and leave notes. These are the only free-text
    // and scheduling fields the model actually has.
    if (body.scheduled_date !== undefined) data.scheduled_date = body.scheduled_date
    if (body.scheduled_time !== undefined) data.scheduled_time = body.scheduled_time
    // Μετάθεση πληρωμένης συνεδρίας: πολιτική ακύρωσης (lib/cancellation rescheduleBlock).
    if ((data.scheduled_date !== undefined && data.scheduled_date !== existing.scheduled_date)
      || (data.scheduled_time !== undefined && data.scheduled_time !== existing.scheduled_time)) {
      const block = rescheduleBlock(existing.payment_status, isClient,
        { date: existing.scheduled_date, time: existing.scheduled_time },
        { date: data.scheduled_date ?? existing.scheduled_date, time: data.scheduled_time ?? existing.scheduled_time })
      if (block) return reply.code(block.code).send({ message: block.message })
    }
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.duration !== undefined) data.duration = parseInt(body.duration) || existing.duration

    // Status may only move to cancelled or completed, and only from a state
    // where that makes sense. Everything else is driven by the payment flow.
    if (body.status !== undefined) {
      const paid = existing.payment_status === 'paid'
      if (body.status === 'completed' && isProvider && paid) {
        data.status = 'completed'
      } else {
        return reply.code(400).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
      }
    }

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }

    return prisma.telehealthConsultation.update({ where: { id: existing.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.client_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    // A paid consultation is a financial record — cancel it instead of erasing
    // it, so the payment, commission and payout trail stay intact. Το ίδιο και
    // για ακύρωση σε εξέλιξη ή επιστραμμένη (αλλιώς η εργασία των κολλημένων
    // επιστροφών και το ίχνος της επιστροφής θα έχαναν τη συνεδρία).
    if (['paid', 'refunding', 'refunded', 'partially_refunded'].includes(existing.payment_status)) {
      return reply.code(400).send({
        message: TELEHEALTH_PAID_NO_DELETE,
      })
    }
    await prisma.telehealthConsultation.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })
}

export default routes