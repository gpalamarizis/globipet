import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Επιλογή μίας τιμής από λίστα — ίδια εμφάνιση με τα φίλτρα των υπόλοιπων
 * οθονών. Η τιμή που αποθηκεύεται είναι πάντα το `value` (κλειδί), ποτέ το
 * μεταφρασμένο κείμενο, ώστε η βάση να μην εξαρτάται από τη γλώσσα.
 */
export function Chips<T extends string>({
  options, value, onChange, label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.chips}>
        {options.map(o => {
          const on = o.value === value
          return (
            <TouchableOpacity key={o.value || '_'} activeOpacity={0.7}
              style={[s.chip, on && s.chipOn]} onPress={() => onChange(o.value)}>
              <Text style={[s.txt, on && s.txtOn]}>{o.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  txt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  txtOn: { color: colors.brand, fontWeight: weight.bold },
})
