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
 */

export const colors = {
  // Κύρια ταυτότητα — το πορτοκαλί του GlobiPet
  brand:      '#E65100',
  brandDark:  '#BF360C',
  brandLight: '#FFF3E0',
  brandTint:  '#FFE0B2',

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

export const theme = { colors, space, radius, font, weight, shadow, icon }
export default theme
