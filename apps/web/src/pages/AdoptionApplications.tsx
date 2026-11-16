import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { APP_STATUS_CLS, SPECIES_EMOJI } from '@/components/features/adoption/shared'

/** Οι αιτήσεις υιοθεσίας μου (ως αιτών). Ίδια λίστα με app/adoption-applications του κινητού. */
export default function AdoptionApplicationsPage() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ['adoption-my-applications'], queryFn: () => api.get('/adoption/applications/mine').then(r => r.data.data) })

  return (
    <div className="page-container py-8 space-y-6 max-w-3xl">
      <Link to="/adoption" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft size={16} />{t('adoption.detail.back')}</Link>
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={22} className="text-brand-900" />{t('adoption.apps.title')}</h1>
      {isLoading ? <div className="card h-32 skeleton" /> : data.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-gray-500">{t('adoption.apps.empty')}</p>
          <Link to="/adoption" className="btn-primary inline-block">{t('adoption.apps.browse')}</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map(a => (
            <Link key={a.id} to={`/adoption/applications/${a.id}`} className="card-hover p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl">
                {a.listing?.photos?.[0] ? <img src={a.listing.photos[0]} alt="" className="w-full h-full object-cover" /> : SPECIES_EMOJI[a.listing?.species] ?? '🐾'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{a.listing?.name}</span>
                  <span className={APP_STATUS_CLS[a.status]}>{t(`adoption.appStatus.${a.status}`)}</span>
                  {a.unread_messages > 0 && <span className="badge-orange">{t('adoption.apps.unread', { count: a.unread_messages })}</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{a.listing?.lister_name} · {t('adoption.apps.submitted', { date: fmtDateShort(a.created_at, lang) })}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
