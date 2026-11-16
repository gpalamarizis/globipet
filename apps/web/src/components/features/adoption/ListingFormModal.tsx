import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ImagePlus, X, Info, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Modal, SPECIES, GUIDE_COUNTRIES, useAdoptionRules, countryName, type AdoptionListing } from './shared'

/**
 * Φόρμα αγγελίας υιοθεσίας (νέα / επεξεργασία).
 *
 * Οι κανόνες της χώρας έρχονται από τον server (GET /adoption/rules) και
 * αλλάζουν τη φόρμα επί τόπου (υποχρεωτικό μικροτσίπ, κάλυψη εξόδων,
 * δήλωση Lucy's Law κ.λπ.). Η τελική απόφαση είναι πάντα του server.
 */
const today = () => new Date().toISOString().slice(0, 10)
const TRI = ['yes', 'no', 'unknown'] as const
const PET_TO_ADOPTION: Record<string, string> = { dog: 'dog', cat: 'cat', bird: 'bird', rabbit: 'rabbit', reptile: 'reptile' }

type Ctx = { lister_type: 'organisation' | 'individual'; organisation: { name: string; verified: boolean } | null; is_adult: boolean; city: string; country: string }

export default function ListingFormModal({ listing, onClose, onSaved }: { listing?: AdoptionListing | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const editing = !!listing
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: ctx } = useQuery<Ctx>({ queryKey: ['adoption-context'], queryFn: () => api.get('/adoption/me/context').then(r => r.data) })
  const { data: myPets = [] } = useQuery<any[]>({ queryKey: ['my-pets'], queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []), enabled: !editing })

  const isOrg = (listing?.lister_type ?? ctx?.lister_type) === 'organisation'
  const [f, setF] = useState(() => ({
    name: listing?.name ?? '', species: listing?.species ?? 'dog', breed: listing?.breed ?? '', is_mixed: listing?.is_mixed ?? false,
    sex: listing?.sex ?? 'female', birth_date_est: listing?.birth_date_est?.slice(0, 10) ?? '', size: listing?.size ?? '', color: listing?.color ?? '',
    weight_kg: listing?.weight_kg != null ? String(listing.weight_kg) : '', microchip_number: listing?.microchip_number ?? '',
    is_sterilized: listing?.is_sterilized ?? false, is_vaccinated: listing?.is_vaccinated ?? false, is_dewormed: listing?.is_dewormed ?? false,
    health_notes: listing?.health_notes ?? '', special_needs: listing?.special_needs ?? false,
    good_with_kids: listing?.good_with_kids ?? 'unknown', good_with_dogs: listing?.good_with_dogs ?? 'unknown', good_with_cats: listing?.good_with_cats ?? 'unknown',
    house_trained: listing?.house_trained ?? null as boolean | null, energy_level: listing?.energy_level ?? '',
    description: listing?.description ?? '', photos: listing?.photos ?? [] as string[],
    country: listing?.country ?? ((user?.country || '').toUpperCase().length === 2 ? (user!.country as string).toUpperCase() : 'GR'),
    city: listing?.city ?? user?.city ?? '',
    adoption_fee: listing?.adoption_fee ? String(listing.adoption_fee) : '', fee_currency: listing?.fee_currency ?? 'EUR', fee_breakdown: listing?.fee_breakdown ?? '',
    requirements: listing?.requirements ?? '', allows_abroad: listing?.allows_abroad ?? false, bred_by_lister: listing?.bred_by_lister ?? false,
    source: listing?.source ?? '', pet_id: '' as string, legal_ack: editing,
  }))
  const set = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }))

  // Προεπιλογές από το πλαίσιο (πόλη/χώρα, πηγή).
  useEffect(() => {
    if (!ctx || editing) return
    setF(s => ({
      ...s,
      source: s.source || (ctx.lister_type === 'organisation' ? 'shelter' : 'own_pet'),
      city: s.city || ctx.city || '',
      country: s.country || ctx.country || 'GR',
    }))
  }, [ctx, editing])

  const { data: rulesData } = useAdoptionRules(f.country)
  const rules = rulesData?.rules
  const chipRequired = !!rules?.microchip_species?.includes(f.species)
  const weeks = f.birth_date_est ? Math.floor((Date.now() - new Date(f.birth_date_est).getTime()) / (7 * 86400000)) : null
  const showBred = !!rules?.under_6m_bred_by_lister && !isOrg && (f.species === 'dog' || f.species === 'cat') && weeks !== null && weeks < 26
  const currencyFor = (c: string) => (c === 'GB' ? 'GBP' : c === 'CN' ? 'CNY' : 'EUR')

  const fillFromPet = (petId: string) => {
    const p = myPets.find(x => x.id === petId)
    if (!p) { set('pet_id', ''); return }
    const yearsAgo = Number(p.age) > 0 ? new Date(Date.now() - Number(p.age) * 365.25 * 86400000).toISOString().slice(0, 10) : ''
    setF(s => ({
      ...s, pet_id: p.id, name: p.name || s.name, species: PET_TO_ADOPTION[p.species] ?? 'other', breed: p.breed || '',
      sex: p.gender === 'male' || p.gender === 'female' ? p.gender : 'unknown', color: p.color || '', weight_kg: p.weight ? String(p.weight) : '',
      microchip_number: p.microchip_number || '', is_sterilized: !!p.is_sterilized, birth_date_est: yearsAgo || s.birth_date_est,
      photos: p.image_url && /^https:/.test(p.image_url) ? [p.image_url] : s.photos,
    }))
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 8 - f.photos.length)) urls.push(await uploadFile(file, 'pets'))
      set('photos', [...f.photos, ...urls].slice(0, 8))
    } catch (e: any) { toast.error(e?.response?.data?.message || t('adoption.common.error')) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name, species: f.species, breed: f.breed || null, is_mixed: f.is_mixed, sex: f.sex, birth_date_est: f.birth_date_est,
        size: f.size || null, color: f.color || null, weight_kg: f.weight_kg ? Number(f.weight_kg) : null, microchip_number: f.microchip_number || null,
        is_sterilized: f.is_sterilized, is_vaccinated: f.is_vaccinated, is_dewormed: f.is_dewormed, health_notes: f.health_notes || null, special_needs: f.special_needs,
        good_with_kids: f.good_with_kids, good_with_dogs: f.good_with_dogs, good_with_cats: f.good_with_cats, house_trained: f.house_trained,
        energy_level: f.energy_level || null, description: f.description, photos: f.photos, country: f.country, city: f.city,
        adoption_fee: isOrg && f.adoption_fee ? Number(f.adoption_fee) : 0, fee_currency: f.fee_currency, fee_breakdown: f.fee_breakdown || null,
        requirements: f.requirements || null, allows_abroad: f.allows_abroad, bred_by_lister: showBred ? f.bred_by_lister : false,
        source: f.source, pet_id: f.pet_id || null, legal_ack: f.legal_ack,
      }
      return editing ? api.patch(`/adoption/listings/${listing!.id}`, body) : api.post('/adoption/listings', body)
    },
    onSuccess: () => { toast.success(editing ? t('adoption.form.saved') : t('adoption.form.created')); onSaved() },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('adoption.common.error')),
  })

  const valid = f.name.trim() && f.birth_date_est && f.description.trim().length >= 20 && f.photos.length > 0 && f.city.trim()
    && f.legal_ack && f.source && (!chipRequired || f.microchip_number.trim()) && (!showBred || f.bred_by_lister)

  const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
  const check = 'flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 min-h-[40px] cursor-pointer'
  const legend = 'font-semibold text-gray-900 dark:text-white mb-3'
  const countryOptions = Array.from(new Set([...GUIDE_COUNTRIES, f.country]))

  if (ctx && !ctx.is_adult) {
    return <Modal title={t('adoption.form.titleNew')} onClose={onClose}><p className="text-sm text-gray-600">{t('adoption.form.adultOnly')}</p></Modal>
  }

  return (
    <Modal title={editing ? t('adoption.form.titleEdit') : t('adoption.form.titleNew')} onClose={onClose} wide>
      <form onSubmit={e => { e.preventDefault(); if (valid) save.mutate(); else toast.error(t('adoption.form.required')) }} className="space-y-7">
        {ctx && (
          <div className={isOrg ? 'p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2' : 'p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2'}>
            {isOrg ? <ShieldCheck size={16} className="shrink-0" /> : <Info size={16} className="shrink-0" />}
            <span>{isOrg ? t('adoption.form.orgBadge', { name: ctx.organisation?.name ?? listing?.lister.name }) : t('adoption.form.individualNote')}</span>
          </div>
        )}

        {!editing && !isOrg && myPets.length > 0 && (
          <div>
            <label className={label} htmlFor="lf-pet">{t('adoption.form.fromMyPet')}</label>
            <select id="lf-pet" className="input" value={f.pet_id} onChange={e => fillFromPet(e.target.value)}>
              <option value="">{t('adoption.form.choosePet')}</option>
              {myPets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Ζώο */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionAnimal')}</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={label} htmlFor="lf-name">{t('adoption.form.name')} *</label><input id="lf-name" className="input" maxLength={80} value={f.name} onChange={e => set('name', e.target.value)} /></div>
            <div>
              <label className={label} htmlFor="lf-species">{t('adoption.form.species')} *</label>
              <select id="lf-species" className="input" value={f.species} onChange={e => set('species', e.target.value)}>
                {SPECIES.map(s => <option key={s} value={s}>{t(`adoption.species.${s}`)}</option>)}
              </select>
            </div>
            <div><label className={label} htmlFor="lf-breed">{t('adoption.form.breed')}</label><input id="lf-breed" className="input" maxLength={120} value={f.breed} onChange={e => set('breed', e.target.value)} /></div>
            <div>
              <label className={label} htmlFor="lf-sex">{t('adoption.form.sex')} *</label>
              <select id="lf-sex" className="input" value={f.sex} onChange={e => set('sex', e.target.value)}>
                {['female', 'male', 'unknown'].map(s => <option key={s} value={s}>{t(`adoption.sex.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="lf-birth">{t('adoption.form.birth')} *</label>
              <input id="lf-birth" type="date" className="input" max={today()} value={f.birth_date_est} onChange={e => set('birth_date_est', e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{t('adoption.form.birthHint')}</p>
            </div>
            <div>
              <label className={label} htmlFor="lf-size">{t('adoption.form.size')}</label>
              <select id="lf-size" className="input" value={f.size} onChange={e => set('size', e.target.value)}>
                <option value="">—</option>
                {['small', 'medium', 'large', 'xlarge'].map(s => <option key={s} value={s}>{t(`adoption.size.${s}`)}</option>)}
              </select>
            </div>
            <div><label className={label} htmlFor="lf-color">{t('adoption.form.color')}</label><input id="lf-color" className="input" maxLength={80} value={f.color} onChange={e => set('color', e.target.value)} /></div>
            <div><label className={label} htmlFor="lf-weight">{t('adoption.form.weight')}</label><input id="lf-weight" type="number" min={0} max={150} step="0.1" className="input" value={f.weight_kg} onChange={e => set('weight_kg', e.target.value)} /></div>
          </div>
          <label className={check + ' mt-2'}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.is_mixed} onChange={e => set('is_mixed', e.target.checked)} />{t('adoption.form.mixed')}</label>
        </fieldset>

        {/* Υγεία */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionHealth')}</legend>
          <div>
            <label className={label} htmlFor="lf-chip">{t('adoption.form.microchip')}{chipRequired ? ' *' : ''}</label>
            <input id="lf-chip" className="input font-mono" inputMode="numeric" maxLength={20} value={f.microchip_number} onChange={e => set('microchip_number', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">
              {chipRequired ? `${t('adoption.form.microchipRequired')} · ` : ''}{rules?.show_microchip_publicly ? t('adoption.form.microchipPublic') : t('adoption.form.microchipPrivate')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 mt-2">
            <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.is_sterilized} onChange={e => set('is_sterilized', e.target.checked)} />{t('adoption.form.sterilized')}</label>
            <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.is_vaccinated} onChange={e => set('is_vaccinated', e.target.checked)} />{t('adoption.form.vaccinated')}</label>
            <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.is_dewormed} onChange={e => set('is_dewormed', e.target.checked)} />{t('adoption.form.dewormed')}</label>
            <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.special_needs} onChange={e => set('special_needs', e.target.checked)} />{t('adoption.form.specialNeeds')}</label>
          </div>
          <div className="mt-2"><label className={label} htmlFor="lf-health">{t('adoption.form.healthNotes')}</label><textarea id="lf-health" className="input resize-none" rows={2} maxLength={2000} value={f.health_notes} onChange={e => set('health_notes', e.target.value)} /></div>
        </fieldset>

        {/* Χαρακτήρας */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionCharacter')}</legend>
          <div className="grid sm:grid-cols-3 gap-3">
            {(['good_with_kids', 'good_with_dogs', 'good_with_cats'] as const).map(k => (
              <div key={k}>
                <label className={label} htmlFor={`lf-${k}`}>{t(`adoption.form.${k === 'good_with_kids' ? 'goodWithKids' : k === 'good_with_dogs' ? 'goodWithDogs' : 'goodWithCats'}`)}</label>
                <select id={`lf-${k}`} className="input" value={f[k]} onChange={e => set(k, e.target.value)}>
                  {TRI.map(v => <option key={v} value={v}>{t(`adoption.tristate.${v}`)}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className={label} htmlFor="lf-energy">{t('adoption.form.energy')}</label>
              <select id="lf-energy" className="input" value={f.energy_level} onChange={e => set('energy_level', e.target.value)}>
                <option value="">—</option>
                {['low', 'medium', 'high'].map(v => <option key={v} value={v}>{t(`adoption.energy.${v}`)}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="lf-house">{t('adoption.form.houseTrained')}</label>
              <select id="lf-house" className="input" value={f.house_trained === null ? '' : f.house_trained ? 'yes' : 'no'}
                onChange={e => set('house_trained', e.target.value === '' ? null : e.target.value === 'yes')}>
                <option value="">{t('adoption.tristate.unknown')}</option><option value="yes">{t('adoption.tristate.yes')}</option><option value="no">{t('adoption.tristate.no')}</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Περιγραφή & φωτογραφίες */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionStory')}</legend>
          <label className={label} htmlFor="lf-desc">{t('adoption.form.description')} *</label>
          <textarea id="lf-desc" className="input resize-none" rows={5} maxLength={5000} value={f.description} onChange={e => set('description', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">{t('adoption.form.descriptionHint')}</p>
          <p className={label + ' mt-4'}>{t('adoption.form.photos')} *</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {f.photos.map((p, i) => (
              <div key={p + i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => set('photos', f.photos.filter((_, j) => j !== i))} aria-label={t('adoption.form.removePhoto')}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={14} /></button>
              </div>
            ))}
            {f.photos.length < 8 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-gray-500 text-xs hover:border-brand-900 hover:text-brand-900">
                <ImagePlus size={22} />{uploading ? t('adoption.form.uploading') : t('adoption.form.addPhoto')}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => addPhotos(e.target.files)} />
          <p className="text-xs text-gray-400 mt-1">{t('adoption.form.photosHint')}</p>
        </fieldset>

        {/* Τοποθεσία */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionLocation')}</legend>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="lf-country">{t('adoption.form.country')} *</label>
              <select id="lf-country" className="input" value={f.country} onChange={e => { set('country', e.target.value); set('fee_currency', currencyFor(e.target.value)) }}>
                {countryOptions.map(c => <option key={c} value={c}>{countryName(t, c)}</option>)}
              </select>
            </div>
            <div><label className={label} htmlFor="lf-city">{t('adoption.form.city')} *</label><input id="lf-city" className="input" maxLength={120} value={f.city} onChange={e => set('city', e.target.value)} /></div>
            <div>
              <label className={label} htmlFor="lf-source">{t('adoption.form.source')} *</label>
              <select id="lf-source" className="input" value={f.source} onChange={e => set('source', e.target.value)}>
                {(isOrg ? ['shelter', 'foster', 'found'] : ['own_pet', 'foster', 'found']).map(s => <option key={s} value={s}>{t(`adoption.source.${s}`)}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Όροι */}
        <fieldset>
          <legend className={legend}>{t('adoption.form.sectionTerms')}</legend>
          {isOrg && (
            <div className="grid sm:grid-cols-[1fr_120px] gap-3 mb-3">
              <div>
                <label className={label} htmlFor="lf-fee">{t('adoption.form.fee')}</label>
                <input id="lf-fee" type="number" min={0} max={1000} step="0.01" className="input" value={f.adoption_fee} onChange={e => set('adoption_fee', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">{t('adoption.form.feeHint')}</p>
              </div>
              <div>
                <label className={label} htmlFor="lf-cur">{t('adoption.form.currency')}</label>
                <select id="lf-cur" className="input" value={f.fee_currency} onChange={e => set('fee_currency', e.target.value)}>
                  {['EUR', 'GBP', 'CNY'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {Number(f.adoption_fee) > 0 && (
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="lf-breakdown">{t('adoption.form.feeBreakdown')}{rules?.org_fee_breakdown_required ? ' *' : ''}</label>
                  <input id="lf-breakdown" className="input" maxLength={1000} placeholder={t('adoption.form.feeBreakdownHint')} value={f.fee_breakdown} onChange={e => set('fee_breakdown', e.target.value)} />
                </div>
              )}
            </div>
          )}
          <label className={label} htmlFor="lf-req">{t('adoption.form.requirements')}</label>
          <textarea id="lf-req" className="input resize-none" rows={2} maxLength={2000} placeholder={t('adoption.form.requirementsHint')} value={f.requirements} onChange={e => set('requirements', e.target.value)} />
          <label className={check + ' mt-2'}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.allows_abroad} onChange={e => set('allows_abroad', e.target.checked)} />{t('adoption.form.allowsAbroad')}</label>
          {showBred && (
            <div className="mt-1">
              <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.bred_by_lister} onChange={e => set('bred_by_lister', e.target.checked)} />{t('adoption.form.bredByLister')} *</label>
              <p className="text-xs text-gray-400 ml-6">{t('adoption.form.bredByListerHint')}</p>
            </div>
          )}
        </fieldset>

        {/* Κανόνες χώρας + δήλωση */}
        {rules && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-1.5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('adoption.form.rulesTitle', { country: countryName(t, f.country) })}</p>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc ml-4">
              <li>{t('adoption.form.ruleMinAge')}</li>
              {!isOrg && <li>{t('adoption.form.ruleFree')}</li>}
              {rules.microchip_species?.length > 0 && <li>{t('adoption.form.ruleMicrochip', { species: rules.microchip_species.map((s: string) => t(`adoption.species.${s}`)).join(', ') })}</li>}
              {isOrg && rules.org_fee_breakdown_required && <li>{t('adoption.form.ruleBreakdown')}</li>}
              {rules.cec_required_species?.length > 0 && <li>{t('adoption.form.ruleCec')}</li>}
              {rules.dog_rabies_required && <li>{t('adoption.form.ruleRabies')}</li>}
              {rules.banned_breeds_note && <li>{t('adoption.form.ruleBanned')}</li>}
              {rules.adopter_residence_required && <li>{t('adoption.form.ruleResidence')}</li>}
            </ul>
          </div>
        )}
        <label className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 mt-0.5 accent-brand-900 shrink-0" checked={f.legal_ack} onChange={e => set('legal_ack', e.target.checked)} />
          <span>{t('adoption.form.legalAck', { country: countryName(t, f.country) })} *</span>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary">{t('adoption.common.cancel')}</button>
          <button type="submit" disabled={save.isPending || uploading} className="btn-primary">
            {save.isPending ? t('adoption.common.saving') : editing ? t('adoption.form.save') : t('adoption.form.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
