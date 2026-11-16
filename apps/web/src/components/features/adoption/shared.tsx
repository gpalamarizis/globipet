import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Heart, BadgeCheck, MapPin, Scale, Send, ExternalLink, BookOpen, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Υιοθεσία — κοινά κομμάτια του web (κάρτα, οδηγός, AI βοηθός, modal).
 * Ίδια δομή και ίδια κλειδιά κειμένων με τις οθόνες του κινητού.
 */

export const SPECIES = ['dog', 'cat', 'rabbit', 'ferret', 'bird', 'rodent', 'reptile', 'other'] as const
export const GUIDE_COUNTRIES = ['GR', 'ES', 'GB', 'FR', 'CN'] as const
export const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', ferret: '🦦', bird: '🐦', rodent: '🐹', reptile: '🦎', other: '🐾' }

export type AdoptionListing = {
  id: string; name: string; species: string; breed: string | null; is_mixed: boolean; sex: string; birth_date_est: string; age_weeks: number
  size: string | null; color: string | null; weight_kg: number | null; microchip_number: string | null; has_microchip: boolean
  is_sterilized: boolean; is_vaccinated: boolean; is_dewormed: boolean; health_notes: string | null; special_needs: boolean
  good_with_kids: string; good_with_dogs: string; good_with_cats: string; house_trained: boolean | null; energy_level: string | null
  description: string; photos: string[]; country: string; city: string; latitude: number | null; longitude: number | null
  adoption_fee: number; fee_currency: string; fee_breakdown: string | null; requirements: string | null; allows_abroad: boolean; bred_by_lister: boolean
  source: string; lister_type: 'organisation' | 'individual'; service_id: string | null; status: string; is_hidden: boolean; hidden_reason?: string | null
  adopted_at: string | null; views_count: number; created_at: string; is_mine: boolean; is_favorite?: boolean
  lister: { name: string; type: string; verified: boolean; service_id: string | null; contact_phone?: string | null; contact_email?: string | null }
  my_application?: { id: string; status: string } | null
}

/** Η ηλικία σε ανθρώπινη μορφή: εβδομάδες → μήνες → έτη. */
export function ageLabel(t: (k: string, o?: any) => string, weeks: number): string {
  if (weeks < 16) return t('adoption.age.weeks', { count: Math.max(weeks, 0) })
  if (weeks < 104) return t('adoption.age.months', { count: Math.floor(weeks / 4.345) })
  return t('adoption.age.years', { count: Math.floor(weeks / 52.18) })
}

export function money(amount: number, currency: string, lang: string): string {
  try { return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount) }
  catch { return `${amount.toFixed(2)} ${currency}` }
}

export function countryName(t: (k: string, o?: any) => string, code: string): string {
  return (GUIDE_COUNTRIES as readonly string[]).includes(code) ? t(`adoption.countries.${code}`) : code
}

export const APP_STATUS_CLS: Record<string, string> = {
  pending: 'badge-blue', reviewing: 'badge-orange', approved: 'badge-green', rejected: 'badge-gray', withdrawn: 'badge-gray', completed: 'badge-green',
}
export const LISTING_STATUS_CLS: Record<string, string> = {
  available: 'badge-green', reserved: 'badge-orange', adopted: 'badge-blue', withdrawn: 'badge-gray',
}

/** Κανόνες + οδηγός χώρας από τον server, στη γλώσσα της εφαρμογής. */
export function useAdoptionRules(country: string) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'el').slice(0, 2)
  return useQuery({
    queryKey: ['adoption-rules', country, lang],
    queryFn: () => api.get('/adoption/rules', { params: { country, lang } }).then(r => r.data),
    enabled: /^[A-Z]{2}$/.test(country),
    staleTime: 60 * 60 * 1000,
  })
}

