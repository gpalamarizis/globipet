/**
 * Preset catalogs that providers can quickly import.
 * Located at apps/backend/src/lib/catalog-presets.ts
 */

export type CategoryKey = 'grooming' | 'veterinary' | 'clinic' | 'walking' | 'sitting' | 'daycare' | 'boarding' | 'training' | 'transport' | 'photography'

export interface PresetPackage {
  group: string
  name: string
  description?: string
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  pet_type?: string
  breed_group?: string
  modality?: string
  price: number
  duration_minutes: number
  is_addon?: boolean
  display_order?: number
}

// ============================================================
// GROOMING — sizes × types + add-ons
// ============================================================
export const GROOMING_PRESET: PresetPackage[] = [
  // Bathing
  { group: 'bathing', name: 'Μπάνιο', size: 'small',  price: 18, duration_minutes: 45 },
  { group: 'bathing', name: 'Μπάνιο', size: 'medium', price: 25, duration_minutes: 60 },
  { group: 'bathing', name: 'Μπάνιο', size: 'large',  price: 35, duration_minutes: 75 },
  { group: 'bathing', name: 'Μπάνιο', size: 'xlarge', price: 45, duration_minutes: 90 },

  // Bath & brush
  { group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'small',  price: 25, duration_minutes: 60 },
  { group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'medium', price: 35, duration_minutes: 75 },
  { group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'large',  price: 45, duration_minutes: 90 },
  { group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'xlarge', price: 55, duration_minutes: 105 },

  // Full groom
  { group: 'haircut', name: 'Πλήρες grooming (Full Groom)', description: 'Μπάνιο, στέγνωμα, κούρεμα, νύχια, αυτιά', size: 'small',  price: 40, duration_minutes: 90 },
  { group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'medium', price: 55, duration_minutes: 105 },
  { group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'large',  price: 70, duration_minutes: 120 },
  { group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'xlarge', price: 95, duration_minutes: 150 },

  // De-shedding
  { group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'small',  price: 30, duration_minutes: 60 },
  { group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'medium', price: 45, duration_minutes: 75 },
  { group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'large',  price: 60, duration_minutes: 90 },

  // Hand stripping (breed-specific)
  { group: 'haircut', name: 'Hand stripping', description: 'Παραδοσιακό για Terriers / Schnauzers', breed_group: 'terrier', size: 'small',  price: 55, duration_minutes: 90 },
  { group: 'haircut', name: 'Hand stripping', breed_group: 'terrier', size: 'medium', price: 75, duration_minutes: 120 },
  { group: 'haircut', name: 'Hand stripping', breed_group: 'schnauzer', size: 'medium', price: 80, duration_minutes: 120 },

  // De-matting (special)
  { group: 'haircut', name: 'De-matting (ξεκοτσίδωμα)', description: 'Επιπλέον χρέωση ανάλογα την κατάσταση', size: 'medium', price: 25, duration_minutes: 30 },

  // Add-ons à la carte
  { group: 'addon', name: 'Κοπή νυχιών', is_addon: true, price: 8,  duration_minutes: 10 },
  { group: 'addon', name: 'Καθαρισμός αυτιών', is_addon: true, price: 10, duration_minutes: 10 },
  { group: 'addon', name: 'Καθαρισμός παρά-πρωκτικών αδένων', is_addon: true, price: 12, duration_minutes: 10 },
  { group: 'addon', name: 'Βούρτσισμα δοντιών', is_addon: true, price: 10, duration_minutes: 10 },
  { group: 'addon', name: 'Blueberry facial', is_addon: true, price: 8,  duration_minutes: 10 },
  { group: 'addon', name: 'Oatmeal bath (ευαίσθητα δέρματα)', is_addon: true, price: 12, duration_minutes: 15 },
  { group: 'addon', name: 'Παρφούμ', is_addon: true, price: 5, duration_minutes: 5 },
  { group: 'addon', name: 'Nail polish (βερνίκι νυχιών)', is_addon: true, price: 8, duration_minutes: 15 },
  { group: 'addon', name: 'Φιόγκος / κορδέλα', is_addon: true, price: 3, duration_minutes: 5 },
]

