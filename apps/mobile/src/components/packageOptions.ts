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
