import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Building2, Package, Layers, Percent, Mail, Layout } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/admin',               label: 'Επισκόπηση',  icon: LayoutDashboard, exact: true },
  { path: '/admin/catalog',       label: 'Κατάλογος',   icon: BookOpen },
  { path: '/admin/services',      label: 'Υπηρεσίες',   icon: Building2 },
  { path: '/admin/packages',      label: 'Πακέτα',      icon: Package },
  { path: '/admin/subscriptions', label: 'Συνδρομές',   icon: Layers },
  { path: '/admin/commissions',   label: 'Προμήθειες',  icon: Percent },
  { path: '/admin/messages',      label: 'Μηνύματα',    icon: Mail },
  { path: '/admin/content',       label: 'Περιεχόμενο', icon: Layout },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="page-container">
          <div className="flex flex-wrap gap-1 py-2">
            {tabs.map(tab => {
              const active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path)
              return (
                <Link key={tab.path} to={tab.path} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <tab.icon size={16}/>{tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  )
}