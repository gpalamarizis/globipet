import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}
