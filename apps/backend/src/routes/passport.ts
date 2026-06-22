import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // ─── HELPERS ──────────────────────────────────────────────────────
  async function assertPetOwner(petId: string, email: string) {
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) throw { statusCode: 404, message: 'Κατοικίδιο δεν βρέθηκε' }
    if (pet.owner_email !== email) throw { statusCode: 403, message: 'Δεν έχετε δικαίωμα' }
    return pet
  }

  // ─── GET FULL PASSPORT ────────────────────────────────────────────
  app.get('/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    // Owner or approved vet can view
    const hasAccess = pet.owner_email === email ||
      await prisma.petPassportAccess.findFirst({ where: { pet_id: petId, provider_email: email, status: 'approved' } })
    if (!hasAccess) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

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
  app.get('/:petId/pdf', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const hasAccess = pet.owner_email === email ||
      await prisma.petPassportAccess.findFirst({ where: { pet_id: petId, provider_email: email, status: 'approved' } })
    if (!hasAccess) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

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

    const section = (title: string, rows: string) => rows ? `<h2>${title}</h2><table>${rows}</table>` : ''
    const row = (label: string, val: any) => val ? `<tr><td>${label}</td><td>${val}</td></tr>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ιατρικός Φάκελος - ${pet.name}</title>
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
      <strong>${pet.name}</strong> &nbsp;|&nbsp; ${pet.species || ''} ${pet.breed || ''}<br>
      Γέννηση: ${pet.birthday || 'Άγνωστη'} &nbsp;|&nbsp; Φύλο: ${pet.gender || '-'}<br>
      Αρ. Μικροτσίπ: ${(pet as any).microchip || '-'}<br>
      Ιδιοκτήτης: ${email}
    </div>
  </div>
  <div style="text-align:right;font-size:10px;color:#999">
    Εκτυπώθηκε: ${new Date().toLocaleDateString('el-GR')}<br>
    GlobiPet · globipet.com
  </div>
</div>

${allergies.length ? `<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:10px;margin-bottom:16px">
  <strong>⚠️ ΑΛΛΕΡΓΙΕΣ:</strong> ${allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}
</div>` : ''}

${chronicConditions.length ? `<div style="background:#fef9c3;border:2px solid #ca8a04;border-radius:8px;padding:10px;margin-bottom:16px">
  <strong>📋 ΧΡΟΝΙΕΣ ΠΑΘΗΣΕΙΣ:</strong> ${chronicConditions.filter(c => c.status === 'active').map(c => c.condition).join(', ')}
</div>` : ''}

${section('Εμβόλια', vaccinations.map(v => `<tr>
  <td>${v.date_administered}</td><td>${v.vaccine_name}</td><td>${v.vaccine_type}</td>
  <td>${v.vet_name || '-'}</td><td>${v.next_due_date || '-'}</td>
</tr>`).join(''))}

${section('Φάρμακα', medications.map(m => `<tr>
  <td>${m.name} ${m.dosage}</td><td>${m.frequency}</td><td>${m.start_date}→${m.end_date || 'τώρα'}</td>
  <td>${m.prescribed_by || '-'}</td><td>${m.is_active ? '✅ Ενεργό' : '⬛ Ολοκλήρωσε'}</td>
</tr>`).join(''))}

${section('Εξετάσεις', healthRecords.map(h => `<tr>
  <td>${h.date}</td><td>${h.title}</td><td>${h.vet_name || '-'}</td>
  <td>${h.clinic_name || '-'}</td><td>${h.description?.slice(0, 100) || '-'}</td>
</tr>`).join(''))}

${section('Εργαστηριακές Εξετάσεις', labResults.map(l => `<tr>
  <td>${l.date}</td><td>${l.title}</td><td>${l.result_type}</td>
  <td>${l.vet_name || '-'}</td><td>${l.is_abnormal ? '⚠️ Παθολογικά' : '✅ Φυσιολογικά'}</td>
</tr>`).join(''))}

${section('Απεικονιστικές Εξετάσεις', imaging.map(i => `<tr>
  <td>${i.date}</td><td>${i.imaging_type.toUpperCase()}</td><td>${i.body_region || '-'}</td>
  <td>${i.vet_name || '-'}</td><td>${i.findings?.slice(0, 100) || '-'}</td>
</tr>`).join(''))}

${section('Χειρουργεία', surgeries.map(s => `<tr>
  <td>${s.date}</td><td>${s.procedure}</td><td>${s.surgeon_name || '-'}</td>
  <td>${s.clinic_name || '-'}</td><td>${s.outcome || '-'}</td>
</tr>`).join(''))}

${section('Οδοντιατρικά', dentalRecords.map(d => `<tr>
  <td>${d.date}</td><td>${d.procedure}</td><td>${d.vet_name || '-'}</td>
  <td>${d.findings || '-'}</td><td>${d.next_due || '-'}</td>
</tr>`).join(''))}

${section('Ιστορικό Βάρους', weightRecords.map(w => `<tr>
  <td>${w.date}</td><td>${w.weight_kg} kg</td><td>BCS: ${w.bcs || '-'}/9</td><td>${w.notes || '-'}</td>
</tr>`).join(''))}

<div class="footer">
  Αυτό το έγγραφο δημιουργήθηκε αυτόματα από το GlobiPet (globipet.com).<br>
  Για επαλήθευση επικοινωνήστε με τον ιδιοκτήτη του ζώου.
</div>
</body></html>`

    reply.header('Content-Type', 'text/html; charset=utf-8')
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
    return prisma.vaccination.update({ where: { id: req.params.id }, data: req.body })
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
    return prisma.healthRecord.update({ where: { id: req.params.id }, data: req.body })
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
      create: { pet_id: req.params.petId, owner_email: email, ...data, certifications: data.certifications || [] },
      update: { ...data, certifications: data.certifications || [] },
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
    return reply.code(201).send(await prisma.petMedication.create({ data: { pet_id: req.params.petId, owner_email: email, ...req.body } }))
  })

  app.patch('/medication/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petMedication.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petMedication.update({ where: { id: req.params.id }, data: req.body })
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
    return reply.code(201).send(await prisma.petLabResult.create({ data: { pet_id: req.params.petId, owner_email: email, file_urls: [], ...req.body } }))
  })

  app.patch('/lab/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petLabResult.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petLabResult.update({ where: { id: req.params.id }, data: req.body })
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
    return reply.code(201).send(await prisma.petImaging.create({ data: { pet_id: req.params.petId, owner_email: email, file_urls: [], ...req.body } }))
  })

  app.patch('/imaging/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petImaging.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petImaging.update({ where: { id: req.params.id }, data: req.body })
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
    return reply.code(201).send(await prisma.petSurgery.create({ data: { pet_id: req.params.petId, owner_email: email, file_urls: [], ...req.body } }))
  })

  app.patch('/surgery/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petSurgery.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petSurgery.update({ where: { id: req.params.id }, data: req.body })
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
    return reply.code(201).send(await prisma.petAllergy.create({ data: { pet_id: req.params.petId, owner_email: email, ...req.body } }))
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
    return reply.code(201).send(await prisma.petChronicCondition.create({ data: { pet_id: req.params.petId, owner_email: email, ...req.body } }))
  })

  app.patch('/chronic/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const r = await prisma.petChronicCondition.findUnique({ where: { id: req.params.id } })
    if (!r || r.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petChronicCondition.update({ where: { id: req.params.id }, data: req.body })
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
    return reply.code(201).send(await prisma.petDentalRecord.create({ data: { pet_id: req.params.petId, owner_email: email, file_urls: [], ...req.body } }))
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
    return reply.code(201).send(await prisma.petWeightRecord.create({ data: { pet_id: req.params.petId, owner_email: email, ...req.body } }))
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
    return reply.code(201).send(await prisma.petGeneticTest.create({ data: { pet_id: req.params.petId, owner_email: email, breeds_detected: [], conditions_found: [], file_urls: [], ...req.body } }))
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
    return reply.code(201).send(await prisma.petVitalSigns.create({ data: { pet_id: req.params.petId, owner_email: email, ...req.body } }))
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
    const { provider_email, provider_name, reason, expires_at } = req.body as any
    if (!provider_email) return reply.code(400).send({ message: 'Λείπει το email παρόχου' })
    const access = await prisma.petPassportAccess.upsert({
      where: { pet_id_provider_email: { pet_id: req.params.petId, provider_email } },
      create: { pet_id: req.params.petId, owner_email: email, provider_email, provider_name: provider_name || provider_email, reason, status: 'approved', granted_at: new Date(), expires_at: expires_at ? new Date(expires_at) : null },
      update: { status: 'approved', granted_at: new Date(), reason, expires_at: expires_at ? new Date(expires_at) : null },
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
    const { email } = req.user as any
    const accesses = await prisma.petPassportAccess.findMany({
      where: { provider_email: email, status: 'approved' },
      orderBy: { granted_at: 'desc' },
    })
    if (!accesses.length) return reply.send({ data: [] })
    const petIds = accesses.map(a => a.pet_id)
    const pets = await prisma.pet.findMany({ where: { id: { in: petIds } } })
    return reply.send({ data: pets.map(p => ({ ...p, access: accesses.find(a => a.pet_id === p.id) })) })
  })
}

export default routes