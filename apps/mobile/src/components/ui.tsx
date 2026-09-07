import React, { useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, ViewStyle, RefreshControl, Animated, KeyboardTypeOptions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { router } from 'expo-router'
import theme, { colors, space, radius, font, weight, shadow, icon, touch } from '@/theme'

const typo = theme.type

/**
 * Κοινά στοιχεία διεπαφής.
 *
 * ΓΙΑΤΙ
 *   Κάθε οθόνη έγραφε δικό της header, δική της κάρτα, δικό της άδειο
 *   μήνυμα. Το αποτέλεσμα ήταν ασυνεπές. Εδώ ορίζονται μία φορά.
 *
 * ΤΙ ΠΡΟΣΤΕΘΗΚΕ (07/09)
 *   Skeleton, SkeletonRows και Input. Καμία υπάρχουσα εξαγωγή δεν άλλαξε
 *   συμπεριφορά — οι 17 οθόνες που ήδη τα χρησιμοποιούν δεν χρειάζονται
 *   καμία αλλαγή.
 */

// ═══════════════════════════════════════════════════════════════════════
//  Screen — το περίβλημα κάθε οθόνης
// ═══════════════════════════════════════════════════════════════════════

type ScreenProps = {
  children: React.ReactNode
  /** Τίτλος στην κεφαλίδα. Χωρίς αυτόν, δεν αποδίδεται κεφαλίδα. */
  title?: string
  subtitle?: string
  /** Κουμπί επιστροφής. Προεπιλογή: ναι όταν υπάρχει τίτλος. */
  back?: boolean
  /** Ενέργεια δεξιά στην κεφαλίδα. */
  action?: React.ReactNode
  /** Κύλιση. Απενεργοποίησέ τη για οθόνες με δική τους λίστα. */
  scroll?: boolean
  onRefresh?: () => void
  refreshing?: boolean
  style?: ViewStyle
}

export function Screen({
  children, title, subtitle, back, action,
  scroll = true, onRefresh, refreshing = false, style,
}: ScreenProps) {
  const showBack = back ?? !!title

  const header = title ? (
    <View style={s.header}>
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <ChevronLeft size={icon.lg} color={colors.text} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  ) : null

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ padding: space.lg, paddingBottom: space.xxxl }, style]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh
        ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, style]}>{children}</View>
  )

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {header}
      {body}
    </SafeAreaView>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Card
// ═══════════════════════════════════════════════════════════════════════

export function Card({
  children, onPress, style, padded = true,
}: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle; padded?: boolean }) {
  const content = (
    <View style={[s.card, padded && { padding: space.lg }, style]}>{children}</View>
  )
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
    : content
}

// ═══════════════════════════════════════════════════════════════════════
//  Button
// ═══════════════════════════════════════════════════════════════════════

type BtnProps = {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  loading?: boolean
  disabled?: boolean
  full?: boolean
  style?: ViewStyle
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  icon: ico, loading, disabled, full, style,
}: BtnProps) {
  const bg =
    variant === 'primary'   ? colors.brand :
    variant === 'danger'    ? colors.danger :
    variant === 'secondary' ? colors.surface : 'transparent'

  const fg =
    variant === 'primary' || variant === 'danger' ? colors.textOnDark :
    variant === 'secondary' ? colors.text : colors.brand

  const pad =
    size === 'sm' ? { paddingVertical: space.sm,  paddingHorizontal: space.md } :
    size === 'lg' ? { paddingVertical: space.lg,  paddingHorizontal: space.xxl } :
                    { paddingVertical: space.md,  paddingHorizontal: space.xl }

  const fs = size === 'sm' ? font.sm : size === 'lg' ? font.lg : font.base

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        s.btn, pad,
        { backgroundColor: bg },
        size !== 'sm' && { minHeight: touch.min },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        full && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.5 },
        variant === 'primary' && shadow.sm,
        style,
      ]}>
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : <>
            {ico}
            <Text style={[s.btnLabel, { color: fg, fontSize: fs }]}>{label}</Text>
          </>}
    </TouchableOpacity>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Badge
// ═══════════════════════════════════════════════════════════════════════

