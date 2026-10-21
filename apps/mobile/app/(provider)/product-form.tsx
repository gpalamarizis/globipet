import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { ErrorState, NotFoundState } from '@/components/ErrorState'
import { Chips } from '@/components/Chips'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Νέο προϊόν ή επεξεργασία — ίδια πεδία με το web (όνομα, κατηγορία, τιμή,
 * τιμή προσφοράς, απόθεμα, μάρκα, περιγραφή, φωτογραφία) και διαγραφή.
 *
 * Οι οκτώ κατηγορίες είναι ΟΙ ΙΔΙΕΣ με του web· πριν το κινητό είχε πέντε,
 * οπότε προϊόν «εκπαίδευσης» ή «στέγασης» δεν μπορούσε να καταχωρηθεί από εδώ.
 */
const CATEGORIES = ['food', 'toys', 'accessories', 'health', 'grooming', 'training', 'housing', 'other']

export default function ProductFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isNew = !id

  const { data: products = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: !isNew,
  })
  const existing = products.find((p: any) => p.id === id)

  const [form, setForm] = useState({
    name: '', description: '', category: 'food', price: '', sale_price: '', stock: '0', brand: '', image_url: '',
  })
  const [uploading, setUploading] = useState(false)
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name ?? '', description: existing.description ?? '',
      category: existing.category || 'other',
      price: existing.price != null ? String(existing.price) : '',
      sale_price: existing.sale_price != null ? String(existing.sale_price) : '',
      stock: String(existing.stock ?? 0), brand: existing.brand ?? '',
      image_url: existing.image_url || existing.images?.[0] || '',
    })
  }, [existing?.id])

  const num = (v: string) => parseFloat(v.replace(',', '.'))
  const price = num(form.price)
  const sale = form.sale_price.trim() ? num(form.sale_price) : null
  // Ίδιος κανόνας με το web: μη κενό όνομα, τιμή > 0, προσφορά < τιμής.
  const valid = form.name.trim().length > 0 && Number.isFinite(price) && price > 0
    && (sale === null || (Number.isFinite(sale) && sale > 0 && sale < price))

  const payload = () => ({
    name: form.name.trim(),
    description: form.description.trim() || form.name.trim(),
    category: form.category,
    price,
    sale_price: sale,
    stock: parseInt(form.stock, 10) || 0,
    brand: form.brand.trim() || null,
    image_url: form.image_url || null,
    images: form.image_url ? [form.image_url] : [],
  })

  const done = (msgKey: string) => {
    qc.invalidateQueries({ queryKey: ['provider-products'] })
    Alert.alert(t(msgKey))
    router.back()
  }

  const save = useMutation({
    mutationFn: () => isNew ? api.post('/products', payload()) : api.patch(`/products/${id}`, payload()),
    onSuccess: () => done(isNew ? 'providerDash.productAdded' : 'providerEdit.productUpdated'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerEdit.errSave')),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/products/${id}`),
    onSuccess: () => done('providerDash.productDeleted'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerEdit.errSave')),
  })

  const pickPhoto = async () => {
    setUploading(true)
    try {
      const url = await pickAndUploadImage('products')
      if (url) set('image_url', url)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('providerEdit.photoPermission')
        : e?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploading(false) }
  }

  if (!isNew && !existing) return (
    <Screen title={t('providerEdit.editProduct')} back>
      {/* Σφάλμα δικτύου → επανάληψη· φόρτωσε αλλά λείπει → «δεν βρέθηκε»· αλλιώς φόρτωση. */}
      {isError ? <ErrorState onRetry={() => refetch()} retrying={isFetching} />
        : isLoading || isFetching ? <Loading /> : <NotFoundState />}
    </Screen>
  )

  return (
    <Screen title={isNew ? t('providerDash.newProduct') : t('providerEdit.editProduct')} back>
      <Card>
        <TouchableOpacity activeOpacity={0.8} style={s.photo} onPress={pickPhoto} disabled={uploading}>
          {form.image_url
            ? <Image source={{ uri: form.image_url }} style={s.photoImg} />
            : <View style={s.photoEmpty}>
                <Camera size={icon.lg} color={colors.textLight} />
                <Text style={s.photoTxt}>{uploading ? t('providerEdit.uploading') : t('providerEdit.addPhoto')}</Text>
              </View>}
        </TouchableOpacity>
        {!!form.image_url && (
          <Text style={s.change} onPress={pickPhoto}>
            {uploading ? t('providerEdit.uploading') : t('providerEdit.changePhoto')}
          </Text>
        )}

        <Input label={t('providerDash.name')} value={form.name} onChangeText={v => set('name', v)}
          placeholder={t('providerDash.phProduct')} />
        <Chips label={t('providerDash.category')} value={form.category} onChange={v => set('category', v)}
          options={CATEGORIES.map(c => ({ value: c, label: String(t(`marketplace.categories.${c}`, { defaultValue: c })) }))} />

        {/* Τιμή, προσφορά και απόθεμα: τρεις ίσες στήλες. */}
        <View style={s.row}>
          <View style={s.col}>
            <Input label={t('providerDash.priceEur')} value={form.price} onChangeText={v => set('price', v)}
              keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View style={s.col}>
            <Input label={t('providerEdit.salePrice')} value={form.sale_price} onChangeText={v => set('sale_price', v)}
              keyboardType="decimal-pad" placeholder="—" />
          </View>
          <View style={s.col}>
            <Input label={t('providerDash.stock')} value={form.stock}
              onChangeText={v => set('stock', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
          </View>
        </View>
        {sale !== null && !(sale < price) && <Text style={s.err}>{t('providerEdit.saleTooHigh')}</Text>}

        <Input label={t('providerEdit.brand')} value={form.brand} onChangeText={v => set('brand', v)} />
        <Input label={t('providerDash.description')} value={form.description} onChangeText={v => set('description', v)}
          placeholder={t('providerDash.phProductDesc')} multiline />

        <Button full label={save.isPending ? t('providerDash.saving') : t('providerDash.save')}
          loading={save.isPending} disabled={!valid || save.isPending || uploading} onPress={() => save.mutate()} />
        {!isNew && (
          <Button full variant="danger" label={t('providerPkg.delete')} loading={remove.isPending}
            style={{ marginTop: space.sm }}
            onPress={() => Alert.alert(t('providerDash.confirmDelete'), form.name, [
              { text: t('providerDash.cancel'), style: 'cancel' },
              { text: t('providerPkg.delete'), style: 'destructive', onPress: () => remove.mutate() },
            ])} />
        )}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  photo: { alignSelf: 'center', width: 140, height: 140, borderRadius: radius.lg, overflow: 'hidden', marginBottom: space.sm },
  photoImg: { width: '100%', height: '100%' },
  photoEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs,
    backgroundColor: colors.surfaceAlt, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.lg,
  },
  photoTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  change: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, textAlign: 'center', marginBottom: space.lg },
  row: { flexDirection: 'row', gap: space.sm },
  col: { flex: 1 },
  err: { ...type.caption, color: colors.danger, marginTop: -space.sm, marginBottom: space.md },
})
