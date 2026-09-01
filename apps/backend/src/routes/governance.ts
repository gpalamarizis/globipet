import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

/**
 * Admin-only governance router.
 * Mounted at /api/admin/governance
 *
 * Provides CRUD for:
 *   - Subprocessors (GDPR Art. 28 — third-party processor tracking + DPA status)
 *   - Breach Incidents (GDPR Art. 33/34 — timeline + notification tracking)
 */
const governanceRoutes: FastifyPluginAsync = async (app) => {

  // Admin-only guard for every endpoint below
  app.addHook('preHandler', async (req: any, reply: any) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── SUBPROCESSORS (GDPR Art. 28) ─────────────────────────────

  app.get('/subprocessors', async () => {
    const data = await prisma.subprocessor.findMany({
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    })
    return { data, total: data.length }
  })

  app.post('/subprocessors', async (req: any, reply) => {
    const b = req.body as any
    if (!b?.name || !b?.purpose) {
      return reply.code(400).send({ message: 'Όνομα και σκοπός είναι υποχρεωτικά' })
    }
    const created = await prisma.subprocessor.create({
      data: {
        name: b.name,
        purpose: b.purpose,
        data_categories: Array.isArray(b.data_categories) ? b.data_categories : [],
        region: b.region || null,
        transfer_mechanism: b.transfer_mechanism || null,
        dpa_status: b.dpa_status || 'pending',
        dpa_signed_at: b.dpa_signed_at ? new Date(b.dpa_signed_at) : null,
        dpa_expires_at: b.dpa_expires_at ? new Date(b.dpa_expires_at) : null,
        dpa_url: b.dpa_url || null,
        contact_email: b.contact_email || null,
        website: b.website || null,
        is_active: b.is_active !== false,
        notes: b.notes || null,
      },
    })
    await audit(req, {
      action: 'subprocessor_create', resource: 'subprocessor', resource_id: created.id,
      metadata: { name: created.name, dpa_status: created.dpa_status },
    })
    return reply.code(201).send({ data: created })
  })

  app.patch('/subprocessors/:id', async (req: any, reply) => {
    const b = req.body as any
    const data: any = {}
    for (const f of ['name','purpose','region','transfer_mechanism','dpa_status','dpa_url','contact_email','website','notes']) {
      if (b[f] !== undefined) data[f] = b[f]
    }
    if (b.data_categories !== undefined) data.data_categories = Array.isArray(b.data_categories) ? b.data_categories : []
    if (b.is_active !== undefined)       data.is_active       = !!b.is_active
    if (b.dpa_signed_at !== undefined)   data.dpa_signed_at   = b.dpa_signed_at  ? new Date(b.dpa_signed_at)  : null
    if (b.dpa_expires_at !== undefined)  data.dpa_expires_at  = b.dpa_expires_at ? new Date(b.dpa_expires_at) : null

    const updated = await prisma.subprocessor.update({ where: { id: req.params.id }, data })
    await audit(req, {
      action: 'subprocessor_update', resource: 'subprocessor', resource_id: updated.id,
      metadata: { fields: Object.keys(data) },
    })
    return { data: updated }
  })

  app.delete('/subprocessors/:id', async (req: any, reply) => {
    await prisma.subprocessor.delete({ where: { id: req.params.id } })
    await audit(req, {
      action: 'subprocessor_delete', resource: 'subprocessor', resource_id: req.params.id,
    })
    return reply.code(204).send()
  })

  // ─── BREACH INCIDENTS (GDPR Art. 33 / 34) ─────────────────────

  app.get('/breaches', async () => {
    const data = await prisma.breachIncident.findMany({
      orderBy: [{ status: 'asc' }, { detected_at: 'desc' }],
    })
    return { data, total: data.length }
  })

  app.get('/breaches/:id', async (req: any, reply) => {
    const item = await prisma.breachIncident.findUnique({ where: { id: req.params.id } })
    if (!item) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    return { data: item }
  })

  app.post('/breaches', async (req: any, reply) => {
    const b = req.body as any
    if (!b?.reference || !b?.title || !b?.description || !b?.detected_at || !b?.reporter_email) {
      return reply.code(400).send({ message: 'Reference, τίτλος, περιγραφή, ημ/νία ανίχνευσης, reporter email απαιτούνται' })
    }
    const created = await prisma.breachIncident.create({
      data: {
        reference: b.reference,
        title: b.title,
        description: b.description,
        severity: b.severity || 'low',
        status: b.status || 'open',
        detected_at: new Date(b.detected_at),
        confirmed_at: b.confirmed_at ? new Date(b.confirmed_at) : null,
        contained_at: b.contained_at ? new Date(b.contained_at) : null,
        root_cause: b.root_cause || null,
        affected_data_categories: Array.isArray(b.affected_data_categories) ? b.affected_data_categories : [],
        affected_user_count: b.affected_user_count ? parseInt(b.affected_user_count) : null,
        supervisory_notified: !!b.supervisory_notified,
        supervisory_notified_at: b.supervisory_notified_at ? new Date(b.supervisory_notified_at) : null,
        data_subjects_notified: !!b.data_subjects_notified,
        data_subjects_notified_at: b.data_subjects_notified_at ? new Date(b.data_subjects_notified_at) : null,
        notification_method: b.notification_method || null,
        reporter_email: b.reporter_email,
        remediation_actions: b.remediation_actions || null,
        lessons_learned: b.lessons_learned || null,
        attachments_url: b.attachments_url || null,
      },
    })
    await audit(req, {
      action: 'breach_create', resource: 'breach_incident', resource_id: created.id,
      metadata: { reference: created.reference, severity: created.severity, status: created.status },
    })
    return reply.code(201).send({ data: created })
  })

  app.patch('/breaches/:id', async (req: any, reply) => {
    const b = req.body as any
    const data: any = {}
    const strFields = ['reference','title','description','severity','status','root_cause','notification_method','reporter_email','remediation_actions','lessons_learned','attachments_url']
    for (const f of strFields) if (b[f] !== undefined) data[f] = b[f]

    if (b.affected_data_categories !== undefined) data.affected_data_categories = Array.isArray(b.affected_data_categories) ? b.affected_data_categories : []
    if (b.affected_user_count !== undefined)      data.affected_user_count      = b.affected_user_count ? parseInt(b.affected_user_count) : null
    if (b.supervisory_notified !== undefined)     data.supervisory_notified     = !!b.supervisory_notified
    if (b.data_subjects_notified !== undefined)   data.data_subjects_notified   = !!b.data_subjects_notified

    for (const dateField of ['detected_at','confirmed_at','contained_at','supervisory_notified_at','data_subjects_notified_at']) {
      if (b[dateField] !== undefined) data[dateField] = b[dateField] ? new Date(b[dateField]) : null
    }

    const updated = await prisma.breachIncident.update({ where: { id: req.params.id }, data })
    await audit(req, {
      action: 'breach_update', resource: 'breach_incident', resource_id: updated.id,
      metadata: { fields: Object.keys(data), status: updated.status },
    })
    return { data: updated }
  })

  app.delete('/breaches/:id', async (req: any, reply) => {
    await prisma.breachIncident.delete({ where: { id: req.params.id } })
    await audit(req, {
      action: 'breach_delete', resource: 'breach_incident', resource_id: req.params.id,
    })
    return reply.code(204).send()
  })
}

export default governanceRoutes
