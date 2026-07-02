import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, BookOpen, Building2, Package, Layers, Percent, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSelector from '@/components/ui/LanguageSelector'

const tabs = [
  { path: '/admin',               labelKey: 'adminLayout.overview',      icon: LayoutDashboard, exact: true },
  { path: '/admin/catalog',       labelKey: 'adminLayout.catalog',       icon: BookOpen },
  { path: '/admin/services',      labelKey: 'adminLayout.services',      icon: Building2 },
  { path: '/admin/packages',      labelKey: 'adminLayout.packages',      icon: Package },
  { path: '/admin/subscriptions', labelKey: 'adminLayout.subscriptions', icon: Layers },
  { path: '/admin/commissions',   labelKey: 'adminLayout.commissions',   icon: Percent },
  { path: '/admin/messages',      labelKey: 'adminLayout.messages',      icon: Mail },
]

export default function AdminLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="page-container">
          <div className="flex flex-wrap items-center gap-1 py-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {tabs.map(tab => {
                const active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path)
                return (
                  <Link key={tab.path} to={tab.path} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
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
      <Outlet />
    </div>
  )
}
