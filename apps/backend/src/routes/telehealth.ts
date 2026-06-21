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
      title: 'Νέα συνεδρία τηλεϊατρικής',
      message: `${consultation.client_name} · ${consultation.scheduled_date} ${consultation.scheduled_time} · αμοιβή ${(consultation.provider_payout_amount || 0).toFixed(2)}€`,
      type: 'new_telehealth',
      link: '/provider',
    },
  }).then(notification => broadcastToUser(consultation.provider_email, { type: 'notification', notification })).catch(() => {})

  return true
}

// Returns the TelehealthConsultation row if `id` matches one — used by orders.ts's
// shared Viva webhook to detect which kind of payment just succeeded.
export async function findTelehealthById(id: string) {
  return prisma.telehealthConsultation.findUnique({ where: { id } })
}

const routes: FastifyPluginAsync = async (app) => {

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
    const { provider_email, provider_name, service_id, pet_id, pet_name, scheduled_date, scheduled_time, duration, notes, price } = req.body as any
    if (!provider_email || !scheduled_date || !scheduled_time) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const sessionPrice = parseFloat(price) || 0
    const { rate, platformFee, providerPayout } = await calculateCommission(sessionPrice, 'telehealth')

    const consultation = await prisma.telehealthConsultation.create({
      data: {
        provider_email, provider_name: provider_name || provider_email,
        client_email: email, client_name: full_name || email.split('@')[0],
        pet_id: pet_id || null, pet_name: pet_name || null,
        service_id: service_id || null,
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
        description: `GlobiPet τηλεϊατρική με ${provider_name || provider_email}`,
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

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.client_email !== email && existing.provider_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.telehealthConsultation.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.client_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.telehealthConsultation.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes