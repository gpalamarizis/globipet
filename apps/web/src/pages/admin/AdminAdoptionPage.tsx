import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Search, EyeOff, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { LISTING_STATUS_CLS, countryName } from '@/components/features/adoption/shared'

/**
 * Διαχείριση → Υιοθεσίες. Εποπτεία αγγελιών (App Store 1.2 / UGC):
 * οι αναφορές φτάνουν στα «Μηνύματα επικοινωνίας» με θέμα «[Αναφορά] Αγγελία
 * υιοθεσίας …» — από εδώ η αγγελία κρύβεται (ο κάτοχος βλέπει τον λόγο).
 */
export default function AdminAdoptionPage() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [onlyHidden, setOnlyHidden] = useState(false)

  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin-adoption', q, onlyHidden],
    queryFn: () => api.get('/adoption/admin/listings', { params: { q: q.trim() || undefined, hidden: onlyHidden ? 'true' : undefined, limit: 100 } }).then(r => r.data),
  })
  const rows: any[] = data?.data ?? []

  const toggle = async (l: any) => {
    let reason: string | null = null
    if (!l.is_hidden) { reason = window.prompt(t('adoption.admin.reasonPrompt')); if (reason === null) return }
    try {
      await api.patch(`/adoption/admin/listings/${l.id}`, { is_hidden: !l.is_hidden, hidden_reason: reason })
      qc.invalidateQueries({ queryKey: ['admin-adoption'] })
    } catch (e: any) { toast.error(e?.response?.data?.message || t('adoption.common.error')) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeartHandshake className="text-rose-500" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adoption.admin.title')}</h1>
          <p className="text-sm text-gray-500">{t('adoption.admin.subtitle')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('adoption.filters.search')} className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-brand-900" checked={onlyHidden} onChange={e => setOnlyHidden(e.target.checked)} />{t('adoption.admin.onlyHidden')}
        </label>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="p-3">{t('adoption.form.name')}</th><th className="p-3">{t('adoption.admin.lister')}</th><th className="p-3">{t('adoption.form.country')}</th>
              <th className="p-3">{t('adoption.app.status')}</th><th className="p-3">{t('adoption.manage.applications', { count: 2 }).replace(/^\d+\s*/, '')}</th><th className="p-3">{t('adoption.admin.created')}</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-6"><div className="skeleton h-10" /></td></tr> : rows.map(l => (
              <tr key={l.id} className="border-b border-gray-50 dark:border-gray-800 align-middle">
                <td className="p-3"><Link to={`/adoption/${l.id}`} className="font-medium text-gray-900 dark:text-white hover:underline">{l.name}</Link>
                  {l.is_hidden && <span className="badge-red ml-2">{t('adoption.admin.hidden')}</span>}
                  {l.hidden_reason && <p className="text-xs text-gray-400">{l.hidden_reason}</p>}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{l.lister_name} <span className="text-xs text-gray-400">({t(`adoption.card.${l.lister_type === 'organisation' ? 'organisation' : 'individual'}`)})</span></td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{countryName(t, l.country)} · {l.city}</td>
                <td className="p-3"><span className={LISTING_STATUS_CLS[l.status]}>{t(`adoption.status.${l.status}`)}</span></td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{l.applications_total}</td>
                <td className="p-3 text-gray-500">{fmtDateShort(l.created_at, lang)}</td>
                <td className="p-3 text-right">
                  <button type="button" onClick={() => toggle(l)} className="btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
                    {l.is_hidden ? <><Eye size={14} />{t('adoption.admin.unhide')}</> : <><EyeOff size={14} />{t('adoption.admin.hide')}</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
