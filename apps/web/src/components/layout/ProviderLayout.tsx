import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Calendar, Wrench, TrendingUp, Users, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSelector from '@/components/ui/LanguageSelector'

const tabs = [
  { path: '/provider',           labelKey: 'providerLayout.overview',  icon: LayoutDashboard, exact: true },
  { path: '/provider/services',  labelKey: 'providerLayout.services',  icon: Wrench },
  { path: '/provider/bookings',  labelKey: 'providerLayout.bookings',  icon: Calendar },
  { path: '/provider/marketing', labelKey: 'providerLayout.marketing', icon: Megaphone },
  { path: '/provider/clients',   labelKey: 'providerLayout.clients',   icon: Users },
]

export default function ProviderLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-40">
        <div className="page-container">
          <div className="flex flex-wrap items-center gap-1 py-1">
            <div className="flex flex-wrap gap-1 flex-1">
              {tabs.map(tab => {
                const active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path)
                return (
                  <Link key={tab.path} to={tab.path} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                    <tab.icon size={16}/>{t(tab.labelKey)}
                  </Link>
                )
              })}
            </div>
            <div className="shrink-0">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
      <div className="page-container py-6"><Outlet /></div>
    </div>
  )
}
