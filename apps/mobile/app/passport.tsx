import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft, Syringe, Stethoscope, Activity, FileText,
  ShieldAlert, PawPrint,
} from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Ιατρικός φάκελος.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Δώδεκα καρτέλες σε οριζόντια σειρά. Για να φτάσεις στο «Διαβατήριο»
 *   έπρεπε να κυλήσεις σχεδόν όλη τη λίστα, και καμία δεν έλεγε πόσο
 *   περιεχόμενο έχει μέσα — άνοιγες τυφλά και τις περισσότερες τις έβρισκες
 *   άδειες.
 *
 *   Τέσσερις τώρα, ομαδοποιημένες κατά ερώτημα: ποιο είναι το ζώο, τι
 *   εμβόλια έχει, τι του έχει συμβεί, τι παρακολουθούμε. Κάθε καρτέλα
 *   δείχνει πόσες εγγραφές έχει.
 */

const emojiFor = (s: string) =>
  ({ dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', fish: '🐠', reptile: '🦎' } as any)[s] ?? '🐾'

const fmt = (d?: string | null) => {
  if (!d) return '—'
  const x = new Date(d)
  return isNaN(x.getTime()) ? d
    : x.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Ένα εμβόλιο είναι ληξιπρόθεσμο όταν περάσει η επόμενη ημερομηνία. */
const isOverdue = (next?: string | null) => {
  if (!next) return false
  const d = new Date(next)
  return !isNaN(d.getTime()) && d < new Date()
}

function Row({ title, subtitle, right, tone }: any) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowTitle, tone === 'warn' && { color: colors.warning }]} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && <Text style={s.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {!!right && <Text style={s.rowRight}>{right}</Text>}
    </View>
  )
}

function Card({ icon: Icon, title, count, children }: any) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Icon size={icon.md} color={colors.brand} />
        <Text style={s.cardTitle}>{title}</Text>
        {count != null && <Text style={s.count}>{count}</Text>}
      </View>
      {children}
    </View>
  )
}

const Empty = ({ text }: { text: string }) => (
  <Text style={s.emptyLine}>{text}</Text>
)

