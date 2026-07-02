import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import LanguageSelector from '@/components/ui/LanguageSelector'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return (
    <>
      {/* Floating language switcher (top-right) so users can change language on auth pages */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      <Outlet />
    </>
  )
}
