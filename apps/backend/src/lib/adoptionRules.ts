/**
 * Υιοθεσία — κανόνες ανά χώρα (επιβάλλονται στον SERVER).
 *
 * Το web και το κινητό διαβάζουν τους ίδιους κανόνες από το GET
 * /adoption/rules για να δείξουν τα σωστά πεδία, αλλά η απόφαση είναι
 * πάντα εδώ: μια φόρμα που «ξέχασε» έναν κανόνα δεν περνά τίποτα.
 *
 * Πολιτική πλατφόρμας (ισχύει παντού, πάνω από τον νόμο κάθε χώρας):
 *   · ιδιώτες: ΜΟΝΟ δωρεάν — ποτέ πώληση μέσω GlobiPet
 *   · ελάχιστη ηλικία 8 εβδομάδες (GR/ES/GB/FR ρητά· κοινή πρακτική αλλού)
 *   · η GlobiPet δεν εισπράττει τίποτα· τυχόν αντίτιμο οργανισμού = κάλυψη εξόδων
 */
import type { AckKey } from './adoptionContent.js'

export const SPECIES = ['dog', 'cat', 'rabbit', 'ferret', 'bird', 'rodent', 'reptile', 'other'] as const
export const SEXES = ['male', 'female', 'unknown'] as const
export const SIZES = ['small', 'medium', 'large', 'xlarge'] as const
export const TRISTATE = ['yes', 'no', 'unknown'] as const
export const ENERGY = ['low', 'medium', 'high'] as const
export const SOURCES = ['shelter', 'foster', 'own_pet', 'found'] as const
export const LISTING_STATUSES = ['available', 'reserved', 'adopted', 'withdrawn'] as const
export const APP_STATUSES = ['pending', 'reviewing', 'approved', 'rejected', 'withdrawn', 'completed'] as const

export const MIN_AGE_WEEKS = 8
export const MAX_PHOTOS = 8
export const MAX_ORG_FEE = 1000

/** Χώρες ΕΕ/ΕΟΧ: ίδια βάση (Κανονισμός 2026/1818) για τις «άλλες» χώρες. */
const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'])

/** Νόμιμα απαγορευμένοι τύποι στο Ηνωμένο Βασίλειο (Dangerous Dogs Act 1991 + XL Bully). */
const GB_BANNED = [
  /pit\s*-?\s*bull/i,
  /\btosa\b/i,
  /dogo\s*argentino/i,
  /fila\s*brasileir/i,
  /\bxl\s*-?\s*bully\b/i,
  /american\s*bully\s*xl/i,
]

export type CountryRules = {
  country: string
  /** Είδη για τα οποία ο αριθμός μικροτσίπ είναι υποχρεωτικός στην αγγελία. */
  microchip_species: string[]
  /** Γαλλία/Ελλάδα: ο αριθμός σήμανσης φαίνεται δημόσια στην αγγελία. */
  show_microchip_publicly: boolean
  min_age_weeks: number
  individual_fee_allowed: false
  org_fee_allowed: boolean
  /** Ελλάδα: μόνο αποδεδειγμένα έξοδα — η ανάλυση είναι υποχρεωτική. */
  org_fee_breakdown_required: boolean
  /** Ηνωμένο Βασίλειο: ιδιώτης με σκύλο/γάτα < 6 μηνών δηλώνει ότι το γέννησε δικό του ζώο. */
  under_6m_bred_by_lister: boolean
  banned_breeds_note: boolean
  /** Κίνα: σκύλος μόνο εμβολιασμένος κατά της λύσσας. */
  dog_rabies_required: boolean
  /** Ελλάδα: ο αιτών διαμένει στη χώρα, εκτός αν η αγγελία δέχεται εξωτερικό. */
  adopter_residence_required: boolean
  /** Γαλλία: certificat d'engagement — ολοκλήρωση ≥ 7 ημέρες μετά. */
  cec_required_species: string[]
  completion_acks: AckKey[]
  /** Ελάχιστη ηλικία του νέου κηδεμόνα. */
  adopter_min_age: number
}

export function rulesFor(countryRaw: string): CountryRules {
  const country = String(countryRaw || '').toUpperCase().slice(0, 2)
  const base: CountryRules = {
    country,
    microchip_species: EU.has(country) ? ['dog', 'cat'] : [],
    show_microchip_publicly: false,
    min_age_weeks: MIN_AGE_WEEKS,
    individual_fee_allowed: false,
    org_fee_allowed: true,
    org_fee_breakdown_required: false,
    under_6m_bred_by_lister: false,
    banned_breeds_note: false,
    dog_rabies_required: false,
    adopter_residence_required: false,
    cec_required_species: [],
    completion_acks: ['contract_signed', 'registry_updated', 'health_docs'],
    adopter_min_age: 18,
  }
  switch (country) {
    case 'GR':
      return { ...base, microchip_species: ['dog', 'cat'], show_microchip_publicly: true,
        org_fee_breakdown_required: true, adopter_residence_required: true,
        completion_acks: ['contract_signed', 'registry_updated', 'health_docs', 'costs_only'] }
    case 'ES':
      return { ...base, microchip_species: ['dog', 'cat', 'ferret'] }
    case 'GB':
      return { ...base, microchip_species: ['dog', 'cat'], under_6m_bred_by_lister: true, banned_breeds_note: true }
    case 'FR':
      return { ...base, microchip_species: ['dog', 'cat', 'ferret'], show_microchip_publicly: true,
        cec_required_species: ['dog', 'cat', 'ferret', 'rabbit'],
        completion_acks: ['contract_signed', 'registry_updated', 'health_docs', 'cec_7_days'] }
    case 'CN':
      return { ...base, microchip_species: [], dog_rabies_required: true,
        completion_acks: ['contract_signed', 'registry_updated', 'rabies_certificate'] }
    default:
      return base
  }
}

