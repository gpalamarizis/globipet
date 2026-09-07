import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ChevronRight, Plus } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Αρχική.
 *
 * ΤΙ ΑΛΛΑΞΕ ΚΑΙ ΓΙΑΤΙ
 *   Υπήρχε ένα πλέγμα δώδεκα ενεργειών σε τέσσερις στήλες, με ετικέτες
 *   στα 10px και numberOfLines={1}. Λέξεις όπως «Τηλεϊατρική» και
 *   «Εκπαίδευση» κόβονταν με αποσιωπητικά, και η λύση που είχε εφαρμοστεί
 *   ήταν να μικρύνει κι άλλο η γραμματοσειρά. Το μέγεθος ήταν το σύμπτωμα:
 *   το πρόβλημα ήταν δώδεκα πράγματα σε τέσσερις στήλες.
 *
 *   Οι δώδεκα ήταν και δύο διαφορετικά είδη ανακατεμένα — υπηρεσίες που
 *   κλείνεις (κτηνίατρος, περιποίηση) μαζί με λειτουργίες της εφαρμογής
 *   (AI Υγεία, Φάκελος, Ασφάλιση). Κάποιος που ψάχνει κομμωτήριο και
 *   κάποιος που ανοίγει τον ιατρικό φάκελο δεν είναι στην ίδια διάθεση.
 *
 *   Τώρα: έξι υπηρεσίες σε τρεις στήλες με χρωματιστά πλακίδια και ετικέτες
 *   δύο γραμμών στα 12px, και οι λειτουργίες χωριστά σε οριζόντια σειρά.
 *   Τα κατοικίδια ανεβαίνουν πάνω — είναι ο λόγος που ανοίγει κανείς την
 *   εφαρμογή.
 */

/** Υπηρεσίες που κλείνεις. Έξι, όσες χωράνε σε δύο σειρές των τριών. */
const SERVICES = [
  { key: 'veterinary',  emoji: '🩺', label: 'Κτηνίατρος',  type: 'veterinary' },
  { key: 'grooming',    emoji: '✂️', label: 'Περιποίηση',  type: 'grooming' },
  { key: 'walking',     emoji: '🚶', label: 'Βόλτες',      type: 'walking' },
  { key: 'hosting',     emoji: '🏠', label: 'Φιλοξενία',   type: 'hosting' },
  { key: 'training',    emoji: '🎓', label: 'Εκπαίδευση',  type: 'training' },
  { key: 'pet_taxi',    emoji: '🚗', label: 'Pet Taxi',    type: 'pet_taxi' },
] as const

/** Λειτουργίες της εφαρμογής. Οριζόντια σειρά — δεν ανταγωνίζονται τις υπηρεσίες. */
const FEATURES = [
  { key: 'ai',        emoji: '🧠', label: 'AI Υγεία',     route: '/ai-health' },
  { key: 'passport',  emoji: '📋', label: 'Φάκελος',      route: '/passport' },
  { key: 'telehealth',emoji: '💻', label: 'Τηλεϊατρική',  route: '/telehealth' },
  { key: 'tracker',   emoji: '📍', label: 'Εντοπισμός',   route: '/tracker' },
  { key: 'insurance', emoji: '🛡️', label: 'Ασφάλιση',    route: '/insurance' },
  { key: 'pharmacy',  emoji: '💊', label: 'Φαρμακείο',    route: '/(tabs)/services' },
] as const

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', fish: '🐠', reptile: '🦎',
}

/** Το πλακίδιο δανείζεται το χρώμα της κατηγορίας από το θέμα. */
function tint(key: string) {
  return (colors.category as any)[key] ?? colors.category.default
}