// ============================================================
// VETERINARY — solo practice
// ============================================================
export const VETERINARY_PRESET: PresetPackage[] = [
  // Consultations
  { group: 'consultation', name: 'Επίσκεψη στο ιατρείο',     modality: 'in_clinic',   price: 30, duration_minutes: 30 },
  { group: 'consultation', name: 'Κατ\' οίκον επίσκεψη',     modality: 'home_visit',  price: 60, duration_minutes: 45 },
  { group: 'consultation', name: 'Τηλεσυμβουλευτική',        modality: 'telehealth',  price: 25, duration_minutes: 20 },
  { group: 'consultation', name: 'Επείγον περιστατικό',      modality: 'emergency',   price: 80, duration_minutes: 30 },

  // Vaccinations
  { group: 'vaccination', name: 'Εμβολιασμός βασικός (5πλά)', pet_type: 'dog',  price: 35, duration_minutes: 20 },
  { group: 'vaccination', name: 'Εμβολιασμός πλήρης (7πλά)',  pet_type: 'dog',  price: 45, duration_minutes: 20 },
  { group: 'vaccination', name: 'Εμβολιασμός λύσσας',         pet_type: 'dog',  price: 25, duration_minutes: 15 },
  { group: 'vaccination', name: 'Εμβολιασμός γάτας (4πλά)',   pet_type: 'cat',  price: 40, duration_minutes: 20 },
  { group: 'vaccination', name: 'Αντιπαρασιτική προφύλαξη',                     price: 20, duration_minutes: 10 },

  // Surgery
  { group: 'surgery', name: 'Στείρωση σκύλου αρσενικού',  pet_type: 'dog', price: 180, duration_minutes: 90 },
  { group: 'surgery', name: 'Στείρωση σκύλου θηλυκού',    pet_type: 'dog', price: 250, duration_minutes: 120 },
  { group: 'surgery', name: 'Στείρωση γάτας αρσενικής',   pet_type: 'cat', price: 80,  duration_minutes: 45 },
  { group: 'surgery', name: 'Στείρωση γάτας θηλυκής',     pet_type: 'cat', price: 130, duration_minutes: 75 },
  { group: 'surgery', name: 'Μικρή χειρουργική επέμβαση',                  price: 150, duration_minutes: 60 },

  // Dental
  { group: 'dental', name: 'Καθαρισμός δοντιών (υπερηχητικός)', price: 80, duration_minutes: 60 },
  { group: 'dental', name: 'Εξαγωγή δοντιού',                   price: 40, duration_minutes: 30 },

  // Diagnostics (basic)
  { group: 'diagnostics', name: 'Γενική εξέταση αίματος',    price: 35, duration_minutes: 15 },
  { group: 'diagnostics', name: 'Βιοχημικός έλεγχος',        price: 45, duration_minutes: 15 },
  { group: 'diagnostics', name: 'Έλεγχος Leishmania',        price: 40, duration_minutes: 15 },
  { group: 'diagnostics', name: 'Έλεγχος Ehrlichia',         price: 35, duration_minutes: 15 },
  { group: 'diagnostics', name: '4DX test (μεταδιδόμενα)',   price: 55, duration_minutes: 15 },

  // Microchip
  { group: 'other', name: 'Τοποθέτηση microchip',  price: 35, duration_minutes: 15 },
  { group: 'other', name: 'Διαβατήριο',            price: 40, duration_minutes: 20 },
]

// ============================================================
// CLINIC — full hospital with specialties + equipment
// ============================================================
export const CLINIC_PRESET: PresetPackage[] = [
  ...VETERINARY_PRESET,

  // Imaging / Diagnostics (advanced)
  { group: 'diagnostics', name: 'Ψηφιακή ακτινογραφία',           price: 45,  duration_minutes: 20 },
  { group: 'diagnostics', name: 'Υπέρηχος κοιλίας',               price: 70,  duration_minutes: 30 },
  { group: 'diagnostics', name: 'Υπερηχοκαρδιογραφία',            price: 90,  duration_minutes: 45 },
  { group: 'diagnostics', name: 'Ενδοσκόπηση',                    price: 180, duration_minutes: 60 },
  { group: 'diagnostics', name: 'Γαστροσκόπηση',                  price: 200, duration_minutes: 75 },
  { group: 'diagnostics', name: 'Κολονοσκόπηση',                  price: 220, duration_minutes: 90 },
  { group: 'diagnostics', name: 'Ρινοσκόπηση',                    price: 180, duration_minutes: 60 },
  { group: 'diagnostics', name: 'Λαπαροσκόπηση (διαγνωστική)',    price: 350, duration_minutes: 120 },

  // Specialties
  { group: 'specialty', name: 'Δερματολογική εκτίμηση',           price: 50, duration_minutes: 30 },
  { group: 'specialty', name: 'Καρδιολογική εκτίμηση',            price: 60, duration_minutes: 45 },
  { group: 'specialty', name: 'Ορθοπεδική εκτίμηση',              price: 55, duration_minutes: 30 },
  { group: 'specialty', name: 'Οφθαλμολογική εκτίμηση',           price: 55, duration_minutes: 30 },
  { group: 'specialty', name: 'Νευρολογική εκτίμηση',             price: 65, duration_minutes: 45 },
  { group: 'specialty', name: 'Ενδοκρινολογική εκτίμηση',         price: 60, duration_minutes: 30 },

  // Oncology
  { group: 'oncology', name: 'Ογκολογική εκτίμηση',               price: 100, duration_minutes: 60 },
  { group: 'oncology', name: 'Δειγματοληψία (FNA)',               price: 70,  duration_minutes: 20 },
  { group: 'oncology', name: 'Βιοψία υπό υπέρηχο',                price: 120, duration_minutes: 45 },
  { group: 'oncology', name: 'Χημειοθεραπεία (συνεδρία)',         price: 200, duration_minutes: 90 },
  { group: 'oncology', name: 'Ογκολογική παρακολούθηση',          price: 80,  duration_minutes: 30 },

  // Hospitalization
  { group: 'other', name: 'Νοσηλεία (ημέρα)',                     price: 50,  duration_minutes: 1440 },
  { group: 'other', name: 'Νοσηλεία εντατικής (ημέρα)',           price: 120, duration_minutes: 1440 },
  { group: 'other', name: '24ωρη παρακολούθηση',                  price: 80,  duration_minutes: 1440 },
]

