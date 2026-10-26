import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Lock, Info } from 'lucide-react-native'
import { api } from '@/lib/api'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { DateField, TimeField } from '@/components/DateField'
import { ymdToDate } from '@/lib/dates'
import { Chips } from '@/components/Chips'
import { hasMoneyAtStake } from '@/components/EventAttendees'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Νέα εκδήλωση ή επεξεργασία (?id=…) — ίδια φόρμα με το web
 * (web/src/components/features/events/EventFormModal.tsx).
 *
 * POST /events, PATCH /events/:id. Κάθε συνδεδεμένος χρήστης δημιουργεί· ο
 * διοργανωτής παίρνεται από τη σύνδεση. Υποχρεωτικά: τίτλος, ημερομηνία
 * (ΕΕΕΕ-ΜΜ-ΗΗ), ώρα (ΩΩ:ΛΛ, ώρα Ελλάδας), τοποθεσία, πόλη. Ημερομηνίες ως
 * κείμενο — καμία μετατροπή σε UTC. Τιμή μόνο σε ευρώ (δεν στέλνεται νόμισμα).
 * Με πληρωμένες συμμετοχές η ημερομηνία, η ώρα και η τιμή κλειδώνουν (ο
 * server απαντά 409 ούτως ή άλλως). Χωρητικότητα κενή = χωρίς όριο.
 *
 * Αρχείο στη ρίζα του app/ (όπως το event-confirmation): το expo-router το
 * καταχωρεί μόνο του στο Stack, χωρίς αλλαγή στο _layout.
 */
const EVENT_TYPES = ['meetup', 'show', 'adoption', 'training', 'charity', 'competition'] as const

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/
const HM = /^([01]\d|2[0-3]):[0-5]\d$/
const validYmd = (s: string) => {
  const m = YMD.exec(s)
  if (!m) return false
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]
}
// «Σήμερα» σε ώρα Ελλάδας, όπως ο server (routes/events.ts athensToday):
// με την τοπική ώρα της συσκευής, ένας χρήστης σε άλλη ζώνη (ή γύρω στα
// μεσάνυχτα) έβλεπε «παρελθούσα ημερομηνία» που ο server δεχόταν, ή το
// αντίστροφο. Χωρίς Intl/ζώνη → τοπική ημερομηνία, όπως πριν.
const todayYmd = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = (k: string) => parts.find(p => p.type === k)?.value
    const y = get('year'), m = get('month'), d = get('day')
    if (y && m && d) return `${y}-${m}-${d}`
  } catch { /* fallback πιο κάτω */ }
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY = {
  title: '', description: '', event_type: 'meetup', date: '', end_date: '', time: '',
  location: '', city: '', capacity: '', price: '', image_url: '',
}
const fromEvent = (e: any): typeof EMPTY => ({
  title: e.title ?? '', description: e.description ?? '', event_type: e.event_type ?? 'meetup',
  date: e.date ?? '', end_date: e.end_date ?? '', time: e.time ?? '',
  location: e.location ?? '', city: e.city ?? '',
  capacity: e.capacity != null ? String(e.capacity) : '',
  price: Number(e.price) > 0 ? String(e.price) : '',
  image_url: e.image_url ?? '',
})

