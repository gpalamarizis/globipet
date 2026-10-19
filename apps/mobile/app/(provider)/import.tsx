import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as XLSX from 'xlsx'
import { Package, Scissors, FileSpreadsheet, Upload, CheckCircle } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Εισαγωγή προϊόντων ή υπηρεσιών από Excel/CSV — ίδια λογική με την
 * καρτέλα Import του web: πρώτη γραμμή οι στήλες (στη γλώσσα του χρήστη ή
 * στα αγγλικά), όλες οι γραμμές του αρχείου, POST /products/bulk ή
 * /services/bulk. Ο server δέχεται έως 500 ανά κλήση, οπότε στέλνουμε σε
 * δόσεις των 500 και αθροίζουμε.
 */
type Kind = 'products' | 'services'
const CHUNK = 500

export default function ProviderImport() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [kind, setKind] = useState<Kind>('products')
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  const cols = kind === 'products'
    ? [t('providerDash.name'), t('providerDash.price'), t('providerDash.description'), t('providerDash.category'), t('providerDash.stock')]
    : [t('providerDash.name'), t('providerDash.price'), t('providerDash.description'), t('providerDash.type')]

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel', 'text/csv', 'text/comma-separated-values', '*/*',
        ],
        copyToCacheDirectory: true, multiple: false,
      })
      if (res.canceled || !res.assets?.[0]) return
      const a = res.assets[0]
      const ext = a.name.split('.').pop()?.toLowerCase()
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { Alert.alert(t('common.error'), t('providerImport.formats')); return }

      const b64 = await new File(a.uri).base64()
      const wb = XLSX.read(b64, { type: 'base64' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      if (!data.length) { Alert.alert(t('common.error'), t('providerImport.emptyFile')); return }
      const headers = data[0].map(String)
      const all = data.slice(1)
        .filter(r => r.some(c => String(c ?? '').trim() !== ''))
        .map(r => { const o: any = {}; headers.forEach((h, i) => { o[h] = r[i] ?? '' }); return o })
      if (!all.length) { Alert.alert(t('common.error'), t('providerImport.emptyFile')); return }
      setFileName(a.name); setColumns(headers); setRows(all)
    } catch {
      Alert.alert(t('common.error'), t('providerDash.errFileRead'))
    }
  }

  const doImport = async () => {
    if (!rows.length) return
    setBusy(true)
    try {
      const endpoint = kind === 'products' ? '/products/bulk' : '/services/bulk'
      // Ίδια αντιστοίχιση στηλών με το web.
      const items = rows.map(row => ({
        name: row[t('providerDash.name')] || row['name'] || row['Name'] || Object.values(row)[0],
        price: parseFloat(String(row[t('providerDash.price')] || row['price'] || row['Price'] || '0').replace(',', '.')),
        description: row[t('providerDash.description')] || row['description'] || row['Description'] || '',
        category: row[t('providerDash.category')] || row['category'] || row['Category'] || 'other',
        type: row[t('providerDash.type')] || row['type'] || row['Type'] || undefined,
        stock: row[t('providerDash.stock')] || row['stock'] || row['Stock'] || undefined,
      }))
      let count = 0, failed = 0
      for (let i = 0; i < items.length; i += CHUNK) {
        const res = await api.post(endpoint, { items: items.slice(i, i + CHUNK) })
        count += res.data?.count ?? 0
        failed += res.data?.failed?.length ?? 0
      }
      const lines = [t('providerDash.importedOk', { count })]
      if (failed > 0) lines.push(t('providerEdit.importFailedRows', { count: failed }))
      Alert.alert(t('providerImport.title'), lines.join('\n'))
      qc.invalidateQueries({ queryKey: ['provider-products'] })
      qc.invalidateQueries({ queryKey: ['provider-services'] })
      qc.invalidateQueries({ queryKey: ['my-services-all'] })
      setFileName(''); setColumns([]); setRows([])
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errImport'))
    } finally {
      setBusy(false)
    }
  }

  const preview = rows.slice(0, 5)

  return (
    <Screen title={t('providerImport.title')} back>
      <Card>
        <Text style={s.head}>{t('providerDash.importType')}</Text>
        <View style={s.kinds}>
          {([
            ['products', t('providerDash.tabProducts'), t('providerDash.importProducts'), Package],
            ['services', t('providerDash.tabServices'), t('providerDash.importServices'), Scissors],
          ] as const).map(([k, label, desc, Ico]) => {
            const on = kind === k
            return (
              <TouchableOpacity key={k} activeOpacity={0.7} style={[s.kind, on && s.kindOn]} onPress={() => setKind(k)}>
                <Ico size={20} color={on ? colors.brand : colors.textLight} />
                <Text style={s.kindTitle}>{label}</Text>
                <Text style={s.kindDesc}>{desc}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <Text style={s.hint}>{t('providerImport.columnsHint', { cols: cols.join(', ') })}</Text>
      </Card>

      <Card>
        <Text style={s.head}>{t('providerDash.uploadFile')}</Text>
        <TouchableOpacity style={s.drop} activeOpacity={0.7} onPress={pick}>
          <FileSpreadsheet size={32} color={colors.success} />
          <Text style={s.dropTitle}>{t('providerImport.pickFile')}</Text>
          <Text style={s.hint}>{t('providerImport.formats')}</Text>
          {!!fileName && <Text style={s.file}>✓ {fileName}</Text>}
        </TouchableOpacity>
      </Card>

      {rows.length > 0 && (
        <Card padded={false}>
          <View style={s.prevHead}>
            <Text style={s.head}>{t('providerDash.previewCount', { count: rows.length })}</Text>
            <View style={s.ready}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={s.readyTxt}>{t('providerDash.readyToImport')}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[s.tr, s.thRow]}>
                {columns.map(c => <Text key={c} style={[s.td, s.th]} numberOfLines={1}>{c}</Text>)}
              </View>
              {preview.map((r, i) => (
                <View key={i} style={s.tr}>
                  {columns.map(c => <Text key={c} style={s.td} numberOfLines={1}>{String(r[c] ?? '')}</Text>)}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={s.prevFoot}>
            <Button full loading={busy} disabled={busy} icon={<Upload size={16} color={colors.textOnDark} />}
              label={busy ? t('providerDash.importing') : t('providerDash.importRecords', { count: rows.length })}
              onPress={doImport} />
          </View>
        </Card>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  head: { ...type.body, color: colors.text, fontWeight: weight.semibold, marginBottom: space.md },
  kinds: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  kind: { flex: 1, padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, gap: 2 },
  kindOn: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  kindTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold, marginTop: space.xs },
  kindDesc: { ...type.caption, color: colors.textMuted },
  hint: { ...type.caption, color: colors.textLight, textAlign: 'center' },
  drop: {
    alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.xl,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border,
  },
  dropTitle: { ...type.body, color: colors.text, fontWeight: weight.medium },
  file: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  prevHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    padding: space.lg, paddingBottom: 0,
  },
  ready: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.md },
  readyTxt: { ...type.caption, color: colors.success },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  thRow: { backgroundColor: colors.surfaceAlt },
  td: { width: 130, paddingHorizontal: space.md, paddingVertical: space.sm, ...type.caption, color: colors.text },
  th: { color: colors.textMuted, fontWeight: weight.semibold },
  prevFoot: { padding: space.lg },
})
