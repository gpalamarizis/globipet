/**
 * Seed script: AI Subscription Plans
 *
 * Δημιουργεί 6 plans:
 *   - 3 individual (μία υπηρεσία η καθεμία): AI Health, Emotion, Wellness
 *   - 3 bundles: Health+Emotion, Health+Wellness, Full AI Pack (3)
 *
 * Χρήση:
 *   cd apps/backend
 *   npx tsx src/scripts/seed-ai-plans.ts
 *
 * Το script είναι idempotent — τρέχει με upsert by name, οπότε μπορεί
 * να ξανατρέξει άφοβα.
 */
import prisma from '../lib/prisma.js'

const PLANS = [
  // ─── Individual (1 feature) ─────────────────────────
  {
    name: 'AI Health',
    name_el: 'AI Υγεία',
    description: 'Ανάλυση φωτογραφιών δέρματος, ματιών, περιττωμάτων με τεχνητή νοημοσύνη',
    tier: 'basic',
    price_monthly: 4.99,
    price_annual: 49.99, // ~17% έκπτωση
    includes_ai_health: true,
    includes_emotion_ai: false,
    includes_wellness_tracker: false,
    includes_telehealth: false,
    features: ['Αναλύσεις έως 10/μήνα', 'Ιστορικό αναφορών', 'Έγκαιρη ειδοποίηση'],
    display_order: 10,
    is_featured: false,
  },
  {
    name: 'Emotion Detector',
    name_el: 'Ανίχνευση Συναισθημάτων',
    description: 'AI ανάλυση συναισθηματικής κατάστασης του κατοικιδίου μέσω βίντεο και φωτογραφιών',
    tier: 'basic',
    price_monthly: 4.99,
    price_annual: 49.99,
    includes_ai_health: false,
    includes_emotion_ai: true,
    includes_wellness_tracker: false,
    includes_telehealth: false,
    features: ['Live ανάλυση συναισθημάτων', 'Εβδομαδιαία αναφορά', 'Behavioral insights'],
    display_order: 20,
    is_featured: false,
  },
  {
    name: 'Wellness Tracker',
    name_el: 'Wellness Tracker',
    description: 'Παρακολούθηση δραστηριότητας, ύπνου και συμπεριφοράς μέσω wearables ή app tracking',
    tier: 'basic',
    price_monthly: 4.99,
    price_annual: 49.99,
    includes_ai_health: false,
    includes_emotion_ai: false,
    includes_wellness_tracker: true,
    includes_telehealth: false,
    features: ['Καθημερινή δραστηριότητα', 'Πρότυπα ύπνου', 'Στατιστικά διατροφής'],
    display_order: 30,
    is_featured: false,
  },
  // ─── Bundles (2+ features) ──────────────────────────
  {
    name: 'Health + Emotion Bundle',
    name_el: 'Πακέτο Υγεία + Συναισθήματα',
    description: 'AI Health και Emotion Detector μαζί, με έκπτωση',
    tier: 'pro',
    price_monthly: 7.99,
    price_annual: 79.99,
    includes_ai_health: true,
    includes_emotion_ai: true,
    includes_wellness_tracker: false,
    includes_telehealth: false,
    features: ['Και τα δύο features', 'Συνδυαστικές αναφορές', 'Priority AI processing'],
    display_order: 40,
    is_featured: true,
  },
  {
    name: 'Health + Wellness Bundle',
    name_el: 'Πακέτο Υγεία + Wellness',
    description: 'AI Health και Wellness Tracker για ολιστική παρακολούθηση',
    tier: 'pro',
    price_monthly: 7.99,
    price_annual: 79.99,
    includes_ai_health: true,
    includes_emotion_ai: false,
    includes_wellness_tracker: true,
    includes_telehealth: false,
    features: ['Και τα δύο features', 'Wellness dashboard', 'Trend analysis'],
    display_order: 50,
    is_featured: false,
  },
  {
    name: 'Complete AI Pack',
    name_el: 'Πλήρες Πακέτο AI',
    description: 'Και τα τρία AI features μαζί, με τη μεγαλύτερη έκπτωση',
    tier: 'premium',
    price_monthly: 9.99,
    price_annual: 99.99,
    includes_ai_health: true,
    includes_emotion_ai: true,
    includes_wellness_tracker: true,
    includes_telehealth: false,
    features: ['Και τα 3 AI features', 'Απεριόριστες αναλύσεις', 'Priority support', 'Advanced insights'],
    display_order: 60,
    is_featured: true,
  },
]

async function main() {
  console.log('Seeding AI subscription plans...')
  let created = 0, updated = 0

  for (const p of PLANS) {
    // Find by name (unique enough for seed purposes)
    const existing = await prisma.aiSubscriptionPlan.findFirst({
      where: { name: p.name },
    })
    if (existing) {
      await prisma.aiSubscriptionPlan.update({
        where: { id: existing.id },
        data: p,
      })
      updated++
      console.log(`  ~ Updated: ${p.name}`)
    } else {
      await prisma.aiSubscriptionPlan.create({ data: p })
      created++
      console.log(`  + Created: ${p.name}`)
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
