import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Languages, X, Check } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Αγγλικές μεταφράσεις του περιεχομένου του παρόχου.
 *
 * ΤΙ ΚΑΝΕΙ
 *   Ο πάροχος γράφει στα ελληνικά. Για να τον βρίσκουν ξενόγλωσσοι πελάτες,
 *   δίνει και αγγλικό τίτλο και περιγραφή. Όπου δεν δώσει, ο επισκέπτης
 *   βλέπει το ελληνικό — δεν μένει κενό.
 *
 * ΤΡΕΙΣ ΤΥΠΟΙ
 *   Υπηρεσίες, πακέτα, προϊόντα. Ο server τα χειρίζεται με το ίδιο endpoint,
 *   αλλάζοντας μόνο το entity στη διαδρομή.
 */
const TABS = [
  { id: 'service',         labelKey: 'providerTrn.tabServices' },
  { id: 'service_package', labelKey: 'providerTrn.tabPackages' },
  { id: 'product',         labelKey: 'providerTrn.tabProducts' },
]

const SOURCE: Record<string, string> = {
  service: '/services/my',
  service_package: '/packages/my',
  product: '/products/my',
}

export default function ProviderTranslations() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState('service')
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [enTitle, setEnTitle] = useState('')
  const [enDesc, setEnDesc] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['trn-rows', tab],
    queryFn: () => api.get(SOURCE[tab]).then(r => {
      const list = r.data?.data ?? r.data ?? []
      // Το /packages/my επιστρέφει τις ΥΠΗΡΕΣΙΕΣ με τα πακέτα τους μέσα
      // (backend/src/routes/packages.ts): η μετάφραση αφορά το κάθε πακέτο
      // (entity service_package, id του πακέτου) — όπως στο web.
      return tab === 'service_package'
        ? (list as any[]).flatMap((s: any) => s?.packages ?? [])
        : list
    }),
  })

  // Ποια έχουν ήδη αγγλικά: ένα ερώτημα για όλα, όχι ένα ανά γραμμή.
  const { data: missing = [] } = useQuery({
    queryKey: ['trn-missing', tab],
    queryFn: () => api.get(`/translations/missing/${tab}?lang=en`).then(r => r.data?.data ?? r.data ?? []),
  })
  const missingIds = new Set(missing.map((m: any) => m.id ?? m))

  // Μόνο τα πεδία της οντότητας, όπως στο web: υπηρεσία → title, πακέτο/
  // προϊόν → name. Πριν στέλνονταν ΚΑΙ τα δύο, και ο server απαντούσε 400
  // («Μη μεταφράσιμο πεδίο») σε κάθε αποθήκευση με τίτλο.
  // Κενό πεδίο = αφαίρεση της μετάφρασης (ό,τι λέει το emptyHint, όπως στο
  // web). Με undefined δεν έφευγε τίποτα και η μετάφραση δεν σβηνόταν ποτέ.
  const save = useMutation({
    mutationFn: () => api.put(`/translations/${tab}/${editing.id}`, {
      en: {
        [tab === 'service' ? 'title' : 'name']: enTitle.trim(),
        description: enDesc.trim(),
      },
    }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['trn-missing', tab] })
      const { saved = 0, removed = 0 } = r?.data ?? {}
      Alert.alert(removed && !saved ? t('providerTrn.removed') : t('providerTrn.savedFields', { count: saved }))
      setEditing(null)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerTrn.errSave')),
  })

  const open = async (row: any) => {
    setEditing(row); setEnTitle(''); setEnDesc('')
    // Φέρνουμε ό,τι υπάρχει ήδη, ώστε η επεξεργασία να μην σβήνει δουλειά.
    try {
      const { data } = await api.get(`/translations/${tab}/${row.id}`)
      const en = data?.data?.en ?? data?.en ?? {}
      setEnTitle((tab === 'service' ? en.title : en.name) ?? '')
      setEnDesc(en.description ?? '')
    } catch { /* νέα μετάφραση — κενά πεδία */ }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['trn-rows', tab] })
    await qc.invalidateQueries({ queryKey: ['trn-missing', tab] })
    setRefreshing(false)
  }, [qc, tab])

  const label = (r: any) => r.title || r.name || r.provider_name || '—'

  return (
    <Screen title={t('providerTabs.translations')} onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={s.intro}>{t('providerTrn.subtitle')}</Text>

      <View style={s.tabs}>
        {TABS.map(tb => {
          const on = tab === tb.id
          return (
            <TouchableOpacity key={tb.id} activeOpacity={0.7}
              style={[s.tab, on && s.tabOn]} onPress={() => setTab(tb.id)}>
              <Text style={[s.tabTxt, on && s.tabTxtOn]}>{t(tb.labelKey)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? <SkeletonRows count={4} /> :
       rows.length === 0 ? <EmptyState icon={Languages} title={t('providerTrn.emptyCategory')} /> :
       rows.map((r: any) => {
        const done = !missingIds.has(r.id)
        return (
          <Card key={r.id} onPress={() => open(r)}>
            <View style={s.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>{label(r)}</Text>
                <Text style={s.greek} numberOfLines={1}>{t('providerTrn.greek')}</Text>
              </View>
              {done
                ? <Badge label={t('providerTrn.english')} tone="success" />
                : <Badge label={t('providerTrn.missingEn')} tone="warning" />}
            </View>
          </Card>
        )
      })}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle} numberOfLines={1}>{editing ? label(editing) : ''}</Text>
              <TouchableOpacity onPress={() => setEditing(null)}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
              <Input label={t('providerTrn.fTitle')} value={enTitle} onChangeText={setEnTitle} />
              <Input label={t('providerTrn.fDescription')} value={enDesc} onChangeText={setEnDesc} multiline />
              <Text style={s.note}>{t('providerTrn.emptyHint')}</Text>
            </ScrollView>
            <Button
              label={save.isPending ? t('providerTrn.saving') : t('providerTrn.save')}
              icon={<Check size={18} color={colors.textOnDark} />}
              loading={save.isPending}
              onPress={() => save.mutate()} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.caption, color: colors.textMuted, marginBottom: space.md },
  tabs: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  tab: { flex: 1, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  tabOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  tabTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  tabTxtOn: { color: colors.brand, fontWeight: weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  greek: { ...type.caption, color: colors.textLight },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  sheetTitle: { ...type.section, color: colors.text, flex: 1 },
  note: { ...type.caption, color: colors.textLight },
})
