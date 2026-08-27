/**
 * Κείμενα του cookie banner.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ
 *   Τα 17 κλειδιά cookieBanner.* ζητούνταν από το component αλλά δεν
 *   υπήρχαν πουθενά στο i18n — ο επισκέπτης έβλεπε «cookieBanner.title»
 *   αντί για κείμενο. Ίδιο μοτίβο με την πολιτική απορρήτου.
 *
 *   Μπαίνουν εδώ αντί στο i18n.ts, που είναι τεράστιο και επικίνδυνο να
 *   τροποποιηθεί χωρίς πλήρη εικόνα.
 *
 * ΝΟΜΙΚΗ ΒΑΣΗ
 *   Τα απαραίτητα cookies δεν απαιτούν συγκατάθεση. Για κάθε άλλη
 *   κατηγορία η συγκατάθεση πρέπει να είναι ρητή, ισότιμη και ανακλητή —
 *   γι' αυτό η «Απόρριψη όλων» έχει την ίδια βαρύτητα με την «Αποδοχή».
 *
 * ΓΛΩΣΣΕΣ
 *   Ελληνικά και αγγλικά. Οι υπόλοιπες πέφτουν στα αγγλικά.
 */

export type CookieTexts = {
  title: string
  description: string
  learnMore: string
  alwaysOn: string
  managePrefs: string
  hidePrefs: string
  acceptAll: string
  rejectAll: string
  saveChoices: string
  categories: Record<'necessary' | 'analytics' | 'marketing' | 'functional',
                     { title: string; desc: string }>
}

const el: CookieTexts = {
  title: 'Χρησιμοποιούμε cookies',
  description:
    'Κάποια είναι απαραίτητα για να λειτουργεί ο ιστότοπος. Για τα υπόλοιπα ' +
    'ζητάμε τη συγκατάθεσή σου και μπορείς να την αλλάξεις όποτε θέλεις.',
  learnMore: 'Δες την πολιτική απορρήτου',
  alwaysOn: 'Πάντα ενεργά',
  managePrefs: 'Διαχείριση προτιμήσεων',
  hidePrefs: 'Απόκρυψη',
  acceptAll: 'Αποδοχή όλων',
  rejectAll: 'Απόρριψη όλων',
  saveChoices: 'Αποθήκευση επιλογών',
  categories: {
    necessary: {
      title: 'Απαραίτητα',
      desc: 'Σύνδεση, καλάθι, ασφάλεια και βασικές προτιμήσεις. Χωρίς αυτά ο ' +
            'ιστότοπος δεν λειτουργεί, γι’ αυτό δεν απενεργοποιούνται.',
    },
    analytics: {
      title: 'Στατιστικά',
      desc: 'Μας δείχνουν ποιες σελίδες χρησιμοποιούνται και πού δυσκολεύεστε, ' +
            'ώστε να βελτιώνουμε την πλατφόρμα. Τα δεδομένα είναι συγκεντρωτικά.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Χρησιμοποιούνται για να βλέπεις σχετικές προσφορές εντός και εκτός ' +
            'της πλατφόρμας. Χωρίς αυτά, οι διαφημίσεις παραμένουν αλλά είναι τυχαίες.',
    },
    functional: {
      title: 'Λειτουργικά',
      desc: 'Θυμούνται επιλογές όπως γλώσσα, θέμα και πρόσφατες αναζητήσεις, ' +
            'ώστε να μην τις ξαναδηλώνεις κάθε φορά.',
    },
  },
}

const en: CookieTexts = {
  title: 'We use cookies',
  description:
    'Some are essential for the site to work. For the rest we ask for your ' +
    'consent, and you can change it whenever you like.',
  learnMore: 'Read the privacy policy',
  alwaysOn: 'Always on',
  managePrefs: 'Manage preferences',
  hidePrefs: 'Hide',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  saveChoices: 'Save choices',
  categories: {
    necessary: {
      title: 'Essential',
      desc: 'Sign-in, cart, security and basic preferences. The site cannot work ' +
            'without them, so they cannot be turned off.',
    },
    analytics: {
      title: 'Analytics',
      desc: 'They show us which pages get used and where people struggle, so we ' +
            'can improve the platform. The data is aggregated.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Used to show you relevant offers on and off the platform. Without ' +
            'them you still see ads, but they are untargeted.',
    },
    functional: {
      title: 'Functional',
      desc: 'They remember choices such as language, theme and recent searches, ' +
            'so you do not have to set them again.',
    },
  },
}

const SETS: Record<string, CookieTexts> = { el, en }

/** Τα κείμενα στη γλώσσα του χρήστη. Άγνωστη γλώσσα → αγγλικά, ποτέ κενό. */
export function getCookieTexts(lang?: string): CookieTexts {
  const code = String(lang || 'el').slice(0, 2).toLowerCase()
  return SETS[code] || SETS.en
}
