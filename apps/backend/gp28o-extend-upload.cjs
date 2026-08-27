/**
 * extend-upload.cjs — επεκτείνει το upload.ts για banner καμπανιών.
 *
 * ΤΡΕΙΣ ΑΛΛΑΓΕΣ
 *   1. Φάκελος 'campaigns' στη λευκή λίστα — αλλιώς τα banner πάνε
 *      ανακατεμένα στο 'uploads'.
 *   2. Τύποι βίντεο MP4 και WebM. Το upload.ts δεχόταν ΜΟΝΟ εικόνες και
 *      PDF, οπότε κάθε βίντεο αποτύγχανε.
 *   3. Ξεχωριστό όριο 5MB για εικόνες, 25MB για βίντεο. Ένα βίντεο 10″
 *      από κινητό είναι 8-15MB και δεν περνούσε ποτέ.
 *
 * Η επαλήθευση υπογραφής αρχείου (magic bytes) διατηρείται — το βίντεο
 * ελέγχεται κι αυτό, ώστε να μη γίνεται μετονομασμένο .exe.
 *
 * Χρήση:
 *   cd /d C:\gp\apps\backend
 *   node extend-upload.cjs
 */
const fs = require('fs');
const p = 'src/routes/upload.ts';

if (!fs.existsSync(p)) { console.error('✗ δεν βρέθηκε ' + p); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
const before = s;

if (s.includes("'video/mp4'")) {
  console.log('· Ήδη επεκτεταμένο — καμία αλλαγή.');
  process.exit(0);
}

let done = 0;

// ── 1. Φάκελος campaigns ──────────────────────────────────────────────
const folders = s.match(/const ALLOWED_FOLDERS = \[([^\]]*)\]/);
if (!folders) { console.error('✗ δεν βρέθηκε το ALLOWED_FOLDERS'); process.exit(1); }
if (!/'campaigns'/.test(folders[1])) {
  s = s.replace(folders[0],
    `const ALLOWED_FOLDERS = [${folders[1].replace(/\s*$/, '')}, 'campaigns']`);
  done++;
}

// ── 2. Τύποι βίντεο ───────────────────────────────────────────────────
// MP4: ftyp στα bytes 4-7 (τα πρώτα 4 είναι το μήκος του box)
// WebM: EBML header 1A 45 DF A3
const pdfLine = s.match(/^\s*'application\/pdf':.*$/m);
if (!pdfLine) { console.error('✗ δεν βρέθηκε η γραμμή του PDF'); process.exit(1); }
s = s.replace(pdfLine[0], pdfLine[0] + `
  // Βίντεο για banner καμπανιών.
  // MP4: το 'ftyp' βρίσκεται στα bytes 4-7, όχι στην αρχή — τα πρώτα
  // τέσσερα είναι το μήκος του box. Ελέγχεται χωριστά παρακάτω.
  'video/mp4':  { ext: 'mp4',  magic: [[0x66, 0x74, 0x79, 0x70]] },
  'video/webm': { ext: 'webm', magic: [[0x1A, 0x45, 0xDF, 0xA3]] },`);
done++;

// ── 3. Ξεχωριστό όριο για βίντεο ──────────────────────────────────────
const maxLine = s.match(/^const MAX_FILE_SIZE = .*$/m);
if (!maxLine) { console.error('✗ δεν βρέθηκε το MAX_FILE_SIZE'); process.exit(1); }
s = s.replace(maxLine[0], maxLine[0] + `
// Τα βίντεο είναι εγγενώς μεγαλύτερα: 10 δευτερόλεπτα από κινητό είναι
// 8-15MB. Με όριο 5MB κανένα δεν θα περνούσε.
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25 MB
const isVideo = (mime: string) => mime.startsWith('video/')`);
done++;

// ── 4. Το magic του MP4 ξεκινά στο byte 4 ─────────────────────────────
const verifyFn = s.match(/return spec\.magic\.some\(sig => sig\.every\(\(byte, i\) => body\[i\] === byte\)\)/);
if (verifyFn) {
  s = s.replace(verifyFn[0],
`// Το MP4 έχει το 'ftyp' στο offset 4, όχι στο 0.
  const offset = mime === 'video/mp4' ? 4 : 0
  return spec.magic.some(sig => sig.every((byte, i) => body[offset + i] === byte))`);
  done++;
}

// ── 5. Ο έλεγχος μεγέθους να σέβεται τον τύπο ─────────────────────────
const sizeCheck = s.match(/^(\s*)if \(.*MAX_FILE_SIZE.*\) \{?\s*$/m);
if (sizeCheck) {
  const orig = sizeCheck[0];
  const indent = sizeCheck[1];
  s = s.replace(orig, orig.replace(/MAX_FILE_SIZE/, '(isVideo(mime) ? MAX_VIDEO_SIZE : MAX_FILE_SIZE)'));
  done++;
}
// Και το μήνυμα
// Το μήνυμα ΠΡΕΠΕΙ να γίνει template literal (backticks), αλλιώς το ${}
// δεν αποτιμάται και ο χρήστης βλέπει τον ίδιο τον κώδικα.
s = s.replace(
  /(reply\.code\(413\)\.send\(\{ message: )'([^']*?)max 5MB([^']*?)'/,
  (_m, head, pre, post) =>
    head + '`' + pre + '${isVideo(mime) ? "25MB για βίντεο" : "5MB"}' + post + '`');

fs.writeFileSync(p + '.bak', before);
fs.writeFileSync(p, s);

console.log(`✓ ${done} αλλαγές  (αντίγραφο: upload.ts.bak)`);

const out = fs.readFileSync(p, 'utf8');
const checks = [
  ['φάκελος campaigns', /ALLOWED_FOLDERS = \[[^\]]*'campaigns'/.test(out)],
  ['τύπος video/mp4',   out.includes("'video/mp4'")],
  ['τύπος video/webm',  out.includes("'video/webm'")],
  ['όριο βίντεο 25MB',  out.includes('MAX_VIDEO_SIZE')],
  ['offset MP4',        out.includes("mime === 'video/mp4' ? 4 : 0")],
];
let bad = 0;
for (const [k, v] of checks) { console.log(`  ${v ? '✓' : '✗'} ${k}`); if (!v) bad++; }
console.log('\nΤρέξε τώρα:  npm run build');
if (bad) process.exit(1);
