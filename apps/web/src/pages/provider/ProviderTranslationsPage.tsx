import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, X, Check, AlertCircle, Package, Scissors, Box } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Μεταφράσεις περιεχομένου παρόχου.
 *
 * Ο πάροχος βλέπει τι έγραψε στα ελληνικά και συμπληρώνει τα αγγλικά.
 * Όπου δεν συμπληρώσει, ο ξενόγλωσσος επισκέπτης βλέπει το ελληνικό —
 * ποτέ κενό.
 *
 * Οι υπηρεσίες, τα πακέτα και τα προϊόντα είναι δικά του. Το περιεχόμενο
 * της πλατφόρμας (φυλές, πλάνα, πρότυπα) το διαχειρίζεται ο διαχειριστής.
 */

type Entity = 'service' | 'service_package' | 'product'

const TABS: { id: Entity; labelKey: string; icon: any; fields: string[] }[] = [
  { id: 'service',         labelKey: 'providerTrn.tabServices', icon: Scissors, fields: ['title', 'description'] },
  { id: 'service_package', labelKey: 'providerTrn.tabPackages',    icon: Package,  fields: ['name', 'description'] },
  { id: 'product',         labelKey: 'providerTrn.tabProducts',  icon: Box,      fields: ['name', 'description'] },
]

const FIELD_LABEL: Record<string, string> = {
  title: 'providerTrn.fTitle',
  name: 'providerTrn.fName',
  description: 'providerTrn.fDescription',
  provider_name: 'providerTrn.fProviderName',
}

