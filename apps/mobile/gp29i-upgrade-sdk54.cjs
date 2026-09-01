/**
 * upgrade-sdk-54.cjs — αναβάθμιση Expo SDK 52 → 54.
 *
 * ΓΙΑΤΙ
 *   Το SDK 52 δεν λαμβάνει πια ενημερώσεις ασφαλείας, και το Expo Go
 *   στα κινητά είναι ήδη 54 — δεν συνδέεται με SDK 52.
 *
 * ΤΙ ΑΛΛΑΖΕΙ ΟΥΣΙΑΣΤΙΚΑ
 *   React      18.3.1 → 19.1.0
 *   React Native 0.76 → 0.81
 *   expo-router     4 → 6
 *
 *   Η React 19 αφαιρεί το propTypes και αλλάζει το ref forwarding. Το
 *   expo-router 6 αλλάζει τον τρόπο δήλωσης typed routes.
 *
 * ΤΙ ΚΑΝΕΙ ΤΟ SCRIPT
 *   Δεν αναβαθμίζει μόνο του — αυτό το κάνει το expo, που ξέρει τις
 *   σωστές εκδόσεις. Ελέγχει το περιβάλλον ΠΡΙΝ, κρατά αντίγραφα, και
 *   επαληθεύει ΜΕΤΑ.
 *
 * Χρήση:
 *   cd /d C:\gp\apps\mobile
 *   node upgrade-sdk-54.cjs           έλεγχος και οδηγίες
 *   node upgrade-sdk-54.cjs --verify  επαλήθευση μετά την αναβάθμιση
 */
const fs = require('fs');
const { execSync } = require('child_process');

const VERIFY = process.argv.includes('--verify');
const P = 'package.json';
const A = 'app.json';

if (!fs.existsSync(P)) { console.error('✗ δεν βρέθηκε package.json — είσαι στον σωστό φάκελο;'); process.exit(1); }

const pkg = JSON.parse(fs.readFileSync(P, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const expoVer = (deps.expo || '').replace(/[~^]/, '');
const major = parseInt(expoVer.split('.')[0]) || 0;

console.log('');
console.log('Αναβάθμιση Expo SDK');
console.log('='.repeat(64));
console.log(`  Τρέχον SDK        : ${deps.expo || '—'}`);
console.log(`  React             : ${deps.react || '—'}`);
console.log(`  React Native      : ${deps['react-native'] || '—'}`);
console.log(`  expo-router       : ${deps['expo-router'] || '—'}`);
console.log('');

// ── ΕΠΑΛΗΘΕΥΣΗ ────────────────────────────────────────────────────────
if (VERIFY) {
  console.log('ΕΠΑΛΗΘΕΥΣΗ ΜΕΤΑ ΤΗΝ ΑΝΑΒΑΘΜΙΣΗ');
  console.log('-'.repeat(64));
  let bad = 0;
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
    if (!ok) bad++;
  };

  check('SDK 54', major === 54, deps.expo);
  check('React 19', (deps.react || '').includes('19'), deps.react);
  check('React Native 0.81', (deps['react-native'] || '').includes('0.81'), deps['react-native']);
  check('expo-router 6', (deps['expo-router'] || '').startsWith('~6') || (deps['expo-router'] || '').startsWith('^6'), deps['expo-router']);

  // Το app.json πρέπει να έχει διατηρήσει τα κρίσιμα
  const app = JSON.parse(fs.readFileSync(A, 'utf8')).expo || {};
  check('bundleIdentifier', app.ios?.bundleIdentifier === 'com.globipet.app');
  check('android package',  app.android?.package === 'com.globipet.app');
  check('EAS projectId',    !!app.extra?.eas?.projectId);
  check('googleWebClientId', !!app.extra?.googleWebClientId);
  check('plugins διατηρήθηκαν', (app.plugins || []).length >= 3, `${(app.plugins||[]).length} plugins`);
  check('scheme', app.scheme === 'globipet');

  // Το eas.json δεν πρέπει να έχει αλλάξει
  if (fs.existsSync('eas.json')) {
    const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
    check('EAS preview profile', !!eas.build?.preview);
    check('EAS API URL', !!eas.build?.preview?.env?.EXPO_PUBLIC_API_URL);
  }

  console.log('');
  console.log(bad === 0
    ? '✓ Η αναβάθμιση ολοκληρώθηκε σωστά.\n\n  Επόμενο:  npx expo start -c'
    : `✗ ${bad} προβλήματα — δες παραπάνω.`);
  process.exit(bad ? 1 : 0);
}

// ── ΕΛΕΓΧΟΣ ΠΡΙΝ ──────────────────────────────────────────────────────
if (major === 54) {
  console.log('· Το project είναι ήδη σε SDK 54.');
  console.log('  Για επαλήθευση:  node upgrade-sdk-54.cjs --verify');
  process.exit(0);
}
if (major !== 52) {
  console.error(`✗ Αναμενόταν SDK 52, βρέθηκε ${major}. Σταματώ για ασφάλεια.`);
  process.exit(1);
}

// Αντίγραφα ασφαλείας
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '');
for (const f of [P, A, 'eas.json', 'package-lock.json']) {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, `${f}.sdk52-${stamp}.bak`);
    console.log(`  ✓ αντίγραφο: ${f}.sdk52-${stamp}.bak`);
  }
}

// Τι θα χρειαστεί προσοχή
console.log('');
console.log('ΣΗΜΕΙΑ ΠΡΟΣΟΧΗΣ');
console.log('-'.repeat(64));

const warn = [];
if (deps['@react-native-google-signin/google-signin'])
  warn.push('Google Sign-In: η έκδοση 13 μπορεί να θέλει αναβάθμιση σε 14 για RN 0.81');
if (deps['react-native-reanimated'])
  warn.push('Reanimated: το 3.16 → 4.x αλλάζει API· έλεγξε τυχόν worklets');
if (deps['expo-router'])
  warn.push('expo-router 4 → 6: τα typedRoutes παράγονται αλλιώς· τρέξε expo start -c');

for (const w of warn) console.log(`  · ${w}`);
if (!warn.length) console.log('  · κανένα ιδιαίτερο');

console.log('');
console.log('ΕΚΤΕΛΕΣΕ ΜΕ ΤΗ ΣΕΙΡΑ');
console.log('='.repeat(64));
console.log('');
console.log('  npx expo install expo@^54.0.0 --fix');
console.log('');
console.log('  npx expo install --fix');
console.log('');
console.log('  npx expo-doctor');
console.log('');
console.log('  node upgrade-sdk-54.cjs --verify');
console.log('');
console.log('  npx expo start -c');
console.log('');
console.log('Το πρώτο βήμα φέρνει το SDK 54. Το δεύτερο ευθυγραμμίζει');
console.log('ΟΛΕΣ τις υπόλοιπες εξαρτήσεις στις εκδόσεις που ταιριάζουν.');
console.log('Το expo-doctor εντοπίζει ό,τι έμεινε ασύμβατο.');
console.log('');
console.log('Αν κάτι πάει στραβά, επανέφερε:');
console.log(`  copy ${P}.sdk52-${stamp}.bak ${P}`);
console.log(`  npm install`);
console.log('');
