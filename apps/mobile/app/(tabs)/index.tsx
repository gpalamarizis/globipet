import { useState, useCallback } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl, Platform, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, ChevronRight, Plus,
  Stethoscope, Scissors, Footprints, House, GraduationCap, Car,
  Brain, FileText, Video, MapPin, ShieldCheck, Pill, Sparkles, Calendar,
} from 'lucide-react-native'
import { useAuthStore, isEmailUnverified } from '../../src/store/auth'
import EmailVerifyBanner from '../../src/components/EmailVerifyBanner'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import { effectivePrice } from '@/lib/price'

/**
 * Ύψος μπάρας κατάστασης συν αναπνοή.
 *
 * StatusBar.currentHeight δίνει την πραγματική τιμή στο Android. Τα
 * useSafeAreaInsets επιστρέφουν 0 όταν η εφαρμογή δεν είναι ρητά
 * edge-to-edge, ενώ το σύστημα σχεδιάζει ούτως ή άλλως από κάτω — γι'
 * αυτό δεν τα εμπιστευόμαστε εδώ. Κάτω όριο 48, όσο ίσχυε πριν.
 */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

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

/**
 * Υπηρεσίες που κλείνεις. Έξι, όσες χωράνε σε δύο σειρές των τριών.
 *
 * ΓΙΑΤΙ ΕΦΥΓΑΝ ΤΑ EMOJI
 *   Τα emoji τα σχεδιάζει το λειτουργικό, όχι εμείς. Σε Samsung δείχνουν
 *   αλλιώς απ' ό,τι σε Pixel και σε iPhone αλλιώς από τα δύο — και κανένα
 *   δεν ταιριάζει με τα εικονίδια της κάτω μπάρας, που είναι γραμμικά.
 *   Το ίδιο εικονίδιο παντού είναι προϋπόθεση για να μοιάζει προϊόν.
 */
const SERVICES = [
  { key: 'veterinary',  Icon: Stethoscope,   labelKey: 'services.categories.veterinary',  type: 'veterinary' },
  { key: 'grooming',    Icon: Scissors,      labelKey: 'cat.grooming',  type: 'grooming' },
  { key: 'walking',     Icon: Footprints,    labelKey: 'services.categories.walking',      type: 'walking' },
  { key: 'hosting',     Icon: House,         labelKey: 'cat.boarding',   type: 'hosting' },
  { key: 'training',    Icon: GraduationCap, labelKey: 'services.categories.training',  type: 'training' },
  { key: 'pet_taxi',    Icon: Car,           labelKey: 'cat.transport',    type: 'pet_taxi' },
] as const

/** Λειτουργίες της εφαρμογής. Οριζόντια σειρά — δεν ανταγωνίζονται τις υπηρεσίες. */
const FEATURES = [
  { key: 'ai',        Icon: Brain,       labelKey: 'cat.ai_health',     route: '/ai-health' },
  { key: 'passport',  Icon: FileText,    labelKey: 'home.record',      route: '/passport' },
  { key: 'telehealth',Icon: Video,       labelKey: 'profile.menu.telehealth',  route: '/telehealth' },
  { key: 'tracker',   Icon: MapPin,      labelKey: 'home.tracking',   route: '/tracker' },
  { key: 'insurance', Icon: ShieldCheck, labelKey: 'cat.insurance',     route: '/insurance' },
  { key: 'pharmacy',  Icon: Pill,        labelKey: 'cat.pharmacy',    route: '/(tabs)/services' },
] as const

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', fish: '🐠', reptile: '🦎',
}

/**
 * Το πλακίδιο δανείζεται το χρώμα της κατηγορίας από το θέμα.
 *
 * Το `fg` μπορεί να μην ορίζεται για κάθε κατηγορία· τότε το εικονίδιο
 * πέφτει στο σκούρο μπλε, που διαβάζεται πάνω σε κάθε παστέλ φόντο.
 */
function tint(key: string) {
  return (colors.category as any)[key] ?? colors.category.default
}