export default function HomeScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, loadToken } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadToken() }, [])

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=6').then(r => r.data?.data ?? []),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products?featured=true&limit=4').then(r => r.data?.data ?? []),
  })

  /**
   * Τράβηγμα προς τα κάτω για ανανέωση.
   *
   * Είναι η πρώτη χειρονομία που δοκιμάζει κάθε χρήστης όταν θέλει φρέσκα
   * δεδομένα. Δεν υπήρχε πουθενά στην εφαρμογή, και η απουσία της κάνει την
   * οθόνη να μοιάζει κολλημένη.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-pets'] }),
      queryClient.invalidateQueries({ queryKey: ['featured-services'] }),
      queryClient.invalidateQueries({ queryKey: ['featured-products'] }),
    ])
    setRefreshing(false)
  }, [queryClient])

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }>

      {/* ── Κεφαλίδα ─────────────────────────────────────────────────
          Σκούρο μπλε: είναι δομή, όχι ενέργεια. Το πορτοκαλί μένει για
          τα πράγματα που πατιούνται. */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting} numberOfLines={1}>
              {isAuthenticated ? `Γεια σου, ${firstName}` : 'Καλώς ήρθες'}
            </Text>
            <Text style={s.tagline}>Ό,τι χρειάζεται το κατοικίδιό σου</Text>
          </View>
          {isAuthenticated && user?.profile_photo
            ? <Image source={{ uri: user.profile_photo }} style={s.avatar} />
            : <Image source={require('../../assets/icon.png')} style={s.avatar} />}
        </View>

        <TouchableOpacity
          style={s.search}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/services' as any)}>
          <Search size={icon.md} color={colors.textLight} />
          <Text style={s.searchText}>Αναζήτηση υπηρεσίας ή παρόχου</Text>
        </TouchableOpacity>
      </View>

      {/* ── Τα κατοικίδιά μου ────────────────────────────────────────
          Πρώτα, γιατί είναι ο λόγος που ανοίγει κανείς την εφαρμογή. */}
      {isAuthenticated && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Τα κατοικίδιά μου</Text>
            {pets.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/pets' as any)} style={s.seeAllBtn}>
                <Text style={s.seeAll}>Όλα</Text>
                <ChevronRight size={icon.sm} color={colors.brand} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.md, paddingRight: space.lg }}>
            {pets.slice(0, 6).map((p: any) => (
              <TouchableOpacity key={p.id} style={s.petCard} activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/pets' as any)}>
                <View style={s.petAvatar}>
                  {p.image_url
                    ? <Image source={{ uri: p.image_url }} style={s.petImg} />
                    : <Text style={s.petEmoji}>{SPECIES_EMOJI[p.species] ?? '🐾'}</Text>}
                </View>
                <Text style={s.petName} numberOfLines={1}>{p.name}</Text>
              </TouchableOpacity>
            ))}

            {/* Πάντα τελευταίο, ώστε η προσθήκη να είναι στην ίδια χειρονομία. */}
            <TouchableOpacity style={s.petCard} activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/pets' as any)}>
              <View style={[s.petAvatar, s.petAdd]}>
                <Plus size={icon.lg} color={colors.brand} />
              </View>
              <Text style={[s.petName, { color: colors.brand }]}>Προσθήκη</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── Υπηρεσίες ────────────────────────────────────────────────
          Τρεις στήλες. Χωράνε ολόκληρες οι λέξεις στα 12px, και το
          πλακίδιο μεγαλώνει αρκετά ώστε να είναι εύκολος στόχος. */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Υπηρεσίες</Text>
        <View style={s.serviceGrid}>
          {SERVICES.map(a => {
            const c = tint(a.key)
            return (
              <TouchableOpacity key={a.key} style={s.serviceTile} activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/services?type=${a.type}` as any)}>
                <View style={[s.serviceIcon, { backgroundColor: c.bg }]}>
                  <Text style={s.serviceEmoji}>{a.emoji}</Text>
                </View>
                <Text style={s.serviceLabel} numberOfLines={2}>{a.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── Λειτουργίες ──────────────────────────────────────────────
          Οριζόντια, ώστε να μην ανταγωνίζονται οπτικά τις υπηρεσίες. */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Για το κατοικίδιό σου</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
          {FEATURES.map(f => (
            <TouchableOpacity key={f.key} style={s.featureChip} activeOpacity={0.7}
              onPress={() => router.push(f.route as any)}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
              <Text style={s.featureLabel}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Πάροχοι ──────────────────────────────────────────────────
          Σκελετοί αντί για κενό. Το μάτι έχει πού να σταθεί όσο φορτώνει,
          και η ίδια αναμονή μοιάζει συντομότερη. */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Κορυφαίοι πάροχοι</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services' as any)} style={s.seeAllBtn}>
            <Text style={s.seeAll}>Όλοι</Text>
            <ChevronRight size={icon.sm} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {servicesLoading
          ? [0, 1, 2].map(i => (
              <View key={i} style={s.providerCard}>
                <View style={[s.providerAvatar, s.skeleton]} />
                <View style={{ flex: 1, gap: space.sm }}>
                  <View style={[s.skeleton, { height: 14, width: '55%', borderRadius: radius.sm }]} />
                  <View style={[s.skeleton, { height: 12, width: '35%', borderRadius: radius.sm }]} />
                </View>
              </View>
            ))
          : services.slice(0, 4).map((sv: any) => (
              <TouchableOpacity key={sv.id} style={s.providerCard} activeOpacity={0.8}
                onPress={() => router.push(`/services/${sv.id}` as any)}>
                <View style={s.providerAvatar}>
                  {sv.image_url
                    ? <Image source={{ uri: sv.image_url }} style={s.providerImg} />
                    : <Text style={s.providerEmoji}>🐾</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.providerName} numberOfLines={1}>{sv.provider_name}</Text>
                  <Text style={s.providerSub} numberOfLines={1}>{sv.city}</Text>
                  <Text style={s.providerRating}>
                    ⭐ {sv.rating?.toFixed(1) ?? '—'} · {sv.reviews_count ?? 0} κριτικές
                  </Text>
                </View>
                <Text style={s.providerPrice}>€{sv.price}</Text>
              </TouchableOpacity>
            ))}
      </View>

      {/* ── Προϊόντα ─────────────────────────────────────────────────
          Δύο ανά σειρά, όχι τρία — η φωτογραφία είναι αυτή που πουλάει. */}
      {products.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Προτεινόμενα</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace' as any)} style={s.seeAllBtn}>
              <Text style={s.seeAll}>Όλα</Text>
              <ChevronRight size={icon.sm} color={colors.brand} />
            </TouchableOpacity>
          </View>
          <View style={s.productGrid}>
            {products.slice(0, 4).map((p: any) => (
              <TouchableOpacity key={p.id} style={s.productCard} activeOpacity={0.8}
                onPress={() => router.push(`/products/${p.id}` as any)}>
                <View style={s.productImgBox}>
                  {p.image_url
                    ? <Image source={{ uri: p.image_url }} style={s.productImg} />
                    : <Text style={{ fontSize: 32 }}>🛍️</Text>}
                </View>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={s.productPrice}>€{p.sale_price ?? p.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Εγγραφή ──────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <View style={s.authBanner}>
          <Text style={s.authTitle}>Ξεκίνα σήμερα</Text>
          <Text style={s.authSub}>
            Εγγραφή δωρεάν — και 30 μέρες AI λειτουργίες χωρίς χρέωση.
          </Text>
          <View style={s.authBtns}>
            <TouchableOpacity style={s.authPrimary} activeOpacity={0.85}
              onPress={() => router.push('/auth/register' as any)}>
              <Text style={s.authPrimaryText}>Εγγραφή</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.authSecondary} activeOpacity={0.85}
              onPress={() => router.push('/auth/login' as any)}>
              <Text style={s.authSecondaryText}>Σύνδεση</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  greeting: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.surface,
    height: touch.comfortable,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  searchText: { ...type.body, color: colors.textLight },

  section: { paddingHorizontal: space.lg, paddingTop: space.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...type.section, color: colors.text, fontWeight: weight.bold, marginBottom: space.md },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  seeAll: { ...type.body, color: colors.brand, fontWeight: weight.semibold },

  // Κατοικίδια
  petCard: { alignItems: 'center', width: 76 },
  petAvatar: {
    width: 68, height: 68, borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.sm,
    ...shadow.sm,
  },
  petAdd: { backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brandTint },
  petImg: { width: 68, height: 68, borderRadius: radius.full },
  petEmoji: { fontSize: 30 },
  petName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, textAlign: 'center' },

  // Υπηρεσίες — τρεις στήλες
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  serviceTile: { width: '30.5%', alignItems: 'center', paddingVertical: space.sm },
  serviceIcon: {
    width: 64, height: 64, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.sm,
  },
  serviceEmoji: { fontSize: 28 },
  serviceLabel: {
    ...type.caption, color: colors.text, fontWeight: weight.semibold,
    textAlign: 'center',
  },

  // Λειτουργίες
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.surface,
    paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: radius.full,
    minHeight: touch.min,
    ...shadow.sm,
  },
  featureEmoji: { fontSize: 18 },
  featureLabel: { ...type.body, color: colors.text, fontWeight: weight.semibold },

  // Πάροχοι
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  providerAvatar: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  providerImg: { width: 56, height: 56, borderRadius: radius.md },
  providerEmoji: { fontSize: 24 },
  providerName: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  providerSub: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  providerRating: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  providerPrice: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },

  skeleton: { backgroundColor: colors.surfaceAlt },

  // Προϊόντα
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  productCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.sm,
  },
  productImgBox: {
    height: 110, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.sm,
    overflow: 'hidden',
  },
  productImg: { width: '100%', height: '100%' },
  productName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, minHeight: 32 },
  productPrice: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold, marginTop: space.xs },

  // Εγγραφή
  authBanner: {
    margin: space.lg, marginTop: space.xxl,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: space.xl,
  },
  authTitle: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  authSub: { ...type.body, color: 'rgba(255,255,255,0.75)', marginTop: space.sm, marginBottom: space.lg },
  authBtns: { flexDirection: 'row', gap: space.md },
  authPrimary: {
    flex: 1, height: touch.comfortable, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  authPrimaryText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  authSecondary: {
    flex: 1, height: touch.comfortable, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  authSecondaryText: { ...type.emphasis, color: colors.textOnDark, fontWeight: weight.semibold },
})
