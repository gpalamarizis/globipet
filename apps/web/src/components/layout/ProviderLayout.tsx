import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown, User, KeyRound, Bell, ShieldCheck, SlidersHorizontal, FileText, Lock,
  LifeBuoy, LogOut, BadgeCheck, Globe, Shield, ArrowRight,
} from 'lucide-react'
import LanguageSelector from '@/components/ui/LanguageSelector'
import NotificationsPanel from '@/components/ui/NotificationsPanel'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { getInitials } from '@/lib/utils'

/**
 * Περίβλημα σελίδων παρόχου.
 *
 * ΓΙΑΤΙ ΑΦΑΙΡΕΘΗΚΕ Η ΜΠΑΡΑ ΠΛΟΗΓΗΣΗΣ
 *   Είχε πέντε κουμπιά — Επισκόπηση, Υπηρεσίες, Κρατήσεις, Marketing,
 *   Πελάτες — αλλά μόνο δύο διαδρομές υπάρχουν πραγματικά: /provider και
 *   /provider/packages. Τα υπόλοιπα έπεφταν στο catch-all /provider/*
 *   και εμφάνιζαν ξανά το ίδιο dashboard, οπότε έμοιαζαν σπασμένα.
 *
 *   Το ProviderDashboard έχει ήδη δικές του καρτέλες που δουλεύουν:
 *   Επισκόπηση, Υπηρεσίες, Προσωπικό, Κρατήσεις, Ημερολόγιο, Καμπάνιες,
 *   Πελάτες, Μεταφράσεις. Δύο επίπεδα πλοήγησης για το ίδιο πράγμα
 *   μπέρδευαν τον χρήστη.
 *
 * ΜΕΝΟΥ ΛΟΓΑΡΙΑΣΜΟΥ
 *   Ο καθαρός πάροχος δεν βλέπει το καταναλωτικό site, οπότε δεν είχε
 *   πουθενά αλλαγή κωδικού, ειδοποιήσεις, εξαγωγή/διαγραφή δεδομένων
 *   (GDPR), συγκαταθέσεις, όρους ή αποσύνδεση. Ίδια λίστα με το
 *   «Περισσότερα» του κινητού ((provider)/more.tsx). Οι σελίδες αυτές
 *   επιτρέπονται στον καθαρό πάροχο από το MainLayout (PROVIDER_SHARED_PATHS).
 */
export default function ProviderLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [])

  // Ειδοποιήσεις — ίδιο query (και κλειδί) με το MainLayout: αριθμός αδιάβαστων
  // (unread_count — ΟΛΕΣ, όχι μόνο της σελίδας), 9+ πάνω από 9. Στο κινητό είναι
  // το «Κέντρο ειδοποιήσεων» στο «Περισσότερα».
  const { data: unreadNotifications = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications?unread=true&limit=1').then(r =>
      typeof r.data?.unread_count === 'number' ? r.data.unread_count : (r.data?.data?.length ?? 0)),
    enabled: !!user,
  })

  // Κατάσταση επαλήθευσης — ίδιο query (και κλειδί) με τη σελίδα επαλήθευσης.
  const { data: verification, isSuccess: verificationLoaded } = useQuery({
    queryKey: ['my-verification'],
    queryFn: () => api.get('/provider/verification-request').then(r => r.data?.data ?? null),
    // Ο admin δεν κάνει αίτηση επαλήθευσης — δεν του δείχνουμε την κάρτα.
    enabled: !!user && user.role !== 'admin',
  })
  const needsVerification = verificationLoaded && (!verification || verification.status === 'rejected')
  const onVerificationPage = location.pathname.startsWith('/provider/verification')

  // Λογαριασμός Google/Facebook (χωρίς κωδικό): η «Αλλαγή κωδικού» κρύβεται —
  // ίδιος κανόνας με το Profile.tsx (εκεί δεν εμφανίζεται η κάρτα #password).
  const socialOnly = !!(user as any)?.google_id || !!(user as any)?.facebook_id
  const items = [
    { to: '/provider/verification', icon: BadgeCheck,        label: t('providerAccount.verification') },
    { to: '/profile',               icon: User,              label: t('nav.profile') },
    { to: '/profile#password',      icon: KeyRound,          label: t('providerAccount.changePassword') },
    { to: '/profile#notifications', icon: Bell,              label: t('providerAccount.notifications') },
    { to: '/profile#my-data',       icon: ShieldCheck,       label: t('providerAccount.myData') },
    { to: '/cookies',               icon: SlidersHorizontal, label: t('providerAccount.consents') },
    { to: '/terms',                 icon: FileText,          label: t('footer.terms') },
    { to: '/privacy',               icon: Lock,              label: t('footer.privacy') },
    { to: '/help',                  icon: LifeBuoy,          label: t('footer.help') },
  ].filter(i => !(socialOnly && i.to === '/profile#password'))

  const itemCls = 'flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <div className="page-container flex items-center justify-end gap-2 pt-3">
        <LanguageSelector />

        <button type="button" onClick={() => setNotifOpen(o => !o)} className="btn-ghost p-2.5 relative"
          aria-label={`${t('nav.notifications')}${unreadNotifications > 0 ? ` (${t('nav.unread', { count: unreadNotifications })})` : ''}`}
          aria-expanded={notifOpen}>
          <Bell size={18} className="text-gray-500" aria-hidden="true" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <div className="relative" ref={ref}>
          <button type="button" onClick={() => setOpen(o => !o)}
            aria-haspopup="true" aria-expanded={open} aria-label={t('providerAccount.menu')}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm shrink-0">
              {user?.profile_photo
                ? <img src={user.profile_photo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : <span>{getInitials(user?.full_name || 'U')}</span>}
            </span>
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
              {user?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className="text-gray-400" aria-hidden="true" />
          </button>

          {open && (
            <div role="menu" className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] card shadow-modal py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              {items.map(item => (
                <Link key={item.to} to={item.to} role="menuitem" onClick={() => setOpen(false)} className={itemCls}>
                  <item.icon size={15} className="text-gray-400 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))}
              {/* Ο «both» και ο admin έχουν και το καταναλωτικό μέρος. */}
              {(user?.role === 'both' || user?.role === 'admin') && (
                <Link to="/" role="menuitem" onClick={() => setOpen(false)}
                  className={`${itemCls} border-t border-gray-100 dark:border-gray-800 mt-1`}>
                  <Globe size={15} className="text-gray-400 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{t('providerAccount.consumerArea')}</span>
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemCls}>
                  <Shield size={15} className="text-gray-400 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{t('nav.admin')}</span>
                </Link>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
                <button type="button" role="menuitem" onClick={() => { setOpen(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut size={15} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ίδια κάρτα με την Επισκόπηση του κινητού: χωρίς αίτηση (ή με
          απορριφθείσα) ο πάροχος δεν ξέρει ότι μπορεί να πάρει σήμα. */}
      {needsVerification && !onVerificationPage && (
        <div className="page-container pt-3">
          <Link to="/provider/verification"
            className="flex items-center gap-3 p-4 rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
            <BadgeCheck size={22} className="text-brand-900 dark:text-brand-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                {verification?.status === 'rejected' ? t('providerAccount.verifyRejectedTitle') : t('providerAccount.verifyTitle')}
              </span>
              <span className="block text-xs text-gray-600 dark:text-gray-400">{t('providerAccount.verifyDesc')}</span>
            </span>
            <ArrowRight size={18} className="text-brand-900 dark:text-brand-400 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      )}

      <div className="page-container py-4"><Outlet /></div>
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
