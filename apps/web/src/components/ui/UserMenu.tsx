import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, User, Settings, PawPrint, Calendar, MessageSquare, Heart, ShoppingBag, MapPin, Shield, Package, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export default function UserMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            className="fixed top-16 right-4 w-56 card shadow-modal py-1 z-50">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            {[
              { to: '/profile',    icon: User,          label: t('nav.profile') },
              { to: '/my-pets',    icon: PawPrint,      label: t('nav.myPets') },
              { to: '/bookings',   icon: Calendar,      label: t('nav.myBookings') },
              { to: '/orders',     icon: ShoppingBag,   label: t('orders.title') },
              { to: '/wishlist',   icon: Heart,         label: 'Wishlist' },
              { to: '/tracker',    icon: MapPin,        label: t('nav.petTracker') },
              { to: '/telehealth', icon: MessageSquare, label: t('nav.telehealth') },
            ].map(item => (
              <Link key={item.to} to={item.to} onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <item.icon size={15} className="text-gray-400" />
                {item.label}
              </Link>
            ))}
            {(user?.role === 'service_provider' || user?.role === 'admin') && (
              <Link to="/provider/packages" onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                <Package size={15} className="text-gray-400" />
                Τα πακέτα μου
              </Link>
            )}
            {(user?.role === 'service_provider' || user?.role === 'admin') && (
              <Link to="/provider" onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                <Settings size={15} className="text-gray-400" />
                {t('nav.providerDashboard')}
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Shield size={15} className="text-gray-400" />
                {t('nav.admin')}
              </Link>
            )}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
              <button onClick={() => { onClose(); logout() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut size={15} />
                {t('nav.logout')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
