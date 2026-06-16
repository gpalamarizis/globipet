import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding AI subscription plans...')

  await prisma.aiSubscriptionPlan.deleteMany()

  await prisma.aiSubscriptionPlan.createMany({
    data: [
      {
        name: 'AI Basic',
        name_el: 'AI Βασικό',
        description: 'Ξεκίνα με τα βασικά εργαλεία AI υγείας για το κατοικίδιό σου.',
        tier: 'basic',
        price_monthly: 4.90,
        price_annual: 49.90,
        includes_ai_health: true,
        includes_emotion_ai: false,
        includes_wellness_tracker: false,
        includes_telehealth: false,
        max_pets: 1,
        features: ['AI Health Check', 'Ανάλυση δέρματος & ματιού', '1 κατοικίδιο'],
        is_active: true,
        is_featured: false,
        display_order: 1,
      },
      {
        name: 'AI Pro',
        name_el: 'AI Pro',
        description: 'Πλήρης παρακολούθηση υγείας και συναισθηματικής κατάστασης.',
        tier: 'pro',
        price_monthly: 9.90,
        price_annual: 99.90,
        includes_ai_health: true,
        includes_emotion_ai: true,
        includes_wellness_tracker: true,
        includes_telehealth: false,
        max_pets: 3,
        features: ['AI Health Check', 'Emotion Detector', 'Wellness Tracker', 'Έως 3 κατοικίδια', 'Ιστορικό αναλύσεων'],
        is_active: true,
        is_featured: true,
        display_order: 2,
      },
      {
        name: 'AI Premium',
        name_el: 'AI Premium',
        description: 'Ολοκληρωμένη φροντίδα με τηλειατρική κατά παραγγελία.',
        tier: 'premium',
        price_monthly: 19.90,
        price_annual: 199.90,
        includes_ai_health: true,
        includes_emotion_ai: true,
        includes_wellness_tracker: true,
        includes_telehealth: true,
        telehealth_sessions_per_month: 2,
        max_pets: 10,
        features: ['Όλα τα AI εργαλεία', 'Τηλειατρική 24/7 (2 συνεδρίες/μήνα)', 'Απεριόριστα κατοικίδια (έως 10)', 'Προτεραιότητα υποστήριξης'],
        is_active: true,
        is_featured: false,
        display_order: 3,
      },
    ]
  })

  console.log('✅ AI subscription plans seeded! (3 plans)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
