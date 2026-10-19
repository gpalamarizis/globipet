// Φόρτωση του Μητρώου Φιλοζωικών Οργανώσεων στον πίνακα welfare_organisations.
//
//   cd C:\gp\apps\backend
//   node prisma\seed-welfare-orgs.cjs           -> dry-run, δεν γράφει τίποτα
//   node prisma\seed-welfare-orgs.cjs --apply   -> γράφει
//
// Idempotent: ξανατρέχει χωρίς διπλοεγγραφές. Ενημερώνει ΜΟΝΟ τα πεδία του
// μητρώου. Δεν αγγίζει ποτέ διεύθυνση, συντεταγμένες, επικοινωνία, is_active
// ή διεκδίκηση από πάροχο — αυτά συμπληρώνονται αργότερα και πρέπει να μείνουν.
'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (_) { /* το Prisma φορτώνει το .env μόνο του */ }
const path = require('path');
const fs = require('fs');

const APPLY = process.argv.includes('--apply');
const DATA = path.join(__dirname, 'data', 'welfare-orgs-gr.json');
const KINDS = new Set(['society', 'nonprofit', 'union', 'federation']);

function load() {
  const doc = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const list = doc.organisations;
  if (!Array.isArray(list) || list.length !== doc.meta.count) {
    throw new Error(`Το αρχείο δηλώνει ${doc.meta.count} εγγραφές αλλά περιέχει ${list && list.length}`);
  }
  const keys = new Set();
  for (const o of list) {
    if (!o.name || !o.registry_key) throw new Error(`Εγγραφή χωρίς όνομα ή κλειδί: ${JSON.stringify(o)}`);
    if (!KINDS.has(o.kind)) throw new Error(`Άγνωστο είδος: ${o.kind}`);
    if (keys.has(o.registry_key)) throw new Error(`Διπλό κλειδί: ${o.registry_key}`);
    keys.add(o.registry_key);
  }
  return { doc, list };
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const { doc, list } = load();
  const sourceDate = new Date(doc.meta.source_generated + 'T00:00:00Z');

  const existing = await prisma.welfareOrganisation.findMany({ select: { registry_key: true } });
  const have = new Set(existing.map(x => x.registry_key));
  const toCreate = list.filter(o => !have.has(o.registry_key)).length;
  const toUpdate = list.length - toCreate;

  console.log(`Αρχείο: ${list.length} οργανώσεις · στη βάση ήδη: ${have.size}`);
  console.log(`Θα δημιουργηθούν: ${toCreate} · θα ενημερωθούν: ${toUpdate}`);
  if (!APPLY) {
    console.log('\nDry-run. Δεν γράφτηκε τίποτα. Ξανατρέξε με --apply.');
    await prisma.$disconnect();
    return;
  }

  let created = 0, updated = 0;
  for (const o of list) {
    // Μόνο τα πεδία του μητρώου. Ό,τι συμπληρώνεται αργότερα μένει ανέπαφο.
    const registry = {
      name: o.name,
      kind: o.kind,
      country: o.country,
      municipality: o.municipality || null,
      source: doc.meta.source,
      source_date: sourceDate,
    };
    const res = await prisma.welfareOrganisation.upsert({
      where: { registry_key: o.registry_key },
      create: { registry_key: o.registry_key, ...registry },
      update: registry,
    });
    if (have.has(o.registry_key)) updated++; else created++;
    if (!res) throw new Error(`Απέτυχε: ${o.name}`);
  }
  const total = await prisma.welfareOrganisation.count();
  console.log(`Δημιουργήθηκαν: ${created} · ενημερώθηκαν: ${updated}`);
  console.log(`Σύνολο στη βάση: ${total} · από το αρχείο: ${list.length}/${list.length}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
