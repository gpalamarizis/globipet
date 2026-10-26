import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar, Clock, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import theme, { colors, space, radius, weight, touch } from '@/theme'
import { fmtDateShort, dateLocale } from '@/lib/dates'

/**
 * Ε17 — Πεδία ημερομηνίας/ώρας με ημερολόγιο του συστήματος.
 *
 * ΓΙΑΤΙ
 *   Πριν, κάθε ημερομηνία γραφόταν με το χέρι ως YYYY-MM-DD (ξένη μορφή για
 *   τους Ευρωπαίους, εύκολα λάθη). Τώρα ο χρήστης διαλέγει από ημερολόγιο και
 *   βλέπει την ημερομηνία στη μορφή της γλώσσας του (π.χ. 15/03/2026).
 *
 * ΣΥΜΒΟΛΑΙΟ
 *   value / onChange: πάντα 'YYYY-MM-DD' (DateField) ή 'HH:mm' (TimeField),
 *   ή '' όταν είναι κενό — ΙΔΙΑ μορφή με ό,τι στέλνουν σήμερα οι φόρμες στον
 *   server, οπότε τίποτα δεν αλλάζει στο backend.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function parseYmd(v: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) ? null : d
}
function parseHm(v: string | null | undefined): Date | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(v ?? '')
  if (!m) return null
  const d = new Date()
  d.setHours(+m[1], +m[2], 0, 0)
  return d
}

type BaseProps = {
  label?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  hint?: string
  error?: string
  placeholder?: string
  /** Επιτρέπει «Καθαρισμό» για προαιρετικά πεδία. */
  clearable?: boolean
  disabled?: boolean
  /** Εξωτερικό στυλ (π.χ. flex: 1 σε σειρά δύο πεδίων), όπως το Input. */
  style?: StyleProp<ViewStyle>
}

type PickerProps = BaseProps & {
  mode: 'date' | 'time'
  minimumDate?: Date
  maximumDate?: Date
}

function PickerField({
  mode, label, value, onChange, required, hint, error, placeholder,
  clearable, disabled, minimumDate, maximumDate, style,
}: PickerProps) {
  const { t, i18n } = useTranslation()
  const [iosOpen, setIosOpen] = useState(false)
  const [iosTemp, setIosTemp] = useState<Date>(new Date())
  const current = mode === 'date' ? parseYmd(value) : parseHm(value)
  const shown = !value ? '' : mode === 'date' ? fmtDateShort(value, i18n.language) : value
  const Icon = mode === 'date' ? Calendar : Clock

  const commit = (d: Date) => onChange(mode === 'date' ? toYmd(d) : toHm(d))

  const open = () => {
    if (disabled) return
    const start = current ?? (mode === 'date' ? (minimumDate && minimumDate > new Date() ? minimumDate : new Date()) : new Date())
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode,
        is24Hour: true,
        minimumDate,
        maximumDate,
        onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === 'set' && d) commit(d) },
      })
    } else {
      setIosTemp(start)
      setIosOpen(true)
    }
  }

  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label ? <Text style={s.label}>{label}{required ? ' *' : ''}</Text> : null}
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[s.input, !!error && { borderColor: colors.danger }, disabled && { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[s.value, disabled && { color: colors.textMuted }, !shown && { color: colors.textLight }]} numberOfLines={1}>
          {shown || placeholder || (mode === 'date' ? t('dateField.pickDate') : t('dateField.pickTime'))}
        </Text>
        {clearable && !!value && !disabled ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={10} accessibilityLabel={t('dateField.clear')}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Icon size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <View style={s.sheetBar}>
                <TouchableOpacity onPress={() => setIosOpen(false)} hitSlop={10}>
                  <Text style={s.sheetCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { commit(iosTemp); setIosOpen(false) }} hitSlop={10}>
                  <Text style={s.sheetDone}>{t('dateField.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTemp}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                // Φύλλο με ανοιχτό φόντο (colors.surface): χωρίς themeVariant, σε σκοτεινό θέμα iOS τα
                // γράμματα του picker βγαίνουν λευκά πάνω σε ανοιχτό. Locale πλήρες
                // (π.χ. el-GR), ίδιο με την εμφάνιση της ημερομηνίας (lib/dates).
                themeVariant="light"
                locale={dateLocale(i18n.language)}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_e, d) => { if (d) setIosTemp(d) }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

export function DateField(props: BaseProps & { minimumDate?: Date; maximumDate?: Date }) {
  return <PickerField mode="date" {...props} />
}

export function TimeField(props: BaseProps) {
  return <PickerField mode="time" {...props} />
}

const typo = theme.type

// Ίδια εμφάνιση με το Input του ui.tsx (ετικέτα, πλαίσιο, βοήθεια, σφάλμα).
const s = StyleSheet.create({
  label: { ...typo.caption, fontWeight: weight.semibold, color: colors.textMuted, marginBottom: space.xs },
  input: {
    minHeight: touch.min, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
  },
  value: { ...typo.body, flex: 1, color: colors.text },
  hint: { ...typo.caption, color: colors.textLight, marginTop: space.xs },
  error: { ...typo.caption, color: colors.danger, marginTop: space.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: space.xl },
  sheetBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.md },
  sheetCancel: { ...typo.body, color: colors.textMuted },
  sheetDone: { ...typo.body, color: colors.brand, fontWeight: weight.bold },
})
