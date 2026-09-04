import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createVivaPaymentOrder, getVivaTransaction } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { sendTelehealthConfirmedEmail, sendProviderNewTelehealthEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'

// Fires once when a consultation is confirmed paid: generates the meeting room,
// sends customer + provider emails, and notifies the provider in-app.
// Exported (top-level) so orders.ts's shared Viva webhook can call it as a fallback
// when a paid merchantTrns id doesn't match an Order (i.e. it's a telehealth payment).
export async function markTelehealthPaid(consultationId: string, transactionId: string): Promise<boolean> {
  const updated = await prisma.telehealthConsultation.updateMany({
    where: { id: consultationId, payment_status: { not: 'paid' } },
    data: {
      payment_status: 'paid',
      status: 'scheduled',
      payment_ref: String(transactionId),
      meeting_url: `globipet-th-${consultationId}`,
    },
  })
  if (updated.count === 0) return false

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

  prisma.notification.create({
    data: {
      user_email: consultation.provider_email,
      title: '🔔 Ασθενής σε περιμένει!',
      message: `${consultation.client_name} πλήρωσε και σε περιμένει για τηλεϊατρική · ${consultation.scheduled_date} ${consultation.scheduled_time}`,
      type: 'incoming_call',
      link: `/provider/telehealth/${consultation.id}`,
    },
  }).then(notification => {
    // Standard notification push
    broadcastToUser(consultation.provider_email, { type: 'notification', notification })
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

    const consultation = await prisma.telehealthConsultation.create({
      data: {
        provider_email,
        provider_name: service.provider_name || provider_email,
        client_email: email, client_name: full_name || email.split('@')[0],
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
        customerName: full_name,
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
      return reply.code(500).send({ message: 'Σφάλμα δημιουργίας πληρωμής: ' + err.message })
    }
  })

  // Manual verify (called from the confirmation page after Viva redirect)
  app.post('/:id/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id } = req.params
    const { transaction_id } = req.body as any
    try {
      const consultation = await prisma.telehealthConsultation.findUnique({ where: { id } })
      if (!consultation) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

      if (consultation.payment_status === 'paid') {
        return { paid: true, data: consultation }
      }
      if (transaction_id) {
        const transaction = await getVivaTransaction(transaction_id)
        if (transaction.statusId === 'F') {
          await markTelehealthPaid(id, transaction_id)
          const fresh = await prisma.telehealthConsultation.findUnique({ where: { id } })
          return { paid: true, data: fresh }
        }
      }
      return { paid: false, data: consultation }
    } catch (err: any) {
      console.error('Telehealth verify error:', err)
      return reply.code(500).send({ message: err.message })
    }
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
    const data: any = {}

    // Both sides may reschedule and leave notes. These are the only free-text
    // and scheduling fields the model actually has.
    if (body.scheduled_date !== undefined) data.scheduled_date = body.scheduled_date
    if (body.scheduled_time !== undefined) data.scheduled_time = body.scheduled_time
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.duration !== undefined) data.duration = parseInt(body.duration) || existing.duration

    // Status may only move to cancelled or completed, and only from a state
    // where that makes sense. Everything else is driven by the payment flow.
    if (body.status !== undefined) {
      const paid = existing.payment_status === 'paid'
      if (body.status === 'cancelled') {
        data.status = 'cancelled'
      } else if (body.status === 'completed' && isProvider && paid) {
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
    // it, so the payment, commission and payout trail stay intact.
    if (existing.payment_status === 'paid') {
      return reply.code(400).send({
        message: 'Η συνεδρία έχει πληρωθεί και δεν διαγράφεται. Χρησιμοποίησε ακύρωση.',
      })
    }
    await prisma.telehealthConsultation.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })
}

export default routes