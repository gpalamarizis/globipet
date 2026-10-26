/**
 * Κείμενα της αρχικής που αλλάζει ο διαχειριστής (GET /settings/content/home,
 * σελίδα «Περιεχόμενο» του admin) — ίδιος κανόνας με το κινητό
 * (mobile/app/(tabs)/index.tsx, adminText).
 *
 * Ο server συγχωνεύει πάντα τα αποθηκευμένα με τις ελληνικές προεπιλογές του
 * (DEFAULT_CONTENT.home στο backend/src/routes/settings.ts — ΙΔΙΕΣ τιμές εδώ),
 * άρα η απάντηση δεν είναι ποτέ άδεια. Τιμή ίση με την προεπιλογή = «δεν την
 * άλλαξε κανείς» → μένει το μεταφρασμένο κείμενο (t()), αλλιώς ο αγγλόφωνος
 * χρήστης θα έβλεπε ελληνικά.
 */
export const SERVER_HOME_DEFAULTS: Record<string, string> = {
  hero_title_1: 'Η καλύτερη φροντίδα για τους',
  hero_title_2: 'καλύτερους φίλους σου',
  hero_subtitle: 'Το all-in-one pet super-app για κατοικίδια και ιδιοκτήτες',
  hero_cta: 'Ξεκινήστε Τώρα',
  marquee_text: 'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο',
  services_title: 'Υπηρεσίες',
  services_subtitle: 'Βρες τον καλύτερο πάροχο κοντά σου',
}

/** Κείμενο του διαχειριστή, ή null όταν λείπει/είναι κενό/είναι η προεπιλογή του server. */
export function adminText(content: unknown, key: string): string | null {
  const v = (content as Record<string, unknown> | null | undefined)?.[key]
  if (typeof v !== 'string') return null
  const x = v.trim()
  return x && x !== SERVER_HOME_DEFAULTS[key] ? x : null
}
