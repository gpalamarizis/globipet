import { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ArrowRight, Clock, PlayCircle, X } from 'lucide-react-native'
import { api } from '../lib/api'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Προβολή καμπανιών — ίδιο endpoint και ίδιοι κανόνες με το web.
 *
 * Κάθε οθόνη δηλώνει σελίδα και θέση. Αν δεν υπάρχει ενεργή καμπάνια, δεν
 * αποδίδεται τίποτα — καμία κενή περιοχή. Η προβολή μετριέται μία φορά ανά
 * εκκίνηση της εφαρμογής (ο server μετράει ούτως ή άλλως μία ανά μέρα).
 *
 * Οι σύνδεσμοι του web μεταφράζονται σε οθόνες του κινητού. Το βίντεο
 * ανοίγει στον browser: η εφαρμογή δεν έχει player και δεν αξίζει ένα νέο
 * native module για ένα banner.
 *
 * Ε16: όπως το web (internalLink) — ΜΟΝΟ εσωτερική διαδρομή /^\/(?![\/\\])/
 * στο link_url, και μόνο μέσω router· ποτέ εξωτερικό link_url με Linking.
 * Το βίντεο (media_url) ανοίγει μόνο αν είναι https:// (το web το παίζει σε
 * <video>/iframe μόνο από http(s)· κανένα άλλο σχήμα, π.χ. intent:, tel:).
 */
type Placement = {
  id: string; campaign_id: string; page: string; slot: string
  media_type: 'image' | 'video' | 'none'; media_url: string | null
  link_url: string | null; headline: string | null; subtext: string | null; cta_label: string | null
  title: string; discount_type: 'percent' | 'amount' | null; discount_value: number | null; ends_at: string
}

const counted = new Set<string>()

/** Διαδρομή του web → οθόνη του κινητού. null = δεν οδηγεί πουθενά. */
function mobileRoute(link: string | null): string | null {
  if (!link || !/^\/(?![\/\\])/.test(link)) return null
  const m = link.match(/^\/(?:marketplace|products)\/([^/?#]+)/)
  if (m) return `/products/${m[1]}`
  const sv = link.match(/^\/services\/([^/?#]+)/)
  if (sv) return `/services/${sv[1]}`
  if (link.startsWith('/services')) return '/(tabs)/services'
  if (link.startsWith('/marketplace')) return '/(tabs)/marketplace'
  return null
}

/** Βίντεο καμπάνιας: μόνο https:// (όχι άλλο σχήμα URL). */
const isHttpsUrl = (u: string | null): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u)

const RATIO: Record<string, number> = { hero: 3, banner: 4, sidebar: 2 / 3, inline: 4, popup: 1 }

export default function CampaignBanner({ page, slot = 'banner' }: { page: string; slot?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [dismissed, setDismissed] = useState<string[]>([])

  const { data: items = [] } = useQuery<Placement[]>({
    queryKey: ['campaign-placements', page, slot],
    queryFn: () => api.get(`/campaigns/placements?page=${page}&slot=${slot}`).then(r => r.data?.data ?? []),
    staleTime: 5 * 60_000,
    retry: false,
  })
  const visible = items.filter(i => !dismissed.includes(i.id))

  useEffect(() => {
    for (const it of visible) {
      if (counted.has(it.campaign_id)) continue
      counted.add(it.campaign_id)
      api.post(`/campaigns/${it.campaign_id}/view`).catch(() => {})
    }
  }, [visible])

  if (!visible.length) return null

  const open = (it: Placement) => {
    api.post(`/campaigns/${it.campaign_id}/click`).catch(() => {})
    if (it.media_type === 'video' && isHttpsUrl(it.media_url) && !it.link_url) { Linking.openURL(it.media_url).catch(() => {}); return }
    const to = mobileRoute(it.link_url)
    if (to) router.push(to as any)
  }

  return (
    <View style={s.wrap}>
      {visible.map(it => {
        const discount = !it.discount_type ? null
          : it.discount_type === 'percent' ? `−${it.discount_value}%` : `−${it.discount_value}€`
        const left = Math.ceil((new Date(it.ends_at).getTime() - Date.now()) / 864e5)
        const tappable = !!mobileRoute(it.link_url) || (it.media_type === 'video' && isHttpsUrl(it.media_url) && !it.link_url)
        const closable = slot === 'popup' || slot === 'sidebar'
        // Το κάθετο «sidebar» του web δεν χωράει στο πλάτος του κινητού.
        const ratio = slot === 'sidebar' ? 16 / 9 : (RATIO[slot] ?? 4)
        return (
          <TouchableOpacity key={it.id} activeOpacity={tappable ? 0.8 : 1} disabled={!tappable}
            onPress={() => open(it)} style={[s.card, slot === 'hero' && s.hero]}>
            {it.media_type === 'image' && !!it.media_url && (
              <Image source={{ uri: it.media_url }} style={[s.media, { aspectRatio: ratio }]} resizeMode="cover" />
            )}
            {it.media_type === 'video' && !!it.media_url && (
              <View style={[s.media, s.video, { aspectRatio: 16 / 9 }]}>
                <PlayCircle size={44} color={colors.textOnDark} />
                <Text style={s.videoTxt}>{t('campaignUi.watchVideo')}</Text>
              </View>
            )}
            <View style={s.body}>
              {!!discount && <View style={s.discount}><Text style={s.discountTxt}>{discount}</Text></View>}
              <Text style={[s.title, slot === 'hero' && s.titleHero]}>{it.headline || it.title}</Text>
              {!!it.subtext && <Text style={s.sub}>{it.subtext}</Text>}
              {left > 0 && left <= 7 && (
                <View style={s.left}>
                  <Clock size={12} color={colors.warning} />
                  <Text style={s.leftTxt}>{left === 1 ? t('campaignUi.lastDay') : t('campaignUi.daysLeft', { count: left })}</Text>
                </View>
              )}
              {!!it.cta_label && !!mobileRoute(it.link_url) && (
                <View style={s.cta}>
                  <Text style={s.ctaTxt}>{it.cta_label}</Text>
                  <ArrowRight size={icon.sm} color={colors.brand} />
                </View>
              )}
            </View>
            {closable && (
              <TouchableOpacity style={s.close} hitSlop={10} accessibilityLabel={t('campaignUi.close')}
                onPress={() => setDismissed(d => [...d, it.id])}>
                <X size={14} color={colors.textOnDark} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: space.md, marginBottom: space.md },
  card: {
    borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hero: { borderColor: colors.brandTint, backgroundColor: colors.brandLight },
  media: { width: '100%', backgroundColor: colors.surfaceAlt },
  video: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  videoTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.semibold },
  body: { padding: space.md, gap: space.xs },
  discount: { alignSelf: 'flex-start', backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 2 },
  discountTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },
  title: { ...type.body, color: colors.text, fontWeight: weight.bold },
  titleHero: { ...type.title },
  sub: { ...type.caption, color: colors.textMuted },
  left: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leftTxt: { ...type.caption, color: '#B45309' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.xs },
  ctaTxt: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
  close: {
    position: 'absolute', top: space.sm, right: space.sm, width: 28, height: 28, borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
})
