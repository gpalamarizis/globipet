import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

const TABS = [
  { id: 'identity',  label: '📋 Ταυτότητα' },
  { id: 'vaccines',  label: '💉 Εμβόλια' },
  { id: 'health',    label: '🩺 Εξετάσεις' },
  { id: 'meds',      label: '💊 Φάρμακα' },
  { id: 'lab',       label: '🧪 Εργαστήριο' },
  { id: 'imaging',   label: '🔬 Απεικόνιση' },
  { id: 'surgery',   label: '🔪 Χειρουργεία' },
  { id: 'allergies', label: '⚠️ Αλλεργίες' },
  { id: 'chronic',   label: '❤️ Χρόνιες' },
  { id: 'dental',    label: '🦷 Οδοντιατρικά' },
  { id: 'weight',    label: '⚖️ Βάρος' },
  { id: 'travel',    label: '✈️ Διαβατήριο' },
]

const speciesEmoji: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

function InfoRow({ label, value }: { label: string; value?: any }) {
  if (!value) return null
  return (
    <View style={r.row}>
      <Text style={r.label}>{label}</Text>
      <Text style={r.value}>{String(value)}</Text>
    </View>
  )
}

function RecordCard({ title, subtitle, date, badge, badgeColor }: any) {
  return (
    <View style={r.card}>
      <View style={r.cardHeader}>
        <Text style={r.cardTitle} numberOfLines={2}>{title}</Text>
        {badge && <View style={[r.badge, { backgroundColor: (badgeColor || '#6B7280') + '20' }]}>
          <Text style={[r.badgeText, { color: badgeColor || '#6B7280' }]}>{badge}</Text>
        </View>}
      </View>
      {subtitle && <Text style={r.cardSub}>{subtitle}</Text>}
      {date && <Text style={r.cardDate}>📅 {date}</Text>}
    </View>
  )
}

