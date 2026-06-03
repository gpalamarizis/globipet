import { Outlet } from 'react-router-dom'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, Wrench, TrendingUp, Users, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/provider', label: 'Επισκόπηση', icon: LayoutDashboard, exact: true },
  { path: '/provider/services', label: 'Υπηρεσίες', icon: Wrench },
  { path: '/provider/bookings', label: 'Κρατήσεις', icon: Calendar },
  { path: '/provider/marketing', label: 'Marketing', icon: Megaphone },
  { path: '/provider/clients', label: 'Πελάτες', icon: Users },
]

export default function ProviderLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-40">
        <div className="page-container">
          <div className="flex gap-1 overflow-x-auto py-1">
            {tabs.map(tab => {
              const active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path)
              return (
                <Link key={tab.path} to={tab.path} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <tab.icon size={16}/>{tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <div className="page-container py-6"><Outlet /></div>
    </div>
  )
}
