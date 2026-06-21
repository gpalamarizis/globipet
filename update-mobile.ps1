# GlobiPet mobile update script
# Grafei ta telika, plirws diorthwmena arxeia (Filoxenia/Periposiisi, coming-soon screens, header fix)
$root = "C:\gp"
New-Item -ItemType Directory -Force -Path (Join-Path $root "apps\mobile\src\components") | Out-Null

$f1 = @'
import { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

const { width } = Dimensions.get('window')

const categories = [
  { emoji: '✂️', label: 'Περιποίηση',  type: 'grooming' },
  { emoji: '🩺', label: 'Κτηνίατρος',  type: 'veterinary' },
  { emoji: '🚶', label: 'Βόλτα',        type: 'walking' },
  { emoji: '🏠', label: 'Φιλοξενία',   type: 'pet_sitting' },
  { emoji: '🎓', label: 'Εκπαίδευση',  type: 'training' },
  { emoji: '🚗', label: 'Μεταφορά',    type: 'pet_taxi' },
  { emoji: '💻', label: 'Τηλειατρική', type: 'telehealth' },
  { emoji: '💊', label: 'Φαρμακείο',   type: 'pharmacy' },
  { emoji: '🛡️', label: 'Ασφάλεια',   type: 'insurance' },
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
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
            {isAuthenticated ? `Γεια, ${user?.full_name?.split(' ')[0]}! 👋` : 'Καλώς ήρθατε! 🐾'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">Best care for the best human's friends</Text>
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
        <Text style={styles.sectionTitle}>Υπηρεσίες</Text>
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
  headerText: { flex: 1, marginRight: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
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
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\(tabs)\index.tsx") -Value $f1 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\(tabs)\index.tsx"

$f2 = @'
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, Dimensions } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const { width } = Dimensions.get('window')

export default function MarketplaceScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data: products = [] } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => api.get(`/products?category=${category !== 'all' ? category : ''}&search=${search}&limit=20`).then(r => r.data?.data ?? []),
  })

  const categories = ['all','food','toys','accessories']
  const catLabels: Record<string,string> = { all:'Όλα', food:'Τροφές', toys:'Παιχνίδια', accessories:'Αξεσουάρ' }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Κατάστημα</Text>
        <TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
        <FlatList horizontal data={categories} keyExtractor={i => i} showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, category === item && styles.chipActive]} onPress={() => setCategory(item)}>
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{catLabels[item]}</Text>
            </TouchableOpacity>
          )} />
      </View>

      <FlatList data={products} keyExtractor={i => i.id} numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/marketplace/${item.id}`)}>
            <View style={styles.imgContainer}>
              {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={styles.img} />
                : <Text style={{ fontSize: 36 }}>📦</Text>}
            </View>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.price}>€{item.price}</Text>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Δεν βρέθηκαν προϊόντα</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  chipActive: { backgroundColor: '#E65100' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  card: { width: (width - 24) / 2, backgroundColor: '#fff', borderRadius: 16, margin: 4, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  imgContainer: { height: 120, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  name: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '800', color: '#E65100' },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E65100', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
})
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\(tabs)\marketplace.tsx") -Value $f2 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\(tabs)\marketplace.tsx"

$f3 = @'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const types = ['all','grooming','veterinary','walking','hosting','training','pet_taxi']
const typeLabels: Record<string,string> = { all:'Όλες', grooming:'Περιποίηση', veterinary:'Κτηνίατρος', walking:'Βόλτες', hosting:'Φιλοξενία', pet_sitting:'Ιδιώτης', training:'Εκπαίδευση', boarding:'Ξενοδοχείο', pet_taxi:'Taxi' }
const hostingSubTypes = ['pet_sitting','boarding']

export default function ServicesScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', type, search],
    queryFn: () => api.get(`/services?type=${type !== 'all' ? type : ''}&search=${search}&limit=20`).then(r => r.data?.data ?? []),
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Υπηρεσίες</Text>
        <TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {types.map(t => {
          const isHosting = t === 'hosting'
          const isActive = isHosting ? (type === 'pet_sitting' || type === 'boarding') : type === t
          return (
            <TouchableOpacity key={t} style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setType(isHosting ? ((type === 'pet_sitting' || type === 'boarding') ? type : 'pet_sitting') : t)}>
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{typeLabels[t]}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {(type === 'pet_sitting' || type === 'boarding') && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filters, { paddingTop: 0, paddingBottom: 10 }]} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {hostingSubTypes.map(t => (
            <TouchableOpacity key={t} style={[styles.filterChip, { paddingVertical: 5 }, type === t && styles.filterChipActive]} onPress={() => setType(t)}>
              <Text style={[styles.filterText, { fontSize: 12 }, type === t && styles.filterTextActive]}>{typeLabels[t]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList data={services} keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/services/${item.id}`)}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>{item.name?.[0] || '🐾'}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardType}>{item.type} · {item.duration_minutes} λεπτά</Text>
              <Text style={styles.cardRating}>⭐ {item.rating || '5.0'} · {item.reviews_count || 0} κριτικές</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardPrice}>€{item.price}</Text>
              <TouchableOpacity style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Κράτηση</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Δεν βρέθηκαν υπηρεσίες</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#E65100' },
  filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
  cardContent: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardType: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  cardRating: { fontSize: 12, color: '#6B7280' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#E65100' },
  bookBtn: { backgroundColor: '#E65100', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  bookBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
})
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\(tabs)\services.tsx") -Value $f3 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\(tabs)\services.tsx"

