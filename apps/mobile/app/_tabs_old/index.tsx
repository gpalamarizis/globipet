import { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

const { width } = Dimensions.get('window')

const categories = [
  { emoji: '✂️', label: 'Grooming',     type: 'grooming' },
  { emoji: '🩺', label: 'Κτηνίατρος',  type: 'veterinary' },
  { emoji: '🚶', label: 'Βόλτες',       type: 'walking' },
  { emoji: '🏠', label: 'Pet Sitting',  type: 'pet_sitting' },
  { emoji: '🎓', label: 'Εκπαίδευση',  type: 'training' },
  { emoji: '🚕', label: 'Pet Taxi',     type: 'pet_taxi' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated, loadToken } = useAuthStore()

  useEffect(() => { loadToken() }, [])

  const { data: services } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=4').then(r => r.data?.data ?? []),
  })

  const { data: products } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products?limit=4').then(r => r.data?.data ?? []),
  })

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {isAuthenticated ? `Γεια, ${user?.full_name?.split(' ')[0]}! 👋` : 'Καλώς ήρθατε! 🐾'}
          </Text>
          <Text style={styles.subtitle}>Best care for the best human's friends</Text>
        </View>
        {isAuthenticated && user?.profile_photo && (
          <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
        )}
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/services')}>
        <Text style={styles.searchText}>🔍  Αναζήτηση υπηρεσίας...</Text>
      </TouchableOpacity>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Κατηγορίες</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.type} style={styles.categoryItem}
              onPress={() => router.push(`/services?type=${cat.type}`)}>
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Services */}
      {services?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Κορυφαίοι Πάροχοι</Text>
            <TouchableOpacity onPress={() => router.push('/services')}>
              <Text style={styles.seeAll}>Όλοι →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {services.map((service: any) => (
              <TouchableOpacity key={service.id} style={styles.serviceCard}
                onPress={() => router.push(`/services/${service.id}`)}>
                <View style={styles.serviceAvatar}>
                  <Text style={styles.serviceAvatarText}>{service.name?.[0] || '🐾'}</Text>
                </View>
                <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                <Text style={styles.serviceType}>{service.type}</Text>
                <Text style={styles.servicePrice}>€{service.price}/ώρα</Text>
                <Text style={styles.serviceRating}>⭐ {service.rating || '5.0'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Products */}
      {products?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Κατάστημα</Text>
            <TouchableOpacity onPress={() => router.push('/marketplace')}>
              <Text style={styles.seeAll}>Όλα →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {products.map((product: any) => (
              <TouchableOpacity key={product.id} style={styles.productCard}
                onPress={() => router.push(`/marketplace/${product.id}`)}>
                <View style={styles.productImage}>
                  {product.images?.[0]
                    ? <Image source={{ uri: product.images[0] }} style={styles.productImg} />
                    : <Text style={{ fontSize: 32 }}>📦</Text>
                  }
                </View>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productPrice}>€{product.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* CTA for non-auth */}
      {!isAuthenticated && (
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Εγγραφείτε δωρεάν</Text>
          <Text style={styles.ctaSubtitle}>Διαχειριστείτε τα κατοικίδιά σας, κάντε κρατήσεις και πολλά άλλα</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth/register')}>
            <Text style={styles.ctaButtonText}>Δημιουργία λογαριασμού</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/auth/login')}>
            <Text style={styles.ctaSecondaryText}>Έχω ήδη λογαριασμό</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  searchBar: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchText: { color: '#9CA3AF', fontSize: 14 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  categoriesScroll: { paddingLeft: 16 },
  categoryItem: { alignItems: 'center', marginRight: 16, width: 72 },
  categoryIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500' },
  serviceCard: { width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginLeft: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  serviceAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  serviceType: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  servicePrice: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 2 },
  serviceRating: { fontSize: 11, color: '#6B7280' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  productCard: { width: (width - 48) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 12, margin: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  productImage: { height: 100, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  productImg: { width: '100%', height: '100%' },
  productName: { fontSize: 12, color: '#111827', fontWeight: '500', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#E65100' },
  ctaSection: { margin: 16, backgroundColor: '#E65100', borderRadius: 20, padding: 24 },
  ctaTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 20 },
  ctaButton: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  ctaButtonText: { color: '#E65100', fontWeight: '700', fontSize: 15 },
  ctaSecondary: { alignItems: 'center', padding: 8 },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
})
