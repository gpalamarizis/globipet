import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Flag, Ban, X, ChevronRight } from 'lucide-react-native'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * «⋯» σε περιεχόμενο χρηστών: Αναφορά και Αποκλεισμός χρήστη.
 *
 * App Store Guideline 1.2 / Google Play UGC: απαιτούνται και τα δύο σε κάθε
 * δημοσίευση, σχόλιο, θέμα και απάντηση forum, μήνυμα κοινότητας.
 *   Αναφορά     → POST /moderation/report — ο admin ειδοποιείται (δράση ≤ 24 ώρες).
 *   Αποκλεισμός → POST /moderation/block — το περιεχόμενο του χρήστη φεύγει
 *                 από όλα τα feeds· αναίρεση από Απόρρητο → Αποκλεισμένοι χρήστες.
 * Στο δικό μου περιεχόμενο δεν εμφανίζεται (is_mine).
 * Ίδια λειτουργία με το web (components/ContentActions.tsx).
 */
export type ContentKind = 'post' | 'comment' | 'topic' | 'reply' | 'community_message'

const REASONS = ['spam', 'harassment', 'hate', 'inappropriate', 'other'] as const

export function ContentActions({ type, id, isMine, size = icon.md, onBlocked }: {
  type: ContentKind
  id: string
  isMine?: boolean
  size?: number
  onBlocked?: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'menu' | 'report'>('menu')
  const [sending, setSending] = useState(false)

  if (isMine) return null

  const close = () => { setOpen(false); setStep('menu') }

  const openMenu = () => {
    if (!isAuthenticated) {
      Alert.alert(t('moderation.loginTitle'), t('moderation.loginHint'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push('/auth/login' as any) },
      ])
      return
    }
    setOpen(true)
  }

  const report = async (reason: typeof REASONS[number]) => {
    if (sending) return
    setSending(true)
    try {
      await api.post('/moderation/report', { type, id, reason: t(`moderation.reason_${reason}`) })
      close()
      Alert.alert(t('moderation.reportedTitle'), t('moderation.reportedHint'))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || e?.response?.data?.message || t('common.something_wrong'))
    } finally { setSending(false) }
  }

  const block = () => {
    close()
    Alert.alert(t('moderation.blockTitle'), t('moderation.blockConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('moderation.block'), style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/moderation/block', { type, id })
            // Όλα τα feeds ξαναφορτώνονται χωρίς τον αποκλεισμένο.
            await qc.invalidateQueries()
            onBlocked?.()
            Alert.alert(t('moderation.blockedTitle'), t('moderation.blockedHint'))
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || e?.response?.data?.message || t('common.something_wrong'))
          }
        },
      },
    ])
  }

  return (
    <>
      <TouchableOpacity onPress={openMenu} hitSlop={10} style={s.trigger}
        accessibilityRole="button" accessibilityLabel={t('moderation.more')}>
        <MoreHorizontal size={size} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={close}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>
                {step === 'menu' ? t('moderation.more') : t('moderation.reportWhy')}
              </Text>
              <TouchableOpacity onPress={close} hitSlop={8} accessibilityLabel={t('moderation.close')}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {step === 'menu' ? (
              <>
                <TouchableOpacity style={s.row} onPress={() => setStep('report')} activeOpacity={0.7}>
                  <Flag size={icon.md} color={colors.text} />
                  <Text style={s.rowTxt}>{t('moderation.report')}</Text>
                  <ChevronRight size={icon.sm} color={colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity style={s.row} onPress={block} activeOpacity={0.7}>
                  <Ban size={icon.md} color={colors.danger} />
                  <Text style={[s.rowTxt, { color: colors.danger }]}>{t('moderation.blockUser')}</Text>
                  <View style={{ width: icon.sm }} />
                </TouchableOpacity>
              </>
            ) : (
              REASONS.map(r => (
                <TouchableOpacity key={r} style={[s.row, sending && { opacity: 0.5 }]} disabled={sending}
                  onPress={() => report(r)} activeOpacity={0.7}>
                  <Text style={s.rowTxt}>{t(`moderation.reason_${r}`)}</Text>
                  <ChevronRight size={icon.sm} color={colors.textLight} />
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  trigger: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.lg, paddingBottom: space.xxxl, gap: space.xs,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  sheetTitle: { ...type.section, color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: touch.comfortable, paddingHorizontal: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowTxt: { ...type.body, color: colors.text, flex: 1, fontWeight: weight.medium },
})
