import { useCallback, useRef, useState } from 'react'
import { View, Text, StyleSheet, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { CreditCard, Receipt, FileText, Info, TriangleAlert } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, SkeletonRows, EmptyState } from '@/components/ui'
import { colors, space, type, weight, icon } from '@/theme'
import { fmtDateShort } from '@/lib/dates'
import { fmtEur } from '@/lib/money'

/**
 * Ε18 — Πληρωμές και αποδεικτικά (ίδια λειτουργία με το web /account/payments).
 *
 *   Τρόποι πληρωμής: «Διαχείριση κάρτας και τιμολογίων» → Stripe Customer
 *   Portal (POST /payments/billing-portal). Στη Viva δεν αποθηκεύεται κάρτα.
 *   Ιστορικό: GET /payments/history — πληρωμές Viva (με αποδεικτικό GlobiPet)
 *   και τιμολόγια Stripe των συνδρομών (σύνδεσμοι του Stripe).
 */

type Kind = 'order' | 'booking' | 'telehealth' | 'event' | 'subscription'
type Status = 'paid' | 'refunded' | 'partially_refunded'
interface PaymentItem {
  id: string
  kind: Kind
  ref: string
  description: string | null
  amount: number
  currency: 'EUR'
  status: Status
  refunded_amount: number | null
  date: string
  receipt: boolean
  invoice_url: string | null
  invoice_pdf: string | null
}

const STATUS_TONE: Record<Status, 'success' | 'neutral' | 'warning'> = {
  paid: 'success',
  refunded: 'neutral',
  partially_refunded: 'warning',
}

/** Μόνο σύνδεσμοι https (του Stripe) ανοίγουν — τίποτα javascript:/data:/intent: (όπως το web safeHttps). */
const safeHttps = (u: string | null | undefined) => (u && /^https:\/\//i.test(u.trim()) ? u.trim() : null)

/** Άνοιγμα εξωτερικής σελίδας (ίδιος έλεγχος με το checkout του pricing.tsx). */
async function openExternal(url: string, t: TFunction) {
  const ok = await Linking.canOpenURL(url).catch(() => false)
  if (ok) Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('payments.openFailed')))
  else Alert.alert(t('common.error'), t('payments.openFailed'))
}

/**
 * Stripe Customer Portal — κοινό για «Πληρωμές» και GlobiPet Plus
 * (payment_failed → «Διαχείριση κάρτας»). 404 no_stripe_customer / 503
 * portal_unavailable → φιλικό μήνυμα.
 */
export function useBillingPortal() {
  const { t } = useTranslation()
  const [opening, setOpening] = useState(false)
  // Κλείδωμα διπλού πατήματος: το state αργεί ένα render, το ref όχι.
  const lock = useRef(false)
  const open = useCallback(async () => {
    if (lock.current) return
    lock.current = true
    setOpening(true)
    try {
      const r = await api.post('/payments/billing-portal', {})
      const url = r?.data?.data?.url ?? r?.data?.url
      if (!url) Alert.alert(t('common.error'), t('payments.openFailed'))
      else await openExternal(String(url), t)
    } catch (e: any) {
      const st = e?.response?.status
      const code = e?.response?.data?.code
      if (st === 404 && code === 'no_stripe_customer') Alert.alert(t('payments.methodsTitle'), t('payments.noStripeCustomer'))
      else if (st === 503) Alert.alert(t('common.error'), t('payments.portalUnavailable'))
      else Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong'))
    } finally {
      lock.current = false
      setOpening(false)
    }
  }, [t])
  return { open, opening }
}

