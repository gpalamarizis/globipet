import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, Linking, Alert, AppState } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, BellRing } from 'lucide-react-native'
import { getPushState, setPushEnabled, type PushState } from '@/lib/notifications'
import { Screen, Card, Button, Badge, Loading } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ειδοποιήσεις για ΑΥΤΗ τη συσκευή — αντίστοιχη της κάρτας «Ειδοποιήσεις»
 * του web. Τέσσερις καταστάσεις, καθεμία με το δικό της μήνυμα:
 * ενεργές, ανενεργές, αποκλεισμένες από το σύστημα (μόνο από τις ρυθμίσεις
 * του τηλεφώνου ξεκλειδώνουν), και συσκευή χωρίς υποστήριξη (προσομοιωτής).
 *
 * Όταν ο χρήστης γυρίζει από τις ρυθμίσεις του τηλεφώνου, η κατάσταση
 * ξαναδιαβάζεται — αλλιώς θα έβλεπε «αποκλεισμένες» ενώ μόλις τις επέτρεψε.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => { getPushState().then(setState) }, [])

  useEffect(() => {
    refresh()
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh() })
    return () => sub.remove()
  }, [refresh])

  const toggle = async (on: boolean) => {
    setBusy(true)
    const next = await setPushEnabled(on)
    setBusy(false)
    setState(next)
    if (on && next === 'on') Alert.alert(t('account.enabled'))
    else if (on && next === 'denied') Alert.alert(t('account.notGranted'))
    else if (on) Alert.alert(t('account.genericError'))
    else Alert.alert(t('account.disabled'))
  }

  if (!state) return (
    <Screen title={t('account.notifications')} back><Loading /></Screen>
  )

  const isOn = state === 'on'
  const Ico = isOn ? BellRing : Bell

  return (
    <Screen title={t('account.notifications')} back>
      <Card>
        <View style={s.row}>
          <View style={[s.iconBox, isOn && s.iconBoxOn]}>
            <Ico size={icon.md} color={isOn ? colors.brand : colors.textLight} />
          </View>
          <View style={s.textCol}>
            <View style={s.titleRow}>
              <Text style={s.title}>{t('account.notifications')}</Text>
              {(state === 'on' || state === 'off') && (
                <Badge label={isOn ? t('account.statusOn') : t('account.statusOff')}
                  tone={isOn ? 'success' : 'neutral'} />
              )}
            </View>
            <Text style={s.desc}>
              {state === 'unsupported' ? t('account.unsupportedApp')
                : isOn ? t('account.notifOn') : t('account.notifOffApp')}
            </Text>
          </View>
        </View>

        {state === 'denied' && (
          <>
            <Text style={s.note}>{t('account.notifDeniedApp')}</Text>
            <Button full variant="secondary" label={t('account.openSettings')}
              onPress={() => Linking.openSettings()} />
          </>
        )}

        {(state === 'on' || state === 'off') && (
          <Button full variant={isOn ? 'secondary' : 'primary'} loading={busy}
            icon={isOn ? <BellOff size={16} color={colors.text} /> : <Bell size={16} color={colors.textOnDark} />}
            label={busy ? t('account.wait') : isOn ? t('account.disable') : t('account.enable')}
            onPress={() => toggle(!isOn)} />
        )}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.lg },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBoxOn: { backgroundColor: colors.brandLight },
  textCol: { flex: 1, minWidth: 0 },
  // Τίτλος και σήμα στην ίδια γραμμή, κεντραρισμένα κάθετα.
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.body, color: colors.text, fontWeight: weight.bold },
  desc: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  note: {
    ...type.caption, color: colors.textMuted, backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md, padding: space.md, marginBottom: space.md,
  },
})