export default function PassportScreen() {
  const router = useRouter()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
  })

  const activePetId = selectedPetId || (pets.length === 1 ? pets[0]?.id : null)

  const { data: passport, isLoading } = useQuery({
    queryKey: ['passport', activePetId],
    queryFn: () => api.get(`/passport/${activePetId}`).then(r => r.data),
    enabled: !!activePetId,
  })

  const p = passport || {}
  const pet = passport?.pet

  return (
    <View style={r.container}>
      <View style={r.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={r.backText}>‹</Text></TouchableOpacity>
        <Text style={r.title}>Ιατρικός Φάκελος</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Pet selector */}
      {pets.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          {pets.map((pet: any) => (
            <TouchableOpacity key={pet.id} style={[r.petChip, activePetId === pet.id && r.petChipActive]} onPress={() => setSelectedPetId(pet.id)}>
              <Text style={r.petChipText}>{speciesEmoji[pet.species] || '🐾'} {pet.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!activePetId ? (
        <View style={r.empty}>
          <Text style={r.emptyEmoji}>🐾</Text>
          <Text style={r.emptyText}>Επίλεξε κατοικίδιο</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Alert banners */}
          {p.allergies?.length > 0 && (
            <View style={r.alertBanner}>
              <Text style={r.alertText}>⚠️ Αλλεργίες: {p.allergies.map((a: any) => a.allergen).join(', ')}</Text>
            </View>
          )}

          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab.id} style={[r.tab, activeTab === tab.id && r.tabActive]} onPress={() => setActiveTab(tab.id)}>
                <Text style={[r.tabText, activeTab === tab.id && r.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {activeTab === 'identity' && pet && (
              <View style={r.section}>
                <Text style={r.sectionTitle}>{speciesEmoji[pet.species] || '🐾'} {pet.name}</Text>
                <InfoRow label="Είδος" value={pet.species} />
                <InfoRow label="Ράτσα" value={pet.breed} />
                <InfoRow label="Φύλο" value={pet.gender} />
                <InfoRow label="Γέννηση" value={pet.birthday} />
                <InfoRow label="Χρώμα" value={pet.color} />
                <InfoRow label="Αποστειρωμένο" value={pet.is_sterilized ? 'Ναι' : 'Όχι'} />
                <InfoRow label="Μικροτσίπ" value={(pet as any).microchip} />
              </View>
            )}

            {activeTab === 'vaccines' && (
              (p.vaccinations || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν εμβόλια</Text> :
              (p.vaccinations || []).map((v: any) => (
                <RecordCard key={v.id} title={v.vaccine_name} subtitle={`${v.vaccine_type} · ${v.vet_name || ''}`} date={v.date_administered}
                  badge={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'Εκπρόθεσμο' : v.next_due_date ? `Επόμ: ${v.next_due_date}` : undefined}
                  badgeColor={v.next_due_date && new Date(v.next_due_date) < new Date() ? '#EF4444' : '#10B981'} />
              ))
            )}

            {activeTab === 'health' && (
              (p.healthRecords || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν εξετάσεις</Text> :
              (p.healthRecords || []).map((h: any) => (
                <RecordCard key={h.id} title={h.title} subtitle={`${h.vet_name || ''} · ${h.clinic_name || ''}`} date={h.date} />
              ))
            )}

            {activeTab === 'meds' && (
              (p.medications || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν φάρμακα</Text> :
              (p.medications || []).map((m: any) => (
                <RecordCard key={m.id} title={`${m.name} ${m.dosage}`} subtitle={`${m.frequency} · ${m.prescribed_by || ''}`}
                  date={`${m.start_date}${m.end_date ? ' → ' + m.end_date : ''}`}
                  badge={m.is_active ? 'Ενεργό' : 'Ολοκλήρωσε'} badgeColor={m.is_active ? '#10B981' : '#6B7280'} />
              ))
            )}

            {activeTab === 'lab' && (
              (p.labResults || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν εργαστηριακές</Text> :
              (p.labResults || []).map((l: any) => (
                <RecordCard key={l.id} title={l.title} subtitle={`${l.result_type} · ${l.lab_name || ''}`} date={l.date}
                  badge={l.is_abnormal ? 'Παθολογικά' : 'Φυσιολογικά'} badgeColor={l.is_abnormal ? '#EF4444' : '#10B981'} />
              ))
            )}

            {activeTab === 'imaging' && (
              (p.imaging || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν απεικονιστικές</Text> :
              (p.imaging || []).map((img: any) => (
                <RecordCard key={img.id} title={img.imaging_type.toUpperCase()} subtitle={`${img.body_region || ''} · ${img.vet_name || ''}`} date={img.date} />
              ))
            )}

            {activeTab === 'surgery' && (
              (p.surgeries || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν χειρουργεία</Text> :
              (p.surgeries || []).map((s: any) => (
                <RecordCard key={s.id} title={s.procedure} subtitle={`${s.surgeon_name || ''} · ${s.clinic_name || ''}`} date={s.date} />
              ))
            )}

            {activeTab === 'allergies' && (
              (p.allergies || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν αλλεργίες</Text> :
              (p.allergies || []).map((a: any) => (
                <RecordCard key={a.id} title={a.allergen} subtitle={`${a.allergen_type} · ${a.reaction || ''}`}
                  badge={a.severity} badgeColor={a.severity === 'severe' || a.severity === 'anaphylactic' ? '#EF4444' : a.severity === 'moderate' ? '#F59E0B' : '#10B981'} />
              ))
            )}

            {activeTab === 'chronic' && (
              (p.chronicConditions || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν χρόνιες παθήσεις</Text> :
              (p.chronicConditions || []).map((c: any) => (
                <RecordCard key={c.id} title={c.condition} subtitle={c.diagnosed_by} date={c.diagnosed_date}
                  badge={c.status === 'active' ? 'Ενεργή' : c.status === 'managed' ? 'Ελεγχόμενη' : 'Ύφεση'}
                  badgeColor={c.status === 'active' ? '#EF4444' : c.status === 'managed' ? '#F59E0B' : '#10B981'} />
              ))
            )}

            {activeTab === 'dental' && (
              (p.dentalRecords || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν οδοντιατρικά</Text> :
              (p.dentalRecords || []).map((d: any) => (
                <RecordCard key={d.id} title={d.procedure} subtitle={`${d.vet_name || ''} · ${d.clinic_name || ''}`} date={d.date} />
              ))
            )}

            {activeTab === 'weight' && (
              (p.weightRecords || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν μετρήσεις</Text> :
              (p.weightRecords || []).slice().reverse().map((w: any) => (
                <RecordCard key={w.id} title={`${w.weight_kg} kg`} subtitle={`BCS: ${w.bcs || '-'}/9 · ${w.vet_name || ''}`} date={w.date} />
              ))
            )}

            {activeTab === 'travel' && (
              <>
                <View style={r.travelInfo}>
                  <Text style={r.travelTitle}>🇬🇷 Εσωτερικό Ταξίδι</Text>
                  {['Μικροτσίπ', 'Εμβόλιο Λύσσας', 'Βιβλιάριο υγείας', 'Κτηνιατρικό πιστοποιητικό'].map(i => (
                    <Text key={i} style={r.travelItem}>✅ {i}</Text>
                  ))}
                </View>
                <View style={[r.travelInfo, { borderLeftColor: ORANGE }]}>
                  <Text style={r.travelTitle}>🌍 Διεθνές Ταξίδι (ΕΕ)</Text>
                  {['EU Pet Passport', 'Μικροτσίπ πριν εμβολιασμό', 'Εμβόλιο Λύσσας (21+ ημέρες)', 'Τίτλοι αντισωμάτων'].map(i => (
                    <Text key={i} style={r.travelItem}>✅ {i}</Text>
                  ))}
                </View>
                {(p.travelDocs || []).length === 0 ? <Text style={r.noData}>Δεν υπάρχουν ταξίδια</Text> :
                  (p.travelDocs || []).map((t: any) => (
                    <RecordCard key={t.id} title={`${t.origin_city || ''} → ${t.destination_city}`} subtitle={`${t.travel_type} · ${t.carrier || ''}`} date={t.departure_date} />
                  ))}
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </>
      )}
    </View>
  )
}

const r = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backText: { color: ORANGE, fontSize: 24, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  petChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  petChipActive: { backgroundColor: ORANGE },
  petChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  alertBanner: { margin: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  alertText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  tabActive: { backgroundColor: ORANGE },
  tabText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  label: { fontSize: 13, color: '#6B7280' },
  value: { fontSize: 13, fontWeight: '600', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  noData: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  travelInfo: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  travelTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  travelItem: { fontSize: 13, color: '#374151', marginBottom: 4 },
})