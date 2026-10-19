import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react-native'
import { Screen } from '@/components/ui'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

/** Συχνές ερωτήσεις — ίδια κλειδιά faq.q1–q10 / a1–a10 με το web. */
const N = 10

export default function FaqScreen() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(0)

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(o => (o === i ? null : i))
  }

  return (
    <Screen title={t('faq.title')} back>
      <Text style={s.intro}>{t('faq.subtitle')}</Text>
      {Array.from({ length: N }, (_, i) => i + 1).map(n => {
        const isOpen = open === n - 1
        return (
          <View key={n} style={s.item}>
            <TouchableOpacity activeOpacity={0.7} style={s.q} onPress={() => toggle(n - 1)}
              accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <Text style={s.qText}>{t(`faq.q${n}`)}</Text>
              <View style={isOpen ? s.chevOpen : undefined}>
                <ChevronDown size={icon.md} color={colors.textLight} />
              </View>
            </TouchableOpacity>
            {isOpen && <Text style={s.a}>{t(`faq.a${n}`)}</Text>}
          </View>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  item: {
    backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
  },
  q: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: touch.comfortable, paddingHorizontal: space.lg, paddingVertical: space.md,
  },
  qText: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  chevOpen: { transform: [{ rotate: '180deg' }] },
  a: { ...type.body, color: colors.textMuted, paddingHorizontal: space.lg, paddingBottom: space.lg },
})
