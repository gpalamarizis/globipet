import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Modal, GUIDE_COUNTRIES, type AdoptionListing } from './shared'

/**
 * Ερωτηματολόγιο αίτησης υιοθεσίας. Τα πεδία είναι ίδια με το
 * answersSchema του server (routes/adoption.ts) και με το κινητό.
 */
export default function ApplyModal({ listing, onClose, onDone }: { listing: AdoptionListing; onClose: () => void; onDone: (id: string) => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const userCountry = (user?.country || '').toUpperCase()
  const [f, setF] = useState({
    country: /^[A-Z]{2}$/.test(userCountry) ? userCountry : listing.country,
    city: user?.city || '',
    housing: 'apartment', ownership: 'own', landlord_ok: true, has_garden: false,
    household_adults: 1, household_children: 0, children_ages: '', other_pets: '', experience: '',
    hours_alone: 4, reason: '', agrees_home_visit: true, agrees_followup: true,
    message: '', phone: '',
  })
  const set = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }))
  const countryOptions = Array.from(new Set([...GUIDE_COUNTRIES, f.country])).filter(Boolean)

  const send = useMutation({
    mutationFn: () => api.post(`/adoption/listings/${listing.id}/applications`, {
      answers: {
        country: f.country, city: f.city, housing: f.housing, ownership: f.ownership,
        landlord_ok: f.ownership === 'rent' ? f.landlord_ok : null, has_garden: f.has_garden,
        household_adults: Number(f.household_adults), household_children: Number(f.household_children),
        children_ages: f.children_ages || null, other_pets: f.other_pets || null, experience: f.experience || null,
        hours_alone: Number(f.hours_alone), reason: f.reason, agrees_home_visit: f.agrees_home_visit, agrees_followup: f.agrees_followup,
      },
      message: f.message || null,
      phone: f.phone || null,
    }).then(r => r.data),
    onSuccess: d => { toast.success(t('adoption.apply.sent')); onDone(d?.data?.id) },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('adoption.common.error')),
  })

  const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
  const check = 'flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 min-h-[40px] cursor-pointer'
  const valid = f.city.trim() && f.reason.trim().length >= 10 && !(f.ownership === 'rent' && !f.landlord_ok)

  return (
    <Modal title={t('adoption.apply.title', { name: listing.name })} onClose={onClose} wide>
      <form onSubmit={e => { e.preventDefault(); if (valid) send.mutate() }} className="space-y-6">
        <p className="text-sm text-gray-500">{t('adoption.apply.intro')}</p>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.apply.sectionHome')}</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="ap-country">{t('adoption.apply.country')}</label>
              <select id="ap-country" className="input" value={f.country} onChange={e => set('country', e.target.value)}>
                {countryOptions.map(c => <option key={c} value={c}>{(GUIDE_COUNTRIES as readonly string[]).includes(c) ? t(`adoption.countries.${c}`) : c}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ap-city">{t('adoption.apply.city')}</label>
              <input id="ap-city" className="input" value={f.city} maxLength={120} required onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="ap-housing">{t('adoption.apply.housing')}</label>
              <select id="ap-housing" className="input" value={f.housing} onChange={e => set('housing', e.target.value)}>
                <option value="house">{t('adoption.apply.housingHouse')}</option>
                <option value="apartment">{t('adoption.apply.housingApartment')}</option>
                <option value="other">{t('adoption.apply.housingOther')}</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ap-own">{t('adoption.apply.ownership')}</label>
              <select id="ap-own" className="input" value={f.ownership} onChange={e => set('ownership', e.target.value)}>
                <option value="own">{t('adoption.apply.own')}</option>
                <option value="rent">{t('adoption.apply.rent')}</option>
                <option value="family">{t('adoption.apply.family')}</option>
              </select>
            </div>
          </div>
          {f.ownership === 'rent' && (
            <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.landlord_ok} onChange={e => set('landlord_ok', e.target.checked)} />{t('adoption.apply.landlordOk')}</label>
          )}
          <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.has_garden} onChange={e => set('has_garden', e.target.checked)} />{t('adoption.apply.garden')}</label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.apply.sectionFamily')}</legend>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="ap-adults">{t('adoption.apply.adults')}</label>
              <input id="ap-adults" type="number" min={1} max={20} className="input" value={f.household_adults} onChange={e => set('household_adults', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="ap-kids">{t('adoption.apply.children')}</label>
              <input id="ap-kids" type="number" min={0} max={20} className="input" value={f.household_children} onChange={e => set('household_children', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="ap-ages">{t('adoption.apply.childrenAges')}</label>
              <input id="ap-ages" className="input" maxLength={120} disabled={Number(f.household_children) === 0} value={f.children_ages} onChange={e => set('children_ages', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="ap-pets">{t('adoption.apply.otherPets')}</label>
            <input id="ap-pets" className="input" maxLength={500} placeholder={t('adoption.apply.otherPetsHint')} value={f.other_pets} onChange={e => set('other_pets', e.target.value)} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.apply.sectionYou')}</legend>
          <div className="grid sm:grid-cols-[1fr_200px] gap-3">
            <div>
              <label className={label} htmlFor="ap-exp">{t('adoption.apply.experience')}</label>
              <input id="ap-exp" className="input" maxLength={1500} value={f.experience} onChange={e => set('experience', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="ap-hours">{t('adoption.apply.hoursAlone')}</label>
              <input id="ap-hours" type="number" min={0} max={24} className="input" value={f.hours_alone} onChange={e => set('hours_alone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="ap-reason">{t('adoption.apply.reason')}</label>
            <textarea id="ap-reason" className="input resize-none" rows={4} maxLength={2000} required value={f.reason} onChange={e => set('reason', e.target.value)} />
          </div>
          <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.agrees_home_visit} onChange={e => set('agrees_home_visit', e.target.checked)} />{t('adoption.apply.homeVisit')}</label>
          <label className={check}><input type="checkbox" className="w-4 h-4 accent-brand-900" checked={f.agrees_followup} onChange={e => set('agrees_followup', e.target.checked)} />{t('adoption.apply.followup')}</label>
          <div>
            <label className={label} htmlFor="ap-msg">{t('adoption.apply.message')}</label>
            <textarea id="ap-msg" className="input resize-none" rows={3} maxLength={2000} value={f.message} onChange={e => set('message', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ap-phone">{t('adoption.apply.phone')}</label>
            <input id="ap-phone" className="input" type="tel" maxLength={30} value={f.phone} onChange={e => set('phone', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">{t('adoption.apply.phoneHint')}</p>
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary">{t('adoption.common.cancel')}</button>
          <button type="submit" disabled={!valid || send.isPending} className="btn-primary">{send.isPending ? t('adoption.common.saving') : t('adoption.apply.submit')}</button>
        </div>
      </form>
    </Modal>
  )
}
