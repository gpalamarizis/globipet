/**
 * cleanup-mobile-tabs.cjs — αφαιρεί τον διπλό φάκελο καρτελών.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ
 *   Υπάρχουν δύο φάκελοι: app/(tabs) και app/tabs.
 *
 *   Το (tabs) με παρενθέσεις είναι ομάδα διαδρομών του expo-router — δεν
 *   εμφανίζεται στο URL. Το tabs χωρίς παρενθέσεις είναι κανονική
 *   διαδρομή, οπότε κάθε οθόνη υπάρχει δύο φορές: /pets και /tabs/pets.
 *
 *   Ο φάκελος tabs είναι παλιό αντίγραφο από 12 Ιουνίου· το (tabs)
 *   ενημερώθηκε στις 23. Φεύγει ο παλιός.
 *
 * ΑΣΦΑΛΕΙΑ
 *   Δεν διαγράφει — μετονομάζει σε _tabs_old, ώστε να επανέρχεται.
 *   Ελέγχει πρώτα ότι το (tabs) υπάρχει και είναι πληρέστερο.
 *
 * Χρήση:
 *   cd /d C:\gp\apps\mobile
 *   node cleanup-mobile-tabs.cjs
 */
const fs = require('fs');
const path = require('path');

const NEW = 'app/(tabs)';
const OLD = 'app/tabs';
const BACKUP = 'app/_tabs_old';

console.log('');
console.log('Καθαρισμός διπλών καρτελών');
console.log('-'.repeat(58));

if (!fs.existsSync(NEW)) {
  console.error(`✗ δεν βρέθηκε ${NEW} — δεν έγινε αλλαγή`);
  process.exit(1);
}

if (!fs.existsSync(OLD)) {
  console.log('· Ο φάκελος app/tabs δεν υπάρχει — τίποτα να καθαρίσω.');
  process.exit(0);
}

const newFiles = fs.readdirSync(NEW).filter(f => f.endsWith('.tsx'));
const oldFiles = fs.readdirSync(OLD).filter(f => f.endsWith('.tsx'));

console.log(`  app/(tabs) : ${newFiles.length} οθόνες`);
console.log(`  app/tabs   : ${oldFiles.length} οθόνες`);

// Ασφάλεια: ο νέος πρέπει να έχει _layout, ο παλιός όχι
if (!newFiles.includes('_layout.tsx')) {
  console.error('✗ το (tabs) δεν έχει _layout.tsx — ύποπτο, δεν έγινε αλλαγή');
  process.exit(1);
}

// Οθόνες που υπάρχουν ΜΟΝΟ στον παλιό — θα χαθούν
const onlyOld = oldFiles.filter(f => !newFiles.includes(f));
if (onlyOld.length) {
  console.log('');
  console.log('  Υπάρχουν μόνο στον παλιό φάκελο:');
  for (const f of onlyOld) console.log(`    · ${f}`);
  console.log('  (διατηρούνται στο αντίγραφο, δεν χάνονται)');
}

if (fs.existsSync(BACKUP)) {
  console.error(`\n✗ υπάρχει ήδη ${BACKUP} — σβήσ' τον πρώτα`);
  process.exit(1);
}

fs.renameSync(OLD, BACKUP);

console.log('');
console.log(`✓ app/tabs → app/_tabs_old`);
console.log('  Ο φάκελος με κάτω παύλα αγνοείται από το expo-router.');

// Επαλήθευση
const ok = !fs.existsSync(OLD) && fs.existsSync(BACKUP) && fs.existsSync(NEW);
console.log(`  ${ok ? '✓' : '✗'} μία μόνο ομάδα καρτελών ενεργή`);

console.log('');
console.log('Τρέξε τώρα:  npx expo start -c');
if (!ok) process.exit(1);
