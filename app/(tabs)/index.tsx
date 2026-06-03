import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

export default function HomeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()

  const categories = [
    { emoji:'✂️', label: t('services.categories.grooming'), type:'grooming' },
    { emoji:'🩺', label: t('services.categories.veterinary'), type:'veterinary' },
    { emoji:'🚶', label: t('services.categories.walking'), type:'walking' },
    { emoji:'🏠', label: t('services.categories.pet_sitting'), type:'pet_sitting' },
    { emoji:'🎓', label: t('services.categories.training'), type:'training' },
    { emoji:'🚕', label: t('services.categories.pet_taxi'), type:'pet_taxi' },
  ]

  const { data: services = [] } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=4').then(r => r.data?.data ?? []),
  })

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{isAuthenticated ? t('home.greeting', { name: user?.full_name?.split(' ')[0] }) : 'GlobiPet 🐾'}</Text>
          <Text style={styles.subtitle}>{t('common.tagline')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/services')}>
        <Text style={styles.searchText}>{t('home.search_service')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {categories.map(cat => (
          <TouchableOpacity key={cat.type} style={styles.categoryItem} onPress={() => router.push('/services')}>
            <View style={styles.categoryIcon}><Text style={{ fontSize: 24 }}>{cat.emoji}</Text></View>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {services.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('home.top_services')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {services.map((s: any) => (
              <TouchableOpacity key={s.id} style={styles.serviceCard}>
                <View style={styles.serviceAvatar}><Text style={styles.serviceAvatarText}>{s.name?.[0]||'🐾'}</Text></View>
                <Text style={styles.serviceName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.servicePrice}>€{s.price}</Text>
                <Text style={styles.serviceRating}>⭐ {s.rating||'5.0'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {!isAuthenticated && (
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>{t('home.join_free')}</Text>
          <Text style={styles.ctaDesc}>{t('home.join_desc')}</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/auth/register')}>
            <Text style={styles.ctaBtnText}>{t('auth.register')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.ctaLink}>{t('home.have_account_link')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  searchBar: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchText: { color: '#9CA3AF', fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  categoryItem: { alignItems: 'center', marginRight: 16, width: 72 },
  categoryIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  categoryLabel: { fontSize: 11, color: '#374151', textAlign: 'center' },
  serviceCard: { width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  serviceAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  servicePrice: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 2 },
  serviceRating: { fontSize: 11, color: '#6B7280' },
  cta: { margin: 16, backgroundColor: '#E65100', borderRadius: 20, padding: 24 },
  ctaTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  ctaDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  ctaBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  ctaBtnText: { color: '#E65100', fontWeight: '700', fontSize: 15 },
  ctaLink: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' },
})
