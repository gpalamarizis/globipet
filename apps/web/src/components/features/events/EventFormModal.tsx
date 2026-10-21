import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, Save, ImagePlus, Trash2, Info, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, uploadFile } from '@/lib/api'

/**
 * Δημιουργία / επεξεργασία εκδήλωσης.
 *
 * POST /events, PATCH /events/:id (events.ts). Οποιοσδήποτε συνδεδεμένος
 * χρήστης μπορεί να δημιουργήσει· ο διοργανωτής (organizer_email) παίρνεται
 * από τη σύνδεση. Υποχρεωτικά: τίτλος, ημερομηνία, ώρα, τοποθεσία, πόλη.
 *
 * Κανόνες του server που εφαρμόζονται και εδώ, για να μη φτάνει άσκοπο 400/409:
 *   · ημερομηνία ΕΕΕΕ-ΜΜ-ΗΗ και ώρα ΩΩ:ΛΛ (ώρα Ελλάδας), χωρίς μετατροπή UTC·
 *   · τιμή μόνο σε ευρώ (δεν στέλνεται νόμισμα — ο server βάζει EUR)·
 *   · με πληρωμένες συμμετοχές η ημερομηνία, η ώρα και η τιμή δεν αλλάζουν
 *     (`lockTerms`)· ο server το ελέγχει ούτως ή άλλως (409).
 * Χωρητικότητα κενή = χωρίς όριο. Ίδια φόρμα με το κινητό (app/event-form.tsx).
 */