// ============================================================
// WALKING
// ============================================================
export const WALKING_PRESET: PresetPackage[] = [
  { group: 'service', name: 'Βόλτα 30 λεπτά', size: 'small',  price: 10, duration_minutes: 30 },
  { group: 'service', name: 'Βόλτα 30 λεπτά', size: 'medium', price: 12, duration_minutes: 30 },
  { group: 'service', name: 'Βόλτα 30 λεπτά', size: 'large',  price: 14, duration_minutes: 30 },
  { group: 'service', name: 'Βόλτα 60 λεπτά', size: 'small',  price: 15, duration_minutes: 60 },
  { group: 'service', name: 'Βόλτα 60 λεπτά', size: 'medium', price: 18, duration_minutes: 60 },
  { group: 'service', name: 'Βόλτα 60 λεπτά', size: 'large',  price: 22, duration_minutes: 60 },
  { group: 'addon', name: 'Επιπλέον σκύλος', is_addon: true, price: 5, duration_minutes: 0 },
  { group: 'addon', name: 'GPS tracking + φωτογραφίες', is_addon: true, price: 3, duration_minutes: 0 },
]

// ============================================================
// SITTING
// ============================================================
export const SITTING_PRESET: PresetPackage[] = [
  { group: 'service', name: 'Επίσκεψη στο σπίτι (30΄)', modality: 'home_visit', price: 15, duration_minutes: 30 },
  { group: 'service', name: 'Επίσκεψη στο σπίτι (60΄)', modality: 'home_visit', price: 22, duration_minutes: 60 },
  { group: 'service', name: 'Μέρα φροντίδας (10ω)', price: 35, duration_minutes: 600 },
  { group: 'service', name: 'Διανυκτέρευση (1 βράδυ)', price: 40, duration_minutes: 1440 },
  { group: 'addon', name: 'Επιπλέον κατοικίδιο', is_addon: true, price: 8, duration_minutes: 0 },
  { group: 'addon', name: 'Χορήγηση φαρμακευτικής αγωγής', is_addon: true, price: 5, duration_minutes: 0 },
]

// ============================================================
// BOARDING / DAYCARE
// ============================================================
export const BOARDING_PRESET: PresetPackage[] = [
  { group: 'service', name: 'Daycare (ημέρα)',          size: 'small',  price: 20, duration_minutes: 600 },
  { group: 'service', name: 'Daycare (ημέρα)',          size: 'medium', price: 25, duration_minutes: 600 },
  { group: 'service', name: 'Daycare (ημέρα)',          size: 'large',  price: 30, duration_minutes: 600 },
  { group: 'service', name: 'Boarding (1 βράδυ)',       size: 'small',  price: 30, duration_minutes: 1440 },
  { group: 'service', name: 'Boarding (1 βράδυ)',       size: 'medium', price: 35, duration_minutes: 1440 },
  { group: 'service', name: 'Boarding (1 βράδυ)',       size: 'large',  price: 40, duration_minutes: 1440 },
  { group: 'service', name: 'Luxury suite (1 βράδυ)',                   price: 60, duration_minutes: 1440 },
  { group: 'addon', name: 'Επιπλέον σκύλος (συγκάτοικος)', is_addon: true, price: 10, duration_minutes: 0 },
  { group: 'addon', name: 'Premium γεύμα',                 is_addon: true, price: 8,  duration_minutes: 0 },
]

// ============================================================
// TRAINING
// ============================================================
export const TRAINING_PRESET: PresetPackage[] = [
  { group: 'service', name: 'Ατομικό μάθημα (60΄)', price: 35, duration_minutes: 60 },
  { group: 'service', name: 'Πακέτο 5 ατομικών',    price: 150, duration_minutes: 60 },
  { group: 'service', name: 'Πακέτο 10 ατομικών',   price: 280, duration_minutes: 60 },
  { group: 'service', name: 'Ομαδικό μάθημα (60΄)', price: 20, duration_minutes: 60 },
  { group: 'service', name: 'Κουτάβι basic course (4 εβδ.)', price: 180, duration_minutes: 60 },
  { group: 'service', name: 'Διόρθωση συμπεριφοράς (intensive)', price: 250, duration_minutes: 90 },
]

// ============================================================
// Master catalog
// ============================================================
export const CATALOG_PRESETS: Record<CategoryKey, PresetPackage[]> = {
  grooming:    GROOMING_PRESET,
  veterinary:  VETERINARY_PRESET,
  clinic:      CLINIC_PRESET,
  walking:     WALKING_PRESET,
  sitting:     SITTING_PRESET,
  daycare:     BOARDING_PRESET,
  boarding:    BOARDING_PRESET,
  training:    TRAINING_PRESET,
  transport:   [],
  photography: [],
}
