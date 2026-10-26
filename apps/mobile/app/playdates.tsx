import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Image, Alert, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, MapPin, Calendar, Clock, Users, Plus, Trash2, Check, X, UserPlus, Navigation, Info, LocateFixed } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, SectionHeader, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'
import { DateField, TimeField } from '@/components/DateField'
import { ServiceLocationField } from '@/components/ServiceLocationField'
import { fmtDateShort } from '@/lib/dates'

/**
 * Βόλτες και συναντήσεις.
 *
 * ΔΥΟ ΠΡΑΓΜΑΤΑ ΠΟΥ ΔΕΝ ΔΟΥΛΕΥΑΝ
 *   Η οθόνη διάβαζε `r.data?.data`. Το endpoint επιστρέφει
 *   `{ events, nearbyOwners }` — δηλαδή `data.data` ήταν πάντα undefined
 *   και η λίστα πάντα άδεια. Έδειχνε «Δεν υπάρχουν playdates» ακόμα κι
 *   όταν υπήρχαν δεκάδες.
 *
 *   Και το «Συμμετοχή» καλούσε POST /playdates/:id/join, που δεν υπήρχε —
 *   οι βόλτες δούλευαν μόνο με πρόσκληση από τον δημιουργό. Το endpoint
 *   προστέθηκε στο backend· εδώ ενεργοποιείται.
 *
 * Οι συμμετέχοντες μετριούνται από τις αποδεκτές προσκλήσεις που ήδη
 * επιστρέφει το endpoint, αντί για το `participants_count` που δεν υπάρχει
 * ως πεδίο και έδειχνε πάντα μηδέν.
 */

const TYPE_EMOJI: Record<string, string> = {
  walk: '🚶', play: '🎾', meetup: '🐾', training: '🎓', other: '✨',
}
// Ίδιοι τύποι και είδη κατοικίδιων με το web (Playdates.tsx).
const EVENT_TYPES = ['walk', 'play', 'meetup', 'training', 'other']
const PET_TYPES = ['dog', 'cat', 'rabbit', 'bird', 'other']
const PET_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' }

// Ε17 — ημερομηνία με fmtDateShort (π.χ. 15/03/2026), όπως όλη η εφαρμογή.
const fmtDate = (d: string | undefined, lang: string) => (d ? fmtDateShort(d, lang) : '—')

/**
 * Ε17 — «Λεπτομέρειες σημείου» χωρίς αλλαγή σχήματος: αποθηκεύονται στο ίδιο
 * πεδίο location, μετά τη διεύθυνση, με διαχωριστικό ' · ' (ίδιο στο web).
 * Παλιές βόλτες χωρίς διαχωριστικό: όλο το κείμενο είναι η διεύθυνση.
 */