export default function ProviderTranslationsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Entity>('service')
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const current = TABS.find(tb => tb.id === tab)!

  // ── Οι εγγραφές του παρόχου ─────────────────────────────────────────
  const { data: services = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['my-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []),
    enabled: tab === 'product',
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['my-packages'],
    // Το /packages/my επιστρέφει τις ΥΠΗΡΕΣΙΕΣ του παρόχου με τα πακέτα τους
    // μέσα (backend/src/routes/packages.ts). Η μετάφραση αφορά το κάθε
    // πακέτο (entity service_package, id του πακέτου, πεδία name/description).
    queryFn: () => api.get('/packages/my').then(r =>
      ((r.data?.data ?? []) as any[]).flatMap((s: any) => s?.packages ?? [])),
    enabled: tab === 'service_package',
  })

  // ── Τι λείπει σε αγγλικά ────────────────────────────────────────────
  const { data: missing = [], isLoading: missingLoading } = useQuery<any[]>({
    queryKey: ['translations-missing', tab],
    queryFn: () => api.get(`/translations/missing/${tab}?lang=en`).then(r => r.data?.data ?? []),
  })
  const missingIds = new Set(missing.map((m: any) => m.id))

  // ── Οι μεταφράσεις της επιλεγμένης εγγραφής ─────────────────────────
  const { data: existing, isLoading: loadingOne } = useQuery({
    queryKey: ['translation', tab, editing?.id],
    queryFn: () => api.get(`/translations/${tab}/${editing!.id}`).then(r => r.data),
    enabled: !!editing,
  })

  const save = useMutation({
    mutationFn: () => api.put(`/translations/${tab}/${editing!.id}`, { en: draft }),
    onSuccess: (r: any) => {
      const { saved = 0, removed = 0 } = r?.data ?? {}
      toast.success(removed && !saved ? t('providerTrn.removed') : t('providerTrn.savedFields', { count: saved }))
      qc.invalidateQueries({ queryKey: ['translations-missing'] })
      qc.invalidateQueries({ queryKey: ['translation', tab, editing?.id] })
      setEditing(null); setDraft({})
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerTrn.errSave')),
  })

  // ── Λίστα προς εμφάνιση ─────────────────────────────────────────────
  const rows: any[] =
    tab === 'service' ? services :
    tab === 'product' ? products : packages

  const openEdit = (row: any) => {
    const label = row.title || row.name || '—'
    setEditing({ id: row.id, label })
    setDraft({})
  }

  // Το draft ξεκινά από ό,τι υπάρχει ήδη, μόλις φορτώσει.
  const enExisting: Record<string, string> = existing?.data?.en ?? {}
  const value = (f: string) => draft[f] !== undefined ? draft[f] : (enExisting[f] ?? '')

  const original = (row: any, f: string) => row?.[f] ?? ''
  const editingRow = rows.find(r => r.id === editing?.id)

  const done = rows.length - missing.length

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Languages size={18} className="text-brand-900" />{t('providerTrn.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('providerTrn.subtitle')}
          </p>
        </div>
        {rows.length > 0 && (
          <div className="text-sm text-gray-500 shrink-0">
            <span className="font-semibold text-gray-900 dark:text-white">{done}</span>
            {' '}{t('providerTrn.ofTotal', { count: rows.length })}
          </div>
        )}
      </div>

      {/* Καρτέλες */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(tb => {
          const Icon = tb.icon
          return (
            <button key={tb.id} onClick={() => { setTab(tb.id); setEditing(null) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
                tab === tb.id
                  ? 'bg-brand-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
              )}>
              <Icon size={14} /> {t(tb.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Λίστα */}
      {missingLoading ? (
        <div className="card p-12 text-center text-gray-500">{t('providerTrn.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <Languages size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">{t('providerTrn.emptyCategory')}</p>
          <p className="text-sm text-gray-500 mt-1">
            {t('providerTrn.addFirst', { what: t(current.labelKey).toLowerCase() })}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map(row => {
            const label = row.title || row.name || '—'
            const needsWork = missingIds.has(row.id)
            return (
              <button key={row.id} onClick={() => openEdit(row)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                  needsWork
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-green-100 dark:bg-green-900/30',
                )}>
                  {needsWork
                    ? <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
                    : <Check size={15} className="text-green-600 dark:text-green-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{label}</p>
                  {row.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{row.description}</p>
                  )}
                </div>

                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full shrink-0',
                  needsWork
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                )}>
                  {needsWork ? t('providerTrn.missingEn') : 'EN ✓'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Επεξεργασία */}
      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setEditing(null); setDraft({}) }}>
            <motion.div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-start justify-between mb-1 gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-display font-bold truncate">{editing.label}</h3>
                  <p className="text-sm text-gray-500">{t('providerTrn.greekToEnglish')}</p>
                </div>
                <button onClick={() => { setEditing(null); setDraft({}) }} className="btn-ghost p-2 shrink-0">
                  <X size={18} />
                </button>
              </div>

              {loadingOne ? (
                <div className="py-10 text-center text-gray-500">{t('providerTrn.loading')}</div>
              ) : (
                <div className="space-y-5 mt-5">
                  {current.fields.map(f => (
                    <div key={f}>
                      <label className="label">{FIELD_LABEL[f] || f}</label>

                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Ελληνικά — μόνο ανάγνωση, ώστε να βλέπει τι μεταφράζει */}
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{t('providerTrn.greek')}</p>
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2.5 text-sm text-gray-600 dark:text-gray-400 min-h-[42px] whitespace-pre-line">
                            {original(editingRow, f) || <span className="text-gray-400">—</span>}
                          </div>
                        </div>

                        {/* Αγγλικά */}
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900 dark:text-yellow-400 mb-1">{t('providerTrn.english')}</p>
                          {f === 'description' ? (
                            <textarea className="input" rows={4} value={value(f)}
                              placeholder="English translation…"
                              onChange={e => setDraft({ ...draft, [f]: e.target.value })} />
                          ) : (
                            <input className="input" value={value(f)}
                              placeholder="English translation…"
                              onChange={e => setDraft({ ...draft, [f]: e.target.value })} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-gray-500">
                    {t('providerTrn.emptyHint')}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={() => { setEditing(null); setDraft({}) }} className="btn-secondary">{t('providerTrn.cancel')}</button>
                <button onClick={() => save.mutate()} className="btn-primary" disabled={save.isPending}>
                  {save.isPending ? t('providerTrn.saving') : t('providerTrn.save')}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