export default function EventFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isNew = !id
  const { user, isAuthenticated } = useAuthStore()

  const { data: shown, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !isNew,
  })
  // Τίτλος/περιγραφή έρχονται μεταφρασμένα στη γλώσσα του χρήστη, τα πρωτότυπα
  // στο `_original`: η φόρμα επεξεργάζεται ΤΟ ΠΡΩΤΟΤΥΠΟ (όπως στο web).
  const event = shown ? { ...shown, ...(shown._original ?? {}) } : undefined
  // is_mine από τον server: το organizer_email δεν επιστρέφεται πια (ίδιο με το web).
  const isOrganizer = !!event && (event.is_mine === true || user?.role === 'admin')
  const { data: registrations = [], isLoading: regsLoading } = useQuery({
    queryKey: ['event-registrations', id],
    queryFn: () => api.get(`/events/${id}/registrations`).then(r => r.data?.data ?? []),
    enabled: !isNew && isOrganizer,
  })
  const lockTerms = !isNew && hasMoneyAtStake(registrations as any[])

  const [form, setForm] = useState(EMPTY)
  const [initial, setInitial] = useState(EMPTY)
  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }))
  useEffect(() => {
    if (!event) return
    const f = fromEvent(event)
    setForm(f); setInitial(f)
  }, [event?.id])

  const [uploading, setUploading] = useState(false)
  const pickImage = async () => {
    setUploading(true)
    try {
      // Ο server δεν έχει φάκελο «events»· ο γενικός είναι το «uploads».
      const url = await pickAndUploadImage('uploads')
      if (url) set('image_url', url)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('eventForm.errPermission') : (e?.response?.data?.message || t('common.something_wrong')))
    } finally {
      setUploading(false)
    }
  }

  // Ίδιοι έλεγχοι με το web· η μορφή ελέγχεται μόνο σε ό,τι άλλαξε.
  const changed = (k: keyof typeof EMPTY) => isNew || form[k] !== initial[k]
  const priceNum = form.price.trim() ? Number(form.price.trim().replace(',', '.')) : 0
  const capNum = form.capacity.trim() ? Number(form.capacity.trim()) : null
  const registered = Number(event?.registered_count ?? 0)
  const errors: string[] = []
  if (!form.title.trim() || !form.location.trim() || !form.city.trim() || !form.date || !form.time) errors.push(t('eventForm.errRequired'))
  if (form.date && changed('date') && !validYmd(form.date)) errors.push(t('eventForm.errDate'))
  if (form.date && isNew && validYmd(form.date) && form.date < todayYmd()) errors.push(t('eventForm.errPast'))
  if (form.time && changed('time') && !HM.test(form.time)) errors.push(t('eventForm.errTime'))
  if (form.end_date && (!validYmd(form.end_date) || (validYmd(form.date) && form.end_date < form.date))) errors.push(t('eventForm.errEndDate'))
  if (!Number.isFinite(priceNum) || priceNum < 0 || (form.price.trim() && !/^\d+([.,]\d{1,2})?$/.test(form.price.trim()))) errors.push(t('eventForm.errPrice'))
  if (priceNum > 0 && (!validYmd(form.date) || !HM.test(form.time))) errors.push(t('eventForm.errPaidFormat'))
  if (capNum != null && (!Number.isInteger(capNum) || capNum < 1)) errors.push(t('eventForm.errCapacity'))
  if (capNum != null && Number.isInteger(capNum) && capNum < registered) errors.push(t('eventForm.errCapacityBelow', { count: registered }))
  const showErrors = errors.length > 0 && !!(form.title || form.date || form.location)

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        end_date: form.end_date.trim() || null,
        location: form.location.trim(),
        city: form.city.trim(),
        capacity: capNum ?? '',
        image_url: form.image_url || null,
      }
      if (isNew || !lockTerms) {
        payload.date = form.date.trim()
        payload.time = form.time.trim()
        payload.price = priceNum
      }
      if (isNew) return api.post('/events', payload).then(r => r.data)
      const diff: any = {}
      for (const [k, v] of Object.entries(payload)) {
        const before = k === 'capacity' ? (event.capacity ?? '')
          : k === 'price' ? Number(event.price ?? 0)
          : k === 'end_date' || k === 'image_url' ? (event[k] || null)
          : (event[k] ?? '')
        if (v !== before) diff[k] = v
      }
      if (Object.keys(diff).length === 0) return event
      return api.patch(`/events/${id}`, diff).then(r => r.data)
    },
    onSuccess: (ev: any) => {
      qc.invalidateQueries({ queryKey: ['events'] })
      if (ev?.id) {
        qc.invalidateQueries({ queryKey: ['event', ev.id] })
        qc.invalidateQueries({ queryKey: ['event-registration', ev.id] })
        qc.invalidateQueries({ queryKey: ['event-registrations', ev.id] })
        qc.invalidateQueries({ queryKey: ['event-cancel-preview', ev.id] })
      }
      Alert.alert(isNew ? t('eventForm.created') : t('eventForm.updated'), ev?.title ?? '')
      if (isNew && ev?.id) router.replace(`/events/${ev.id}` as any)
      else router.back()
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const title = isNew ? t('eventForm.newTitle') : t('eventForm.editTitle')
  if (!isAuthenticated) return (
    <Screen title={title} back>
      <Card>
        <Text style={s.note}>{t('auth.login_to_continue')}</Text>
        <Button full label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />
      </Card>
    </Screen>
  )
  if (!isNew && (isLoading || (isOrganizer && regsLoading))) return <Screen title={title} back><Loading /></Screen>
  if (!isNew && (!event || !isOrganizer)) return (
    <Screen title={title} back><Card><Text style={s.note}>{t('eventForm.notAllowed')}</Text></Card></Screen>
  )

  const termsDisabled = !isNew && lockTerms
  return (
    <Screen title={title} back>
      <Card>
        <Input label={`${t('eventForm.title')} *`} value={form.title} onChangeText={v => set('title', v.slice(0, 200))} />
        <Chips label={t('eventForm.type')} value={form.event_type} onChange={v => set('event_type', v)}
          options={EVENT_TYPES.map(v => ({ value: v, label: t(`eventForm.types.${v}`) }))} />
        <Input label={t('eventForm.description')} value={form.description} multiline
          onChangeText={v => set('description', v.slice(0, 5000))} />

        {termsDisabled && (
          <View style={s.lock}>
            <Lock size={icon.xs} color="#B45309" />
            <Text style={s.lockTxt}>{t('eventForm.termsLocked')}</Text>
          </View>
        )}
        <View style={s.row2}>
          {/* Ε17: ημερολόγιο/ρολόι αντί για πληκτρολόγηση· οι τιμές μένουν YYYY-MM-DD / ΩΩ:ΛΛ. */}
          <DateField style={s.half} label={t('eventForm.date')} required value={form.date} disabled={termsDisabled}
            onChange={v => set('date', v)} minimumDate={isNew ? new Date() : undefined} />
          <TimeField style={s.half} label={t('eventForm.time')} required value={form.time} disabled={termsDisabled}
            onChange={v => set('time', v)} />
        </View>
        <DateField label={t('eventForm.endDate')} value={form.end_date} onChange={v => set('end_date', v)}
          minimumDate={ymdToDate(form.date)} clearable hint={t('eventForm.endDateHint')} />

        <Input label={`${t('eventForm.location')} *`} value={form.location} placeholder={t('eventForm.locationPlaceholder')}
          onChangeText={v => set('location', v.slice(0, 300))} />
        <Input label={`${t('eventForm.city')} *`} value={form.city} onChangeText={v => set('city', v.slice(0, 100))} />

        <View style={s.row2}>
          <Input style={s.half} label={t('eventForm.capacity')} value={form.capacity} keyboardType="number-pad"
            placeholder={t('eventForm.capacityPlaceholder')} onChangeText={v => set('capacity', v.replace(/[^\d]/g, ''))} />
          <Input style={s.half} label={`${t('eventForm.price')} (€)`} value={form.price} keyboardType="decimal-pad"
            editable={!termsDisabled} placeholder={t('eventForm.pricePlaceholder')} onChangeText={v => set('price', v)} />
        </View>
        <View style={s.info}>
          <Info size={icon.xs} color={colors.textMuted} />
          <Text style={s.infoTxt}>{t('eventForm.priceHint', { hours: 48 })}</Text>
        </View>

        <Text style={s.label}>{t('eventForm.image')}</Text>
        {!!form.image_url && <Image source={{ uri: form.image_url }} style={s.image} resizeMode="cover" />}
        <View style={s.imgActions}>
          <Button variant="secondary" size="sm" loading={uploading} disabled={uploading}
            icon={<ImagePlus size={icon.sm} color={colors.text} />}
            label={form.image_url ? t('eventForm.changeImage') : t('eventForm.addImage')} onPress={pickImage} />
          {!!form.image_url && (
            <Button variant="ghost" size="sm" label={t('common.remove')} onPress={() => set('image_url', '')} />
          )}
        </View>

        {showErrors && [...new Set(errors)].map(e => <Text key={e} style={s.error}>{e}</Text>)}

        <Button full style={{ marginTop: space.lg }}
          label={isNew ? t('eventForm.create') : t('common.save')}
          loading={save.isPending} disabled={save.isPending || uploading || errors.length > 0}
          onPress={() => save.mutate()} />
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  row2: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  label: { ...type.caption, fontWeight: weight.semibold, color: colors.textMuted, marginBottom: space.xs },
  image: { width: '100%', height: 160, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, marginBottom: space.sm },
  imgActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: -space.sm, marginBottom: space.lg },
  infoTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  lock: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm,
    borderRadius: radius.md, backgroundColor: colors.warningBg, marginBottom: space.md,
  },
  lockTxt: { ...type.caption, color: '#B45309', flex: 1 },
  error: { ...type.caption, color: colors.danger, marginTop: space.xs },
  note: { ...type.body, color: colors.textMuted, textAlign: 'center', marginBottom: space.md },
})
