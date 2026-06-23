import { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

const O = '#E65100'

const QUICK_ACTIONS = [
  { emoji: '✂️', label: 'Περιποίηση',  route: '/(tabs)/services', type: 'grooming' },
  { emoji: '🩺', label: 'Κτηνίατρος', route: '/(tabs)/services', type: 'veterinary' },
  { emoji: '🚶', label: 'Βόλτες',      route: '/(tabs)/services', type: 'walking' },
  { emoji: '🏠', label: 'Φιλοξενία',  route: '/(tabs)/services', type: 'pet_sitting' },
  { emoji: '💊', label: 'Φαρμακείο',  route: '/(tabs)/services', type: 'pharmacy' },
  { emoji: '🎓', label: 'Εκπαίδευση', route: '/(tabs)/services', type: 'training' },
  { emoji: '🚗', label: 'Pet Taxi',   route: '/(tabs)/services', type: 'pet_taxi' },
  { emoji: '⚖️', label: 'Νομικά',     route: '/legal', type: 'legal' },
  { emoji: '💻', label: 'Τηλεϊατρική',route: '/telehealth', type: 'telehealth' },
  { emoji: '🛡️', label: 'Ασφάλιση',  route: '/insurance', type: 'insurance' },
  { emoji: '🧠', label: 'AI Υγεία',   route: '/ai-health', type: 'ai' },
  { emoji: '📋', label: 'Φάκελος',    route: '/passport', type: 'passport' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated, loadToken } = useAuthStore()
  useEffect(() => { loadToken() }, [])

  const { data: services = [] } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=6').then(r => r.data?.data ?? []),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products?featured=true&limit=4').then(r => r.data?.data ?? []),
  })

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.logoBox}>
            <Image source={require('../../assets/icon.png')} style={s.logo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting} numberOfLines={1}>
              {isAuthenticated ? `Γεια, ${user?.full_name?.split(' ')[0]}! 👋` : 'Καλώς ήρθατε! 🐾'}
            </Text>
            <Text style={s.tagline}>Best care for the best friends</Text>
          </View>
          {isAuthenticated && user?.profile_photo && (
            <Image source={{ uri: user.profile_photo }} style={s.avatar} />
          )}
        </View>

        {/* Search */}
        <TouchableOpacity style={s.searchBar} onPress={() => router.push('/(tabs)/services' as any)}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Αναζήτηση υπηρεσίας ή παρόχου...</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions grid — 4 per row, wrap */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Υπηρεσίες</Text>
        <View style={s.actionGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity key={a.type} style={s.actionItem}
              onPress={() => router.push(a.route as any)} activeOpacity={0.7}>
              <View style={s.actionIcon}>
                <Text style={s.actionEmoji}>{a.emoji}</Text>
              </View>
              <Text style={s.actionLabel} numberOfLines={1}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured services */}
      {services.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Κορυφαίοι Πάροχοι</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/services' as any)}>
              <Text style={s.seeAll}>Όλοι →</Text>
            </TouchableOpacity>
          </View>
          {services.slice(0, 4).map((sv: any) => (
            <TouchableOpacity key={sv.id} style={s.serviceCard}
              onPress={() => router.push(`/services/${sv.id}` as any)} activeOpacity={0.7}>
              <View style={s.serviceAvatar}>
                {sv.image_url
                  ? <Image source={{ uri: sv.image_url }} style={s.serviceAvatarImg} />
                  : <Text style={s.serviceAvatarEmoji}>🐾</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.serviceName} numberOfLines={1}>{sv.provider_name}</Text>
                <Text style={s.serviceSub} numberOfLines={1}>{sv.service_type} · {sv.city}</Text>
                <Text style={s.serviceRating}>⭐ {sv.rating?.toFixed(1) || '5.0'} · {sv.reviews_count || 0} κριτικές</Text>
              </View>
              <Text style={s.servicePrice}>€{sv.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Featured products */}
      {products.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Προτεινόμενα Προϊόντα</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace' as any)}>
              <Text style={s.seeAll}>Όλα →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.productGrid}>
            {products.slice(0, 4).map((p: any) => (
              <TouchableOpacity key={p.id} style={s.productCard}
                onPress={() => router.push(`/products/${p.id}` as any)} activeOpacity={0.7}>
                <View style={s.productImg}>
                  {p.image_url
                    ? <Image source={{ uri: p.image_url }} style={s.productImgSrc} />
                    : <Text style={{ fontSize: 28 }}>🛍️</Text>}
                </View>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={s.productPrice}>€{p.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Not logged in banner */}
      {!isAuthenticated && (
        <View style={s.authBanner}>
          <Text style={s.authTitle}>Ξεκινήστε Σήμερα 🐾</Text>
          <Text style={s.authSub}>Εγγραφείτε δωρεάν και διαχειριστείτε όλα όσα χρειάζεται το κατοικίδιό σας</Text>
          <View style={s.authBtns}>
            <TouchableOpacity style={s.authLoginBtn} onPress={() => router.push('/auth/login' as any)}>
              <Text style={s.authLoginText}>Σύνδεση</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.authRegisterBtn} onPress={() => router.push('/auth/register' as any)}>
              <Text style={s.authRegisterText}>Εγγραφή</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logoBox: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  logo: { width: 40, height: 40 },
  greeting: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tagline: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, flexShrink: 0 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  searchIcon: { fontSize: 15 },
  searchPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  seeAll: { fontSize: 13, color: O, fontWeight: '600' },
  // Quick actions - 4 per row
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionItem: { width: '22%', alignItems: 'center' },
  actionIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 10, color: '#374151', fontWeight: '600', textAlign: 'center' },
  // Service cards
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, gap: 10 },
  serviceAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  serviceAvatarImg: { width: 44, height: 44 },
  serviceAvatarEmoji: { fontSize: 20 },
  serviceName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  serviceSub: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  serviceRating: { fontSize: 11, color: '#6B7280' },
  servicePrice: { fontSize: 15, fontWeight: '800', color: O, flexShrink: 0 },
  // Product grid - 2 per row
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
  productImg: { width: '100%', height: 100, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  productImgSrc: { width: '100%', height: 100 },
  productName: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '800', color: O },
  // Auth banner
  authBanner: { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  authTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  authSub: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  authBtns: { flexDirection: 'row', gap: 10 },
  authLoginBtn: { flex: 1, borderWidth: 1.5, borderColor: O, borderRadius: 12, padding: 12, alignItems: 'center' },
  authLoginText: { color: O, fontWeight: '700' },
  authRegisterBtn: { flex: 1, backgroundColor: O, borderRadius: 12, padding: 12, alignItems: 'center' },
  authRegisterText: { color: '#fff', fontWeight: '700' },
})