const LOC_SEP = ' · '
const splitLocation = (loc: string | null | undefined) => {
  const v = String(loc ?? '')
  const i = v.indexOf(LOC_SEP)
  return i < 0 ? { address: v, details: '' } : { address: v.slice(0, i), details: v.slice(i + LOC_SEP.length) }
}
const joinLocation = (address: string, details: string) => {
  // Το διαχωριστικό δεν επιτρέπεται μέσα στη διεύθυνση, για να χωρίζει σωστά.
  const a = address.trim().split(LOC_SEP).join(', ')
  const d = details.trim()
  return d ? `${a}${LOC_SEP}${d}` : a
}
/** Οδηγίες: με συντεταγμένες όταν υπάρχουν, αλλιώς αναζήτηση της διεύθυνσης. */
const directionsUrl = (ev: any) => {
  const lat = Number(ev?.latitude), lng = Number(ev?.longitude)
  if (ev?.latitude != null && ev?.longitude != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  const q = [splitLocation(ev?.location).address, ev?.city].map(x => String(x ?? '').trim()).filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
const isPosInt = (v: string) => /^\d+$/.test(v.trim()) && parseInt(v, 10) > 0
// Ίδια στρογγυλοποίηση με την εύρεση από διεύθυνση (ServiceLocationField).
const round6 = (n: number) => Math.round(n * 1e6) / 1e6
/** Ε18 — όριο αναμονής για τη θέση GPS. */
const GPS_TIMEOUT_MS = 15_000

export default function PlaydatesScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  /**
   * Δημιουργία και διαγραφή βόλτας.
   *
   * Το κινητό μόνο συμμετείχε σε υπάρχουσες. Ο χρήστης που ήθελε να
   * οργανώσει βόλτα έπρεπε να ανοίξει υπολογιστή — για κάτι που γίνεται
   * με το τηλέφωνο στο χέρι, στο πάρκο.
   */
  const [creating, setCreating] = useState(false)
  const [pTitle, setPTitle] = useState('')
  // Αύριο, από τοπικά έτος/μήνα/ημέρα (το toISOString είναι UTC).
  const [pDate, setPDate] = useState(() => {
    const d = new Date(Date.now() + 864e5)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [pTime, setPTime] = useState('18:00')
  // Ε17 — ίδια πεδία με το web: τύπος, περιγραφή, διάρκεια, είδη κατοικίδιων.
  const [pType, setPType] = useState('meetup')
  const [pDesc, setPDesc] = useState('')
  const [pDuration, setPDuration] = useState('60')
  const [pPets, setPPets] = useState<string[]>([])
  // Σημείο συνάντησης: διεύθυνση → εύρεση (/geocode) → συντεταγμένες + πόλη.
  const [pAddress, setPAddress] = useState('')
  const [pDetails, setPDetails] = useState('')
  const [pLat, setPLat] = useState<number | null>(null)
  const [pLng, setPLng] = useState<number | null>(null)
  const [pAutoCity, setPAutoCity] = useState('')
  // Πόλη με το χέρι μόνο όταν δεν προέκυψε από τη διεύθυνση· προσυμπλήρωση
  // με την πόλη του προφίλ (τη χρησιμοποιεί η λίστα «κοντά σου»).
  const [pCity, setPCity] = useState(user?.city ?? '')
  const [pMax, setPMax] = useState('')
  // Σφάλματα ανά πεδίο μετά την πρώτη προσπάθεια αποθήκευσης (όχι σιωπηλά
  // απενεργοποιημένο κουμπί).
  const [pTried, setPTried] = useState(false)

  const pErrors: Record<string, string> = {}
  if (pTitle.trim().length < 2) pErrors.title = t('play.err.title')
  if (!pDate) pErrors.date = t('play.err.date')
  if (!pTime) pErrors.time = t('play.err.time')
  if (!pAddress.trim()) pErrors.address = t('play.err.address')
  // Πόλη: ΧΩΡΙΣ υποχρεωτικό έλεγχο εδώ — κενή → ο server βάζει την πόλη του
  // προφίλ· αν λείπει κι αυτή, απαντά 400 «Συμπλήρωσε την πόλη της βόλτας»
  // (εμφανίζεται από το onError). Ίδιο με το web.
  if (pDuration.trim() && !isPosInt(pDuration)) pErrors.duration = t('play.err.number')
  if (pMax.trim() && !isPosInt(pMax)) pErrors.max = t('play.err.number')
  const errOf = (k: string) => (pTried ? pErrors[k] : undefined)
  const req = (label: string) => `${label} *`

  const resetCreate = () => {
    setPTitle(''); setPType('meetup'); setPDesc(''); setPDuration('60'); setPPets([])
    setPAddress(''); setPDetails(''); setPLat(null); setPLng(null); setPAutoCity(''); setLocFilled(false)
    setPMax(''); setPCity(user?.city ?? ''); setPTried(false)
  }
  const closeCreate = () => { setCreating(false); setPTried(false) }

  /**
   * Ε18 — «Χρήση της τοποθεσίας μου»: GPS → GET /geocode/reverse → σημείο
   * συνάντησης, πόλη, συντεταγμένες, με τον ίδιο τρόπο που τα γεμίζει η
   * «Εύρεση από διεύθυνση» (setPLat/setPLng με round6, αυτόματη πόλη).
   *
   * Το expo-location φορτώνεται ΤΕΜΠΕΛΙΚΑ εδώ (require σε try/catch): μια
   * εγκατεστημένη έκδοση χωρίς το native module δεν σκάει στο άνοιγμα — απλώς
   * ζητά ενημέρωση της εφαρμογής όταν πατηθεί το κουμπί.
   */
  const [locating, setLocating] = useState(false)
  // Νέο key στο ServiceLocationField ώστε να μη μείνει παλιό «βρέθηκε: …».
  const [locKey, setLocKey] = useState(0)
  // Σύντομη επιβεβαίωση κάτω από το κουμπί (όπως το toast του web) — μέχρι να αλλάξει η διεύθυνση.
  const [locFilled, setLocFilled] = useState(false)
  const fillFromMyLocation = async () => {
    if (locating) return
    let Location: typeof import('expo-location')
    try {
      Location = require('expo-location')
    } catch {
      Alert.alert(t('common.error'), t('playLocate.needsUpdate'))
      return
    }
    setLocating(true)
    setLocFilled(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      let granted = false
      try {
        granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted'
      } catch {
        Alert.alert(t('common.error'), t('playLocate.needsUpdate'))
        return
      }
      if (!granted) {
        Alert.alert(t('playLocate.deniedTitle'), t('playLocate.denied'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('account.openSettings'), onPress: () => { Linking.openSettings().catch(() => {}) } },
        ])
        return
      }
      if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
        Alert.alert(t('common.error'), t('playLocate.servicesOff'))
        return
      }
      let pos: { coords: { latitude: number; longitude: number } }
      try {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), GPS_TIMEOUT_MS) }),
        ])
      } catch {
        Alert.alert(t('common.error'), t('playLocate.timeout'))
        return
      }
      try {
        const r = await api.get('/geocode/reverse', {
          params: { lat: round6(pos.coords.latitude), lon: round6(pos.coords.longitude) },
        })
        const d = r.data?.data ?? r.data ?? {}
        if (!String(d.display_name || '').trim()) {
          Alert.alert(t('common.error'), t('playLocate.notFound'))
          return
        }
        const lat = Number(d.lat ?? pos.coords.latitude), lon = Number(d.lon ?? pos.coords.longitude)
        // Πρώτα η διεύθυνση (όχι onAddressChange: θα έσβηνε τις νέες συντεταγμένες).
        setPAddress(String(d.display_name || ''))
        setPLat(round6(lat)); setPLng(round6(lon))
        setPAutoCity(String(d.city || '').trim())
        setLocKey(k => k + 1)
        setLocFilled(true)
      } catch (e: any) {
        const st = e?.response?.status
        Alert.alert(t('common.error'),
          st === 404 ? t('playLocate.notFound')
          : st === 503 ? t('playLocate.busy')
          : t('playLocate.error'))
      }
    } finally {
      if (timer) clearTimeout(timer)
      setLocating(false)
    }
  }

  // Νέα διεύθυνση μετά από εύρεση: οι παλιές συντεταγμένες/πόλη δεν ισχύουν πια.
  const onAddressChange = (v: string) => {
    setPAddress(v)
    setLocFilled(false)
    if (pLat != null || pAutoCity) { setPLat(null); setPLng(null); setPAutoCity('') }
  }

  const createPlaydate = useMutation({
    mutationFn: () => api.post('/playdates', {
      title: pTitle.trim(),
      description: pDesc.trim() || undefined,
      event_type: pType,
      date: pDate,
      time: pTime,
      duration_minutes: pDuration.trim() ? parseInt(pDuration, 10) : undefined,
      // Διεύθυνση + «Λεπτομέρειες σημείου» στο ίδιο πεδίο (βλ. joinLocation).
      location: joinLocation(pAddress, pDetails),
      // Αυτόματη πόλη από τη διεύθυνση· αλλιώς ό,τι έγραψε ο χρήστης· αν
      // μείνει κενή, ο server βάζει την πόλη του προφίλ.
      city: pAutoCity || pCity.trim() || undefined,
      latitude: pLat ?? undefined,
      longitude: pLng ?? undefined,
      max_participants: pMax.trim() ? parseInt(pMax, 10) : undefined,
      pet_types: pPets,
      is_public: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates'] })
      qc.invalidateQueries({ queryKey: ['playdates-mine'] })
      setCreating(false); resetCreate()
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })
  const submitCreate = () => {
    setPTried(true)
    if (Object.keys(pErrors).length) return
    createPlaydate.mutate()
  }
  const openDirections = (ev: any) => Linking.openURL(directionsUrl(ev))
    .catch(() => Alert.alert(t('common.error'), t('svcLocation.openMapsFailed')))

  const removePlaydate = useMutation({
    mutationFn: (pid: string) => api.delete(`/playdates/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  /**
   * Δικές μου βόλτες και προσκλήσεις.
   *
   * Το /playdates δείχνει τις δημόσιες κοντά· το /playdates/my δείχνει
   * όσες διοργανώνει ο χρήστης και τις προσκλήσεις που έλαβε. Χωρίς αυτό,
   * μια πρόσκληση δεν έφτανε ποτέ στον παραλήπτη.
   */
  const { data: mine } = useQuery({
    queryKey: ['playdates-mine'],
    queryFn: () => api.get('/playdates/my').then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated,
  })
  // Μόνο όσες περιμένουν απάντηση: το /playdates/my επιστρέφει και τις ήδη
  // αποδεκτές/απορριφθείσες, και τις συμμετοχές του ίδιου (accepted), που
  // εμφανίζονταν ξανά με κουμπιά αποδοχής/απόρριψης.
  const invitations: any[] = (mine?.invitations ?? mine?.received ?? [])
    .filter((i: any) => !i.status || i.status === 'pending')

  const respondInvite = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/playdates/invitation/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates-mine'] })
      qc.invalidateQueries({ queryKey: ['playdates'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const [invitingFor, setInvitingFor] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  // Προαιρετικό μήνυμα πρόσκλησης — το backend το δέχεται (έως 500
  // χαρακτήρες) και το web το στέλνει.
  const [inviteMsg, setInviteMsg] = useState('')
  // Ιδιοκτήτης από τη λίστα «κοντά σου»: στέλνεται με invitee_id, αφού το
  // endpoint δεν επιστρέφει πια email.
  const [inviteOwner, setInviteOwner] = useState<any>(null)
  const closeInvite = () => { setInvitingFor(null); setInviteOwner(null) }

  const sendInvite = useMutation({
    // Το backend δέχεται invitee_id ή invitee_email — όχι `email`, που
    // γύριζε πάντα 400 «Λείπει ο παραλήπτης».
    mutationFn: () => api.post(`/playdates/${invitingFor.id}/invite`,
      inviteOwner
        ? { invitee_id: inviteOwner.id, message: inviteMsg.trim() || undefined }
        : { invitee_email: inviteEmail.trim(), message: inviteMsg.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates-mine'] })
      closeInvite(); setInviteEmail(''); setInviteMsg('')
      Alert.alert(t('play.inviteSent'), t('play.inviteSentHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['playdates'],
    // Το σχήμα είναι { events, nearbyOwners, userCity } — όχι { data }.
    queryFn: () => api.get('/playdates').then(r => r.data),
  })

  const events = data?.events ?? []
  const nearby = data?.nearbyOwners ?? []

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    // Ο interceptor απορρίπτει με το σφάλμα του axios: το e.message είναι
    // «Request failed with status code…». Το μήνυμα του server είναι στο response.
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('play.join_failed')),
  })

  const leave = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('play.leave_failed')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['playdates'] })
    setRefreshing(false)
  }, [qc])

  /** Συμμετέχω αν είμαι στις αποδεκτές προσκλήσεις (is_me από τον server — τα email δεν επιστρέφονται πια). */
  const amIn = (ev: any) =>
    (ev.invitations ?? []).some((i: any) => i.is_me === true)

  return (
    <Screen title={t('community.walks_meetups')}
      subtitle={data?.userCity ? t('play.near_city', { city: data.userCity }) : undefined}
      onRefresh={onRefresh} refreshing={refreshing}>
      <CampaignBanner page="playdates" slot="banner" />
      {invitations.length > 0 && (
        <Card style={{ marginBottom: space.md }}>
          <Text style={s.sectionTitle}>{t('play.invitations')}</Text>
          {invitations.map((inv: any) => (
            <View key={inv.id} style={s.inviteRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.inviteTitle} numberOfLines={1}>
                  {inv.event?.title ?? inv.title ?? t('play.invitation')}
                </Text>
                <Text style={s.inviteMeta} numberOfLines={1}>
                  {fmtDate(inv.event?.date ?? inv.date, i18n.language)} {inv.event?.time ?? inv.time}
                </Text>
                {!!inv.message && (
                  <Text style={s.inviteMsg} numberOfLines={3}>“{inv.message}”</Text>
                )}
              </View>
              {!!inv.event && (
                <TouchableOpacity style={s.navBtn} accessibilityLabel={t('play.directions')}
                  onPress={() => openDirections(inv.event)}>
                  <Navigation size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.accept}
                onPress={() => respondInvite.mutate({ id: inv.id, status: 'accepted' })}>
                <Check size={16} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={s.decline}
                onPress={() => respondInvite.mutate({ id: inv.id, status: 'declined' })}>
                <X size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      <Button label={t('play.create')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => setCreating(true)} full style={{ marginBottom: space.md }} />


      {isLoading ? (
        <SkeletonRows count={3} height={130} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={t('play.none')}
          message={t('play.create_first')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {events.map((ev: any) => {
            const joined = amIn(ev)
            const accepted = (ev.invitations ?? []).length
            const full = ev.max_participants && accepted >= ev.max_participants
            const mine = ev.is_mine === true
            const loc = splitLocation(ev.location)
            return (
              <Card key={ev.id}>
                <View style={s.head}>
                  <View style={s.iconBox}>
                    <Text style={s.emoji}>{TYPE_EMOJI[ev.event_type] ?? '🐾'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.titleRow}>
                      <Text style={s.title} numberOfLines={1}>{ev.title}</Text>
                      {mine && <Badge label={t('play.mine')} tone="brand" />}
                    </View>
                    <View style={s.metaRow}>
                      <MapPin size={icon.xs} color={colors.textLight} />
                      <Text style={[s.meta, s.metaFlex]} numberOfLines={1}>
                        {[loc.address, ev.city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    {!!loc.details && (
                      <View style={s.metaRow}>
                        <Info size={icon.xs} color={colors.textLight} />
                        <Text style={[s.meta, s.metaFlex]} numberOfLines={2}>{loc.details}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={s.metaRow}>
                  <Calendar size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>{fmtDate(ev.date, i18n.language)}</Text>
                  {!!ev.time && (
                    <>
                      <Clock size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta}>{ev.time}</Text>
                    </>
                  )}
                  <Users size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>
                    {accepted}{ev.max_participants ? `/${ev.max_participants}` : ''}
                  </Text>
                </View>

                {!!ev.description && (
                  <Text style={s.desc} numberOfLines={3}>{ev.description}</Text>
                )}

                {/* Ποιοι έχουν δηλώσει ήδη — ένας αριθμός δεν λέει με ποιον
                    θα βρεθείς. */}
                {accepted > 0 && (
                  <Text style={s.who} numberOfLines={1}>
                    {(ev.invitations ?? [])
                      .map((i: any) => i.pet_name || i.invitee_name)
                      .filter(Boolean).slice(0, 4).join(' · ')}
                  </Text>
                )}

                <Button label={t('play.directions')} size="sm" variant="secondary" full
                  icon={<Navigation size={icon.sm} color={colors.text} />}
                  onPress={() => openDirections(ev)} style={{ marginTop: space.md }} />

                {isAuthenticated && !mine && (
                  <Button
                    label={joined ? t('play.leave') : full ? t('play.full') : t('play.join')}
                    variant={joined ? 'secondary' : 'primary'}
                    size="sm"
                    full
                    disabled={!joined && !!full}
                    loading={(join.isPending && join.variables === ev.id) || (leave.isPending && leave.variables === ev.id)}
                    onPress={() => joined ? leave.mutate(ev.id) : join.mutate(ev.id)}
                    style={{ marginTop: space.sm }}
                  />
                )}
                {/* Ο διοργανωτής: πρόσκληση και διαγραφή, όπως στο web. Πριν, το
                    παράθυρο πρόσκλησης δεν άνοιγε από πουθενά. */}
                {isAuthenticated && mine && (
                  <View style={s.sheetActions}>
                    <Button label={t('play.invitation')} size="sm" variant="secondary"
                      icon={<UserPlus size={icon.sm} color={colors.text} />}
                      onPress={() => { setInviteOwner(null); setInvitingFor(ev) }} style={{ flex: 1 }} />
                    <Button label={t('common.delete')} size="sm" variant="secondary"
                      icon={<Trash2 size={icon.sm} color={colors.danger} />}
                      loading={removePlaydate.isPending && removePlaydate.variables === ev.id}
                      onPress={() => Alert.alert(t('common.delete'), t('play.deleteQ', { title: ev.title }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: () => removePlaydate.mutate(ev.id) },
                      ])} style={{ flex: 1 }} />
                  </View>
                )}
                {!isAuthenticated && (
                  <Button label={t('play.login_join')} variant="secondary" size="sm" full
                    onPress={() => router.push('/auth/login' as any)}
                    style={{ marginTop: space.sm }} />
                )}
              </Card>
            )
          })}
        </View>
      )}

      {/* Ιδιοκτήτες κοντά — χωρίς email, το endpoint δεν το επιστρέφει πια. */}
      {nearby.length > 0 && (
        <>
          <SectionHeader title={t('play.near_you')} />
          <View style={s.ownerRow}>
            {nearby.slice(0, 8).map((o: any) => (
              <TouchableOpacity key={o.id} style={s.owner} disabled={!isAuthenticated}
                onPress={() => {
                  const own = events.filter((e: any) => e.is_mine === true)
                  if (!own.length) { Alert.alert(t('play.invite'), t('play.createEventFirst')); return }
                  setInviteOwner(o); setInvitingFor(own[0])
                }}>
                <View style={s.ownerAvatar}>
                  {o.profile_photo
                    ? <Image source={{ uri: o.profile_photo }} style={s.ownerImg} />
                    : <Text style={s.ownerInitial}>
                        {o.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>}
                </View>
                <Text style={s.ownerName} numberOfLines={1}>
                  {o.full_name?.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <Modal visible={creating} transparent animationType="slide" onRequestClose={closeCreate}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('play.create')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.reqNote}>{t('play.f.requiredNote')}</Text>
              <Input label={req(t('play.f.title'))} value={pTitle} onChangeText={setPTitle}
                placeholder={t('play.f.titlePh')} error={errOf('title')} />

              <Text style={s.fieldLabel}>{t('play.f.type')}</Text>
              <View style={[s.chips, s.group]}>
                {EVENT_TYPES.map(v => (
                  <TouchableOpacity key={v} onPress={() => setPType(v)}
                    style={[s.chip, pType === v && s.chipOn]} accessibilityState={{ selected: pType === v }}>
                    <Text style={[s.chipText, pType === v && s.chipTextOn]}>{TYPE_EMOJI[v]} {t(`play.types.${v}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.rowTwo}>
                <View style={{ flex: 1 }}>
                  <DateField label={t('play.f.date')} required value={pDate} onChange={setPDate}
                    minimumDate={new Date()} error={errOf('date')} />
                </View>
                <View style={{ flex: 1 }}>
                  <TimeField label={t('play.f.time')} required value={pTime} onChange={setPTime} error={errOf('time')} />
                </View>
              </View>

              <Input label={req(t('play.location'))} value={pAddress} onChangeText={onAddressChange}
                placeholder={t('play.f.addressPh')} error={errOf('address')} />
              <Button full size="sm" variant="secondary"
                label={locating ? t('playLocate.locating') : t('playLocate.useMyLocation')}
                icon={<LocateFixed size={icon.sm} color={colors.text} />}
                loading={locating} disabled={locating}
                onPress={fillFromMyLocation} style={locFilled ? { ...s.locateBtn, marginBottom: space.xs } : s.locateBtn} />
              {locFilled && <Text style={s.locFilled}>{t('playLocate.filled')}</Text>}
              <ServiceLocationField
                key={locKey}
                address={pAddress}
                // Χωρίς αυτόματη πόλη: η πόλη που έγραψε ο χρήστης βοηθά την εύρεση.
                city={pAutoCity ? undefined : pCity}
                country="gr"
                latitude={pLat}
                longitude={pLng}
                title={t('play.f.mapTitle')}
                hint={t('play.f.mapHint')}
                notSet={t('play.f.mapNotSet')}
                onChange={c => {
                  setPLat(c.latitude); setPLng(c.longitude)
                  if (c.latitude == null) setPAutoCity('')
                }}
                onFound={r => setPAutoCity(r.city.trim())} />
              {pAutoCity ? (
                <Text style={s.autoCity}>{t('play.f.cityAuto', { city: pAutoCity })}</Text>
              ) : (
                <Input label={t('common.city')} value={pCity} onChangeText={setPCity}
                  hint={t('play.f.cityHint')} />
              )}
              <Input label={t('play.f.details')} value={pDetails} onChangeText={setPDetails}
                placeholder={t('play.f.detailsPh')} />

              <Input label={t('play.f.description')} value={pDesc} onChangeText={setPDesc}
                placeholder={t('play.f.descriptionPh')} multiline />

              <View style={s.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Input label={t('play.f.duration')} value={pDuration} onChangeText={setPDuration}
                    keyboardType="number-pad" placeholder="60" error={errOf('duration')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label={t('play.maxParticipants')} value={pMax} onChangeText={setPMax}
                    keyboardType="number-pad" placeholder={t('play.f.maxPh')} error={errOf('max')} />
                </View>
              </View>

              <View style={s.group}>
                <Text style={s.fieldLabel}>{t('play.f.petTypes')}</Text>
                <View style={s.chips}>
                  {PET_TYPES.map(v => {
                    const on = pPets.includes(v)
                    return (
                      <TouchableOpacity key={v} accessibilityState={{ selected: on }}
                        onPress={() => setPPets(p => on ? p.filter(x => x !== v) : [...p, v])}
                        style={[s.chip, on && s.chipOn]}>
                        <Text style={[s.chipText, on && s.chipTextOn]}>{PET_EMOJI[v]} {t(`play.petTypes.${v}`)}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <Text style={s.chipsHint}>{t('play.f.petTypesHint')}</Text>
              </View>
            </ScrollView>
            {pTried && Object.keys(pErrors).length > 0 && (
              <Text style={s.errSummary}>{t('play.err.summary')}</Text>
            )}
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={closeCreate} style={{ flex: 1 }} />
              <Button label={t('common.save')}
                disabled={createPlaydate.isPending}
                loading={createPlaydate.isPending}
                onPress={submitCreate} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invitingFor} transparent animationType="slide" onRequestClose={closeInvite}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('play.invite')}</Text>
            <Text style={s.inviteMeta}>{invitingFor?.title}</Text>
            {inviteOwner ? (
              <Text style={s.inviteTitle}>{t('play.inviteTo', { name: inviteOwner.full_name })}</Text>
            ) : (
              <Input label={t('common.email')} value={inviteEmail} onChangeText={setInviteEmail}
                keyboardType="email-address" autoCapitalize="none" />
            )}
            <Input label={t('play.messageOptional')} value={inviteMsg} onChangeText={setInviteMsg}
              placeholder={t('play.messagePlaceholder')} multiline />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={closeInvite} style={{ flex: 1 }} />
              <Button label={t('play.send')}
                disabled={(!inviteOwner && !inviteEmail.includes('@')) || sendInvite.isPending}
                loading={sendInvite.isPending}
                onPress={() => sendInvite.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  )
}

const s = StyleSheet.create({
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  inviteTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  inviteMeta: { ...type.caption, color: colors.textLight },
  inviteMsg: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  accept: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  decline: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  reqNote: { ...type.caption, color: colors.textLight, marginBottom: space.md },
  // Ίδια ετικέτα με το Input του ui.tsx.
  fieldLabel: { ...type.caption, fontWeight: weight.semibold, color: colors.textMuted, marginBottom: space.xs },
  group: { marginBottom: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chipsHint: { ...type.caption, color: colors.textLight, marginTop: space.xs },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...type.caption, color: colors.text, fontWeight: weight.medium },
  chipTextOn: { color: colors.textOnDark },
  errSummary: { ...type.caption, color: colors.danger },
  autoCity: { ...type.caption, color: colors.textMuted, marginBottom: space.lg },
  // Κάτω από το πεδίο διεύθυνσης (Input: marginBottom lg) — πιο κοντά σε αυτό, lg πριν από τον χάρτη.
  locateBtn: { marginTop: -space.sm, marginBottom: space.lg },
  // Επιβεβαίωση κάτω από το κουμπί: xs από αυτό, lg πριν από τον χάρτη (ίδιο κενό με χωρίς αυτήν).
  locFilled: { ...type.caption, color: '#047857', marginBottom: space.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.sm, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '88%' },
  sheetTitle: { ...type.section, color: colors.text },
  sheetActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  rowTwo: { flexDirection: 'row', gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  iconBox: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textMuted, marginRight: space.sm },
  metaFlex: { flex: 1, marginRight: 0 },

  desc: { ...type.body, color: colors.textMuted, marginTop: space.sm, lineHeight: 21 },
  who: { ...type.caption, color: colors.textLight, marginTop: space.sm },

  ownerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  owner: { alignItems: 'center', width: 68 },
  ownerAvatar: {
    width: 56, height: 56, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: space.xs,
  },
  ownerImg: { width: 56, height: 56 },
  ownerInitial: { ...type.emphasis, color: colors.textMuted, fontWeight: weight.bold },
  ownerName: { ...type.caption, color: colors.text, textAlign: 'center' },
})
