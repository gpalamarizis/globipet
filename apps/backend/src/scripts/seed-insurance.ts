import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding insurance providers and plans...')

  // Clear existing
  await prisma.insurancePlan.deleteMany()
  await prisma.insuranceProvider.deleteMany()

  // Interamerican
  const interamerican = await prisma.insuranceProvider.create({
    data: {
      name: 'Interamerican',
      name_el: 'Interamerican',
      website: 'https://www.interamerican.gr',
      phone: '210 9480000',
      email: 'info@interamerican.gr',
      description: 'Κορυφαία ασφαλιστική εταιρεία στην Ελλάδα με εξειδικευμένα προϊόντα για κατοικίδια.',
      is_active: true,
      display_order: 1,
    }
  })

  await prisma.insurancePlan.createMany({
    data: [
      {
        provider_id: interamerican.id,
        name: 'Pet Basic',
        name_el: 'Βασική Κάλυψη',
        description: 'Βασική ασφάλιση για ατυχήματα και επείγοντα περιστατικά.',
        tier: 'basic',
        price_monthly: 12.90,
        price_annual: 139.90,
        covers_accidents: true,
        covers_illness: false,
        covers_surgery: false,
        covers_dental: false,
        covers_preventive: false,
        covers_liability: true,
        covers_death: false,
        annual_limit: 1500,
        deductible: 50,
        reimbursement_percent: 70,
        waiting_period_days: 14,
        pet_types: ['dog', 'cat'],
        max_age_years: 10,
        min_age_months: 3,
        is_active: true,
        is_featured: false,
        display_order: 1,
      },
      {
        provider_id: interamerican.id,
        name: 'Pet Standard',
        name_el: 'Standard Κάλυψη',
        description: 'Ολοκληρωμένη ασφάλιση για ασθένειες και ατυχήματα.',
        tier: 'standard',
        price_monthly: 24.90,
        price_annual: 269.90,
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: false,
        covers_dental: false,
        covers_preventive: true,
        covers_liability: true,
        covers_death: false,
        annual_limit: 3000,
        deductible: 30,
        reimbursement_percent: 80,
        waiting_period_days: 14,
        pet_types: ['dog', 'cat'],
        max_age_years: 10,
        min_age_months: 3,
        is_active: true,
        is_featured: true,
        display_order: 2,
      },
      {
        provider_id: interamerican.id,
        name: 'Pet Premium',
        name_el: 'Premium Κάλυψη',
        description: 'Πλήρης κάλυψη συμπεριλαμβανομένου χειρουργείου και οδοντιατρείου.',
        tier: 'premium',
        price_monthly: 44.90,
        price_annual: 489.90,
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        covers_dental: true,
        covers_preventive: true,
        covers_liability: true,
        covers_death: true,
        annual_limit: 6000,
        deductible: 20,
        reimbursement_percent: 90,
        waiting_period_days: 7,
        pet_types: ['dog', 'cat', 'rabbit'],
        max_age_years: 12,
        min_age_months: 2,
        features: ['24/7 Τηλεφωνική υποστήριξη', 'Δωρεάν 2η ιατρική γνώμη', 'Κάλυψη εξωτερικού'],
        is_active: true,
        is_featured: false,
        display_order: 3,
      }
    ]
  })

  // Allianz
  const allianz = await prisma.insuranceProvider.create({
    data: {
      name: 'Allianz',
      name_el: 'Allianz Ελλάδος',
      website: 'https://www.allianz.gr',
      phone: '210 6930000',
      description: 'Παγκόσμιος ηγέτης στον ασφαλιστικό κλάδο με εξειδικευμένα πλάνα για κατοικίδια.',
      is_active: true,
      display_order: 2,
    }
  })

  await prisma.insurancePlan.createMany({
    data: [
      {
        provider_id: allianz.id,
        name: 'PetCare Basic',
        name_el: 'PetCare Βασικό',
        tier: 'basic',
        price_monthly: 9.90,
        price_annual: 109.90,
        covers_accidents: true,
        covers_illness: false,
        covers_surgery: false,
        covers_dental: false,
        covers_preventive: false,
        covers_liability: false,
        covers_death: false,
        annual_limit: 1000,
        deductible: 75,
        reimbursement_percent: 70,
        waiting_period_days: 21,
        pet_types: ['dog', 'cat'],
        max_age_years: 8,
        min_age_months: 3,
        is_active: true,
        is_featured: false,
        display_order: 1,
      },
      {
        provider_id: allianz.id,
        name: 'PetCare Comprehensive',
        name_el: 'PetCare Ολοκληρωμένο',
        tier: 'comprehensive',
        price_monthly: 54.90,
        price_annual: 599.90,
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        covers_dental: true,
        covers_preventive: true,
        covers_liability: true,
        covers_death: true,
        annual_limit: 10000,
        deductible: 0,
        reimbursement_percent: 100,
        waiting_period_days: 0,
        pet_types: ['dog', 'cat', 'rabbit', 'bird'],
        max_age_years: 15,
        min_age_months: 2,
        features: ['Μηδενική απαλλαγή', '100% αποζημίωση', 'Κάλυψη από 1η ημέρα', 'Φυσιοθεραπεία'],
        is_active: true,
        is_featured: true,
        display_order: 2,
      }
    ]
  })

  // Generali
  const generali = await prisma.insuranceProvider.create({
    data: {
      name: 'Generali',
      name_el: 'Generali Ελλάδος',
      website: 'https://www.generali.gr',
      phone: '210 8099000',
      description: 'Ευρωπαϊκή ασφαλιστική με ειδικά πλάνα για κατοικίδια όλων των ειδών.',
      is_active: true,
      display_order: 3,
    }
  })

  await prisma.insurancePlan.createMany({
    data: [
      {
        provider_id: generali.id,
        name: 'MyPet Standard',
        name_el: 'MyPet Standard',
        tier: 'standard',
        price_monthly: 19.90,
        price_annual: 219.90,
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: false,
        covers_dental: false,
        covers_preventive: true,
        covers_liability: false,
        covers_death: false,
        annual_limit: 2500,
        deductible: 40,
        reimbursement_percent: 80,
        waiting_period_days: 14,
        pet_types: ['dog', 'cat'],
        max_age_years: 10,
        is_active: true,
        is_featured: false,
        display_order: 1,
      },
      {
        provider_id: generali.id,
        name: 'MyPet Premium',
        name_el: 'MyPet Premium',
        tier: 'premium',
        price_monthly: 38.90,
        price_annual: 419.90,
        covers_accidents: true,
        covers_illness: true,
        covers_surgery: true,
        covers_dental: false,
        covers_preventive: true,
        covers_liability: true,
        covers_death: true,
        annual_limit: 5000,
        deductible: 25,
        reimbursement_percent: 85,
        waiting_period_days: 10,
        pet_types: ['dog', 'cat', 'rabbit'],
        max_age_years: 12,
        features: ['Εκτός συνόρων κάλυψη', 'Απώλεια/κλοπή', 'Ψυχολογική υποστήριξη ιδιοκτήτη'],
        is_active: true,
        is_featured: true,
        display_order: 2,
      }
    ]
  })

  console.log('✅ Insurance seed completed!')
  console.log(`   - 3 providers`)
  console.log(`   - 7 plans`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
