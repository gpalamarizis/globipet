import { useState } from 'react'
import { View, Text, StyleSheet, Linking, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Search, ExternalLink, Trash2 } from 'lucide-react-native'
import { api } from '../lib/api'
import { Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Τοποθεσία υπηρεσίας στον χάρτη υπηρεσιών (Service.latitude/longitude) —
 * ίδια λειτουργία με το web (ServiceLocationPicker), χωρίς χάρτη: το κινητό
 * δεν έχει βιβλιοθήκη χάρτη. Επαλήθευση με «Άνοιγμα στους χάρτες».
 *
 * «Χρήση τρέχουσας θέσης» παραλείπεται: το expo-location δεν υπάρχει στις
 * εξαρτήσεις της εφαρμογής.
 */

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

export interface Coords { latitude: number | null; longitude: number | null }

interface Props {
  address?: string
  city?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  onChange: (c: Coords) => void
  /**
   * Ε17 (προαιρετικά — οι υπάρχουσες φόρμες υπηρεσιών δεν τα δίνουν και
   * μένουν ίδιες): κείμενα για άλλη χρήση (π.χ. σημείο συνάντησης βόλτας) και
   * το αποτέλεσμα της εύρεσης (display_name, city από το /geocode).
   */
  title?: string
  hint?: string
  notSet?: string
  onFound?: (r: { display_name: string; city: string }) => void
}

export function ServiceLocationField({ address, city, country, latitude, longitude, onChange, title, hint, notSet, onFound }: Props) {
  const { t } = useTranslation()
  const [finding, setFinding] = useState(false)
  const [foundName, setFoundName] = useState('')
  const has = latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))

  const find = async () => {
    const q = [address, city].map(s => (s || '').trim()).filter(Boolean).join(', ')
    if (q.length < 3) { Alert.alert(t('svcLocation.needAddress')); return }
    setFinding(true)
    try {
      const { data } = await api.get('/geocode', { params: { address: q, country: country || undefined } })
      onChange({ latitude: round6(Number(data.lat)), longitude: round6(Number(data.lon)) })
      setFoundName(data.display_name || '')
      onFound?.({ display_name: String(data.display_name || ''), city: String(data.city || '') })
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.status === 404 ? t('svcLocation.notFound') : t('svcLocation.error'))
    } finally { setFinding(false) }
  }

  const remove = () => { setFoundName(''); onChange({ latitude: null, longitude: null }) }

  const openMaps = () => Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${Number(latitude)},${Number(longitude)}`)
    .catch(() => Alert.alert(t('common.error'), t('svcLocation.openMapsFailed')))

  return (
    <View style={s.box}>
      <View style={s.head}>
        <MapPin size={icon.sm} color={colors.textMuted} />
        <Text style={s.title}>{title || t('svcLocation.title')}</Text>
      </View>
      <Text style={s.hint}>{hint || t('svcLocation.hint')}</Text>

      {has ? (
        <>
          {!!foundName && <Text style={s.found}>{foundName}</Text>}
          <Text style={s.coords}>
            {t('svcLocation.coords', { lat: Number(latitude).toFixed(5), lng: Number(longitude).toFixed(5) })}
          </Text>
        </>
      ) : (
        <Text style={s.hint}>{notSet || t('svcLocation.notSet')}</Text>
      )}

      <Button full size="sm" variant="secondary"
        label={finding ? t('svcLocation.finding') : t('svcLocation.findFromAddress')}
        icon={<Search size={icon.sm} color={colors.text} />}
        loading={finding} onPress={find} style={{ marginTop: space.sm }} />
      {has && (
        <>
          <Button full size="sm" variant="secondary" label={t('svcLocation.openInMaps')}
            icon={<ExternalLink size={icon.sm} color={colors.text} />}
            onPress={openMaps} style={{ marginTop: space.sm }} />
          <Button full size="sm" variant="ghost" label={t('svcLocation.remove')}
            icon={<Trash2 size={icon.sm} color={colors.brand} />}
            onPress={remove} style={{ marginTop: space.xs }} />
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  box: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: space.md, marginBottom: space.lg, gap: space.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.body, color: colors.text, fontWeight: weight.medium },
  hint: { ...type.caption, color: colors.textLight },
  found: { ...type.caption, color: colors.text },
  coords: { ...type.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
})
