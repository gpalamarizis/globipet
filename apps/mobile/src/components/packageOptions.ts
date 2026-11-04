/**
 * Επιλογές πακέτων — ΙΔΙΕΣ τιμές με τη σελίδα πακέτων του web
 * (ProviderPackagesPage): οι τιμές γράφονται στη βάση, άρα πρέπει να
 * ταυτίζονται σε web και κινητό.
 */
export const GROUP_KEYS: Record<string, string> = {
  bathing: 'providerPkg.gBathing',
  haircut: 'providerPkg.gHaircut',
  addon: 'providerPkg.gAddon',
  consultation: 'providerPkg.gConsultation',
  vaccination: 'providerPkg.gVaccination',
  surgery: 'providerPkg.gSurgery',
  dental: 'providerPkg.gDental',
  diagnostics: 'providerPkg.gDiagnostics',
  specialty: 'providerPkg.gSpecialty',
  oncology: 'providerPkg.gOncology',
  service: 'providerPkg.gService',
  emergency: 'providerPkg.gEmergency',
  other: 'providerPkg.gOther',
}

export const SIZE_OPTIONS = [
  { value: '', key: 'providerPkg.anyNone' },
  { value: 'small', key: 'providerPkg.szSmall' },
  { value: 'medium', key: 'providerPkg.szMedium' },
  { value: 'large', key: 'providerPkg.szLarge' },
  { value: 'xlarge', key: 'providerPkg.szXLarge' },
]

export const PET_OPTIONS = [
  { value: '', key: 'providerPkg.anyAll' },
  { value: 'dog', key: 'providerPkg.petDog' },
  { value: 'cat', key: 'providerPkg.petCat' },
]

export const MODALITY_OPTIONS = [
  { value: '', key: 'providerPkg.anyNone' },
  { value: 'in_clinic', key: 'providerPkg.modInClinic' },
  { value: 'home_visit', key: 'providerPkg.fHomeVisits' },
  { value: 'telehealth', key: 'providerPkg.modTelehealth' },
]

const SIZE_KEYS: Record<string, string> = Object.fromEntries(SIZE_OPTIONS.filter(o => o.value).map(o => [o.value, o.key]))

/**
 * Ετικέτα ομάδας/μεγέθους: κωδικός → μετάφραση· ελεύθερο κείμενο από
 * παλαιότερες εισαγωγές («Χειρουργεία», «Μικρόσωμος») → όπως είναι.
 * Πριν, έβγαινε «Άλλα» και το μέγεθος δεν φαινόταν (όπως στο web).
 */
export const groupLabel = (t: (k: string) => string, g?: string | null) =>
  !g ? t(GROUP_KEYS.other) : GROUP_KEYS[g] ? t(GROUP_KEYS[g]) : g
export const sizeLabel = (t: (k: string) => string, s?: string | null) =>
  !s ? '' : SIZE_KEYS[s] ? t(SIZE_KEYS[s]) : s

/** Επιλογές για Chips, με την τρέχουσα τιμή αν είναι ελεύθερο κείμενο. */
export function withCurrent(options: { value: string; label: string }[], current?: string | null) {
  return current && !options.some(o => o.value === current) ? [{ value: current, label: current }, ...options] : options
}
