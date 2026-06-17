import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data across all categories...')
  const pass = await bcrypt.hash('Demo12345!', 10)

  // ---- Users (customers + providers) ----
  const usersData = [
    { full_name: 'Μαρία Παπαδοπούλου', email: 'maria.demo@globipet.com', role: 'user', city: 'Αθήνα' },
    { full_name: 'Γιώργος Νικολάου', email: 'giorgos.demo@globipet.com', role: 'user', city: 'Θεσσαλονίκη' },
    { full_name: 'Σοφία Δημητρίου', email: 'sofia.demo@globipet.com', role: 'user', city: 'Πάτρα' },
    { full_name: 'Ελένη Κωνσταντίνου', email: 'eleni.groomer@globipet.com', role: 'service_provider', city: 'Αθήνα' },
    { full_name: 'Δρ. Ανδρέας Σταύρου', email: 'andreas.vet@globipet.com', role: 'service_provider', city: 'Αθήνα' },
  ]

  const users: Record<string, any> = {}
  for (const u of usersData) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password_hash: pass, is_verified: true, preferred_language: 'el' },
    })
  }

  // ---- Pets ----
  const pets = await Promise.all([
    prisma.pet.create({ data: { owner_email: 'maria.demo@globipet.com', name: 'Rex', species: 'dog', breed: 'Labrador', age: 3, weight: 28, gender: 'male', vaccination_status: 'up_to_date' } }),
    prisma.pet.create({ data: { owner_email: 'giorgos.demo@globipet.com', name: 'Luna', species: 'cat', breed: 'Persian', age: 2, weight: 4.2, gender: 'female', vaccination_status: 'up_to_date' } }),
    prisma.pet.create({ data: { owner_email: 'sofia.demo@globipet.com', name: 'Max', species: 'dog', breed: 'Golden Retriever', age: 5, weight: 32, gender: 'male', vaccination_status: 'up_to_date' } }),
  ])

  // ---- Services ----
  const groomingService = await prisma.service.create({
    data: {
      provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
      service_type: 'grooming', description: 'Πλήρες grooming για σκύλους και γάτες όλων των μεγεθών.',
      price: 25, city: 'Αθήνα', contact_phone: '6900000001', available_days: [1, 2, 3, 4, 5],
      rating: 4.8, reviews_count: 2, is_active: true, is_verified: true,
    }
  })
  const vetService = await prisma.service.create({
    data: {
      provider_email: 'andreas.vet@globipet.com', provider_name: 'Δρ. Ανδρέας Σταύρου',
      service_type: 'veterinary', description: 'Γενική κτηνιατρική εξέταση και εμβολιασμοί.',
      price: 40, city: 'Αθήνα', contact_phone: '6900000002', available_days: [1, 2, 3, 4, 5],
      rating: 4.9, reviews_count: 1, is_active: true, is_verified: true,
    }
  })

  // ---- Bookings ----
  const booking1 = await prisma.booking.create({
    data: {
      service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
      customer_email: 'maria.demo@globipet.com', customer_name: 'Μαρία Παπαδοπούλου',
      pet_id: pets[0].id, pet_name: 'Rex', booking_date: '2026-06-20', booking_time: '11:00',
      duration: 60, total_price: 25, status: 'completed', rating: 5, review: 'Εξαιρετική δουλειά!',
    }
  })
  const booking2 = await prisma.booking.create({
    data: {
      service_id: vetService.id, provider_email: 'andreas.vet@globipet.com', provider_name: 'Δρ. Ανδρέας Σταύρου',
      customer_email: 'giorgos.demo@globipet.com', customer_name: 'Γιώργος Νικολάου',
      pet_id: pets[1].id, pet_name: 'Luna', booking_date: '2026-06-22', booking_time: '17:30',
      duration: 30, total_price: 40, status: 'confirmed',
    }
  })
  await prisma.booking.create({
    data: {
      service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
      customer_email: 'sofia.demo@globipet.com', customer_name: 'Σοφία Δημητρίου',
      pet_id: pets[2].id, pet_name: 'Max', booking_date: '2026-06-25', booking_time: '10:00',
      duration: 60, total_price: 25, status: 'pending',
    }
  })

  // ---- Reviews ----
  await prisma.review.createMany({
    data: [
      { service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', customer_email: 'maria.demo@globipet.com', customer_name: 'Μαρία Παπαδοπούλου', rating: 5, comment: 'Πολύ προσεκτική με τον Rex, σίγουρα θα ξανάρθω!', booking_id: booking1.id },
      { service_id: vetService.id, provider_email: 'andreas.vet@globipet.com', customer_email: 'giorgos.demo@globipet.com', customer_name: 'Γιώργος Νικολάου', rating: 5, comment: 'Πολύ επαγγελματίας, εξήγησε όλα καθαρά.', booking_id: booking2.id },
    ]
  })

  // ---- Events ----
  await prisma.event.createMany({
    data: [
      { title: 'Pet Expo Athens 2026', description: 'Η μεγαλύτερη εκθεσιακή εκδήλωση για κατοικίδια στην Ελλάδα.', event_type: 'expo', date: '2026-07-12', time: '10:00', location: 'Στάδιο Ειρήνης & Φιλίας', city: 'Αθήνα', country: 'Ελλάδα', capacity: 500, registered_count: 87, price: 5, organizer: 'GlobiPet', organizer_email: 'events@globipet.com' },
      { title: 'Πρωινή βόλτα σκύλων - Πάρκο Γουδή', description: 'Συνάντηση ιδιοκτητών σκύλων για κοινή βόλτα και κοινωνικοποίηση.', event_type: 'meetup', date: '2026-06-21', time: '09:00', location: 'Πάρκο Γουδή', city: 'Αθήνα', country: 'Ελλάδα', capacity: 30, registered_count: 14, price: 0, organizer: 'GlobiPet Community', organizer_email: 'community@globipet.com' },
    ]
  })

  // ---- Forum topics ----
  await prisma.forumTopic.createMany({
    data: [
      { author_email: 'maria.demo@globipet.com', author_name: 'Μαρία Παπαδοπούλου', title: 'Καλύτερη τροφή για ηλικιωμένο σκύλο;', content: 'Ο Rex μου είναι 9 χρονών, τι τροφή προτείνετε;', category: 'nutrition', tags: ['τροφή', 'senior'], views_count: 124, replies_count: 6 },
      { author_email: 'sofia.demo@globipet.com', author_name: 'Σοφία Δημητρίου', title: 'Συμβουλές για πρώτο κατοικίδιο', content: 'Σκέφτομαι να υιοθετήσω το πρώτο μου κουτάβι, οδηγίες;', category: 'general', tags: ['νέος ιδιοκτήτης'], views_count: 256, replies_count: 11, is_pinned: true },
    ]
  })

  // ---- Social posts ----
  await prisma.post.createMany({
    data: [
      { author_email: 'maria.demo@globipet.com', author_name: 'Μαρία Παπαδοπούλου', content: 'Ο Rex μετά το grooming σήμερα! 🐾✨', likes_count: 34, comments_count: 5, tags: ['grooming'], pet_id: pets[0].id, pet_name: 'Rex' },
      { author_email: 'giorgos.demo@globipet.com', author_name: 'Γιώργος Νικολάου', content: 'Η Luna απολαμβάνει το ηλιόλουστο απόγευμα ☀️🐱', likes_count: 52, comments_count: 8, pet_id: pets[1].id, pet_name: 'Luna' },
    ]
  })

  // ---- Community + members ----
  const community = await prisma.community.create({
    data: { creator_email: 'maria.demo@globipet.com', creator_name: 'Μαρία Παπαδοπούλου', name: 'Φιλόζωοι Αθήνας', description: 'Κοινότητα για ιδιοκτήτες κατοικίδιων στην Αθήνα.', city: 'Αθήνα', latitude: 37.9838, longitude: 23.7275, member_count: 3 }
  })
  await prisma.communityMember.createMany({
    data: [
      { community_id: community.id, user_email: 'maria.demo@globipet.com', user_name: 'Μαρία Παπαδοπούλου', role: 'admin' },
      { community_id: community.id, user_email: 'giorgos.demo@globipet.com', user_name: 'Γιώργος Νικολάου', role: 'member' },
      { community_id: community.id, user_email: 'sofia.demo@globipet.com', user_name: 'Σοφία Δημητρίου', role: 'member' },
    ]
  })

  // ---- Playdate event ----
  await prisma.playdateEvent.create({
    data: {
      creator_email: 'sofia.demo@globipet.com', creator_name: 'Σοφία Δημητρίου',
      title: 'Playdate για Golden Retrievers', description: 'Συνάντηση για σκύλους μεγάλου μεγέθους.',
      event_type: 'play', date: '2026-06-23', time: '18:00', location: 'Πάρκο Γουδή', city: 'Αθήνα',
      max_participants: 8, pet_types: ['dog'],
    }
  })

  console.log('✅ Demo data seeded: 5 users, 3 pets, 2 services, 3 bookings, 2 reviews, 2 events, 2 forum topics, 2 posts, 1 community (3 members), 1 playdate')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