export default function HomeScreen() {
  const tabSpace = useTabSpace()
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  // Το loadToken() έφυγε από εδώ. Τρέχει πλέον στο app/_layout.tsx, πριν
  // εμφανιστεί οποιαδήποτε οθόνη — αλλιώς κάθε άνοιγμα που δεν περνούσε
  // από την Αρχική έβγαζε 401 και το React Query το κρατούσε στην cache.

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

  // Δοκιμή AI — ίδιο σήμα με το web. Οι μέρες έρχονται από τον server
  // (my-status → trial_days_left), όχι από σταθερό αριθμό στην εφαρμογή.
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data ?? null),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const trialShown = !!aiStatus?.ai_trial_started_at
    && (aiStatus.ai_subscription_status === 'trial' || aiStatus.ai_subscription_status === 'expired')
  const trialLeft = aiStatus?.ai_subscription_status === 'trial'
    ? Math.max(0, Number(aiStatus.trial_days_left ?? 0)) : 0
  const trialExpired = trialLeft === 0
  // Αποτυχημένη πληρωμή συνδρομής AI: μη ενεργή → πλάνα (όπως στο web).
  const aiPaymentFailed = aiStatus?.ai_subscription_status === 'payment_failed'

  // Επόμενο ραντεβού — όπως η κάρτα της αρχικής του web.
  const { data: nextBooking } = useQuery({
    // Ίδια κριτήρια με την καρτέλα «Επερχόμενες» του app/bookings.tsx: όχι
    // ακυρωμένες και όχι όσες πέρασε ήδη η ώρα τους. Ο server ταξινομεί μόνο
    // κατά ημερομηνία (και με limit=1 θα έφερνε και ακυρωμένη), οπότε
    // φιλτράρουμε και ταξινομούμε κατά ημερομηνία+ώρα εδώ.
    queryKey: ['my-next-booking'],
    queryFn: () => api.get('/bookings/my?upcoming=true').then(r => {
      const at = (b: any): number | null => {
        const [y, m, d] = String(b?.booking_date ?? '').split('-').map(Number)
        if (!y || !m || !d) return null
        const [hh, mm] = String(b?.booking_time || '00:00').split(':').map(Number)
        const x = new Date(y, m - 1, d, hh || 0, mm || 0).getTime()
        return isNaN(x) ? null : x
      }
      const now = Date.now()
      return ((r.data?.data ?? []) as any[])
        .map(b => ({ b, ts: at(b) }))
        .filter(x => x.ts !== null && x.ts >= now && x.b.status !== 'cancelled')
        .sort((a, c) => (a.ts as number) - (c.ts as number))[0]?.b ?? null
    }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  // booking_date είναι «YYYY-MM-DD»: τοπική ημερομηνία από τα μέρη της,
  // όχι new Date('YYYY-MM-DD') (UTC → λάθος μέρα σε άλλες ζώνες).
  const bookingWhen = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nextBooking?.booking_date ?? '')
    if (!m) return ''
    const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      .toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
    return [day, nextBooking?.booking_time].filter(Boolean).join(' · ')
  })()

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
      queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] }),
      queryClient.invalidateQueries({ queryKey: ['my-next-booking'] }),
    ])
    setRefreshing(false)
  }, [queryClient])

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabSpace.paddingBottom }}
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
              {isAuthenticated ? t('home.greeting_name', { name: firstName }) : t('home.welcome')}
            </Text>
            <Text style={s.tagline}>{t('home.everything_pet_needs')}</Text>
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
          <Text style={s.searchText}>{t('home.search_placeholder')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Επιβεβαίωση email (ισοτιμία με τη μπάρα του web) ───────── */}
      {isAuthenticated && isEmailUnverified(user) && (
        <View style={[s.section, { paddingTop: space.lg }]}>
          <EmailVerifyBanner />
        </View>
      )}

      {/* ── Συνδρομή AI με αποτυχημένη πληρωμή → πλάνα ─────────────── */}
      {isAuthenticated && aiPaymentFailed && (
        <View style={[s.section, { paddingTop: space.lg }]}>
          <TouchableOpacity activeOpacity={0.8}
            style={[s.trial, s.trialExpired]}
            onPress={() => router.push('/pricing' as any)}>
            <View style={[s.trialIcon, { backgroundColor: colors.dangerBg }]}>
              <Sparkles size={icon.sm} color={colors.danger} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.trialLabel} numberOfLines={1}>{t('aiGate.subscriptionLabel')}</Text>
              <Text style={s.trialValue} numberOfLines={1}>{t('aiGate.paymentFailedShort')}</Text>
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Δοκιμή AI: ενεργή → AI Health, ληγμένη → πλάνα ─────────── */}
      {isAuthenticated && trialShown && (
        <View style={[s.section, { paddingTop: space.lg }]}>
          <TouchableOpacity activeOpacity={0.8}
            style={[s.trial, trialExpired ? s.trialExpired : s.trialActive]}
            onPress={() => router.push((trialExpired ? '/pricing' : '/ai-health') as any)}>
            <View style={[s.trialIcon, { backgroundColor: trialExpired ? colors.dangerBg : colors.warningBg }]}>
              <Sparkles size={icon.sm} color={trialExpired ? colors.danger : colors.warning} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.trialLabel} numberOfLines={1}>{t('home.trialLabel')}</Text>
              <Text style={s.trialValue} numberOfLines={1}>
                {trialExpired ? t('home.trialExpired') : t('home.trialDays', { count: trialLeft })}
              </Text>
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Επόμενο ραντεβού (όπως στο web) ──────────────────────── */}
      {isAuthenticated && (
        <View style={[s.section, { paddingTop: space.lg }]}>
          <TouchableOpacity activeOpacity={0.8} style={s.booking}
            onPress={() => router.push((nextBooking ? '/bookings' : '/(tabs)/services') as any)}>
            <View style={s.bookingIcon}>
              <Calendar size={icon.sm} color={colors.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.trialLabel} numberOfLines={1}>{t('home.nextBooking')}</Text>
              {nextBooking ? (
                <>
                  <Text style={s.trialValue} numberOfLines={1}>
                    {nextBooking.service?.title || t('home.appointment')}
                  </Text>
                  {bookingWhen ? <Text style={s.bookingWhen} numberOfLines={1}>{bookingWhen}</Text> : null}
                </>
              ) : (
                <Text style={s.bookingWhen} numberOfLines={2}>{t('home.noBooking')}</Text>
              )}
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Τα κατοικίδιά μου ────────────────────────────────────────
          Πρώτα, γιατί είναι ο λόγος που ανοίγει κανείς την εφαρμογή. */}
      {isAuthenticated && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('home.my_pets')}</Text>
            {pets.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/pets' as any)} style={s.seeAllBtn}>
                <Text style={s.seeAll}>{t('marketplace.categories.all')}</Text>
                <ChevronRight size={icon.sm} color={colors.brand} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: space.md, paddingRight: space.lg, flexDirection: 'row', flexWrap: 'wrap' }}>
            {pets.slice(0, 6).map((p: any) => (
              <TouchableOpacity key={p.id} style={s.petCard} activeOpacity={0.8}
                onPress={() => router.push(`/pets/${p.id}` as any)}>
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
              {/* «Νέο» και όχι «Προσθήκη»: με μεγαλωμένα γράμματα στις
                  ρυθμίσεις του τηλεφώνου, η μεγάλη λέξη έσπαγε σε δύο
                  γραμμές κάτω από το κυκλικό εικονίδιο. */}
              <Text style={[s.petName, { color: colors.brand }]} numberOfLines={1}>{t('home.new')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Υπηρεσίες ────────────────────────────────────────────────
          Τρεις στήλες. Χωράνε ολόκληρες οι λέξεις στα 12px, και το
          πλακίδιο μεγαλώνει αρκετά ώστε να είναι εύκολος στόχος. */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('services.title')}</Text>
        <View style={s.serviceGrid}>
          {SERVICES.map(a => {
            const c = tint(a.key)
            return (
              <TouchableOpacity key={a.key} style={s.serviceTile} activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/services?type=${a.type}` as any)}>
                <View style={[s.serviceIcon, { backgroundColor: c.bg }]}>
                  <a.Icon size={22} color={c.fg ?? colors.navy} strokeWidth={2} />
                </View>
                <Text style={s.serviceLabel} numberOfLines={2}>{t(a.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── Λειτουργίες ──────────────────────────────────────────────
          Πλέγμα τριών, ίδιο μοτίβο με τις υπηρεσίες από πάνω. */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('home.for_your_pet')}</Text>
        {/* Πλέγμα τριών, όχι οριζόντια κύλιση.
            Η οριζόντια λίστα έκρυβε τα μισά: ο χρήστης δεν καταλαβαίνει
            ότι υπάρχει κι άλλο δεξιά, και στο Android η σκιά κοβόταν στα
            όρια του ScrollView. Εδώ φαίνονται όλα με μια ματιά. */}
        <View style={s.featureGrid}>
          {FEATURES.map(f => (
            <TouchableOpacity key={f.key} style={s.featureTile} activeOpacity={0.7}
              onPress={() => router.push(f.route as any)}>
              <View style={s.featureIcon}>
                <f.Icon size={20} color={colors.brand} strokeWidth={2} />
              </View>
              <Text style={s.featureLabel} numberOfLines={2}>{t(f.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Πάροχοι ──────────────────────────────────────────────────
          Σκελετοί αντί για κενό. Το μάτι έχει πού να σταθεί όσο φορτώνει,
          και η ίδια αναμονή μοιάζει συντομότερη. */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('home.top_providers')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services' as any)} style={s.seeAllBtn}>
            <Text style={s.seeAll}>{t('home.all')}</Text>
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
                    ⭐ {sv.rating?.toFixed(1) ?? '—'} · {t('home.reviews_count', { count: sv.reviews_count ?? 0 })}
                  </Text>
                </View>
                <Text style={s.providerPrice}>€{Number(sv.price ?? 0).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
      </View>

      {/* ── Προϊόντα ─────────────────────────────────────────────────
          Δύο ανά σειρά, όχι τρία — η φωτογραφία είναι αυτή που πουλάει. */}
      {products.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('home.recommended')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace' as any)} style={s.seeAllBtn}>
              <Text style={s.seeAll}>{t('marketplace.categories.all')}</Text>
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
                <Text style={s.productPrice}>€{effectivePrice(p).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Εγγραφή ──────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <View style={s.authBanner}>
          <Text style={s.authTitle}>{t('home.start_today')}</Text>
          <Text style={s.authSub}>{t('home.free_signup')}</Text>
          <View style={s.authBtns}>
            <TouchableOpacity style={s.authPrimary} activeOpacity={0.85}
              onPress={() => router.push('/auth/register' as any)}>
              <Text style={s.authPrimaryText}>{t('auth.register')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.authSecondary} activeOpacity={0.85}
              onPress={() => router.push('/auth/login' as any)}>
              <Text style={s.authSecondaryText}>{t('auth.sign_in')}</Text>
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
    // Σταθερό και ασφαλές: η κεφαλίδα μπορεί να αποδοθεί σε πολλά
    // σημεία της ίδιας οθόνης (συνδεδεμένος / αποσυνδεδεμένος χρήστης),
    // και inline παράκαμψη θα ίσχυε μόνο σε όποια θυμηθεί κανείς.
    paddingTop: HEADER_TOP,
    backgroundColor: colors.navy,
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
  trial: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: radius.lg, borderWidth: 1,
    backgroundColor: colors.surface,
  },
  trialActive: { borderColor: colors.warning },
  booking: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.borderLight, backgroundColor: colors.surface,
  },
  bookingIcon: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brandTint,
    alignItems: 'center', justifyContent: 'center',
  },
  bookingWhen: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, marginTop: 2 },
  trialExpired: { borderColor: colors.danger },
  trialIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  trialLabel: { ...type.caption, color: colors.textMuted },
  trialValue: { ...type.body, color: colors.text, fontWeight: weight.bold },
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
  // Μικρότερα: στα 64 το πλέγμα κυριαρχούσε και έσπρωχνε τα πάντα κάτω
  // από το πρώτο γέμισμα οθόνης.
  serviceIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.xs,
  },
  serviceLabel: {
    ...type.caption, fontSize: 12, lineHeight: 15,
    color: colors.text, fontWeight: weight.semibold,
    textAlign: 'center',
  },

  // Λειτουργίες
  // Ίδιο πλέγμα με τις υπηρεσίες: ο χρήστης μαθαίνει ένα μοτίβο, όχι δύο.
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  featureTile: { width: '33.33%', alignItems: 'center', paddingHorizontal: space.xs },
  featureIcon: {
    width: 46, height: 46, borderRadius: radius.lg,
    backgroundColor: colors.brandTint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.xs,
  },

  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.surface,
    paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: radius.full,
    minHeight: touch.min,
    ...shadow.sm,
  },
  featureLabel: {
    ...type.caption, fontSize: 12, lineHeight: 15,
    color: colors.text, fontWeight: weight.semibold,
    textAlign: 'center',
  },

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
