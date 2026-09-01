import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

export default function PackagesScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingPkg, setEditingPkg] = useState<any>(null)
  const [form, setForm] = useState<any>({})

  const canAccess = isAuthenticated && (user?.role === 'service_provider' || user?.role === 'admin')

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/provider/packages').then(r => r.data?.data ?? []),
    enabled: canAccess,
  })

  const saveMutation = useMutation({
    mutationFn: () => editingPkg
      ? api.patch(`/provider/packages/${editingPkg.id}`, form)
      : api.post('/provider/packages', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
      setShowModal(false)
      setEditingPkg(null)
    },
    onError: (e: any) => Alert.alert('Σφάλμα', e.response?.data?.message || 'Κάτι πήγε στραβά'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/provider/packages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-packages'] }),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => api.patch(`/provider/packages/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-packages'] }),
  })

  const openCreate = () => {
    setEditingPkg(null)
    setForm({ name: '', description: '', price: '', session_count: 1, validity_days: 30, is_active: true })
    setShowModal(true)
  }

  const openEdit = (pkg: any) => {
    setEditingPkg(pkg)
    setForm({ ...pkg })
    setShowModal(true)
  }

  if (!isAuthenticated) return (
    <View style={styles.centered}>
      <Text style={styles.lockEmoji}>🔒</Text>
      <Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.loginBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  if (!canAccess) return (
    <View style={styles.centered}>
      <Text style={styles.lockEmoji}>🚫</Text>
      <Text style={styles.guestTitle}>Μόνο για παρόχους υπηρεσιών</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>📦 Τα πακέτα μου</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Νέο</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Δημιουργήστε πακέτα υπηρεσιών για τους πελάτες σας</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#E65100" size="large"/></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {packages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Δεν έχετε πακέτα ακόμα</Text>
              <Text style={styles.emptySubtitle}>Δημιουργήστε πακέτα για να αυξήσετε τις πωλήσεις σας</Text>
              <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <Text style={styles.createBtnText}>Δημιουργία πακέτου</Text>
              </TouchableOpacity>
            </View>
          ) : packages.map((pkg: any) => (
            <View key={pkg.id} style={[styles.card, !pkg.is_active && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <View style={[styles.activeBadge, { backgroundColor: pkg.is_active ? '#D1FAE5' : '#F3F4F6' }]}>
                    <Text style={[styles.activeText, { color: pkg.is_active ? '#065F46' : '#6B7280' }]}>
                      {pkg.is_active ? 'Ενεργό' : 'Ανενεργό'}
                    </Text>
                  </View>
                </View>
                {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}
              </View>

              <View style={styles.pkgStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>€{pkg.price}</Text>
                  <Text style={styles.statLabel}>Τιμή</Text>
                </View>
                <View style={styles.statDivider}/>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{pkg.session_count}</Text>
                  <Text style={styles.statLabel}>Συνεδρίες</Text>
                </View>
                <View style={styles.statDivider}/>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{pkg.validity_days}</Text>
                  <Text style={styles.statLabel}>Ημέρες</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active })}>
                  <Text style={styles.actionBtnText}>{pkg.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit(pkg)}>
                  <Text style={styles.editBtnText}>Επεξεργασία</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn}
                  onPress={() => Alert.alert('Διαγραφή', `Διαγραφή "${pkg.name}";`, [
                    { text: 'Ακύρωση', style: 'cancel' },
                    { text: 'Διαγραφή', style: 'destructive', onPress: () => deleteMutation.mutate(pkg.id) }
                  ])}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }}/>
        </ScrollView>
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPkg ? 'Επεξεργασία' : 'Νέο πακέτο'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Όνομα *</Text>
            <TextInput style={styles.input} value={form.name || ''} onChangeText={v => setForm({...form, name: v})} placeholder="π.χ. Πακέτο 5 λουσίματος"/>

            <Text style={styles.fieldLabel}>Περιγραφή</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description || ''} onChangeText={v => setForm({...form, description: v})} placeholder="Περιγραφή πακέτου..." multiline numberOfLines={3}/>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Τιμή (€) *</Text>
                <TextInput style={styles.input} value={String(form.price || '')} onChangeText={v => setForm({...form, price: v})} keyboardType="decimal-pad" placeholder="0.00"/>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Αριθμός συνεδριών *</Text>
                <TextInput style={styles.input} value={String(form.session_count || '')} onChangeText={v => setForm({...form, session_count: parseInt(v) || 1})} keyboardType="number-pad" placeholder="5"/>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Ισχύς (ημέρες)</Text>
            <TextInput style={styles.input} value={String(form.validity_days || '')} onChangeText={v => setForm({...form, validity_days: parseInt(v) || 30})} keyboardType="number-pad" placeholder="30"/>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Άκυρο</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
              onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.price}>
              <Text style={styles.saveBtnText}>{saveMutation.isPending ? 'Αποθήκευση...' : (editingPkg ? 'Ενημέρωση' : 'Δημιουργία')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280' },
  addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardInactive: { opacity: 0.6 },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pkgName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  pkgDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  activeText: { fontSize: 11, fontWeight: '600' },
  pkgStats: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#E65100' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  editBtn: { borderColor: '#E65100' },
  editBtnText: { color: '#E65100', fontWeight: '700', fontSize: 12 },
  deleteBtn: { width: 40, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  createBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose: { fontSize: 20, color: '#6B7280', padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