export const EVENT_TYPE_VALUES = ['meetup', 'show', 'adoption', 'training', 'charity', 'competition'] as const

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/
const HM = /^([01]\d|2[0-3]):[0-5]\d$/
const validYmd = (s: string) => {
  const m = YMD.exec(s)
  if (!m) return false
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]
}
// «Σήμερα» σε ώρα Ελλάδας, όπως ο server (routes/events.ts athensToday):
// με την τοπική ώρα της συσκευής, ένας χρήστης σε άλλη ζώνη (ή γύρω στα
// μεσάνυχτα) έβλεπε «παρελθούσα ημερομηνία» που ο server δεχόταν, ή το
// αντίστροφο. Χωρίς Intl/ζώνη → τοπική ημερομηνία, όπως πριν.
const todayYmd = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = (k: string) => parts.find(p => p.type === k)?.value
    const y = get('year'), m = get('month'), d = get('day')
    if (y && m && d) return `${y}-${m}-${d}`
  } catch { /* fallback πιο κάτω */ }
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EventFormModal({
  event: shown, lockTerms = false, onClose, onSaved,
}: {
  /** Υπάρχουσα εκδήλωση (επεξεργασία) ή τίποτα (νέα). */
  event?: any
  /** Υπάρχουν πληρωμένες συμμετοχές: ημερομηνία/ώρα/τιμή κλειδωμένες. */
  lockTerms?: boolean
  onClose: () => void
  onSaved: (ev: any) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  // Το GET /events/:id επιστρέφει τίτλο/περιγραφή μεταφρασμένα στη γλώσσα του
  // χρήστη και τα πρωτότυπα στο `_original`: η φόρμα επεξεργάζεται ΤΟ ΠΡΩΤΟΤΥΠΟ,
  // ώστε να μη γραφτεί μετάφραση πάνω στο κείμενο του διοργανωτή.
  const event = shown ? { ...shown, ...(shown._original ?? {}) } : undefined
  const isNew = !event
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const initial = {
    title: event?.title ?? '',
    description: event?.description ?? '',
    event_type: event?.event_type ?? 'meetup',
    date: event?.date ?? '',
    end_date: event?.end_date ?? '',
    time: event?.time ?? '',
    location: event?.location ?? '',
    city: event?.city ?? '',
    capacity: event?.capacity != null ? String(event.capacity) : '',
    price: event && Number(event.price) > 0 ? String(event.price) : '',
    image_url: event?.image_url ?? '',
  }
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Έλεγχος μορφής μόνο σε ό,τι άλλαξε: μια παλιά εκδήλωση με ελεύθερο
  // κείμενο στην ημερομηνία διορθώνεται ακόμη σε άλλα πεδία (όπως ο server).
  const changed = (k: keyof typeof form) => isNew || form[k] !== initial[k]
  const priceNum = form.price.trim() ? Number(form.price.trim().replace(',', '.')) : 0
  const capNum = form.capacity.trim() ? Number(form.capacity.trim()) : null
  const registered = Number(event?.registered_count ?? 0)
  const errors: string[] = []
  if (!form.title.trim() || !form.location.trim() || !form.city.trim() || !form.date || !form.time) errors.push(t('eventForm.errRequired'))
  if (form.date && changed('date') && !validYmd(form.date)) errors.push(t('eventForm.errDate'))
  if (form.date && isNew && validYmd(form.date) && form.date < todayYmd()) errors.push(t('eventForm.errPast'))
  if (form.time && changed('time') && !HM.test(form.time)) errors.push(t('eventForm.errTime'))
  if (form.end_date && (!validYmd(form.end_date) || (validYmd(form.date) && form.end_date < form.date))) errors.push(t('eventForm.errEndDate'))
  if (!Number.isFinite(priceNum) || priceNum < 0 || (form.price.trim() && !/^\d+([.,]\d{1,2})?$/.test(form.price.trim()))) errors.push(t('eventForm.errPrice'))
  if (priceNum > 0 && (!validYmd(form.date) || !HM.test(form.time))) errors.push(t('eventForm.errPaidFormat'))
  if (capNum != null && (!Number.isInteger(capNum) || capNum < 1)) errors.push(t('eventForm.errCapacity'))
  if (capNum != null && Number.isInteger(capNum) && capNum < registered) errors.push(t('eventForm.errCapacityBelow', { count: registered }))

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        end_date: form.end_date || null,
        location: form.location.trim(),
        city: form.city.trim(),
        // Κενό = χωρίς όριο (ο server γράφει null).
        capacity: capNum ?? '',
        image_url: form.image_url || null,
      }
      // Όροι πληρωμής: στέλνονται μόνο όταν επιτρέπεται να αλλάξουν.
      if (isNew || !lockTerms) {
        payload.date = form.date
        payload.time = form.time
        payload.price = priceNum
      }
      if (isNew) return api.post('/events', payload).then(r => r.data)
      // Μόνο ό,τι άλλαξε· ο server αρνείται κενό PATCH.
      const diff: any = {}
      for (const [k, v] of Object.entries(payload)) {
        const before = k === 'capacity' ? (event.capacity ?? '')
          : k === 'price' ? Number(event.price ?? 0)
          : k === 'end_date' || k === 'image_url' ? (event[k] || null)
          : (event[k] ?? '')
        if (v !== before) diff[k] = v
      }
      if (Object.keys(diff).length === 0) return event
      return api.patch(`/events/${event.id}`, diff).then(r => r.data)
    },
    onSuccess: (ev: any) => {
      qc.invalidateQueries({ queryKey: ['events'] })
      if (ev?.id) qc.invalidateQueries({ queryKey: ['event', ev.id] })
      toast.success(isNew ? t('eventForm.created') : t('eventForm.updated'))
      onSaved(ev)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const onPickImage = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      // Ο server δεν έχει φάκελο «events»· ο γενικός είναι το «uploads».
      const url = await uploadFile(file, 'uploads')
      if (url) set('image_url', url)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const label = 'text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isNew ? t('eventForm.newTitle') : t('eventForm.editTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label={t('common.close')}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className={label}>{t('eventForm.title')} <span className="text-red-500">*</span></label>
            <input className="input w-full mt-1" value={form.title} maxLength={200}
              onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className={label}>{t('eventForm.type')}</label>
            <select className="input w-full mt-1" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
              {EVENT_TYPE_VALUES.map(v => <option key={v} value={v}>{t(`events.types.${v}`)}</option>)}
            </select>
          </div>

          <div>
            <label className={label}>{t('eventForm.description')}</label>
            <textarea className="input w-full mt-1 resize-none" rows={4} value={form.description} maxLength={5000}
              onChange={e => set('description', e.target.value)} />
          </div>

          {lockTerms && (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
              <Lock size={13} className="shrink-0 mt-0.5" /> {t('eventForm.termsLocked')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('eventForm.date')} <span className="text-red-500">*</span></label>
              <input type="date" className="input w-full mt-1" value={form.date} disabled={!isNew && lockTerms}
                min={isNew ? todayYmd() : undefined}
                onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className={label}>{t('eventForm.time')} <span className="text-red-500">*</span></label>
              <input type="time" className="input w-full mt-1" value={form.time} disabled={!isNew && lockTerms}
                onChange={e => set('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>{t('eventForm.endDate')}</label>
            <input type="date" className="input w-full mt-1" value={form.end_date} min={form.date || undefined}
              onChange={e => set('end_date', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">{t('eventForm.endDateHint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('eventForm.location')} <span className="text-red-500">*</span></label>
              <input className="input w-full mt-1" value={form.location} maxLength={300}
                placeholder={t('eventForm.locationPlaceholder')}
                onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <label className={label}>{t('eventForm.city')} <span className="text-red-500">*</span></label>
              <input className="input w-full mt-1" value={form.city} maxLength={100}
                onChange={e => set('city', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('eventForm.capacity')}</label>
              <input inputMode="numeric" className="input w-full mt-1" value={form.capacity}
                placeholder={t('eventForm.capacityPlaceholder')}
                onChange={e => set('capacity', e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <div>
              <label className={label}>{t('eventForm.price')}</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                <input inputMode="decimal" className="input w-full pl-7" value={form.price} disabled={!isNew && lockTerms}
                  placeholder={t('eventForm.pricePlaceholder')}
                  onChange={e => set('price', e.target.value)} />
              </div>
            </div>
          </div>
          <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>{t('eventForm.priceHint', { hours: 48 })}</span>
          </p>

          <div>
            <label className={label}>{t('eventForm.image')}</label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url ? (
                <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => onPickImage(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn-secondary text-sm inline-flex items-center gap-1.5">
                <ImagePlus size={14} /> {uploading ? t('common.loading') : form.image_url ? t('eventForm.changeImage') : t('eventForm.addImage')}
              </button>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', '')}
                  className="text-gray-400 hover:text-red-600 p-1" aria-label={t('common.remove')}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {errors.length > 0 && (form.title || form.date || form.location) && (
            <ul className="text-xs text-red-500 space-y-0.5">
              {[...new Set(errors)].map(e => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || uploading || errors.length > 0}
            className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Save size={14} /> {save.isPending ? t('common.loading') : isNew ? t('eventForm.create') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
