import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding GlobiPet launch data...')

  const password_hash = await bcrypt.hash('GlobiPet2026!', 12)

  // ───────── CLEAR PREVIOUS SEED DATA ─────────────────────────────────────
  console.log('🧹 Clearing previous data...')
  await prisma.bookingPackage.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.servicePackage.deleteMany()
  await prisma.service.deleteMany()
  await prisma.pet.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.review.deleteMany()
  await prisma.userInsuranceSubscription.deleteMany()
  await prisma.productSubscription.deleteMany()
  await prisma.product.deleteMany()
  await prisma.insurancePlan.deleteMany()
  await prisma.insuranceProvider.deleteMany()
  await prisma.loyaltyPoints.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.healthRecord.deleteMany()
  await prisma.vaccination.deleteMany()
  await prisma.forumTopic.deleteMany()
  await prisma.petLocation.deleteMany()
  await prisma.telehealthConsultation.deleteMany()
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()
  console.log('✓ Cleared')

  // ───────── USERS ─────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      full_name: 'George Palamarizis',
      email: 'admin@globipet.com',
      password_hash,
      role: 'admin',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
    },
  })

  const demo = await prisma.user.create({
    data: {
      full_name: 'Δημήτρης Παπαδόπουλος',
      email: 'demo@globipet.com',
      password_hash,
      role: 'user',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
    },
  })

  const vetUser = await prisma.user.create({
    data: {
      full_name: 'Δρ. Ελένη Παπαδοπούλου',
      email: 'vet@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+302101234567',
      bio: 'Κτηνίατρος με 12 χρόνια εμπειρίας σε μικρά ζώα. Ειδικότητα σε παθολογία και χειρουργική.',
    },
  })

  const groomerUser = await prisma.user.create({
    data: {
      full_name: 'Νίκος Αντωνίου',
      email: 'groomer@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Θεσσαλονίκη',
      country: 'GR',
      phone: '+302311234567',
      bio: 'Επαγγελματικό grooming για σκύλους και γάτες, 8 χρόνια εμπειρίας.',
    },
  })

  const clinicUser = await prisma.user.create({
    data: {
      full_name: 'Κτηνιατρείο Νότου',
      email: 'clinic@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Πειραιάς',
      country: 'GR',
      phone: '+302104567890',
      bio: 'Κτηνιατρικό κέντρο με πλήρεις εγκαταστάσεις και 24ωρη εφημερία.',
    },
  })

  const walkerUser = await prisma.user.create({
    data: {
      full_name: 'Μαρία Κωνσταντίνου',
      email: 'walker@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+306971234567',
      bio: 'Επαγγελματική dog walker με αγάπη για τα ζώα. Ομαδικοί και ατομικοί περίπατοι.',
    },
  })

  const sitterUser = await prisma.user.create({
    data: {
      full_name: 'Κώστας Δημητρίου',
      email: 'sitter@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+306981234567',
      bio: 'Pet sitter στο σπίτι σας ή στο δικό μου. Αξιόπιστος και υπεύθυνος.',
    },
  })

  const boardingUser = await prisma.user.create({
    data: {
      full_name: 'PetHotel Αθηνά',
      email: 'boarding@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Κηφισιά',
      country: 'GR',
      phone: '+302106789012',
      bio: 'Ξενοδοχείο κατοικιδίων με εξαιρετικές εγκαταστάσεις και εξειδικευμένο προσωπικό.',
    },
  })

  const trainerUser = await prisma.user.create({
    data: {
      full_name: 'Αλέξης Παπαγεωργίου',
      email: 'trainer@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+306951234567',
      bio: 'Πιστοποιημένος εκπαιδευτής σκύλων. Θετικές μεθόδους εκπαίδευσης για όλες τις φυλές.',
    },
  })

  const transportUser = await prisma.user.create({
    data: {
      full_name: 'PetTransfer GR',
      email: 'transport@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+302109876543',
      bio: 'Ασφαλής μεταφορά κατοικιδίων σε κτηνίατρο, groomer ή οπουδήποτε χρειαστεί.',
    },
  })

  const photographerUser = await prisma.user.create({
    data: {
      full_name: 'Σοφία Νικολάου',
      email: 'photographer@globipet.com',
      password_hash,
      role: 'service_provider',
      is_verified: true,
      preferred_language: 'el',
      city: 'Αθήνα',
      country: 'GR',
      phone: '+306961234567',
      bio: 'Pet photographer με εξειδίκευση σε πορτρέτα κατοικιδίων. Επαγγελματικός εξοπλισμός.',
    },
  })

  console.log('✓ 11 users created')

  // ───────── PETS ──────────────────────────────────────────────────────────
  await prisma.pet.create({
    data: {
      owner_email: demo.email,
      name: 'Μπάρμπας',
      species: 'dog',
      breed: 'Labrador',
      age: 3,
      weight: 28,
      gender: 'male',
      color: 'Χρυσός',
      vaccination_status: 'up_to_date',
    },
  })

  await prisma.pet.create({
    data: {
      owner_email: demo.email,
      name: 'Λούνα',
      species: 'cat',
      breed: 'Persian',
      age: 2,
      weight: 4.5,
      gender: 'female',
      color: 'Λευκή',
      vaccination_status: 'up_to_date',
    },
  })

  console.log('✓ 2 demo pets created')

  // ───────── SERVICES + PACKAGES ───────────────────────────────────────────

  // 1. VET
  const vetSvc = await prisma.service.create({
    data: {
      provider_email: vetUser.email,
      provider_name: vetUser.full_name,
      service_type: 'veterinary',
      title: 'Κτηνιατρική Κλινική Παπαδοπούλου',
      category: 'veterinary',
      description: 'Πλήρης κτηνιατρική φροντίδα: εξετάσεις, εμβολιασμοί, χειρουργεία, διαγνωστικά.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Κολωνάκι',
      contact_phone: '+302101234567',
      contact_email: vetUser.email,
      is_active: true,
      is_verified: true,
      emergency_available: true,
      years_experience: 12,
      specializations: ['internal_medicine', 'surgery', 'dermatology'],
      pet_types: ['dog', 'cat', 'rabbit'],
      languages: ['el', 'en'],
      available_days: [1,2,3,4,5],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: vetSvc.id, group: 'consultation', name: 'Γενική Εξέταση', description: 'Πλήρης κλινική εξέταση του ζώου σας', price: 35, duration_minutes: 30, display_order: 0 },
      { service_id: vetSvc.id, group: 'vaccination', name: 'Εμβολιασμός', description: 'Βασικός εμβολιασμός με πιστοποιητικό', price: 28, duration_minutes: 15, display_order: 1 },
      { service_id: vetSvc.id, group: 'surgery', name: 'Στείρωση/Ευνουχισμός', description: 'Χειρουργική επέμβαση με νοσηλεία', price: 180, duration_minutes: 120, display_order: 2 },
    ],
  })

  // 2. GROOMER
  const groomerSvc = await prisma.service.create({
    data: {
      provider_email: groomerUser.email,
      provider_name: groomerUser.full_name,
      service_type: 'grooming',
      title: 'Pet Grooming Antoniou',
      category: 'grooming',
      description: 'Επαγγελματικό μπάνιο, κούρεμα και περιποίηση για σκύλους και γάτες κάθε φυλής.',
      city: 'Θεσσαλονίκη',
      country: 'GR',
      location: 'Καλαμαριά',
      contact_phone: '+302311234567',
      contact_email: groomerUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 8,
      specializations: ['bathing', 'haircut', 'nail_trimming'],
      pet_types: ['dog', 'cat'],
      languages: ['el'],
      available_days: [1,2,3,4,5,6],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: groomerSvc.id, group: 'bathing', name: 'Μπάνιο & Στέγνωμα', description: 'Μπάνιο, στέγνωμα και χτένισμα', price: 18, duration_minutes: 40, display_order: 0 },
      { service_id: groomerSvc.id, group: 'haircut', name: 'Κούρεμα Πλήρες', description: 'Πλήρες κούρεμα κατά φυλή', price: 35, duration_minutes: 60, display_order: 1 },
      { service_id: groomerSvc.id, group: 'addon', name: 'Κόψιμο Νυχιών', description: 'Κόψιμο νυχιών και λίμανση', price: 8, duration_minutes: 10, display_order: 2 },
    ],
  })

  // 3. CLINIC
  const clinicSvc = await prisma.service.create({
    data: {
      provider_email: clinicUser.email,
      provider_name: clinicUser.full_name,
      service_type: 'veterinary',
      title: 'Κτηνιατρείο Νότου - 24ωρη Εφημερία',
      category: 'clinic',
      description: 'Σύγχρονο κτηνιατρικό κέντρο με εργαστήριο, ακτινολογία, υπερηχογράφημα και 24ωρη εφημερία.',
      city: 'Πειραιάς',
      country: 'GR',
      location: 'Κέντρο Πειραιά',
      contact_phone: '+302104567890',
      contact_email: clinicUser.email,
      is_active: true,
      is_verified: true,
      emergency_available: true,
      years_experience: 15,
      specializations: ['emergency', 'diagnostics', 'internal_medicine'],
      pet_types: ['dog', 'cat', 'bird', 'rabbit'],
      languages: ['el', 'en'],
      available_days: [0,1,2,3,4,5,6],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: clinicSvc.id, group: 'consultation', name: 'Επείγουσα Εξέταση', description: 'Άμεση εξέταση σε έκτακτη ανάγκη', price: 50, duration_minutes: 30, display_order: 0 },
      { service_id: clinicSvc.id, group: 'diagnostics', name: 'Αιματολογικές Εξετάσεις', description: 'Πλήρες αιματολογικό και βιοχημικό πάνελ', price: 65, duration_minutes: 45, display_order: 1 },
    ],
  })

  // 4. WALKER
  const walkerSvc = await prisma.service.create({
    data: {
      provider_email: walkerUser.email,
      provider_name: walkerUser.full_name,
      service_type: 'walking',
      title: 'Dog Walking Κωνσταντίνου',
      category: 'walking',
      description: 'Ατομικοί και ομαδικοί περίπατοι σε πάρκα και παραλίες της Αθήνας. GPS tracking.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Νότια Προάστια',
      contact_phone: '+306971234567',
      contact_email: walkerUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 4,
      specializations: ['individual_walks', 'group_walks'],
      pet_types: ['dog'],
      languages: ['el'],
      available_days: [1,2,3,4,5,6,0],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: walkerSvc.id, group: 'individual', name: 'Ατομικός Περίπατος 30\'', description: 'Ατομικός περίπατος 30 λεπτά με GPS tracking', price: 12, duration_minutes: 30, display_order: 0 },
      { service_id: walkerSvc.id, group: 'individual', name: 'Ατομικός Περίπατος 60\'', description: 'Ατομικός περίπατος 1 ώρα με GPS tracking', price: 20, duration_minutes: 60, display_order: 1 },
      { service_id: walkerSvc.id, group: 'group', name: 'Ομαδικός Περίπατος', description: 'Ομαδικός περίπατος έως 4 σκύλοι', price: 8, duration_minutes: 60, display_order: 2 },
    ],
  })

  // 5. SITTER
  const sitterSvc = await prisma.service.create({
    data: {
      provider_email: sitterUser.email,
      provider_name: sitterUser.full_name,
      service_type: 'sitting',
      title: 'Pet Sitting Δημητρίου',
      category: 'sitting',
      description: 'Φύλαξη κατοικιδίου στο δικό σας ή στο δικό μου σπίτι. Φωτογραφίες ενημέρωσης.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Αμπελόκηποι',
      contact_phone: '+306981234567',
      contact_email: sitterUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 5,
      specializations: ['home_visits', 'overnight_stays'],
      pet_types: ['dog', 'cat', 'rabbit'],
      languages: ['el', 'en'],
      available_days: [0,1,2,3,4,5,6],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: sitterSvc.id, group: 'visit', name: 'Επίσκεψη Κατοικίας', description: 'Επίσκεψη στο σπίτι σας, 30 λεπτά', price: 10, duration_minutes: 30, display_order: 0 },
      { service_id: sitterSvc.id, group: 'overnight', name: 'Διανυκτέρευση', description: 'Φύλαξη όλη τη νύχτα στο σπίτι σας', price: 40, duration_minutes: 480, display_order: 1 },
    ],
  })

  // 6. BOARDING
  const boardingSvc = await prisma.service.create({
    data: {
      provider_email: boardingUser.email,
      provider_name: boardingUser.full_name,
      service_type: 'boarding',
      title: 'PetHotel Αθηνά - Ξενοδοχείο Κατοικιδίων',
      category: 'boarding',
      description: 'Πλήρης εγκατάσταση για τη φιλοξενία σκύλων και γατών. Χώροι παιχνιδιού, κτηνιατρική παρακολούθηση.',
      city: 'Κηφισιά',
      country: 'GR',
      location: 'Κηφισιά',
      contact_phone: '+302106789012',
      contact_email: boardingUser.email,
      is_active: true,
      is_verified: true,
      emergency_available: true,
      years_experience: 10,
      specializations: ['dog_boarding', 'cat_boarding'],
      pet_types: ['dog', 'cat'],
      languages: ['el', 'en'],
      available_days: [0,1,2,3,4,5,6],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: boardingSvc.id, group: 'standard', name: 'Standard Suite (ανά νύχτα)', description: 'Άνετος χώρος, τρόφιμα, βόλτες 3x/ημέρα', price: 35, duration_minutes: 1440, display_order: 0 },
      { service_id: boardingSvc.id, group: 'premium', name: 'Premium Suite (ανά νύχτα)', description: 'Υπέρθεση δωμάτιο με κάμερα live stream', price: 55, duration_minutes: 1440, display_order: 1 },
    ],
  })

  // 7. TRAINER
  const trainerSvc = await prisma.service.create({
    data: {
      provider_email: trainerUser.email,
      provider_name: trainerUser.full_name,
      service_type: 'training',
      title: 'Dog Training Παπαγεωργίου',
      category: 'training',
      description: 'Εκπαίδευση σκύλων με θετικές μεθόδους. Βασική υπακοή, διορθωτική εκπαίδευση, κοινωνικοποίηση.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Χολαργός',
      contact_phone: '+306951234567',
      contact_email: trainerUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 6,
      specializations: ['basic_obedience', 'behavior_correction', 'puppy_training'],
      pet_types: ['dog'],
      languages: ['el'],
      available_days: [1,2,3,4,5,6],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: trainerSvc.id, group: 'individual', name: 'Ατομική Συνεδρία', description: 'Ατομική εκπαίδευση 1 ώρα', price: 45, duration_minutes: 60, display_order: 0 },
      { service_id: trainerSvc.id, group: 'package', name: 'Πακέτο 5 Συνεδριών', description: '5 ατομικές συνεδρίες με εκπτωτική τιμή', price: 200, duration_minutes: 300, display_order: 1 },
      { service_id: trainerSvc.id, group: 'group', name: 'Ομαδική Τάξη', description: 'Ομαδική εκπαίδευση 4-6 σκύλοι', price: 20, duration_minutes: 60, display_order: 2 },
    ],
  })

  // 8. TRANSPORT
  const transportSvc = await prisma.service.create({
    data: {
      provider_email: transportUser.email,
      provider_name: transportUser.full_name,
      service_type: 'transport',
      title: 'PetTransfer GR - Μεταφορά Κατοικιδίων',
      category: 'transport',
      description: 'Ασφαλής μεταφορά κατοικιδίων σε κτηνίατρο, groomer ή πουδήποτε στην Αττική. Κλιματισμός, GPS.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Όλη η Αττική',
      contact_phone: '+302109876543',
      contact_email: transportUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 3,
      specializations: ['vet_transport', 'airport_transport'],
      pet_types: ['dog', 'cat', 'rabbit'],
      languages: ['el', 'en'],
      available_days: [1,2,3,4,5,6,0],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: transportSvc.id, group: 'local', name: 'Τοπική Μεταφορά (έως 10km)', description: 'Μεταφορά εντός Αθήνας', price: 15, duration_minutes: 30, display_order: 0 },
      { service_id: transportSvc.id, group: 'extended', name: 'Εκτεταμένη Μεταφορά (10-30km)', description: 'Μεταφορά σε προάστια', price: 25, duration_minutes: 60, display_order: 1 },
    ],
  })

  // 9. PHOTOGRAPHER
  const photoSvc = await prisma.service.create({
    data: {
      provider_email: photographerUser.email,
      provider_name: photographerUser.full_name,
      service_type: 'photography',
      title: 'Pet Photography Νικολάου',
      category: 'photography',
      description: 'Επαγγελματικές φωτογραφίες του αγαπημένου σας κατοικιδίου. Studio ή εξωτερικοί χώροι.',
      city: 'Αθήνα',
      country: 'GR',
      location: 'Κεντρική Αθήνα',
      contact_phone: '+306961234567',
      contact_email: photographerUser.email,
      is_active: true,
      is_verified: true,
      home_visits: true,
      years_experience: 5,
      specializations: ['studio_photography', 'outdoor_photography'],
      pet_types: ['dog', 'cat', 'rabbit', 'bird'],
      languages: ['el', 'en'],
      available_days: [6,0,3,4],
    },
  })
  await prisma.servicePackage.createMany({
    data: [
      { service_id: photoSvc.id, group: 'mini', name: 'Mini Session (30\')', description: '20 επεξεργασμένες φωτογραφίες', price: 60, duration_minutes: 30, display_order: 0 },
      { service_id: photoSvc.id, group: 'full', name: 'Full Session (90\')', description: '60 επεξεργασμένες φωτογραφίες + album', price: 150, duration_minutes: 90, display_order: 1 },
    ],
  })

  console.log('✓ 9 services + packages created')

  // ───────── INSURANCE ─────────────────────────────────────────────────────
  const petshield = await prisma.insuranceProvider.create({
    data: {
      name: 'PetShield Hellas',
      name_el: 'PetShield Ελλάς',
      description: 'Ηγετική ασφαλιστική εταιρεία κατοικιδίων στην Ελλάδα.',
      is_active: true,
      display_order: 0,
    },
  })

  await prisma.insurancePlan.createMany({
    data: [
      {
        provider_id: petshield.id,
        name: 'Basic Cover',
        name_el: 'Βασική Κάλυψη',
        description: 'Βασική ασφαλιστική κάλυψη για ατυχήματα και επείγουσες περιπτώσεις.',
        tier: 'basic',
        price_monthly: 8.99,
        price_annual: 89.99,
        currency: 'EUR',
        covers_accidents: true,
        covers_illness: false,
        covers_surgery: false,
        annual_limit: 1500,
        reimbursement_percent: 70,
        waiting_period_days: 14,
        pet_types: ['dog', 'cat'],
        features: ['Κάλυψη ατυχημάτων', 'Επείγουσα κτηνιατρική', 'Χωρίς franchise'],
        is_active: true,
        display_order: 0,
      },
      {
        provider_id: petshield.id,
        name: 'Premium Shield',
        name_el: 'Premium Ασπίδα',
        description: 'Πλήρης κάλυψη για όλες τις κτηνιατρικές ανάγκες.',
        tier: 'premium',
        price_monthly: 19.99,
        price_annual: 199.99,
        currency: 'EUR',
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        covers_dental: true,
        covers_preventive: true,
        annual_limit: 5000,
        reimbursement_percent: 85,
        waiting_period_days: 14,
        pet_types: ['dog', 'cat'],
        features: ['Πλήρης κάλυψη', 'Χειρουργεία', 'Οδοντιατρικά', 'Προληπτικά εμβόλια', '85% επιστροφή'],
        is_active: true,
        is_featured: true,
        display_order: 1,
      },
    ],
  })

  const safepaws = await prisma.insuranceProvider.create({
    data: {
      name: 'SafePaws Insurance',
      name_el: 'SafePaws Ασφάλιση',
      description: 'Ευρωπαϊκή εταιρεία ασφάλισης κατοικιδίων με παρουσία σε 12 χώρες.',
      is_active: true,
      display_order: 1,
    },
  })

  await prisma.insurancePlan.createMany({
    data: [
      {
        provider_id: safepaws.id,
        name: 'Standard Plan',
        name_el: 'Τυπικό Πλάνο',
        description: 'Ισορροπημένη κάλυψη για ασθένειες και ατυχήματα.',
        tier: 'standard',
        price_monthly: 12.99,
        price_annual: 129.99,
        currency: 'EUR',
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        annual_limit: 3000,
        reimbursement_percent: 75,
        waiting_period_days: 30,
        pet_types: ['dog', 'cat', 'rabbit'],
        features: ['Ατυχήματα & ασθένειες', 'Χειρουργεία', '75% επιστροφή', 'Κουνέλια included'],
        is_active: true,
        display_order: 0,
      },
      {
        provider_id: safepaws.id,
        name: 'Comprehensive Plus',
        name_el: 'Πλήρης Plus',
        description: 'Η μέγιστη προστασία για το αγαπημένο σας ζώο.',
        tier: 'comprehensive',
        price_monthly: 29.99,
        price_annual: 299.99,
        currency: 'EUR',
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        covers_dental: true,
        covers_preventive: true,
        covers_liability: true,
        annual_limit: 10000,
        reimbursement_percent: 90,
        waiting_period_days: 7,
        pet_types: ['dog', 'cat'],
        features: ['Μέγιστη κάλυψη €10.000', '90% επιστροφή', 'Αστική ευθύνη', 'Μόλις 7 ημέρες αναμονή'],
        is_active: true,
        is_featured: true,
        display_order: 1,
      },
    ],
  })

  console.log('✓ 2 insurance providers + 4 plans created')

  // ───────── PRODUCTS (with verified zooplus.gr CDN images) ────────────────
  await prisma.product.createMany({
    data: [
      {
        name: 'Royal Canin Maxi Adult 15kg',
        description: 'Ισορροπημένη ξηρά τροφή για μεγαλόσωμους σκύλους (26-44 kg) από 15 μηνών. Υποστηρίζει ανοσοποιητικό & αρθρώσεις.',
        price: 62.99,
        category: 'food',
        brand: 'Royal Canin',
        image_url: 'https://media.zooplus.com/bilder/5/400/rc_shn_maxiadult_mv_1_5.jpg',
        images: ['https://media.zooplus.com/bilder/5/400/rc_shn_maxiadult_mv_1_5.jpg'],
        stock: 40,
        rating: 4.8,
        reviews_count: 127,
        target_species: ['dog'],
        is_featured: true,
      },
      {
        name: 'Royal Canin Indoor 27 4kg',
        description: 'Ξηρά τροφή για ενήλικες οικόσιτες γάτες. Μειώνει τριχόμπαλες & δυσάρεστες οσμές. Ιδανική για γάτες διαμερίσματος.',
        price: 22.99,
        category: 'food',
        brand: 'Royal Canin',
        image_url: 'https://media.zooplus.com/bilder/4/400/rc_fhn_indoor27_mv_eretailkit__4.jpg',
        images: ['https://media.zooplus.com/bilder/4/400/rc_fhn_indoor27_mv_eretailkit__4.jpg'],
        stock: 55,
        rating: 4.7,
        reviews_count: 89,
        target_species: ['cat'],
        is_featured: true,
      },
      {
        name: 'Catsan Hygiene Άμμος 18L',
        description: 'Άμμος υγιεινής υψηλής ποιότητας με λευκούς κόκκους. Απορροφά γρήγορα, δεσμεύει οσμές άμεσα. Ιδανική για απαιτητικές γάτες.',
        price: 14.99,
        category: 'litter',
        brand: 'Catsan',
        image_url: 'https://media.zooplus.com/bilder/1/400/115096_mrhi__catsan_hygiene_plus_katzenstreu_18l_mars_02_1.jpg',
        images: ['https://media.zooplus.com/bilder/1/400/115096_mrhi__catsan_hygiene_plus_katzenstreu_18l_mars_02_1.jpg'],
        stock: 75,
        rating: 4.6,
        reviews_count: 203,
        target_species: ['cat'],
        is_featured: false,
      },
      {
        name: 'Trixie Σχοινί Παιχνιδιού 60cm',
        description: 'Ανθεκτικό σχοινί από βαμβάκι για σκύλους. Διπλό σχοινί με 3 κόμπους, ιδανικό για tug-of-war. Καθαρίζει δόντια στο παιχνίδι.',
        price: 11.99,
        category: 'toys',
        brand: 'Trixie',
        image_url: 'https://media.zooplus.com/bilder/7/400/4782_pla_trixie_hundespielzeug_doppel_spieltau_bunt_grau_3275_3275_hs3_7.jpg',
        images: ['https://media.zooplus.com/bilder/7/400/4782_pla_trixie_hundespielzeug_doppel_spieltau_bunt_grau_3275_3275_hs3_7.jpg'],
        stock: 90,
        rating: 4.5,
        reviews_count: 64,
        target_species: ['dog'],
        is_featured: false,
      },
      {
        name: 'Trixie BE NORDIC V-Λουρί',
        description: 'Σκανδιναβικής αισθητικής λουρί από πολυεστέρα. Ρυθμιζόμενο σε 3 μήκη, ανθεκτικό στον καιρό, γάντζοι εύκολης ασφάλισης.',
        price: 19.99,
        category: 'accessories',
        brand: 'Trixie',
        image_url: 'https://media.zooplus.com/bilder/8/400/859713_pla_be_nordic_v_leine_8.jpg',
        images: ['https://media.zooplus.com/bilder/8/400/859713_pla_be_nordic_v_leine_8.jpg'],
        stock: 45,
        rating: 4.6,
        reviews_count: 38,
        target_species: ['dog'],
        is_featured: false,
      },
      {
        name: 'OrthoSofa Ορθοπεδικό Κρεβάτι Σκύλου',
        description: 'Memory foam κρεβάτι για σκύλους με ορθοπεδική υποστήριξη. Ιδανικό για ηλικιωμένους σκύλους ή με αρθριτικά. Πλενόμενο κάλυμμα.',
        price: 79.99,
        category: 'beds',
        brand: 'OrthoSofa',
        image_url: 'https://media.zooplus.com/bilder/4/400/108332_pla_orthosofa_grau_fg_4820_4.jpg',
        images: ['https://media.zooplus.com/bilder/4/400/108332_pla_orthosofa_grau_fg_4820_4.jpg'],
        stock: 20,
        rating: 4.9,
        reviews_count: 52,
        target_species: ['dog'],
        is_featured: true,
      },
      {
        name: 'Trixie Capri Κλουβί Μεταφοράς',
        description: 'Κλασικό κλουβί μεταφοράς Capri σε γκρι/τιρκουάζ. Ανθεκτικό πλαστικό, μεταλλική πόρτα. Για σκύλους και γάτες έως 6kg.',
        price: 25.99,
        category: 'carriers',
        brand: 'Trixie',
        image_url: 'https://media.zooplus.com/bilder/7/400/1_186533_trixie_container_transportbox_capri_hellgrau_tuerkis_hs_02_7.jpg',
        images: ['https://media.zooplus.com/bilder/7/400/1_186533_trixie_container_transportbox_capri_hellgrau_tuerkis_hs_02_7.jpg'],
        stock: 30,
        rating: 4.4,
        reviews_count: 47,
        target_species: ['dog', 'cat'],
        is_featured: false,
      },
      {
        name: 'Trixie Aloe Vera Σαμπουάν Σκύλου 250ml',
        description: 'Σαμπουάν με αλόη βέρα για λαμπερό και μεταξένιο τρίχωμα. Ιδανικό για ευαίσθητο δέρμα, ουδέτερο pH. Ελαφρώς αντιβακτηριακό.',
        price: 7.49,
        category: 'grooming',
        brand: 'Trixie',
        image_url: 'https://media.zooplus.com/bilder/2/400/17065_pla_trixie_aloe_vera_hundeshampoo_hs_01_2.jpg',
        images: ['https://media.zooplus.com/bilder/2/400/17065_pla_trixie_aloe_vera_hundeshampoo_hs_01_2.jpg'],
        stock: 80,
        rating: 4.5,
        reviews_count: 31,
        target_species: ['dog'],
        is_featured: false,
      },
      {
        name: 'Trixie Ποντίκια Catnip 6 τμχ.',
        description: 'Σετ 6 λούτρινα ποντίκια με catnip (νεπέτα) σε γκρι & λευκό. Μέγεθος ~5cm, ιδανικό για κυνηγητό και αλληλεπίδραση.',
        price: 4.99,
        category: 'toys',
        brand: 'Trixie',
        image_url: 'https://media.zooplus.com/bilder/7/400/42535_pla_trixie_plueschmaus_grau_und_weiss_ret_01_7.jpg',
        images: ['https://media.zooplus.com/bilder/7/400/42535_pla_trixie_plueschmaus_grau_und_weiss_ret_01_7.jpg'],
        stock: 150,
        rating: 4.7,
        reviews_count: 98,
        target_species: ['cat'],
        is_featured: false,
      },
      {
        name: 'TIAKI Soft & Safe Περιλαίμιο Κόκκινο',
        description: 'Μαλακό nylon περιλαίμιο με ασφαλή κούμπωμα. Άνετο στο δέρμα, ανθεκτικό. Ρυθμιζόμενο μέγεθος. Διατίθεται σε 4 χρώματα.',
        price: 11.99,
        category: 'accessories',
        brand: 'TIAKI',
        image_url: 'https://media.zooplus.com/bilder/7/400/323200_pla_soft_safe_fg_1209_7.jpg',
        images: ['https://media.zooplus.com/bilder/7/400/323200_pla_soft_safe_fg_1209_7.jpg'],
        stock: 60,
        rating: 4.4,
        reviews_count: 22,
        target_species: ['dog'],
        is_featured: false,
      },
      {
        name: 'Beaphar Vitamin B Complex 50ml',
        description: 'Συμπλήρωμα διατροφής με σύμπλεγμα βιταμινών Β για σκύλους & γάτες. Ενισχύει ανοσοποιητικό, ζωντάνια & υγεία τριχώματος.',
        price: 8.99,
        category: 'supplements',
        brand: 'Beaphar',
        image_url: 'https://media.zooplus.com/bilder/8/400/100217_pla_beaphar_vitamin_b_komplex_50ml_hs_01_8.jpg',
        images: ['https://media.zooplus.com/bilder/8/400/100217_pla_beaphar_vitamin_b_komplex_50ml_hs_01_8.jpg'],
        stock: 70,
        rating: 4.6,
        reviews_count: 44,
        target_species: ['dog', 'cat'],
        is_featured: false,
        is_subscribable: true,
      },
    ],
  })

  console.log('✓ 11 products with verified zooplus.gr images created')

  console.log('\n🎉 Seeding COMPLETE!')
  console.log('─────────────────────────────────────────')
  console.log('  Admin:       admin@globipet.com / GlobiPet2026!')
  console.log('  Demo user:   demo@globipet.com  / GlobiPet2026!')
  console.log('  Vet:         vet@globipet.com   / GlobiPet2026!')
  console.log('  Groomer:     groomer@globipet.com')
  console.log('  Clinic:      clinic@globipet.com')
  console.log('  Walker:      walker@globipet.com')
  console.log('  Sitter:      sitter@globipet.com')
  console.log('  Boarding:    boarding@globipet.com')
  console.log('  Trainer:     trainer@globipet.com')
  console.log('  Transport:   transport@globipet.com')
  console.log('  Photographer: photographer@globipet.com')
  console.log('─────────────────────────────────────────')
  console.log('  (All passwords: GlobiPet2026!)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
