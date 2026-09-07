/**
 * Σύστημα σχεδιασμού για την εφαρμογή.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ
 *   Οι οθόνες γράφτηκαν σε διαφορετικές στιγμές, καθεμία με δικά της
 *   χρώματα και αποστάσεις. Το αποτέλεσμα δεν έμοιαζε ενιαίο. Εδώ
 *   ορίζονται μία φορά και χρησιμοποιούνται παντού.
 *
 *   Τα χρώματα ταιριάζουν με το web, ώστε η εμπειρία να είναι συνεπής
 *   ανάμεσα στις δύο πλατφόρμες.
 *
 * ΤΙ ΠΡΟΣΤΕΘΗΚΕ
 *   Το μπλε του λογοτύπου, ρόλοι τυπογραφίας με ύψος γραμμής, χρώμα ανά
 *   κατηγορία υπηρεσίας, και ελάχιστα μεγέθη αφής. Τίποτα δεν αφαιρέθηκε —
 *   οι οθόνες που ήδη χρησιμοποιούν `font`, `icon` ή `shadow.md` δεν
 *   χρειάζονται αλλαγή.
 */

export const colors = {
  // Κύρια ταυτότητα — το πορτοκαλί του GlobiPet
  brand:      '#E65100',
  brandDark:  '#BF360C',
  brandLight: '#FFF3E0',
  brandTint:  '#FFE0B2',

  /**
   * Το μπλε του λογοτύπου.
   *
   * Στο web αγκυρώνει κάθε hero (About, Contact, Faq, Help). Στο κινητό
   * παίζει τον ίδιο ρόλο: επικεφαλίδες, σκούρες επιφάνειες, το tab bar.
   *
   * Ο κανόνας που έχει σημασία: το μπλε είναι η δομή, το πορτοκαλί η
   * ενέργεια. Το πορτοκαλί μπαίνει σε ό,τι πατιέται και πουθενά αλλού. Από
   * τη στιγμή που αρχίζει να διακοσμεί τίτλους και περιγράμματα παύει να
   * σημαίνει «πάτα εδώ», και το μάτι πρέπει να διαβάζει κάθε οθόνη από την
   * αρχή.
   */
  navy:       '#0F2A3F',
  navySoft:   '#1B3E56',
  navyTint:   '#E8EEF3',

  // Δευτερεύον — το κίτρινο των CTA
  accent:     '#FBBF24',
  accentDark: '#F59E0B',

  // Κείμενο
  text:       '#111827',
  textMuted:  '#6B7280',
  textLight:  '#9CA3AF',
  textOnDark: '#FFFFFF',

  // Επιφάνειες
  bg:         '#F9FAFB',
  surface:    '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border:     '#E5E7EB',
  borderLight:'#F3F4F6',

  // Καταστάσεις
  success:    '#10B981',
  successBg:  '#D1FAE5',
  warning:    '#F59E0B',
  warningBg:  '#FEF3C7',
  danger:     '#EF4444',
  dangerBg:   '#FEE2E2',
  info:       '#3B82F6',
  infoBg:     '#DBEAFE',

  // Σκίαση
  shadow:     '#000000',

  /**
   * Ένα χρώμα ανά τύπο υπηρεσίας, ώστε η κατηγορία να αναγνωρίζεται πριν
   * διαβαστεί η ετικέτα. Ίδια παλέτα με το ServiceCard του web, ώστε όποιος
   * περνά από το site στην εφαρμογή να βλέπει τα ίδια χρώματα.
   */
  category: {
    veterinary:  { bg: '#FEF2F2', fg: '#DC2626' },
    grooming:    { bg: '#FAF5FF', fg: '#9333EA' },
    training:    { bg: '#EFF6FF', fg: '#2563EB' },
    hosting:     { bg: '#F0FDF4', fg: '#16A34A' },
    walking:     { bg: '#FEFCE8', fg: '#CA8A04' },
    pet_taxi:    { bg: '#F0FDFA', fg: '#0D9488' },
    photography: { bg: '#FDF2F8', fg: '#DB2777' },
    pharmacy:    { bg: '#EEF2FF', fg: '#4F46E5' },
    default:     { bg: '#F3F4F6', fg: '#6B7280' },
  },
} as const

/** Αποστάσεις σε πολλαπλάσια του 4 — σταθερός ρυθμός σε όλη την εφαρμογή. */
export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const

/** Στρογγυλέματα. Οι κάρτες χρησιμοποιούν lg, τα κουμπιά md. */
export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999,
} as const

export const font = {
  xs: 11, sm: 13, base: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30, display: 34,
} as const

export const weight = {
  regular: '400', medium: '500', semibold: '600', bold: '700', black: '800',
} as const

/**
 * Ρόλοι κειμένου — ο προτιμώμενος τρόπος από δω και πέρα.
 *
 * Το `font` δίνει μόνο μέγεθος. Ένα μέγεθος χωρίς ύψος γραμμής είναι ο λόγος
 * που τα ελληνικά με τόνους βγαίνουν στριμωγμένα: οι τόνοι χρειάζονται τον
 * χώρο που το προεπιλεγμένο lineHeight δεν τους δίνει.
 *
 * Έξι ρόλοι αντί για οκτώ μεγέθη. Η ιεραρχία διαβάζεται από τη σχέση μεταξύ
 * μεγεθών — όσο περισσότερα, τόσο λιγότερες σχέσεις.
 *
 * Τίποτα κάτω από 12. Οι ετικέτες ήταν στα 10 επειδή τέσσερις στήλες με
 * ελληνικά ονόματα υπηρεσιών δεν χωρούσαν αλλιώς· η απάντηση σε αυτό είναι
 * τρεις στήλες και δύο γραμμές, όχι μικρότερη γραμματοσειρά.
 */
export const type = {
  caption:  { fontSize: 12, lineHeight: 16 },
  body:     { fontSize: 15, lineHeight: 22 },
  emphasis: { fontSize: 17, lineHeight: 24 },
  section:  { fontSize: 20, lineHeight: 27 },
  title:    { fontSize: 24, lineHeight: 31 },
  display:  { fontSize: 34, lineHeight: 40 },
} as const

/**
 * Σκιές. Στο Android δουλεύει το elevation, στο iOS τα shadow*.
 * Ορίζονται μαζί ώστε να μη χρειάζεται έλεγχος πλατφόρμας κάθε φορά.
 */
export const shadow = {
  sm: {
    shadowColor: colors.shadow, shadowOpacity: 0.05,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  md: {
    shadowColor: colors.shadow, shadowOpacity: 0.08,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow, shadowOpacity: 0.12,
    shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
} as const

/** Μέγεθος εικονιδίων ανά χρήση. */
export const icon = {
  xs: 14, sm: 16, md: 20, lg: 24, xl: 32, hero: 44,
} as const

/**
 * Ελάχιστος στόχος αφής. 44 είναι το μικρότερο που πετυχαίνει αξιόπιστα ένα
 * δάχτυλο — κουμπιά και γραμμές χτίζονται από εδώ και πάνω, αντί να παίρνουν
 * το ύψος του περιεχομένου τους.
 */
export const touch = { min: 44, comfortable: 52 } as const

export const theme = { colors, space, radius, font, type, weight, shadow, icon, touch }
export default theme
