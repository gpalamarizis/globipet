import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding sample pet food products...')

  await prisma.product.createMany({
    data: [
      {
        name: 'Royal Canin Adult Large Breed 15kg',
        description: 'Ξηρή τροφή για ενήλικους σκύλους μεγαλόσωμων ράτσων (26-44kg). Ισορροπημένη διατροφή για υγιή άρθρωση και πέψη.',
        price: 64.90,
        category: 'food',
        brand: 'Royal Canin',
        stock: 40,
        rating: 4.7,
        reviews_count: 132,
        target_species: ['dog'],
        is_featured: true,
        is_subscribable: true,
      },
      {
        name: 'Royal Canin Kitten 4kg',
        description: 'Ξηρή τροφή για γατάκια έως 12 μηνών. Στηρίζει το ανοσοποιητικό και την υγιή ανάπτυξη.',
        price: 29.90,
        category: 'food',
        brand: 'Royal Canin',
        stock: 55,
        rating: 4.8,
        reviews_count: 98,
        target_species: ['cat'],
        is_featured: false,
        is_subscribable: true,
      },
      {
        name: 'Royal Canin Renal Diet 2kg',
        description: 'Διαιτητική τροφή για σκύλους και γάτες με χρόνια νεφρική ανεπάρκεια. Μόνο κατόπιν οδηγίας κτηνιάτρου.',
        price: 34.90,
        category: 'food',
        brand: 'Royal Canin',
        stock: 20,
        rating: 4.6,
        reviews_count: 41,
        target_species: ['dog', 'cat'],
        is_featured: false,
        is_subscribable: true,
      },
      {
        name: 'Acana Wild Prairie 11.4kg',
        description: 'Grain-free ξηρή τροφή με κοτόπουλο ελευθέρας βοσκής και ψάρι. Υψηλή περιεκτικότητα σε πρωτεΐνη για ενήλικους σκύλους όλων των μεγεθών.',
        price: 79.90,
        category: 'food',
        brand: 'Acana',
        stock: 30,
        rating: 4.9,
        reviews_count: 76,
        target_species: ['dog'],
        is_featured: true,
        is_subscribable: true,
      },
      {
        name: 'Acana Adult Small Breed 6kg',
        description: 'Grain-free τροφή ειδικά σχεδιασμένη για μικρόσωμες ράτσες σκύλων, με βιολογικά κατάλληλες πρώτες ύλες.',
        price: 49.90,
        category: 'food',
        brand: 'Acana',
        stock: 35,
        rating: 4.8,
        reviews_count: 53,
        target_species: ['dog'],
        is_featured: false,
        is_subscribable: true,
      },
    ]
  })

  console.log('✅ Seeded 5 products (3 Royal Canin, 2 Acana) — all marked as is_subscribable')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
