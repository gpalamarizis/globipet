import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Heart, MapPin, Phone, Mail, BadgeCheck, Check, X as XIcon, HelpCircle, Eye, ShieldCheck, ExternalLink, Globe2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import ContentActions from '@/components/ContentActions'
import ApplyModal from '@/components/features/adoption/ApplyModal'
import { ageLabel, money, countryName, LegalGuide, AiAssistant, LISTING_STATUS_CLS, SPECIES_EMOJI, type AdoptionListing } from '@/components/features/adoption/shared'

/** Σελίδα ζώου προς υιοθεσία. Ίδιο περιεχόμενο με app/adoption/[id] του κινητού. */
export default function AdoptionDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [photo, setPhoto] = useState(0)
  const [applying, setApplying] = useState(false)
  const [showAi, setShowAi] = useState(false)

  const { data: l, isLoading, isError } = useQuery<AdoptionListing>({
    queryKey: ['adoption-listing', id],
    queryFn: () => api.get(`/adoption/listings/${id}`).then(r => r.data.data),
    enabled: !!id,
    retry: false,
  })

  if (isLoading) return <div className="page-container py-8"><div className="card h-96 skeleton" /></div>
  if (isError || !l) return (
    <div className="page-container py-16 text-center space-y-4">
      <p className="text-gray-500">{t('adoption.detail.notFound')}</p>
      <Link to="/adoption" className="btn-primary inline-block">{t('adoption.detail.back')}</Link>
    </div>
  )

  const fav = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    try {
      if (l.is_favorite) await api.delete(`/adoption/listings/${l.id}/favorite`)
      else await api.post(`/adoption/listings/${l.id}/favorite`, {})
      qc.invalidateQueries({ queryKey: ['adoption-listing', id] })
      qc.invalidateQueries({ queryKey: ['adoption-listings'] })
    } catch (e: any) { toast.error(e?.response?.data?.message || t('adoption.common.error')) }
  }

  const tri = (v: string) => v === 'yes' ? <Check size={16} className="text-green-600" /> : v === 'no' ? <XIcon size={16} className="text-red-500" /> : <HelpCircle size={16} className="text-gray-400" />
  const yesNo = (v: boolean) => v ? <Check size={16} className="text-green-600" /> : <XIcon size={16} className="text-gray-400" />
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500">{label}</span><span className="text-sm text-gray-900 dark:text-white text-right flex items-center gap-1.5">{children}</span>
    </div>
  )
  const photos = l.photos?.length ? l.photos : []
  const app = l.my_application

  return (
    <div className="page-container py-8 space-y-6">
      <Link to="/adoption" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft size={16} />{t('adoption.detail.back')}</Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Αριστερά: φωτογραφίες + περιεχόμενο */}
        <div className="space-y-6 min-w-0">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800">
              {photos[photo]
                ? <img src={photos[photo]} alt={l.name} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-7xl">{SPECIES_EMOJI[l.species] ?? '🐾'}</div>}
              {l.status !== 'available' && <span className={cn('absolute top-4 left-4', LISTING_STATUS_CLS[l.status])}>{t(`adoption.status.${l.status}`)}</span>}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {photos.map((p, i) => (
                  <button key={p + i} type="button" onClick={() => setPhoto(i)} aria-label={`${l.name} ${i + 1}`} aria-pressed={photo === i}
                    className={cn('w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2', photo === i ? 'border-brand-900' : 'border-transparent')}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{l.name}</h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin size={14} />{l.city}, {countryName(t, l.country)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={fav} aria-pressed={!!l.is_favorite} aria-label={t('adoption.card.favorite')} className="btn-ghost p-2.5">
                  <Heart size={20} className={l.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500'} />
                </button>
                <ContentActions type="adoption_listing" id={l.id} isMine={l.is_mine} size={20} onBlocked={() => navigate('/adoption')} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge-gray">{t(`adoption.species.${l.species}`)}</span>
              <span className="badge-gray">{t(`adoption.sex.${l.sex}`)}</span>
              <span className="badge-gray">{ageLabel(t, l.age_weeks)}</span>
              {l.size && <span className="badge-gray">{t(`adoption.size.${l.size}`)}</span>}
              {l.special_needs && <span className="badge-orange">{t('adoption.detail.specialNeeds')}</span>}
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white pt-2">{t('adoption.detail.about')}</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{l.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.detail.health')}</h2>
              <Row label={t('adoption.detail.sterilized')}>{yesNo(l.is_sterilized)}</Row>
              <Row label={t('adoption.detail.vaccinated')}>{yesNo(l.is_vaccinated)}</Row>
              <Row label={t('adoption.detail.dewormed')}>{yesNo(l.is_dewormed)}</Row>
              <Row label={t('adoption.detail.microchip')}>
                {l.microchip_number ? <span className="font-mono">{l.microchip_number}</span> : l.has_microchip ? t('adoption.detail.microchipHidden') : yesNo(false)}
              </Row>
              {l.health_notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-line"><span className="font-medium">{t('adoption.detail.healthNotes')}: </span>{l.health_notes}</p>}
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.detail.character')}</h2>
              <Row label={t('adoption.form.goodWithKids')}>{tri(l.good_with_kids)}</Row>
              <Row label={t('adoption.form.goodWithDogs')}>{tri(l.good_with_dogs)}</Row>
              <Row label={t('adoption.form.goodWithCats')}>{tri(l.good_with_cats)}</Row>
              {l.house_trained !== null && <Row label={t('adoption.detail.houseTrained')}>{yesNo(!!l.house_trained)}</Row>}
              {l.energy_level && <Row label={t('adoption.detail.energy')}>{t(`adoption.energy.${l.energy_level}`)}</Row>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.detail.details')}</h2>
            <div className="grid sm:grid-cols-2 gap-x-8">
              <Row label={t('adoption.detail.breed')}>{l.breed || '—'}{l.is_mixed ? ` (${t('adoption.detail.mixed')})` : ''}</Row>
              <Row label={t('adoption.detail.color')}>{l.color || '—'}</Row>
              <Row label={t('adoption.detail.weight')}>{l.weight_kg ? t('adoption.detail.weightKg', { value: l.weight_kg }) : '—'}</Row>
              <Row label={t('adoption.form.source')}>{t(`adoption.source.${l.source}`)}</Row>
            </div>
            {l.requirements && <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 whitespace-pre-line"><span className="font-semibold">{t('adoption.detail.requirements')}: </span>{l.requirements}</p>}
          </div>

          <LegalGuide country={l.country} compact />
          {showAi && <AiAssistant country={l.country} listingId={l.id} />}
        </div>

        {/* Δεξιά: ενέργειες */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('adoption.detail.feeTitle')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {l.adoption_fee > 0 ? t('adoption.detail.feeOrg', { amount: money(l.adoption_fee, l.fee_currency, lang) }) : t('adoption.detail.feeFree')}
              </p>
              {l.adoption_fee > 0 && (
                <>
                  {l.fee_breakdown && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{l.fee_breakdown}</p>}
                  <p className="text-xs text-gray-400 mt-1">{t('adoption.detail.paidDirect')}</p>
                </>
              )}
              {l.allows_abroad && <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1"><Globe2 size={12} />{t('adoption.detail.allowsAbroad')}</p>}
            </div>

            {l.is_mine ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('adoption.detail.mine')}</p>
                <Link to="/adoption/manage" className="btn-primary w-full text-center block">{t('adoption.detail.manage')}</Link>
              </div>
            ) : app && app.status !== 'withdrawn' ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('adoption.detail.applied', { status: t(`adoption.appStatus.${app.status}`) })}</p>
                <Link to={`/adoption/applications/${app.id}`} className="btn-primary w-full text-center block">{t('adoption.detail.viewApplication')}</Link>
              </div>
            ) : l.status !== 'available' ? (
              <p className="text-sm text-gray-500">{t('adoption.detail.notAccepting')}</p>
            ) : !isAuthenticated ? (
              <Link to="/login" className="btn-primary w-full text-center block">{t('adoption.detail.loginToApply')}</Link>
            ) : (
              <button type="button" onClick={() => setApplying(true)} className="btn-primary w-full">{t('adoption.detail.apply')}</button>
            )}
            <button type="button" onClick={() => setShowAi(s => !s)} aria-expanded={showAi} className="btn-secondary w-full text-sm">{t('adoption.detail.askAi')}</button>
          </div>

          <div className="card p-5 space-y-3">
            <p className="text-xs text-gray-500">{t('adoption.detail.listedBy')}</p>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">{l.lister.name}</span>
              {l.lister.verified && <BadgeCheck size={16} className="text-green-600" aria-label={t('adoption.card.verified')} />}
            </div>
            <span className={l.lister.type === 'organisation' ? 'badge-blue' : 'badge-gray'}>
              {l.lister.type === 'organisation' ? <ShieldCheck size={12} /> : null}
              {t(`adoption.card.${l.lister.type === 'organisation' ? 'organisation' : 'individual'}`)}
            </span>
            {(l.lister.contact_phone || l.lister.contact_email || l.lister.service_id) && (
              <div className="flex flex-wrap gap-3 pt-1 text-sm">
                {l.lister.contact_phone && <a href={`tel:${l.lister.contact_phone}`} className="flex items-center gap-1 text-brand-900 hover:underline"><Phone size={14} />{t('adoption.detail.call')}</a>}
                {l.lister.contact_email && <a href={`mailto:${l.lister.contact_email}`} className="flex items-center gap-1 text-brand-900 hover:underline"><Mail size={14} />{t('adoption.detail.email')}</a>}
                {l.lister.service_id && <Link to={`/services/${l.lister.service_id}`} className="flex items-center gap-1 text-brand-900 hover:underline"><ExternalLink size={14} />{t('adoption.detail.viewOrg')}</Link>}
              </div>
            )}
            <p className="text-xs text-gray-400 flex items-center gap-1 pt-1"><Eye size={12} />{t('adoption.detail.views', { count: l.views_count })}</p>
          </div>
        </div>
      </div>

      {applying && (
        <ApplyModal listing={l} onClose={() => setApplying(false)}
          onDone={appId => { setApplying(false); qc.invalidateQueries({ queryKey: ['adoption-listing', id] }); if (appId) navigate(`/adoption/applications/${appId}`) }} />
      )}
    </div>
  )
}
