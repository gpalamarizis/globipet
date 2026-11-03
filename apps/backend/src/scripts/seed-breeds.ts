/**
 * Κατάλογος ράτσων — περιεχόμενο αναφοράς της πλατφόρμας (σελίδα /breeds και
 * επιλογή ράτσας στη φόρμα κατοικιδίου).
 *
 * ΠΗΓΕΣ (data/breeds-catalog.json)
 *   • Σκύλοι: όλες οι ράτσες της ονοματολογίας της FCI (οριστικές και
 *     προσωρινές) με αριθμό FCI, ομάδα και χώρα προέλευσης, + Κοκόνι,
 *     Ελληνικός Ποιμενικός και Πομεράνιαν.
 *   • Γάτες: οι ράτσες της FIFe (με κωδικό) και της TICA.
 *   • ~90 δημοφιλείς ράτσες έχουν πλήρες ελληνικό προφίλ (χαρακτήρας, ανάγκες,
 *     υγεία, υπέρ/κατά). Οι υπόλοιπες έχουν τα επίσημα στοιχεία· τα πεδία
 *     προφίλ μένουν κενά και η εφαρμογή απλώς δεν τα δείχνει.
 *   • Φωτογραφίες: Wikimedia Commons, ΜΟΝΟ ελεύθερες άδειες (CC0, CC BY,
 *     CC BY-SA, public domain), με δημιουργό/άδεια/πηγή για την υποχρεωτική
 *     αναφορά που εμφανίζεται κάτω από τη φωτογραφία.
 *
 * ΤΙ ΚΑΝΕΙ — ΜΟΝΟ ΠΡΟΣΘΗΚΗ
 *   • Προσθέτει όσες ράτσες λείπουν (έλεγχος με το αγγλικό όνομα).
 *   • Σε ράτσες που ΗΔΗ υπάρχουν, συμπληρώνει μόνο ό,τι είναι κενό: φωτογραφία
 *     (με τα στοιχεία άδειας), ομάδα FCI, φορείς αναγνώρισης. Δεν αλλάζει
 *     κείμενα, βαθμούς ή οτιδήποτε έχει γράψει ο διαχειριστής.
 *   • Δεν σβήνει τίποτα. Ασφαλές να ξανατρέξει.
 *
 * Εκτέλεση (γράφει στη βάση του DATABASE_URL — μόνο με ρητή επιβεβαίωση):
 *   πρώτα:   npx prisma migrate deploy        (migration 20261103200000_breed_catalog)
 *   δοκιμή:  set DRY_RUN=yes  &&  npx tsx src/scripts/seed-breeds.ts
 *   κανονικά: set CONFIRM_SEED_BREEDS=yes  &&  npx tsx src/scripts/seed-breeds.ts
 *
 * Γενικές, ενημερωτικές πληροφορίες — όχι κτηνιατρική συμβουλή.
 */
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

type CatalogBreed = {
  name: string; name_el: string; species: 'dog' | 'cat'
  fci_number: string | null; fci_group: number | null; origin: string | null
  recognized_by: string[]; registry_codes: string[]
  size: 'small' | 'medium' | 'large' | 'giant' | null
  weight_min: number | null; weight_max: number | null
  lifespan_min: number | null; lifespan_max: number | null
  temperament: string[]; health_issues: string[]; pros: string[]; cons: string[]
  grooming_needs: number | null; exercise_needs: number | null; trainability: number | null
  good_with_children: boolean | null; good_with_pets: boolean | null; apartment_friendly: boolean | null
  popularity: number; description: string
  image_url: string | null; image_source: string | null; image_license: string | null; image_credit: string | null
}

const FREE_LICENSE = /^(CC0|CC BY(-SA)? [0-9.]+( [a-z]{2})?|Public domain|Copyrighted free use)$/i