export default function PaymentsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [receiptFor, setReceiptFor] = useState<string | null>(null)
  const receiptLock = useRef(false)
  const portal = useBillingPortal()
  const lang = i18n.language

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payments-history', user?.id ?? null],
    queryFn: () => api.get('/payments/history').then(r => r.data as { data: PaymentItem[]; stripe_ok: boolean }),
    enabled: isAuthenticated,
  })
  const items: PaymentItem[] = Array.isArray(data?.data) ? data!.data : []

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['payments-history'] })
    setRefreshing(false)
  }, [qc])

  // Αποδεικτικό: βραχύβιος υπογεγραμμένος σύνδεσμος (ίδια ροή με τον ιατρικό
  // φάκελο, passport.tsx) — ο browser δεν έχει το τοκεν. Το id χωρίς πρόθεμα.
  const openReceipt = async (it: PaymentItem) => {
    if (receiptLock.current) return
    receiptLock.current = true
    const i = it.id.indexOf(':')
    const id = i >= 0 ? it.id.slice(i + 1) : it.id
    setReceiptFor(it.id)
    try {
      const { data: res } = await api.post('/payments/receipt-link', { kind: it.kind, id })
      const url = res?.path ? `${api.defaults.baseURL ?? ''}${res.path}` : res?.url
      if (!url) Alert.alert(t('common.error'), t('payments.receiptFailed'))
      else await openExternal(String(url), t)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('payments.receiptFailed'))
    } finally {
      receiptLock.current = false
      setReceiptFor(null)
    }
  }

  if (!isAuthenticated) return (
    <Screen title={t('payments.title')} back>
      <EmptyState icon={Receipt} title={t('payments.loginPrompt')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  return (
    <Screen title={t('payments.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      <View style={s.body}>
        {/* Τρόποι πληρωμής */}
        <Card>
          <Text style={s.section}>{t('payments.methodsTitle')}</Text>
          <Text style={[s.muted, { marginTop: space.xs }]}>{t('payments.methodsHint')}</Text>
          <Button full variant="secondary" label={t('payments.manage')}
            icon={<CreditCard size={icon.sm} color={colors.text} />}
            loading={portal.opening} disabled={portal.opening}
            onPress={portal.open} style={{ marginTop: space.md }} />
          <View style={s.noteRow}>
            <Info size={icon.xs} color={colors.textLight} style={s.noteIcon} />
            <Text style={[s.caption, { flex: 1 }]}>{t('payments.vivaNote')}</Text>
          </View>
        </Card>

        {/* Ιστορικό πληρωμών */}
        <Text style={[s.section, { marginTop: space.sm }]}>{t('payments.historyTitle')}</Text>

        {data && data.stripe_ok === false && (
          <Card style={s.warn}>
            <View style={s.noteRowTop}>
              <TriangleAlert size={icon.sm} color="#B45309" />
              <Text style={[s.caption, s.warnTxt]}>{t('payments.stripeWarn')}</Text>
            </View>
          </Card>
        )}

        {isLoading ? <SkeletonRows count={3} /> :
         isError ? (
          <EmptyState icon={Receipt} title={t('payments.loadError')}
            action={<Button variant="secondary" label={t('common.try_again')} onPress={() => refetch()} />} />
         ) :
         items.length === 0 ? (
          <EmptyState icon={Receipt} title={t('payments.empty')} message={t('payments.emptyHint')} />
         ) :
         items.map(it => {
          const status: Status = (['paid', 'refunded', 'partially_refunded'] as const).includes(it.status) ? it.status : 'paid'
          const inv = safeHttps(it.invoice_url)
          const pdf = safeHttps(it.invoice_pdf)
          const hasActions = it.receipt || !!inv || !!pdf
          const refunded = Number(it.refunded_amount)
          return (
            <Card key={it.id}>
              <View style={s.rowTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.kind} numberOfLines={1}>{t(`payments.kind_${it.kind}`, { defaultValue: it.kind })}</Text>
                  <Text style={s.caption} numberOfLines={1}>{fmtDateShort(it.date, lang)}</Text>
                </View>
                <Text style={s.amount} numberOfLines={1}>{fmtEur(it.amount, lang)}</Text>
              </View>
              {!!it.description && <Text style={s.desc} numberOfLines={2}>{it.description}</Text>}
              <View style={s.rowMid}>
                <Text style={[s.caption, { flex: 1 }]} numberOfLines={1}>{t('payments.ref', { ref: it.ref })}</Text>
                <Badge label={t(`payments.status_${status}`)} tone={STATUS_TONE[status]} />
              </View>
              {/* Πλήρης ή μερική επιστροφή: το ποσό όταν είναι γνωστό (>0)· αλλιώς μόνο το σήμα (όπως το web). */}
              {status !== 'paid' && it.refunded_amount != null && Number.isFinite(refunded) && refunded > 0 && (
                <Text style={[s.caption, s.refunded]}>{t('payments.refunded', { amount: fmtEur(refunded, lang) })}</Text>
              )}
              {hasActions && (
                <View style={s.actions}>
                  {it.receipt && (
                    <Button size="sm" variant="secondary" label={t('payments.receipt')}
                      icon={<Receipt size={icon.xs} color={colors.text} />}
                      loading={receiptFor === it.id} disabled={!!receiptFor}
                      onPress={() => openReceipt(it)} />
                  )}
                  {!!inv && (
                    <Button size="sm" variant="secondary" label={t('payments.invoice')}
                      icon={<FileText size={icon.xs} color={colors.text} />}
                      onPress={() => openExternal(inv, t)} />
                  )}
                  {!!pdf && (
                    <Button size="sm" variant="secondary" label={t('payments.pdf')}
                      icon={<FileText size={icon.xs} color={colors.text} />}
                      onPress={() => openExternal(pdf, t)} />
                  )}
                </View>
              )}
            </Card>
          )
        })}
        {/* Όπως το web: κάτω από το ιστορικό, όταν υπάρχουν πληρωμές. */}
        {!isLoading && !isError && items.length > 0 && (
          <Text style={s.caption}>{t('payments.receiptNote')}</Text>
        )}
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { gap: space.md },
  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  muted: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textLight },
  // Εικονίδιο 14 στη γραμμή κειμένου 16: +1 για κάθετη στοίχιση με την 1η γραμμή.
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.md },
  noteIcon: { marginTop: 1 },
  noteRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  warn: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  warnTxt: { color: '#B45309', flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  kind: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  amount: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, fontVariant: ['tabular-nums'] },
  desc: { ...type.body, color: colors.textMuted, marginTop: space.sm },
  rowMid: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  refunded: { color: colors.textMuted, marginTop: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
})