export default function PassportScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const { pet: petParam } = useLocalSearchParams<{ pet?: string }>()

  const [selectedPetId, setSelectedPetId] = useState<string | null>(petParam ?? null)
  const [tab, setTab] = useState<'identity' | 'vaccines' | 'medical' | 'watch'>('identity')
  const [refreshing, setRefreshing] = useState(false)

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const activePetId = selectedPetId || (pets.length === 1 ? pets[0]?.id : null)

  const { data: passport, isLoading } = useQuery({
    queryKey: ['passport', activePetId],
    queryFn: () => api.get(`/passport/${activePetId}`).then(r => r.data),
    enabled: !!activePetId,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['passport', activePetId] })
    setRefreshing(false)
  }, [qc, activePetId])

  const p = passport ?? {}
  const pet = p.pet
  const vaccinations = p.vaccinations ?? []
  const healthRecords = p.healthRecords ?? []
  const medications = p.medications ?? []
  const labResults = p.labResults ?? []
  const imaging = p.imaging ?? []
  const surgeries = p.surgeries ?? []
  const dental = p.dentalRecords ?? []
  const allergies = p.allergies ?? []
  const chronic = p.chronicConditions ?? []
  const weights = p.weightRecords ?? []
  const travel = p.travelDocs ?? []

  const medicalCount = healthRecords.length + medications.length + labResults.length
    + imaging.length + surgeries.length + dental.length
  const watchCount = allergies.length + chronic.length + weights.length
  const overdue = vaccinations.filter((v: any) => isOverdue(v.next_due_date))

  const TABS = [
    { id: 'identity', label: 'Ταυτότητα', count: null },
    { id: 'vaccines', label: 'Εμβόλια',   count: vaccinations.length },
    { id: 'medical',  label: 'Ιατρικά',   count: medicalCount },
    { id: 'watch',    label: 'Παρακολούθηση', count: watchCount },
  ] as const

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>Ιατρικός φάκελος</Text>
      </View>
      <View style={s.empty}>
        <FileText size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Συνδέσου για πρόσβαση</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>Ιατρικός φάκελος</Text>
      </View>

      {/* Επιλογή κατοικιδίου */}
      {pets.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.petRow} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
          {pets.map((x: any) => (
            <TouchableOpacity key={x.id} activeOpacity={0.7}
              style={[s.petChip, activePetId === x.id && s.petChipActive]}
              onPress={() => setSelectedPetId(x.id)}>
              <Text style={s.petEmoji}>{emojiFor(x.species)}</Text>
              <Text style={[s.petName, activePetId === x.id && s.petNameActive]}>{x.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!activePetId ? (
        <View style={s.empty}>
          <PawPrint size={icon.hero} color={colors.border} />
          <Text style={s.emptyTitle}>Διάλεξε κατοικίδιο</Text>
          <Text style={s.emptyText}>Ο φάκελος ανοίγει ανά ζώο.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.tabRow} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
            {TABS.map(t => (
              <TouchableOpacity key={t.id} activeOpacity={0.7}
                style={[s.tab, tab === t.id && s.tabActive]}
                onPress={() => setTab(t.id as any)}>
                <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
                {t.count != null && t.count > 0 && (
                  <View style={[s.tabCount, tab === t.id && s.tabCountActive]}>
                    <Text style={[s.tabCountText, tab === t.id && { color: '#fff' }]}>{t.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
            }>

            {/* Ό,τι χρειάζεται προσοχή, πριν από τις καρτέλες. */}
            {(overdue.length > 0 || allergies.length > 0) && (
              <View style={s.alerts}>
                {overdue.length > 0 && (
                  <TouchableOpacity style={s.alert} activeOpacity={0.7} onPress={() => setTab('vaccines')}>
                    <Syringe size={icon.sm} color={colors.warning} />
                    <Text style={s.alertText}>{overdue.length} εμβόλια εκκρεμούν</Text>
                  </TouchableOpacity>
                )}
                {allergies.length > 0 && (
                  <TouchableOpacity style={[s.alert, s.alertDanger]} activeOpacity={0.7}
                    onPress={() => setTab('watch')}>
                    <ShieldAlert size={icon.sm} color={colors.danger} />
                    <Text style={[s.alertText, { color: colors.danger }]}>
                      {allergies.length} αλλεργίες
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isLoading && <Text style={s.emptyLine}>Φόρτωση…</Text>}

            {tab === 'identity' && pet && (
              <>
                <View style={s.identity}>
                  <View style={s.avatar}>
                    {pet.image_url
                      ? <Image source={{ uri: pet.image_url }} style={s.avatarImg} />
                      : <Text style={s.avatarEmoji}>{emojiFor(pet.species)}</Text>}
                  </View>
                  <Text style={s.petTitle}>{pet.name}</Text>
                  <Text style={s.petSub}>{pet.breed || pet.species}</Text>
                </View>

                <Card icon={FileText} title="Στοιχεία">
                  {[
                    ['Είδος', pet.species],
                    ['Ράτσα', pet.breed],
                    ['Φύλο', pet.gender === 'male' ? 'Αρσενικό' : pet.gender === 'female' ? 'Θηλυκό' : null],
                    ['Ηλικία', pet.age ? `${pet.age} ετών` : null],
                    ['Βάρος', pet.weight ? `${pet.weight} kg` : null],
                    ['Χρώμα', pet.color],
                    ['Microchip', pet.microchip_number],
                    // Τρεις καταστάσεις: το null σημαίνει «κανείς δεν το είπε»
                    // και η γραμμή δεν εμφανίζεται καθόλου.
                    ['Στειρωμένο', pet.is_sterilized === true ? 'Ναι'
                      : pet.is_sterilized === false ? 'Όχι' : null],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <Row key={String(k)} title={String(k)} right={String(v)} />
                  ))}
                </Card>

                {travel.length > 0 && (
                  <Card icon={FileText} title="Διαβατήριο & ταξίδια" count={travel.length}>
                    {travel.map((t: any) => (
                      <Row key={t.id}
                        title={`${t.origin_city || ''} → ${t.destination_city || t.destination_country || ''}`}
                        subtitle={[t.travel_type, t.carrier].filter(Boolean).join(' · ')}
                        right={fmt(t.departure_date)} />
                    ))}
                  </Card>
                )}
              </>
            )}

            {tab === 'vaccines' && (
              <Card icon={Syringe} title="Εμβόλια" count={vaccinations.length}>
                {vaccinations.length === 0
                  ? <Empty text="Κανένα εμβόλιο καταχωρημένο" />
                  : vaccinations.map((v: any) => {
                      const due = isOverdue(v.next_due_date)
                      return (
                        <Row key={v.id}
                          title={v.vaccine_name}
                          subtitle={[`Χορηγήθηκε ${fmt(v.date_administered)}`, v.vet_name]
                            .filter(Boolean).join(' · ')}
                          right={v.next_due_date ? `${due ? '⚠ ' : ''}${fmt(v.next_due_date)}` : undefined}
                          tone={due ? 'warn' : undefined} />
                      )
                    })}
              </Card>
            )}

            {tab === 'medical' && (
              <>
                {medications.filter((m: any) => m.is_active).length > 0 && (
                  <Card icon={Activity} title="Ενεργή αγωγή">
                    {medications.filter((m: any) => m.is_active).map((m: any) => (
                      <Row key={m.id} title={m.name}
                        subtitle={[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                        right={fmt(m.start_date)} />
                    ))}
                  </Card>
                )}

                <Card icon={Stethoscope} title="Επισκέψεις" count={healthRecords.length}>
                  {healthRecords.length === 0
                    ? <Empty text="Καμία καταχώρηση" />
                    : healthRecords.map((h: any) => (
                        <Row key={h.id} title={h.title}
                          subtitle={[h.record_type, h.vet_name, h.clinic_name]
                            .filter(Boolean).join(' · ')}
                          right={fmt(h.date)} />
                      ))}
                </Card>

                {labResults.length > 0 && (
                  <Card icon={Activity} title="Εργαστηριακά" count={labResults.length}>
                    {labResults.map((l: any) => (
                      <Row key={l.id} title={l.test_name}
                        subtitle={l.result_summary} right={fmt(l.test_date)} />
                    ))}
                  </Card>
                )}

                {imaging.length > 0 && (
                  <Card icon={Activity} title="Απεικονιστικά" count={imaging.length}>
                    {imaging.map((im: any) => (
                      <Row key={im.id} title={im.imaging_type}
                        subtitle={im.findings} right={fmt(im.date)} />
                    ))}
                  </Card>
                )}

                {surgeries.length > 0 && (
                  <Card icon={Activity} title="Χειρουργεία" count={surgeries.length}>
                    {surgeries.map((sg: any) => (
                      <Row key={sg.id} title={sg.procedure_name}
                        subtitle={sg.surgeon_name} right={fmt(sg.date)} />
                    ))}
                  </Card>
                )}

                {dental.length > 0 && (
                  <Card icon={Activity} title="Οδοντιατρικά" count={dental.length}>
                    {dental.map((d: any) => (
                      <Row key={d.id} title={d.procedure}
                        subtitle={d.notes} right={fmt(d.date)} />
                    ))}
                  </Card>
                )}

                {medicalCount === 0 && <Empty text="Κανένα ιατρικό ιστορικό ακόμη" />}
              </>
            )}

            {tab === 'watch' && (
              <>
                {allergies.length > 0 && (
                  <Card icon={ShieldAlert} title="Αλλεργίες" count={allergies.length}>
                    {allergies.map((a: any) => (
                      <Row key={a.id} title={a.allergen}
                        subtitle={[a.reaction, a.treatment].filter(Boolean).join(' · ')}
                        right={a.severity} tone="warn" />
                    ))}
                  </Card>
                )}

                {chronic.length > 0 && (
                  <Card icon={Activity} title="Χρόνιες παθήσεις" count={chronic.length}>
                    {chronic.map((c: any) => (
                      <Row key={c.id} title={c.condition}
                        subtitle={[c.status, c.treatment_plan].filter(Boolean).join(' · ')}
                        right={fmt(c.diagnosed_date)} />
                    ))}
                  </Card>
                )}

                {weights.length > 0 && (
                  <Card icon={Activity} title="Βάρος" count={weights.length}>
                    {weights.slice(-10).reverse().map((w: any) => (
                      <Row key={w.id} title={`${w.weight_kg} kg`}
                        subtitle={w.notes} right={fmt(w.date)} />
                    ))}
                  </Card>
                )}

                {watchCount === 0 && <Empty text="Τίποτα υπό παρακολούθηση" />}
              </>
            )}
          </ScrollView>
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg,
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },

  petRow: { paddingVertical: space.lg, maxHeight: 68, flexGrow: 0 },
  petChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg, height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  petChipActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  petEmoji: { fontSize: 16 },
  petName: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  petNameActive: { color: colors.brand, fontWeight: weight.bold },

  tabRow: { paddingVertical: space.md, maxHeight: 62, flexGrow: 0 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg, height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  tabTextActive: { color: '#fff', fontWeight: weight.bold },
  tabCount: {
    minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { ...type.caption, color: colors.textMuted, fontWeight: weight.bold, textAlign: 'center' },

  alerts: { flexDirection: 'row', gap: space.sm, marginBottom: space.md, flexWrap: 'wrap' },
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    backgroundColor: colors.warningBg,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.full,
  },
  alertDanger: { backgroundColor: colors.dangerBg },
  alertText: { ...type.caption, color: colors.warning, fontWeight: weight.bold },

  identity: { alignItems: 'center', marginBottom: space.lg },
  avatar: {
    width: 96, height: 96, borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.sm,
  },
  avatarImg: { width: 96, height: 96 },
  avatarEmoji: { fontSize: 44 },
  petTitle: { ...type.title, color: colors.text, fontWeight: weight.bold, marginTop: space.md },
  petSub: { ...type.body, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  cardTitle: { flex: 1, ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  count: {
    ...type.caption, color: colors.textMuted, fontWeight: weight.bold,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.sm, paddingVertical: 2,
    borderRadius: radius.full,
  },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  rowSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  rowRight: { ...type.caption, color: colors.textMuted },

  emptyLine: { ...type.body, color: colors.textLight, textAlign: 'center', paddingVertical: space.xl },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  primaryBtn: {
    height: touch.comfortable, paddingHorizontal: space.xxxl,
    borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
})
