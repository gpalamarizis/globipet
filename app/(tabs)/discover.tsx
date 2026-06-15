import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Search, Scissors, ShoppingBag, Stethoscope, Shield, MapPin, Brain, Heart, BookOpen } from 'lucide-react-native'
import { api } from '../../src/lib/api'

const quickLinks = [
  { icon: Scissors,     label: 'Υπηρεσίες',   route: '/services',    color: '#F97316', bg: '#FFF7ED' },
  { icon: ShoppingBag, label: 'Κατάστημα',    route: '/marketplace', color: '#3B82F6', bg: '#EFF6FF' },
  { icon: Stethoscope, label: 'Τηλεϊατρική',  route: '/telehealth',  color: '#10B981', bg: '#ECFDF5' },
  { icon: Shield,      label: 'Ασφάλιση',     route: '/insurance',   color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: MapPin,      label: 'Tracker',       route: '/tracker',     color: '#EF4444', bg: '#FEF2F2' },
  { icon: Brain,       label: 'AI Υγεία',      route: '/ai-health',   color: '#EC4899', bg: '#FDF2F8' },
  { icon: Heart,       label: 'AI Emotion',    route: '/ai-emotion',  color: '#F59E0B', bg: '#FFFBEB' },
  { icon: BookOpen,    label: 'Passport',      route: '/passport',    color: '#6366F1', bg: '#EEF2FF' },
]

export default function DiscoverScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data: services } = useQuery({
    queryKey: ['discover-services', search],
    queryFn: () => api.get('/services', { params: { q: search || undefined, limit: 6 } }).then(r => r.data?.data ?? []),
  })

  const { data: products } = useQuery({
    queryKey: ['discover-products', search],
    queryFn: () => api.get('/products', { params: { q: search || undefined, limit: 4 } }).then(r => r.data?.data ?? []),
  })

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>Discover</Text>
        <Text style={s.subtitle}>Υπηρεσίες, κατάστημα και AI εργαλεία</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Search size={16} color="#9CA3AF" style={s.searchIcon} />
        <TextInput style={s.searchInput} placeholder="Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
      </View>

      {/* Quick links */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Γρήγορη Πρόσβαση</Text>
        <View style={s.grid}>
          {quickLinks.map(item => (
            <TouchableOpacity key={item.route} style={[s.quickCard, { backgroundColor: item.bg }]}
              onPress={() => router.push(item.route as any)}>
              <item.icon size={22} color={item.color} />
              <Text style={[s.quickLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Services */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Υπηρεσίες</Text>
          <TouchableOpacity onPress={() => router.push('/services')}>
            <Text style={s.seeAll}>Όλες →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
          {services?.map((sv: any) => (
            <TouchableOpacity key={sv.id} style={s.serviceCard}
              onPress={() => router.push(`/services/${sv.id}` as any)}>
              <View style={s.serviceAvatar}>
                {sv.cover_image
                  ? <Image source={{ uri: sv.cover_image }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                  : <Text style={{ fontSize: 28 }}>✂️</Text>
                }
              </View>
              <Text style={s.serviceName} numberOfLines={1}>{sv.title || sv.name}</Text>
              <Text style={s.serviceCity}>{sv.city}</Text>
              <View style={s.serviceFooter}>
                <Text style={s.serviceRating}>⭐ {sv.rating?.toFixed(1) || '5.0'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Κατάστημα</Text>
          <TouchableOpacity onPress={() => router.push('/marketplace')}>
            <Text style={s.seeAll}>Όλα →</Text>
          </TouchableOpacity>
        </View>
        <View style={s.productsGrid}>
          {products?.map((p: any) => (
            <TouchableOpacity key={p.id} style={s.productCard}
              onPress={() => router.push(`/marketplace/${p.id}` as any)}>
              <View style={s.productImg}>
                {p.image_url
                  ? <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                  : <Text style={{ fontSize: 32 }}>📦</Text>
                }
              </View>
              <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
              <Text style={s.productPrice}>€{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#111827' },
  section: { marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  quickCard: { width: '22%', margin: '1.5%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 },
  quickLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  hScroll: { paddingLeft: 16 },
  serviceCard: { width: 152, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  serviceAvatar: { height: 80, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  serviceCity: { fontSize: 11, color: '#6B7280' },
  serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  serviceRating: { fontSize: 11, color: '#6B7280' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  productCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, margin: '1.5%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  productImg: { height: 90, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  productName: { fontSize: 12, color: '#111827', fontWeight: '500', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#E65100' },
})
