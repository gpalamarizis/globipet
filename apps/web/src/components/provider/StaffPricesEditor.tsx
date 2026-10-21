import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Save, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

/**
 * Τιμές ανά επαγγελματία για κάθε πακέτο της υπηρεσίας του.
 *
 * GET /staff/:id/prices → [{ package_id, name, base_price, base_duration,
 *   price, duration_minutes, custom_price }]
 * PUT /staff/:id/prices { prices: [{ package_id, price, duration_minutes }] }
 *   Μαζικά: ό,τι λείπει (ή έχει κενή τιμή) επιστρέφει στη βασική τιμή του
 *   πακέτου. Γι' αυτό στέλνεται ΠΑΝΤΑ όλη η λίστα.
 *
 * Κενό πεδίο = βασική τιμή του πακέτου. Η διάρκεια στέλνεται ρητά (η τρέχουσα
 * ή η βασική): χωρίς αυτήν ο server βάζει 30 λεπτά.
 * Ίδια λειτουργία με το κινητό (mobile/src/components/StaffPricesEditor.tsx).
 */
type PriceRow = {
  package_id: string
  name: string
  base_price: number
  base_duration: number | null
  price: number
  duration_minutes: number | null
  custom_price: boolean
}

/** Δεκαδικός με κόμμα ή τελεία· κενό = βασική. */
const parsePrice = (v: string): number | null | 'bad' => {
  const s = v.trim().replace(',', '.')
  if (!s) return null
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return 'bad'
  return Number(s)
}

export default function StaffPricesEditor({ staffId }: { staffId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff-prices', staffId],
    queryFn: () => api.get(`/staff/${staffId}/prices`).then(r => (r.data?.data ?? []) as PriceRow[]),
  })
  const rows = data ?? []
  // Μόνο ΟΣΑ άλλαξε ο χρήστης· τα υπόλοιπα διαβάζονται από τα δεδομένα. Πριν
  // κάθε επαναφόρτωση (π.χ. επιστροφή στην καρτέλα) ξαναγέμιζε όλα τα πεδία
  // από τον server και έσβηνε τις μη αποθηκευμένες τιμές.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const serverValue = (r: PriceRow) => (r.custom_price ? String(r.price) : '')
  const valueOf = (r: PriceRow) => edits[r.package_id] ?? serverValue(r)

  const invalid = rows.some(r => parsePrice(valueOf(r)) === 'bad')
  const dirty = rows.some(r => valueOf(r) !== serverValue(r))

  const save = useMutation({
    mutationFn: () => api.put(`/staff/${staffId}/prices`, {
      prices: rows.map(r => {
        const p = parsePrice(valueOf(r))
        return {
          package_id: r.package_id,
          price: p === null || p === 'bad' ? null : p,
          duration_minutes: r.duration_minutes ?? r.base_duration ?? undefined,
        }
      }),
    }),
    onSuccess: async () => {
      toast.success(t('staffPrices.saved'))
      // Οι τιμές που βλέπει ο πελάτης στην επιλογή γιατρού.
      qc.invalidateQueries({ queryKey: ['service-staff'] })
      // Οι αλλαγές φεύγουν ΑΦΟΥ έρθουν τα νέα δεδομένα (αλλιώς για μια στιγμή
      // θα φαίνονταν οι παλιές τιμές).
      await qc.invalidateQueries({ queryKey: ['staff-prices', staffId] }).catch(() => {})
      setEdits({})
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <Tag size={14} className="text-brand-900 dark:text-yellow-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('staffPrices.title')}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">{t('staffPrices.hint')}</p>

      {isLoading ? (
        <p className="text-xs text-gray-400">{t('common.loading')}</p>
      ) : isError ? (
        <p className="text-xs text-red-500">{t('staffPrices.loadError')}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">{t('staffPrices.noPackages')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map(r => {
              const bad = parsePrice(valueOf(r)) === 'bad'
              return (
                <div key={r.package_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      {t('staffPrices.base', { price: formatCurrency(Number(r.base_price)) })}
                    </p>
                  </div>
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                    <input
                      inputMode="decimal"
                      value={valueOf(r)}
                      onChange={e => setEdits(v => ({ ...v, [r.package_id]: e.target.value }))}
                      placeholder={Number(r.base_price).toFixed(2)}
                      aria-label={t('staffPrices.priceFor', { name: r.name })}
                      className={'input w-full pl-7 text-sm text-right' + (bad ? ' border-red-400' : '')}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {invalid && <p className="text-xs text-red-500 mt-2">{t('staffPrices.invalid')}</p>}
          <div className="flex items-center justify-end gap-3 mt-3">
            {dirty && !save.isPending && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400" role="status">{t('staffPrices.unsaved')}</span>
            )}
            <button type="button" onClick={() => save.mutate()}
              disabled={save.isPending || invalid || !dirty}
              className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <Save size={14} /> {save.isPending ? t('common.loading') : t('staffPrices.save')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