/** Έλεγχος πριν από οποιαδήποτε εγγραφή: ένα λάθος σταματά τα πάντα. */
function validate(rows: CatalogBreed[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const rating = (v: number | null) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5)
  for (const b of rows) {
    const id = b.name || '(χωρίς όνομα)'
    if (!b.name || !b.name_el || !b.description) errors.push(`${id}: λείπει όνομα/ελληνικό όνομα/περιγραφή`)
    if (b.species !== 'dog' && b.species !== 'cat') errors.push(`${id}: άγνωστο είδος ${b.species}`)
    if (b.size !== null && !['small', 'medium', 'large', 'giant'].includes(b.size)) errors.push(`${id}: μέγεθος ${b.size}`)
    if (![b.grooming_needs, b.exercise_needs, b.trainability].every(rating)) errors.push(`${id}: βαθμός εκτός 1–5`)
    if (b.image_url) {
      if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(b.image_url)) errors.push(`${id}: φωτογραφία εκτός Wikimedia`)
      if (!b.image_license || !FREE_LICENSE.test(b.image_license)) errors.push(`${id}: μη ελεύθερη άδεια «${b.image_license}»`)
      if (!b.image_source || !b.image_credit) errors.push(`${id}: λείπει πηγή/δημιουργός φωτογραφίας`)
    }
    const key = b.name.toLowerCase()
    if (seen.has(key)) errors.push(`${id}: διπλή εγγραφή`)
    seen.add(key)
  }
  return errors
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'yes'
  if (!dryRun && process.env.CONFIRM_SEED_BREEDS !== 'yes') {
    console.error('❌ seed-breeds: γράφει στη βάση του DATABASE_URL. Όρισε CONFIRM_SEED_BREEDS=yes (ή DRY_RUN=yes για δοκιμή χωρίς εγγραφές).')
    process.exit(1)
  }

  const catalog = JSON.parse(readFileSync(new URL('./data/breeds-catalog.json', import.meta.url), 'utf8'))
  const rows: CatalogBreed[] = catalog.breeds
  const errors = validate(rows)
  if (errors.length) {
    console.error(`❌ seed-breeds: ${errors.length} σφάλματα στον κατάλογο — καμία εγγραφή:\n  ` + errors.slice(0, 30).join('\n  '))
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const existing = await prisma.breed.findMany({
      select: { id: true, name: true, image_url: true, fci_group: true, recognized_by: true, registry_codes: true },
    })
    const byName = new Map(existing.map(b => [b.name.toLowerCase(), b]))

    const toCreate = rows.filter(b => !byName.has(b.name.toLowerCase()))
    const toFill: { id: string; name: string; data: Record<string, unknown> }[] = []
    for (const b of rows) {
      const cur = byName.get(b.name.toLowerCase())
      if (!cur) continue
      const data: Record<string, unknown> = {}
      if (!cur.image_url && b.image_url) {
        Object.assign(data, { image_url: b.image_url, image_source: b.image_source, image_license: b.image_license, image_credit: b.image_credit })
      }
      if (cur.fci_group == null && b.fci_group != null) data.fci_group = b.fci_group
      if (!cur.recognized_by?.length && b.recognized_by.length) data.recognized_by = b.recognized_by
      if (!cur.registry_codes?.length && b.registry_codes.length) data.registry_codes = b.registry_codes
      if (Object.keys(data).length) toFill.push({ id: cur.id, name: b.name, data })
    }

    const dogs = toCreate.filter(b => b.species === 'dog').length
    console.log(`Κατάλογος: ${rows.length} ράτσες (${rows.filter(b => b.species === 'dog').length} σκύλοι, ${rows.filter(b => b.species === 'cat').length} γάτες).`)
    console.log(`Στη βάση ήδη: ${existing.length}. Θα προστεθούν: ${toCreate.length} (${dogs} σκύλοι, ${toCreate.length - dogs} γάτες). Θα συμπληρωθούν κενά σε: ${toFill.length}.`)
    if (dryRun) {
      console.log('DRY_RUN — καμία εγγραφή. Πρώτες προσθήκες:', toCreate.slice(0, 10).map(b => b.name).join(', ') || '—')
      return
    }

    // Σε παρτίδες: μία συναλλαγή ανά παρτίδα, ώστε μια διακοπή να μην αφήνει μισή παρτίδα.
    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100)
      await prisma.breed.createMany({
        data: batch.map(b => ({
          name: b.name, name_el: b.name_el, species: b.species, fci_number: b.fci_number, fci_group: b.fci_group,
          origin: b.origin, recognized_by: b.recognized_by, registry_codes: b.registry_codes, size: b.size,
          weight_min: b.weight_min, weight_max: b.weight_max, lifespan_min: b.lifespan_min, lifespan_max: b.lifespan_max,
          temperament: b.temperament, health_issues: b.health_issues, pros: b.pros, cons: b.cons,
          grooming_needs: b.grooming_needs, exercise_needs: b.exercise_needs, trainability: b.trainability,
          good_with_children: b.good_with_children, good_with_pets: b.good_with_pets, apartment_friendly: b.apartment_friendly,
          popularity: b.popularity, description: b.description,
          image_url: b.image_url, image_source: b.image_source, image_license: b.image_license, image_credit: b.image_credit,
        })),
      })
      console.log(`  + ${Math.min(i + 100, toCreate.length)}/${toCreate.length}`)
    }
    for (const f of toFill) await prisma.breed.update({ where: { id: f.id }, data: f.data })

    console.log(`✓ seed-breeds: προστέθηκαν ${toCreate.length}, συμπληρώθηκαν ${toFill.length}, σύνολο τώρα ${await prisma.breed.count()}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
