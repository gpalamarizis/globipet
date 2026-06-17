import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Modal } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../src/lib/api'

const TIER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  basic:         { label: 'Βασικό',       color: '#374151', bg: '#F3F4F6' },
  standard:      { label: 'Standard',      color: '#1E40AF', bg: '#DBEAFE' },
  premium:       { label: 'Premium',       color: '#6D28D9', bg: '#EDE9FE' },
  comprehensive: { label: 'Ολοκληρωμένο', color: '#065F46', bg: '#D1FAE5' },
}

export default function InsuranceScreen() {
  const [petType, setPetType] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<any>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['insurance-plans', petType],
    queryFn: () => api.get('/insurance/plans', { params: { pet_type: petType || undefined } }).then(r => r.data?.data ?? []),
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Ασφάλιση Κατοικιδίου</Text>
        <Text style={styles.subtitle}>Συγκρίνετε πλάνα ασφάλισης</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {[['', 'Όλα'], ['dog', '🐕 Σκύλος'], ['cat', '🐈 Γάτα'], ['rabbit', '🐇 Κουνέλι'], ['bird', '🦜 Πτηνό']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.filterChip, petType === val && styles.filterChipActive]} onPress={() => setPetType(val)}>
            <Text style={[styles.filterText, petType === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#E65100" size="large"/></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {plans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🛡️</Text>
              <Text style={styles.emptyTitle}>Δεν βρέθηκαν πλάνα</Text>
            </View>
          ) : plans.map((plan: any) => {
            const tier = TIER_LABELS[plan.tier] || TIER_LABELS.basic
            return (
              <TouchableOpacity key={plan.id} style={[styles.card, plan.is_featured && styles.cardFeatured]}
                onPress={() => setSelectedPlan(plan)}>
                {plan.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>⭐ Προτεινόμενο</Text>
                  </View>
                )}
                <View style={styles.cardTop}>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{plan.provider?.name_el || plan.provider?.name}</Text>
                    <Text style={styles.planName}>{plan.name_el || plan.name}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                      <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
                    </View>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.price}>€{plan.price_monthly}</Text>
                    <Text style={styles.priceLabel}>/μήνα</Text>
                  </View>
                </View>

                <View style={styles.coverageRow}>
                  {[
                    ['covers_accidents', 'Ατυχήματα'],
                    ['covers_illness', 'Ασθένεια'],
                    ['covers_surgery', 'Χειρουργείο'],
                    ['covers_dental', 'Οδοντιατρείο'],
                  ].map(([key, label]) => (
                    <View key={key} style={[styles.coverageChip, { backgroundColor: plan[key] ? '#D1FAE5' : '#F3F4F6' }]}>
                      <Text style={[styles.coverageText, { color: plan[key] ? '#065F46' : '#9CA3AF' }]}>
                        {plan[key] ? '✓' : '✗'} {label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.detailsLink}>Περισσότερες λεπτομέρειες →</Text>
              </TouchableOpacity>
            )
          })}
          <View style={{ height: 40 }}/>
        </ScrollView>
      )}

      {/* Plan Detail Modal */}
      <Modal visible={!!selectedPlan} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedPlan(null)}>
        {selectedPlan && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalProvider}>{selectedPlan.provider?.name_el || selectedPlan.provider?.name}</Text>
                <Text style={styles.modalPlanName}>{selectedPlan.name_el || selectedPlan.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.priceSection}>
                <Text style={styles.modalPrice}>€{selectedPlan.price_monthly}<Text style={styles.modalPriceLabel}>/μήνα</Text></Text>
                {selectedPlan.price_annual && <Text style={styles.modalPriceAnnual}>€{selectedPlan.price_annual}/χρόνο</Text>}
              </View>

              <Text style={styles.sectionTitle}>Κάλυψη</Text>
              {[
                ['covers_accidents', 'Ατυχήματα'],
                ['covers_illness', 'Ασθένεια'],
                ['covers_surgery', 'Χειρουργείο'],
                ['covers_dental', 'Οδοντιατρείο'],
                ['covers_preventive', 'Πρόληψη'],
                ['covers_liability', 'Αστική ευθύνη'],
                ['covers_death', 'Θάνατος'],
              ].map(([key, label]) => (
                <View key={key} style={styles.coverageItem}>
                  <Text style={[styles.coverageIcon, { color: selectedPlan[key] ? '#10B981' : '#D1D5DB' }]}>
                    {selectedPlan[key] ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.coverageLabel, { color: selectedPlan[key] ? '#111827' : '#9CA3AF' }]}>{label}</Text>
                </View>
              ))}

              <Text style={styles.sectionTitle}>Λεπτομέρειες</Text>
              {selectedPlan.annual_limit && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ετήσιο όριο</Text>
                  <Text style={styles.detailValue}>€{selectedPlan.annual_limit.toLocaleString()}</Text>
                </View>
              )}
              {selectedPlan.deductible && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Απαλλαγή</Text>
                  <Text style={styles.detailValue}>€{selectedPlan.deductible}</Text>
                </View>
              )}
              {selectedPlan.reimbursement_percent && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Αποζημίωση</Text>
                  <Text style={styles.detailValue}>{selectedPlan.reimbursement_percent}%</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Περίοδος αναμονής</Text>
                <Text style={styles.detailValue}>{selectedPlan.waiting_period_days} ημέρες</Text>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              {selectedPlan.provider?.phone && (
                <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL(`tel:${selectedPlan.provider.phone}`)}>
                  <Text style={styles.phoneBtnText}>📞 {selectedPlan.provider.phone}</Text>
                </TouchableOpacity>
              )}
              {selectedPlan.provider?.website && (
                <TouchableOpacity style={styles.applyBtn} onPress={() => Linking.openURL(selectedPlan.provider.website)}>
                  <Text style={styles.applyBtnText}>Αίτηση Ασφάλισης</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280' },
  filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#E65100' },
  filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  cardFeatured: { borderWidth: 2, borderColor: '#E65100' },
  featuredBadge: { backgroundColor: '#FFF7ED', marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 },
  featuredText: { fontSize: 12, fontWeight: '700', color: '#E65100' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  planName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tierText: { fontSize: 11, fontWeight: '600' },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 24, fontWeight: '900', color: '#E65100' },
  priceLabel: { fontSize: 12, color: '#6B7280' },
  coverageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  coverageChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  coverageText: { fontSize: 11, fontWeight: '500' },
  detailsLink: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitleGroup: { flex: 1 },
  modalProvider: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  modalPlanName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose: { fontSize: 20, color: '#6B7280', padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  priceSection: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFF7ED', borderRadius: 16, marginBottom: 20 },
  modalPrice: { fontSize: 36, fontWeight: '900', color: '#E65100' },
  modalPriceLabel: { fontSize: 16, fontWeight: '400', color: '#6B7280' },
  modalPriceAnnual: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12, marginTop: 8 },
  coverageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  coverageIcon: { fontSize: 16, marginRight: 10, width: 20 },
  coverageLabel: { fontSize: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  phoneBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E65100', alignItems: 'center' },
  phoneBtnText: { color: '#E65100', fontWeight: '700', fontSize: 14 },
  applyBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