/** Ηλικία σε εβδομάδες από την εκτιμώμενη ημερομηνία γέννησης. */
export function ageWeeks(birth: Date, now = new Date()): number {
  return Math.floor((now.getTime() - birth.getTime()) / (7 * 86_400_000))
}

/** Ηλικία ανθρώπου σε πλήρη έτη. */
export function ageYears(birth: Date, now = new Date()): number {
  let y = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) y--
  return y
}

/** Μικροτσίπ ISO 11784/11785: 15 ψηφία (δεκτά και παλαιά 9–10 αλφαριθμητικά). */
export function normaliseMicrochip(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/[\s-]/g, '').toUpperCase()
  if (!s) return null
  return /^(\d{15}|[0-9A-F]{9,10})$/.test(s) ? s : 'INVALID'
}

export type ListingDraft = {
  lister_type: 'organisation' | 'individual'
  species: string
  breed: string | null
  country: string
  birth_date_est: Date
  microchip_number: string | null
  adoption_fee: number
  fee_breakdown: string | null
  bred_by_lister: boolean
  is_vaccinated: boolean
  source: string
}

/**
 * Έλεγχος αγγελίας με τους κανόνες της χώρας. Επιστρέφει { message, field }
 * στο πρώτο σφάλμα — τα μηνύματα είναι ελληνικά και μεταφράζονται κεντρικά
 * (lib/apiMessages.ts).
 */
export function checkListing(d: ListingDraft): { message: string; field: string } | null {
  const r = rulesFor(d.country)
  const weeks = ageWeeks(d.birth_date_est)
  if (d.birth_date_est.getTime() > Date.now()) return { message: 'Η ημερομηνία γέννησης δεν μπορεί να είναι στο μέλλον', field: 'birth_date_est' }
  if (weeks < r.min_age_weeks) return { message: 'Το ζώο πρέπει να είναι τουλάχιστον 8 εβδομάδων', field: 'birth_date_est' }

  if (r.microchip_species.includes(d.species) && !d.microchip_number) {
    return { message: 'Ο αριθμός μικροτσίπ είναι υποχρεωτικός για αυτό το είδος στη χώρα σου', field: 'microchip_number' }
  }

  if (d.lister_type === 'individual') {
    if (d.adoption_fee > 0) return { message: 'Οι ιδιώτες δίνουν ζώα μόνο δωρεάν', field: 'adoption_fee' }
  } else {
    if (d.adoption_fee < 0 || d.adoption_fee > MAX_ORG_FEE) return { message: 'Μη έγκυρο ποσό κάλυψης εξόδων', field: 'adoption_fee' }
    if (d.adoption_fee > 0 && r.org_fee_breakdown_required && !(d.fee_breakdown && d.fee_breakdown.trim().length >= 5)) {
      return { message: 'Γράψε την ανάλυση των εξόδων (μεταφορά, σίτιση, κτηνίατρος)', field: 'fee_breakdown' }
    }
  }

  if (d.country === 'GB' && (d.species === 'dog') && d.breed && GB_BANNED.some(rx => rx.test(d.breed!))) {
    return { message: 'Αυτός ο τύπος σκύλου δεν επιτρέπεται να δοθεί σε νέο σπίτι στο Ηνωμένο Βασίλειο', field: 'breed' }
  }
  if (r.under_6m_bred_by_lister && d.lister_type === 'individual' && (d.species === 'dog' || d.species === 'cat')
      && weeks < 26 && !d.bred_by_lister) {
    return { message: 'Στο Ηνωμένο Βασίλειο ιδιώτης δίνει κουτάβι/γατάκι κάτω των 6 μηνών μόνο αν το γέννησε δικό του ζώο', field: 'bred_by_lister' }
  }
  if (r.dog_rabies_required && d.species === 'dog' && !d.is_vaccinated) {
    return { message: 'Ο σκύλος πρέπει να είναι εμβολιασμένος κατά της λύσσας', field: 'is_vaccinated' }
  }
  if (d.lister_type === 'individual' && d.source === 'shelter') {
    return { message: 'Η πηγή «καταφύγιο» είναι μόνο για οργανισμούς', field: 'source' }
  }
  return null
}

/** Ο κανόνας ως απλό αντικείμενο για τους clients (χωρίς RegExp). */
export function publicRules(country: string) {
  return rulesFor(country)
}
