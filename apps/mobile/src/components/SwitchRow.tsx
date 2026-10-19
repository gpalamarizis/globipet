import { View, Text, Switch, StyleSheet } from 'react-native'
import { colors, space, type, weight } from '@/theme'

/** Ετικέτα αριστερά, διακόπτης δεξιά, κεντραρισμένα κάθετα. */
export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md,
    minHeight: 44, marginBottom: space.md,
  },
  label: { ...type.body, color: colors.text, fontWeight: weight.medium, flex: 1 },
})