export function Badge({
  label, tone = 'neutral', style,
}: { label: string; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'; style?: ViewStyle }) {
  const map = {
    neutral: [colors.surfaceAlt, colors.textMuted],
    brand:   [colors.brandLight, colors.brand],
    success: [colors.successBg,  '#047857'],
    warning: [colors.warningBg,  '#B45309'],
    danger:  [colors.dangerBg,   '#B91C1C'],
    info:    [colors.infoBg,     '#1D4ED8'],
  } as const
  const [bg, fg] = map[tone]
  return (
    <View style={[s.badge, { backgroundColor: bg }, style]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  EmptyState
// ═══════════════════════════════════════════════════════════════════════

export function EmptyState({
  icon: Ico, title, message, action,
}: { icon?: any; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <View style={s.empty}>
      {Ico ? (
        <View style={s.emptyIcon}>
          <Ico size={icon.xl} color={colors.textLight} />
        </View>
      ) : null}
      <Text style={s.emptyTitle}>{title}</Text>
      {message ? <Text style={s.emptyMsg}>{message}</Text> : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Loading
// ═══════════════════════════════════════════════════════════════════════

export function Loading({ label }: { label?: string }) {
  return (
    <View style={s.loading}>
      <ActivityIndicator size="large" color={colors.brand} />
      {label ? <Text style={s.loadingLabel}>{label}</Text> : null}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Skeleton — ΝΕΟ
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ένας σπινάρων κύκλος λέει «περίμενε». Ένα skeleton λέει «περίμενε, και
 * να τι έρχεται» — η οθόνη δεν αναπηδά όταν φτάσουν τα δεδομένα, γιατί ο
 * χώρος είναι ήδη δεσμευμένος στο σωστό μέγεθος.
 */
export function Skeleton({
  width = '100%', height = 16, round = radius.sm, style,
}: { width?: number | string; height?: number; round?: number; style?: ViewStyle }) {
  const pulse = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 750, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: round,
          backgroundColor: colors.surfaceAlt, opacity: pulse },
        style,
      ]} />
  )
}

/** Έτοιμος σκελετός λίστας — τόσες κάρτες όσες χωρούν σε μια οθόνη. */
export function SkeletonRows({ count = 4, height = 96 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} round={radius.lg} />
      ))}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Input — ΝΕΟ
// ═══════════════════════════════════════════════════════════════════════

type InputProps = {
  label?: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  multiline?: boolean
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  editable?: boolean
  style?: ViewStyle
}

export function Input({
  label, value, onChangeText, placeholder, hint, error,
  multiline, secureTextEntry, keyboardType, autoCapitalize, editable = true, style,
}: InputProps) {
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label ? <Text style={s.inputLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[
          s.input,
          multiline && { height: 104, textAlignVertical: 'top' },
          !!error && { borderColor: colors.danger },
          !editable && { backgroundColor: colors.surfaceAlt, color: colors.textMuted },
        ]} />
      {error ? <Text style={s.inputError}>{error}</Text>
        : hint ? <Text style={s.inputHint}>{hint}</Text> : null}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  SectionHeader
// ═══════════════════════════════════════════════════════════════════════

export function SectionHeader({
  title, actionLabel, onAction,
}: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerTitle: { fontSize: font.xl, fontWeight: weight.bold, color: colors.text },
  headerSub:   { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
    ...shadow.sm,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, borderRadius: radius.md,
  },
  btnLabel: { fontWeight: weight.semibold },

  badge: {
    paddingHorizontal: space.sm, paddingVertical: 3,
    borderRadius: radius.full, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.xs, fontWeight: weight.semibold },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xxl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: radius.xxl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  emptyTitle: {
    fontSize: font.lg, fontWeight: weight.semibold,
    color: colors.text, textAlign: 'center',
  },
  emptyMsg: {
    fontSize: font.sm, color: colors.textMuted,
    textAlign: 'center', marginTop: space.xs, lineHeight: 20,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingLabel: { fontSize: font.sm, color: colors.textMuted, marginTop: space.md },

  inputLabel: {
    ...typo.caption, fontWeight: weight.semibold,
    color: colors.textMuted, marginBottom: space.xs,
  },
  input: {
    minHeight: touch.min,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.md,
    ...typo.body, color: colors.text,
  },
  inputHint:  { ...typo.caption, color: colors.textLight, marginTop: space.xs },
  inputError: { ...typo.caption, color: colors.danger, marginTop: space.xs },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md, marginTop: space.sm,
  },
  sectionTitle: { fontSize: font.lg, fontWeight: weight.bold, color: colors.text },
  sectionAction: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.brand },
})

export default {
  Screen, Card, Button, Badge, EmptyState, Loading,
  Skeleton, SkeletonRows, Input, SectionHeader,
}