$f4 = @'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

const META: Record<string, { emoji: string; title: string; color: string; bg: string }> = {
  telehealth:   { emoji: '🩺', title: 'Τηλεϊατρική',  color: '#10B981', bg: '#ECFDF5' },
  tracker:      { emoji: '📍', title: 'GPS Tracker',  color: '#EF4444', bg: '#FEF2F2' },
  insurance:    { emoji: '🛡️', title: 'Ασφάλιση',     color: '#8B5CF6', bg: '#F5F3FF' },
  passport:     { emoji: '📗', title: 'Pet Passport', color: '#6366F1', bg: '#EEF2FF' },
  'ai-emotion': { emoji: '💜', title: 'AI Emotion',   color: '#F59E0B', bg: '#FFFBEB' },
  playdates:    { emoji: '🐾', title: 'Playdates',    color: '#10B981', bg: '#ECFDF5' },
  communities:  { emoji: '🏘️', title: 'Κοινότητες',   color: '#8B5CF6', bg: '#F5F3FF' },
  bookings:     { emoji: '📅', title: 'Κρατήσεις',    color: '#E65100', bg: '#FFF7ED' },
  orders:       { emoji: '📦', title: 'Παραγγελίες',  color: '#E65100', bg: '#FFF7ED' },
}

export default function ComingSoonScreen({ name }: { name: string }) {
  const router = useRouter()
  const meta = META[name] || { emoji: '✨', title: name, color: '#E65100', bg: '#FFF7ED' }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>← Πίσω</Text>
      </TouchableOpacity>

      <View style={[s.badge, { backgroundColor: meta.bg }]}>
        <Text style={s.emoji}>{meta.emoji}</Text>
      </View>

      <Text style={[s.title, { color: meta.color }]}>{meta.title}</Text>
      <Text style={s.sub}>Διαθέσιμο ήδη στο globipet.com</Text>
      <Text style={s.sub2}>Η εφαρμογή κινητού έρχεται πολύ σύντομα</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 60, left: 20 },
  backText: { color: '#E65100', fontSize: 15, fontWeight: '600' },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emoji: { fontSize: 34 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
  sub2: { fontSize: 13, color: '#9CA3AF', marginTop: 3, textAlign: 'center' },
})
'@
Set-Content -Path (Join-Path $root "apps\mobile\src\components\ComingSoonScreen.tsx") -Value $f4 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\src\components\ComingSoonScreen.tsx"

$f5 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="telehealth" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\telehealth.tsx") -Value $f5 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\telehealth.tsx"

$f6 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="tracker" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\tracker.tsx") -Value $f6 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\tracker.tsx"

$f7 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="insurance" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\insurance.tsx") -Value $f7 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\insurance.tsx"

$f8 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="passport" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\passport.tsx") -Value $f8 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\passport.tsx"

$f9 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="ai-emotion" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\ai-emotion.tsx") -Value $f9 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\ai-emotion.tsx"

$f10 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="playdates" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\playdates.tsx") -Value $f10 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\playdates.tsx"

$f11 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="communities" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\communities.tsx") -Value $f11 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\communities.tsx"

$f12 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="bookings" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\bookings.tsx") -Value $f12 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\bookings.tsx"

$f13 = @'
import ComingSoonScreen from '../src/components/ComingSoonScreen'

export default function Screen() {
  return <ComingSoonScreen name="orders" />
}
'@
Set-Content -Path (Join-Path $root "apps\mobile\app\orders.tsx") -Value $f13 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\mobile\app\orders.tsx"

Write-Host ""
Write-Host "Done - 13 mobile files updated."