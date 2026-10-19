// Φόρτωση του Επίσημου Μητρώου Καταφυγίων στον πίνακα official_shelters.
//
//   cd C:\gp\apps\backend
//   node prisma\seed-official-shelters.cjs           -> dry-run, δεν γράφει τίποτα
//   node prisma\seed-official-shelters.cjs --apply   -> γράφει
//
// Idempotent: ξανατρέχει χωρίς διπλοεγγραφές. Ενημερώνει μόνο τα πεδία του
// μητρώου. Δεν αγγίζει ποτέ διεύθυνση, συντεταγμένες, επικοινωνία, is_active
// ή διεκδίκηση από πάροχο — αυτά συμπληρώνονται αργότερα και πρέπει να μείνουν.
'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (_) { /* το Prisma φορτώνει το .env μόνο του */ }
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const APPLY = process.argv.includes('--apply');
const DATA = path.join(__dirname, 'data', 'official-shelters-gr.json');
const CATEGORIES = new Set(['municipality', 'association', 'private', 'inter_municipal']);

function registryKey(s) {
  if (s.official_code) return s.official_code;
  const base = [s.operator, s.name, s.municipality].join('|').normalize('NFC');
  return 'h_' + crypto.createHash('sha1').update(base, 'utf8').digest('hex').slice(0, 40);
}

function load() {
  const doc = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const list = doc.shelters;
  if (!Array.isArray(list) || list.length !== doc.meta.count) {
    throw new Error(`Το αρχείο δηλώνει ${doc.meta.count} εγγραφές αλλά περιέχει ${list && list.length}`);
  }
  const rows = list.map((s) => {
    if (!s.name || !s.operator || !s.municipality) throw new Error('Ελλιπής εγγραφή: ' + JSON.stringify(s));
    if (!CATEGORIES.has(s.category)) throw new Error('Άγνωστη κατηγορία: ' + s.category);
    return {
      registry_key: registryKey(s),
      official_code: s.official_code || null,
      code_raw: s.code_raw || null,
      name: s.name,
      operator_name: s.operator,
      operator_is_person: s.operator_is_person === true,
      category: s.category,
      municipality: s.municipality,
      source: doc.meta.source,
      source_date: new Date(doc.meta.source_generated + 'T00:00:00Z'),
    };
  });
  const keys = new Set(rows.map((r) => r.registry_key));
  if (keys.size !== rows.length) throw new Error('Διπλά registry_key στο αρχείο');
  return rows;
}

async function run(prisma, rows, apply) {
  const existing = await prisma.officialShelter.findMany({ select: { registry_key: true } });
  const have = new Set(existing.map((e) => e.registry_key));
  const toCreate = rows.filter((r) => !have.has(r.registry_key)).length;
  const toUpdate = rows.length - toCreate;
  const fileKeys = new Set(rows.map((r) => r.registry_key));
  const notInFile = existing.filter((e) => !fileKeys.has(e.registry_key)).length;

  console.log(`Εγγραφές στο αρχείο:      ${rows.length}`);
  console.log(`Ήδη στη βάση:             ${existing.length}`);
  console.log(`Θα δημιουργηθούν:         ${toCreate}`);
  console.log(`Θα ενημερωθούν:           ${toUpdate}`);
  if (notInFile) console.log(`Στη βάση αλλά όχι στο αρχείο (ΔΕΝ σβήνονται): ${notInFile}`);
  if (!apply) { console.log('\nDRY-RUN — δεν γράφτηκε τίποτα. Για εγγραφή: --apply'); return; }

  await prisma.$transaction(rows.map((r) => {
    const { registry_key, ...fields } = r;
    return prisma.officialShelter.upsert({
      where: { registry_key },
      create: r,
      update: fields,
    });
  }));

  const total = await prisma.officialShelter.count();
  const inFile = await prisma.officialShelter.count({ where: { registry_key: { in: [...fileKeys] } } });
  console.log(`\nΕΓΓΡΑΦΗΚΑΝ. Σύνολο στον πίνακα: ${total} — από το αρχείο: ${inFile}/${rows.length}`);
  if (inFile !== rows.length) { process.exitCode = 1; console.error('ΣΦΑΛΜΑ: δεν βρέθηκαν όλες οι εγγραφές μετά την εγγραφή'); }
}

module.exports = { load, run, registryKey };

if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  run(prisma, load(), APPLY)
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