// ─── Κάρτα ζώου ───────────────────────────────────────────────────────
export function AdoptionCard({ l, onToggleFavorite }: { l: AdoptionListing; onToggleFavorite?: (l: AdoptionListing) => void }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const photo = l.photos?.[0]
  return (
    <Link to={`/adoption/${l.id}`} className="card-hover overflow-hidden flex flex-col group">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {photo
          ? <img src={photo} alt={l.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center text-5xl">{SPECIES_EMOJI[l.species] ?? '🐾'}</div>}
        {l.status !== 'available' && (
          <span className={cn('absolute top-3 left-3', LISTING_STATUS_CLS[l.status] ?? 'badge-gray')}>{t(`adoption.status.${l.status}`)}</span>
        )}
        {onToggleFavorite && (
          <button type="button" aria-label={t('adoption.card.favorite')} aria-pressed={!!l.is_favorite}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(l) }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow">
            <Heart size={18} className={l.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500'} />
          </button>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight truncate">{l.name}</h3>
          <span className={l.adoption_fee > 0 ? 'badge-orange shrink-0' : 'badge-green shrink-0'}>
            {l.adoption_fee > 0 ? money(l.adoption_fee, l.fee_currency, lang) : t('adoption.card.free')}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {t(`adoption.species.${l.species}`)}{l.breed ? ` · ${l.breed}` : ''} · {t(`adoption.sex.${l.sex}`)} · {ageLabel(t, l.age_weeks)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{l.city}, {countryName(t, l.country)}</span></span>
          <span className="flex items-center gap-1 shrink-0">
            {l.lister.verified && <BadgeCheck size={13} className="text-green-600" aria-label={t('adoption.card.verified')} />}
            {t(`adoption.card.${l.lister.type === 'organisation' ? 'organisation' : 'individual'}`)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn('bg-white dark:bg-gray-900 rounded-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-modal', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label={t('adoption.common.close')}><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Νομικός οδηγός χώρας ─────────────────────────────────────────────
export function LegalGuide({ country, onCountry, compact }: { country: string; onCountry?: (c: string) => void; compact?: boolean }) {
  const { t } = useTranslation()
  const { data, isLoading } = useAdoptionRules(country)
  const g = data?.guide
  const Section = ({ title, items }: { title: string; items: { ref: string | null; text: string }[] }) => items?.length ? (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
      <ul className="space-y-2">
        {items.map((i, k) => (
          <li key={k} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
            <span className="text-brand-900 shrink-0 mt-0.5">•</span>
            <span>{i.ref && <span className="font-semibold text-gray-800 dark:text-gray-100">{i.ref}: </span>}{i.text}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen size={18} className="text-indigo-600" />{t('adoption.guide.title')}</h3>
        {onCountry && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('adoption.guide.country')}>
            {GUIDE_COUNTRIES.map(c => (
              <button key={c} type="button" onClick={() => onCountry(c)} aria-pressed={country === c}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  country === c ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
                {t(`adoption.countries.${c}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      {isLoading || !g ? <div className="skeleton h-40" /> : (
        <>
          {!compact && <p className="text-sm text-gray-500">{t('adoption.guide.subtitle')}</p>}
          <Section title={t('adoption.guide.laws')} items={g.laws} />
          <Section title={t('adoption.guide.adopter')} items={g.adopter} />
          <Section title={t('adoption.guide.giver')} items={g.giver} />
          <Section title={t('adoption.guide.after')} items={g.after} />
          {g.links?.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {g.links.map((l: any) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <ExternalLink size={12} />{l.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">{t('adoption.guide.updated', { date: g.updated_at })} · {t('adoption.guide.disclaimer')}</p>
        </>
      )}
    </div>
  )
}

// ─── AI βοηθός υιοθεσίας ─────────────────────────────────────────────
export function AiAssistant({ country, listingId, defaultRole = 'adopter' }: { country: string; listingId?: string; defaultRole?: 'adopter' | 'giver' }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const [question, setQuestion] = useState('')
  const [role, setRole] = useState<'adopter' | 'giver'>(defaultRole)
  const [answer, setAnswer] = useState<any>(null)

  const ask = useMutation({
    mutationFn: (q: string) => api.post('/ai/adoption', { question: q, country, role, lang, listing_id: listingId }).then(r => r.data),
    onSuccess: data => { setAnswer(data); setQuestion('') },
    onError: (e: any) => {
      const code = e?.response?.data?.code
      if (code === 'ai_subscription_required') { toast.error(e.response.data.message); return }
      toast.error(e?.response?.data?.message || t('adoption.common.error'))
    },
  })
  const go = (q: string) => { if (q.trim() && !ask.isPending) { setAnswer(null); ask.mutate(q.trim()) } }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0"><Sparkles size={18} className="text-indigo-600" /></div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white">{t('adoption.ai.title')}</h3>
          <p className="text-sm text-gray-500">{t('adoption.ai.subtitle')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">{t('adoption.ai.role')}:</span>
        {(['adopter', 'giver'] as const).map(r => (
          <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-medium', role === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
            {t(r === 'adopter' ? 'adoption.ai.roleAdopter' : 'adoption.ai.roleGiver')}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <textarea value={question} maxLength={2000} rows={3} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(question) } }}
          placeholder={t('adoption.ai.placeholder')} className="input flex-1 resize-none" />
        <button type="button" onClick={() => go(question)} disabled={!question.trim() || ask.isPending} className="btn-primary flex items-center gap-2 shrink-0">
          {ask.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}{t('adoption.ai.ask')}
        </button>
      </div>
      {!answer && !ask.isPending && (
        <div className="flex flex-wrap gap-2">
          {(['q1', 'q2', 'q3', 'q4'] as const).map(k => (
            <button key={k} type="button" onClick={() => go(t(`adoption.ai.${k}`))}
              className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-700 text-left">
              {t(`adoption.ai.${k}`)}
            </button>
          ))}
        </div>
      )}
      {ask.isPending && <p className="text-sm text-gray-500 flex items-center gap-2"><Scale size={14} className="text-indigo-600" />{t('adoption.ai.thinking')}</p>}
      {answer && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">{answer.answer}</p>
          {answer.relevant_laws?.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">{t('adoption.ai.laws')}</p>
              <div className="flex flex-wrap gap-1.5">{answer.relevant_laws.map((l: string) => <span key={l} className="text-xs px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300">{l}</span>)}</div>
            </div>
          )}
          {answer.practical_steps?.length > 0 && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-2">{t('adoption.ai.steps')}</p>
              <ol className="space-y-1">{answer.practical_steps.map((s: string, i: number) => <li key={i} className="text-xs text-green-800 dark:text-green-200 flex gap-2"><span className="font-bold">{i + 1}.</span><span>{s}</span></li>)}</ol>
            </div>
          )}
          {answer.documents?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">{t('adoption.ai.documents')}</p>
              <ul className="space-y-1">{answer.documents.map((d: string, i: number) => <li key={i} className="text-xs text-amber-800 dark:text-amber-200">• {d}</li>)}</ul>
            </div>
          )}
          {answer.recommend_lawyer && <p className="text-xs text-red-600">⚠️ {t('adoption.ai.lawyer')}</p>}
          {answer.disclaimer && <p className="text-xs text-gray-400 italic">{answer.disclaimer}</p>}
        </div>
      )}
    </div>
  )
}

/** Μικρή ετικέτα-σήμα επαληθευμένου οργανισμού. */
export function VerifiedBadge() {
  const { t } = useTranslation()
  return <span className="badge-green"><BadgeCheck size={12} />{t('adoption.card.verified')}</span>
}
