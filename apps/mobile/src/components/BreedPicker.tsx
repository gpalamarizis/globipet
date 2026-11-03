import { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Input } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Πεδίο «Ράτσα» με προτάσεις από τον κατάλογο (/breeds), με φωτογραφία —
 * όπως το web/src/components/features/pets/BreedPicker.tsx.
 *
 * Μένει ελεύθερο κείμενο (ημίαιμα, σπάνιες ράτσες, πουλιά…). Οι προτάσεις
 * εμφανίζονται κάτω από το πεδίο (όχι αναδυόμενες), ώστε να μην κόβονται
 * μέσα στο ScrollView της φόρμας.
 */
export function BreedPicker({ species, value, onChange }: {
  species: string
  value: string
  onChange: (v: string) => void
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const hasCatalog = species === 'dog' || species === 'cat'

  useEffect(() => {
    const h = setTimeout(() => setQ(value.trim()), 300)
    return () => clearTimeout(h)
  }, [value])

  const { data } = useQuery({
    queryKey: ['breed-picker', species, q],
    queryFn: () => api.get('/breeds', { params: { species, q: q || undefined, limit: 6 } }).then(r => r.data?.data ?? []),
    enabled: open && hasCatalog && q.length > 0,
    staleTime: 5 * 60_000,
  })
  const items: any[] = Array.isArray(data) ? data : []
  const name = (b: any) => (i18n.language === 'el' && b.name_el) ? b.name_el : b.name
  const pick = (v: string) => { onChange(v); setOpen(false) }
  const mixed = t('pets.breed_mixed')

  return (
    <View>
      <Input label={t('pets.breed')} value={value} placeholder={t('pets.breed_placeholder')}
        hint={hasCatalog && !open ? t('pets.breed_hint') : undefined}
        onChangeText={v => { onChange(v); setOpen(true) }}
        style={open && hasCatalog && value.trim() ? { marginBottom: space.xs } : undefined} />
      {open && hasCatalog && value.trim().length > 0 && (
        <View style={s.list}>
          {items.map(b => (
            <TouchableOpacity key={b.id} activeOpacity={0.7} style={s.row} onPress={() => pick(name(b))}>
              {b.image_url
                ? <Image source={{ uri: b.image_url }} style={s.thumb} />
                : <View style={[s.thumb, s.thumbEmpty]}><Text>{b.species === 'cat' ? '🐱' : '🐶'}</Text></View>}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>{name(b)}</Text>
                {name(b) !== b.name && <Text style={s.sub} numberOfLines={1}>{b.name}</Text>}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.7} style={[s.row, s.mixed]} onPress={() => pick(mixed)}>
            <Text style={s.sub}>{mixed}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: space.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  mixed: { borderTopWidth: 1, borderTopColor: colors.border },
  thumb: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, color: colors.text, fontWeight: weight.medium },
  sub: { ...type.caption, color: colors.textMuted },
})
