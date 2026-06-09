/**
 * One-off seed script to populate catalog_templates table.
 * Run once: cd apps/backend && npx tsx src/scripts/seed-catalog.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// All templates — prices NOT included (providers set their own)
const TEMPLATES = [
  // ===== GROOMING =====
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'small',  suggested_duration_minutes: 45 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'medium', suggested_duration_minutes: 60 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'large',  suggested_duration_minutes: 75 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'xlarge', suggested_duration_minutes: 90 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'small',  suggested_duration_minutes: 60 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'medium', suggested_duration_minutes: 75 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'large',  suggested_duration_minutes: 90 },
  { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'xlarge', suggested_duration_minutes: 105 },
  { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', description: 'Μπάνιο, στέγνωμα, κούρεμα, νύχια, αυτιά', size: 'small',  suggested_duration_minutes: 90 },
  { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'medium', suggested_duration_minutes: 105 },
  { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'large',  suggested_duration_minutes: 120 },
  { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'xlarge', suggested_duration_minutes: 150 },
  { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'small',  suggested_duration_minutes: 60 },
  { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'medium', suggested_duration_minutes: 75 },
  { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'large',  suggested_duration_minutes: 90 },
  { category: 'grooming', group: 'haircut', name: 'Hand stripping', description: 'Παραδοσιακό για Terriers / Schnauzers', breed_group: 'terrier', size: 'small',  suggested_duration_minutes: 90 },
  { category: 'grooming', group: 'haircut', name: 'Hand stripping', breed_group: 'terrier', size: 'medium', suggested_duration_minutes: 120 },
  { category: 'grooming', group: 'haircut', name: 'Hand stripping', breed_group: 'schnauzer', size: 'medium', suggested_duration_minutes: 120 },
  { category: 'grooming', group: 'haircut', name: 'De-matting (ξεκοτσίδωμα)', description: 'Επιπλέον χρέωση ανάλογα την κατάσταση', size: 'medium', suggested_duration_minutes: 30 },
  { category: 'grooming', group: 'addon', name: 'Κοπή νυχιών', is_addon: true, suggested_duration_minutes: 10 },
  { category: 'grooming', group: 'addon', name: 'Καθαρισμός αυτιών', is_addon: true, suggested_duration_minutes: 10 },
  { category: 'grooming', group: 'addon', name: 'Καθαρισμός παρά-πρωκτικών αδένων', is_addon: true, suggested_duration_minutes: 10 },
  { category: 'grooming', group: 'addon', name: 'Βούρτσισμα δοντιών', is_addon: true, suggested_duration_minutes: 10 },
  { category: 'grooming', group: 'addon', name: 'Blueberry facial', is_addon: true, suggested_duration_minutes: 10 },
  { category: 'grooming', group: 'addon', name: 'Oatmeal bath (ευαίσθητα δέρματα)', is_addon: true, suggested_duration_minutes: 15 },
  { category: 'grooming', group: 'addon', name: 'Παρφούμ', is_addon: true, suggested_duration_minutes: 5 },
  { category: 'grooming', group: 'addon', name: 'Nail polish (βερνίκι νυχιών)', is_addon: true, suggested_duration_minutes: 15 },
  { category: 'grooming', group: 'addon', name: 'Φιόγκος / κορδέλα', is_addon: true, suggested_duration_minutes: 5 },

  // ===== VETERINARY =====
  { category: 'veterinary', group: 'consultation', name: 'Επίσκεψη στο ιατρείο',     modality: 'in_clinic',   suggested_duration_minutes: 30 },
  { category: 'veterinary', group: 'consultation', name: 'Κατ\' οίκον επίσκεψη',     modality: 'home_visit',  suggested_duration_minutes: 45 },
  { category: 'veterinary', group: 'consultation', name: 'Τηλεσυμβουλευτική',        modality: 'telehealth',  suggested_duration_minutes: 20 },
  { category: 'veterinary', group: 'consultation', name: 'Επείγον περιστατικό',      modality: 'emergency',   suggested_duration_minutes: 30 },
  { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός βασικός (5πλά)', pet_type: 'dog',  suggested_duration_minutes: 20 },
  { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός πλήρης (7πλά)',  pet_type: 'dog',  suggested_duration_minutes: 20 },
  { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός λύσσας',         pet_type: 'dog',  suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός γάτας (4πλά)',   pet_type: 'cat',  suggested_duration_minutes: 20 },
  { category: 'veterinary', group: 'vaccination', name: 'Αντιπαρασιτική προφύλαξη',                     suggested_duration_minutes: 10 },
  { category: 'veterinary', group: 'surgery', name: 'Στείρωση σκύλου αρσενικού',  pet_type: 'dog', suggested_duration_minutes: 90 },
  { category: 'veterinary', group: 'surgery', name: 'Στείρωση σκύλου θηλυκού',    pet_type: 'dog', suggested_duration_minutes: 120 },
  { category: 'veterinary', group: 'surgery', name: 'Στείρωση γάτας αρσενικής',   pet_type: 'cat', suggested_duration_minutes: 45 },
  { category: 'veterinary', group: 'surgery', name: 'Στείρωση γάτας θηλυκής',     pet_type: 'cat', suggested_duration_minutes: 75 },
  { category: 'veterinary', group: 'surgery', name: 'Μικρή χειρουργική επέμβαση',                  suggested_duration_minutes: 60 },
  { category: 'veterinary', group: 'dental', name: 'Καθαρισμός δοντιών (υπερηχητικός)', suggested_duration_minutes: 60 },
  { category: 'veterinary', group: 'dental', name: 'Εξαγωγή δοντιού',                   suggested_duration_minutes: 30 },
  { category: 'veterinary', group: 'diagnostics', name: 'Γενική εξέταση αίματος',    suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'diagnostics', name: 'Βιοχημικός έλεγχος',        suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'diagnostics', name: 'Έλεγχος Leishmania',        suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'diagnostics', name: 'Έλεγχος Ehrlichia',         suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'diagnostics', name: '4DX test (μεταδιδόμενα)',   suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'other', name: 'Τοποθέτηση microchip',  suggested_duration_minutes: 15 },
  { category: 'veterinary', group: 'other', name: 'Διαβατήριο',            suggested_duration_minutes: 20 },

  // ===== CLINIC (everything vet + advanced diagnostics + specialties + oncology) =====
  { category: 'clinic', group: 'consultation', name: 'Επίσκεψη στο ιατρείο',     modality: 'in_clinic',   suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'consultation', name: 'Κατ\' οίκον επίσκεψη',     modality: 'home_visit',  suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'consultation', name: 'Τηλεσυμβουλευτική',        modality: 'telehealth',  suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'consultation', name: 'Επείγον περιστατικό',      modality: 'emergency',   suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός βασικός (5πλά)', pet_type: 'dog',  suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός πλήρης (7πλά)',  pet_type: 'dog',  suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός λύσσας',         pet_type: 'dog',  suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός γάτας (4πλά)',   pet_type: 'cat',  suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'vaccination', name: 'Αντιπαρασιτική προφύλαξη',                     suggested_duration_minutes: 10 },
  { category: 'clinic', group: 'surgery', name: 'Στείρωση σκύλου αρσενικού',  pet_type: 'dog', suggested_duration_minutes: 90 },
  { category: 'clinic', group: 'surgery', name: 'Στείρωση σκύλου θηλυκού',    pet_type: 'dog', suggested_duration_minutes: 120 },
  { category: 'clinic', group: 'surgery', name: 'Στείρωση γάτας αρσενικής',   pet_type: 'cat', suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'surgery', name: 'Στείρωση γάτας θηλυκής',     pet_type: 'cat', suggested_duration_minutes: 75 },
  { category: 'clinic', group: 'surgery', name: 'Μικρή χειρουργική επέμβαση',                  suggested_duration_minutes: 60 },
  { category: 'clinic', group: 'dental', name: 'Καθαρισμός δοντιών (υπερηχητικός)', suggested_duration_minutes: 60 },
  { category: 'clinic', group: 'dental', name: 'Εξαγωγή δοντιού',                   suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'diagnostics', name: 'Γενική εξέταση αίματος',    suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'diagnostics', name: 'Βιοχημικός έλεγχος',        suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'diagnostics', name: 'Έλεγχος Leishmania',        suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'diagnostics', name: 'Έλεγχος Ehrlichia',         suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'diagnostics', name: '4DX test (μεταδιδόμενα)',   suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'diagnostics', name: 'Ψηφιακή ακτινογραφία',      suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'diagnostics', name: 'Υπέρηχος κοιλίας',          suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'diagnostics', name: 'Υπερηχοκαρδιογραφία',       suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'diagnostics', name: 'Ενδοσκόπηση',               suggested_duration_minutes: 60 },
  { category: 'clinic', group: 'diagnostics', name: 'Γαστροσκόπηση',             suggested_duration_minutes: 75 },
  { category: 'clinic', group: 'diagnostics', name: 'Κολονοσκόπηση',             suggested_duration_minutes: 90 },
  { category: 'clinic', group: 'diagnostics', name: 'Ρινοσκόπηση',               suggested_duration_minutes: 60 },
  { category: 'clinic', group: 'diagnostics', name: 'Λαπαροσκόπηση (διαγνωστική)', suggested_duration_minutes: 120 },
  { category: 'clinic', group: 'specialty', name: 'Δερματολογική εκτίμηση',      suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'specialty', name: 'Καρδιολογική εκτίμηση',       suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'specialty', name: 'Ορθοπεδική εκτίμηση',         suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'specialty', name: 'Οφθαλμολογική εκτίμηση',      suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'specialty', name: 'Νευρολογική εκτίμηση',        suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'specialty', name: 'Ενδοκρινολογική εκτίμηση',    suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'oncology', name: 'Ογκολογική εκτίμηση',          suggested_duration_minutes: 60 },
  { category: 'clinic', group: 'oncology', name: 'Δειγματοληψία (FNA)',          suggested_duration_minutes: 20 },
  { category: 'clinic', group: 'oncology', name: 'Βιοψία υπό υπέρηχο',           suggested_duration_minutes: 45 },
  { category: 'clinic', group: 'oncology', name: 'Χημειοθεραπεία (συνεδρία)',    suggested_duration_minutes: 90 },
  { category: 'clinic', group: 'oncology', name: 'Ογκολογική παρακολούθηση',     suggested_duration_minutes: 30 },
  { category: 'clinic', group: 'other', name: 'Νοσηλεία (ημέρα)',                suggested_duration_minutes: 1440 },
  { category: 'clinic', group: 'other', name: 'Νοσηλεία εντατικής (ημέρα)',      suggested_duration_minutes: 1440 },
  { category: 'clinic', group: 'other', name: '24ωρη παρακολούθηση',             suggested_duration_minutes: 1440 },
  { category: 'clinic', group: 'other', name: 'Τοποθέτηση microchip',            suggested_duration_minutes: 15 },
  { category: 'clinic', group: 'other', name: 'Διαβατήριο',                      suggested_duration_minutes: 20 },

  // ===== WALKING =====
  { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'small',  suggested_duration_minutes: 30 },
  { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'medium', suggested_duration_minutes: 30 },
  { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'large',  suggested_duration_minutes: 30 },
  { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'small',  suggested_duration_minutes: 60 },
  { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'medium', suggested_duration_minutes: 60 },
  { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'large',  suggested_duration_minutes: 60 },
  { category: 'walking', group: 'addon', name: 'Επιπλέον σκύλος', is_addon: true, suggested_duration_minutes: 0 },
  { category: 'walking', group: 'addon', name: 'GPS tracking + φωτογραφίες', is_addon: true, suggested_duration_minutes: 0 },

  // ===== SITTING =====
  { category: 'sitting', group: 'service', name: 'Επίσκεψη στο σπίτι (30΄)', modality: 'home_visit', suggested_duration_minutes: 30 },
  { category: 'sitting', group: 'service', name: 'Επίσκεψη στο σπίτι (60΄)', modality: 'home_visit', suggested_duration_minutes: 60 },
  { category: 'sitting', group: 'service', name: 'Μέρα φροντίδας (10ω)', suggested_duration_minutes: 600 },
  { category: 'sitting', group: 'service', name: 'Διανυκτέρευση (1 βράδυ)', suggested_duration_minutes: 1440 },
  { category: 'sitting', group: 'addon', name: 'Επιπλέον κατοικίδιο', is_addon: true, suggested_duration_minutes: 0 },
  { category: 'sitting', group: 'addon', name: 'Χορήγηση φαρμακευτικής αγωγής', is_addon: true, suggested_duration_minutes: 0 },

  // ===== BOARDING / DAYCARE (shared) =====
  { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)',          size: 'small',  suggested_duration_minutes: 600 },
  { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)',          size: 'medium', suggested_duration_minutes: 600 },
  { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)',          size: 'large',  suggested_duration_minutes: 600 },
  { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)',       size: 'small',  suggested_duration_minutes: 1440 },
  { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)',       size: 'medium', suggested_duration_minutes: 1440 },
  { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)',       size: 'large',  suggested_duration_minutes: 1440 },
  { category: 'boarding', group: 'service', name: 'Luxury suite (1 βράδυ)',                   suggested_duration_minutes: 1440 },
  { category: 'boarding', group: 'addon', name: 'Επιπλέον σκύλος (συγκάτοικος)', is_addon: true, suggested_duration_minutes: 0 },
  { category: 'boarding', group: 'addon', name: 'Premium γεύμα',                 is_addon: true, suggested_duration_minutes: 0 },

  { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'small',  suggested_duration_minutes: 600 },
  { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'medium', suggested_duration_minutes: 600 },
  { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'large',  suggested_duration_minutes: 600 },
  { category: 'daycare', group: 'addon', name: 'Premium γεύμα', is_addon: true, suggested_duration_minutes: 0 },

  // ===== TRAINING =====
  { category: 'training', group: 'service', name: 'Ατομικό μάθημα (60΄)', suggested_duration_minutes: 60 },
  { category: 'training', group: 'service', name: 'Πακέτο 5 ατομικών',    suggested_duration_minutes: 60 },
  { category: 'training', group: 'service', name: 'Πακέτο 10 ατομικών',   suggested_duration_minutes: 60 },
  { category: 'training', group: 'service', name: 'Ομαδικό μάθημα (60΄)', suggested_duration_minutes: 60 },
  { category: 'training', group: 'service', name: 'Κουτάβι basic course (4 εβδ.)', suggested_duration_minutes: 60 },
  { category: 'training', group: 'service', name: 'Διόρθωση συμπεριφοράς (intensive)', suggested_duration_minutes: 90 },
]

async function main() {
  console.log(`Σβήσιμο υπαρχόντων templates...`)
  await prisma.catalogTemplate.deleteMany()

  console.log(`Εισαγωγή ${TEMPLATES.length} templates...`)
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]
    await prisma.catalogTemplate.create({
      data: {
        category: t.category,
        group: t.group,
        name: t.name,
        description: (t as any).description ?? null,
        size: (t as any).size ?? null,
        pet_type: (t as any).pet_type ?? null,
        breed_group: (t as any).breed_group ?? null,
        modality: (t as any).modality ?? null,
        suggested_duration_minutes: t.suggested_duration_minutes,
        is_addon: (t as any).is_addon ?? false,
        display_order: i,
      }
    })
  }

  const count = await prisma.catalogTemplate.count()
  console.log(`✅ Done. ${count} templates στη βάση.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
