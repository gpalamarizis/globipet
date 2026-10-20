import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingBag, TrendingUp, PawPrint, Search, Ban, CheckCircle, Trash2, Eye, EyeOff, Package, ClipboardList, Database, ChevronRight, AlertTriangle, X, Play, Shield, Plus, Key, Globe, Edit2, FileSpreadsheet, Upload, Download, ChevronDown, Layers, ArrowLeft, Calendar, Euro, Megaphone } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { Navigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { localName } from '@/lib/localName'
import ChangePasswordModal from '@/components/admin/ChangePasswordModal'
import TranslationEditor from '@/components/admin/TranslationEditor'
import ProductFormModal from '@/components/admin/ProductFormModal'
import ServiceFormModal from '@/components/admin/ServiceFormModal'
import BulkImportModal from '@/components/admin/BulkImportModal'
import ProviderMarketingPage from '@/pages/provider/ProviderMarketingPage'

type Tab = 'overview' | 'users' | 'providers' | 'products' | 'services' | 'orders' | 'database' | 'insurance' | 'bookings' | 'pets' | 'revenue' | 'campaigns'

function StatCard({ icon: Icon, label, value, change, color, onClick }: any) {
  // Με onClick γίνεται κουμπί: ο διαχειριστής κλικάρει τον αριθμό και
  // πηγαίνει στα δεδομένα. Χωρίς αυτό, οι αριθμοί ήταν αδιέξοδο.
  const Tag: any = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={cn('card p-5 w-full text-left',
        onClick && 'hover:border-brand-400 hover:shadow-md transition-all cursor-pointer')}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        {change != null && <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', change > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
          {change > 0 ? '+' : ''}{change}%
        </span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </Tag>
  )
}

function UsersTab() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'user' })
  const [passwordUser, setPasswordUser] = useState<any>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data?.data ?? []),
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/admin/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t('adminDash.userCreated'))
      setShowCreate(false)
      setNewUser({ full_name: '', email: '', password: '', role: 'user' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('adminDash.createError')),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/admin/users/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success(t('adminDash.userUpdated')) },
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success(t('adminDash.userDeleted')) },
  })

  const filtered = users.filter((u: any) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 input">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder={t('adminDash.searchUser')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input text-sm">
          <option value="all">{t('adminDash.allUsers')}</option>
          <option value="user">{t('adminDash.owners')}</option>
          <option value="service_provider">{t('adminDash.providersPl')}</option>
          <option value="admin">{t('adminDash.admins')}</option>
        </select>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus size={16}/> {t('adminDash.newUser')}
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card p-5 border-2 border-brand-200 dark:border-brand-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminDash.createUserTitle')}</h3>
              <button onClick={() => setShowCreate(false)} className="btn-ghost p-1"><X size={16}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.fullName')}</label>
                <input className="input" placeholder={t('adminDash.fullNamePh')} value={newUser.full_name}
                  onChange={e => setNewUser(u => ({...u, full_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.emailReq')}</label>
                <input className="input" type="email" placeholder="user@example.com" value={newUser.email}
                  onChange={e => setNewUser(u => ({...u, email: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.passwordReq')}</label>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? 'text' : 'password'}
                    placeholder={t('adminDash.passwordPh')}
                    value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.role')}</label>
                <select className="input" value={newUser.role} onChange={e => setNewUser(u => ({...u, role: e.target.value}))}>
                  <option value="user">{t('adminDash.owner')}</option>
                  <option value="service_provider">{t('adminDash.provider')}</option>
                  <option value="admin">{t('adminDash.admin')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button onClick={() => {
                  // Ίδιο ελάχιστο μήκος με τον backend (POST /admin/users).
                  if (newUser.password.length < 8) { toast.error(t('account.passwordMin')); return }
                  createUser.mutate()
                }}
                disabled={!newUser.email || !newUser.password || createUser.isPending}
                className="btn-primary flex-1">
                {createUser.isPending ? t('adminDash.creating') : t('adminDash.createUser')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.user')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.role')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.registered')}</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                {users.length === 0 ? t('adminDash.noUsers') : t('adminDash.noResults')}
              </td></tr>
            ) : filtered.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-xs shrink-0">
                      {u.profile_photo
                        ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" />
                        : getInitials(u.full_name || u.email || 'U')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => updateUser.mutate({ id: u.id, data: { role: e.target.value } })}
                    className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer',
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'service_provider' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700')}>
                    <option value="user">{t('adminDash.owner')}</option>
                    <option value="service_provider">{t('adminDash.provider')}</option>
                    <option value="admin">{t('adminDash.admin')}</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString(i18n.language) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setPasswordUser(u)}
                      title={t('adminDash.changePassword')}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Key size={14} className="text-blue-500" />
                    </button>
                    <button
                      onClick={() => { if(confirm(t('adminDash.confirmDeleteUser', { email: u.email }))) deleteUser.mutate(u.id) }}
                      title={t('adminDash.deleteUser')}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">{t('adminDash.usersCount', { count: filtered.length })}</p>
          </div>
        )}
      </div>

      <ChangePasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
    </div>
  )
}

function ProvidersTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => api.get('/admin/users?role=service_provider').then(r => r.data?.data ?? []),
  })

  const verifyProvider = useMutation({
    mutationFn: ({ id, verified }: any) => api.patch(`/admin/users/${id}`, { is_verified: verified }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-providers'] }); toast.success(t('adminDash.providerUpdated')) },
  })

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.provider')}</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.verification')}</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={3} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
          : providers.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-gray-400">{t('adminDash.noProviders')}</td></tr>
          : providers.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {getInitials(p.full_name || 'P')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{p.full_name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', p.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                  {p.is_verified ? t('adminDash.verifiedBadge') : t('adminDash.pendingBadge')}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => verifyProvider.mutate({ id: p.id, verified: !p.is_verified })}
                  className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-all', p.is_verified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                  {p.is_verified ? t('adminDash.remove') : t('adminDash.verification')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductsTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [translateProduct, setTranslateProduct] = useState<any>(null)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products?limit=50').then(r => r.data?.data ?? []),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success(t('adminDash.productDeleted')) },
  })

  const saveTranslations = useMutation({
    mutationFn: (vars: { id: string; translations: any }) => api.patch(`/products/${vars.id}`, {
      name_translations: vars.translations.name,
      description_translations: vars.translations.description,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success(t('adminDash.translationsSaved')) },
  })

  const filtered = products.filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 input flex-1">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder={t('adminDash.searchProduct')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <FileSpreadsheet size={14}/> {t('adminDash.excelImport')}
        </button>
        <button onClick={() => setNewProductOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <Plus size={14}/> {t('adminDash.newProduct')}
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.product')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.category')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.price')}</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">{t('adminDash.noProducts')}</td></tr>
            : filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">📦</div>
                    <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category ? t(`marketplace.categories.${p.category}`, { defaultValue: p.category }) : ''}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{p.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditProduct(p)} title={t('common.edit')}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit2 size={14} className="text-gray-600" /></button>
                    <button onClick={() => setTranslateProduct(p)} title={t('adminDash.translations')}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Globe size={14} className="text-blue-500" /></button>
                    <button onClick={() => { if(confirm(t('adminDash.confirmDeleteProduct'))) deleteProduct.mutate(p.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TranslationEditor
        open={!!translateProduct}
        onClose={() => setTranslateProduct(null)}
        title={t('adminDash.translationsFor', { name: translateProduct?.name || '' })}
        defaultName={translateProduct?.name}
        defaultDescription={translateProduct?.description}
        initialName={translateProduct?.name_translations}
        initialDescription={translateProduct?.description_translations}
        onSave={(t) => translateProduct && saveTranslations.mutate({ id: translateProduct.id, translations: t })}
      />

      <ProductFormModal open={newProductOpen} onClose={() => setNewProductOpen(false)} />
      <ProductFormModal open={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} />
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} type="products" />
    </div>
  )
}

function ServicesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [translateService, setTranslateService] = useState<any>(null)
  const [editService, setEditService] = useState<any>(null)
  const [newServiceOpen, setNewServiceOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get('/services?limit=50').then(r => r.data?.data ?? []),
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); toast.success(t('adminDash.serviceDeleted')) },
  })

  const saveTranslations = useMutation({
    mutationFn: (vars: { id: string; translations: any }) => api.patch(`/services/${vars.id}`, {
      provider_name_translations: vars.translations.name,
      description_translations: vars.translations.description,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); toast.success(t('adminDash.translationsSaved')) },
  })

  const filtered = services.filter((s: any) =>
    s.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.service_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 input flex-1">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder={t('adminDash.searchService')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <FileSpreadsheet size={14}/> {t('adminDash.excelImport')}
        </button>
        <button onClick={() => setNewServiceOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <Plus size={14}/> {t('adminDash.newService')}
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.provider')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.type')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.city')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.price')}</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t('adminDash.noServices')}</td></tr>
            : filtered.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">🩺</div>
                    <span className="font-medium text-gray-900 dark:text-white">{s.provider_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.service_type ? t(`services.types.${s.service_type}`, { defaultValue: s.service_type }) : ''}</td>
                <td className="px-4 py-3 text-gray-500">{s.city}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{s.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditService(s)} title={t('common.edit')}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit2 size={14} className="text-gray-600" /></button>
                    <button onClick={() => setTranslateService(s)} title={t('adminDash.translations')}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Globe size={14} className="text-blue-500" /></button>
                    <button onClick={() => { if(confirm(t('adminDash.confirmDeleteService'))) deleteService.mutate(s.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TranslationEditor
        open={!!translateService}
        onClose={() => setTranslateService(null)}
        title={t('adminDash.translationsFor', { name: translateService?.provider_name || '' })}
        defaultName={translateService?.provider_name}
        defaultDescription={translateService?.description}
        initialName={translateService?.provider_name_translations}
        initialDescription={translateService?.description_translations}
        onSave={(t) => translateService && saveTranslations.mutate({ id: translateService.id, translations: t })}
      />

      <ServiceFormModal open={newServiceOpen} onClose={() => setNewServiceOpen(false)} />
      <ServiceFormModal open={!!editService} onClose={() => setEditService(null)} service={editService} />
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} type="services" />
    </div>
  )
}

function OrdersTab() {
  const { t, i18n } = useTranslation()
  const [statusFilter, setStatusFilter] = useState('all')
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/orders?limit=50').then(r => r.data?.data ?? []),
  })
  const filtered = orders.filter((o: any) => statusFilter === 'all' || o.status === statusFilter)

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all','pending','confirmed','shipped','delivered','cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('text-xs px-3 py-1.5 rounded-full font-medium transition-all', statusFilter === s ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600')}>
            {s === 'all' ? t('adminDash.os_all') : s === 'pending' ? t('adminDash.os_pending') : s === 'confirmed' ? t('adminDash.os_confirmed') : s === 'shipped' ? t('adminDash.os_shipped') : s === 'delivered' ? t('adminDash.os_delivered') : t('adminDash.os_cancelled')}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.total')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.status')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('adminDash.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">{t('adminDash.noOrders')}</td></tr>
            : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id?.slice(0,8)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{o.total_amount?.toFixed(2) || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700')}>
                    {o.status ? t(`orders.status.${o.status}`, { defaultValue: o.status }) : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString(i18n.language) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DatabaseTab() {
  const { t } = useTranslation()
  const [query, setQuery] = useState("SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runQuery = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/admin/query', { sql: query })
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.message || t('adminDash.queryError'))
    } finally { setLoading(false) }
  }

  const quickQueries = [
    { label: t('adminDash.q_users'), sql: "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;" },
    { label: t('adminDash.q_orders'), sql: "SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;" },
    { label: t('adminDash.q_pets'), sql: "SELECT id, name, species, breed FROM pets ORDER BY created_at DESC LIMIT 20;" },
    { label: t('adminDash.q_tables'), sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-orange-500" />
          {/* Η παλιά προειδοποίηση έλεγε ότι τα DELETE/DROP είναι μη
              αναστρέψιμα. Δεν ισχύει πια: το backend δέχεται μόνο SELECT
              και WITH. Μια προειδοποίηση που περιγράφει δύναμη που δεν
              υπάρχει είναι χειρότερη από καμία — ο διαχειριστής μαθαίνει
              να αγνοεί τις προειδοποιήσεις. */}
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            {t('adminDash.readOnlyNote')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQueries.map(q => (
            <button key={q.label} onClick={() => setQuery(q.sql)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
        <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4}
          className="w-full font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl resize-none outline-none border border-gray-700"
          placeholder="SELECT * FROM ..." />
        <div className="flex justify-end mt-2">
          <button onClick={runQuery} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
            <Play size={14} /> {loading ? t('adminDash.running') : t('adminDash.runQuery')}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200"><p className="text-sm text-red-600 font-mono">{error}</p></div>}

      {result && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between">
            <span className="text-xs font-medium text-gray-500">{t('adminDash.resultsCount', { count: result.rowCount ?? result.rows?.length ?? 0 })}</span>
            <span className="text-xs text-gray-400">{result.duration}ms</span>
          </div>
          {result.rows?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{Object.keys(result.rows[0]).map(k => <th key={k} className="text-left px-3 py-2 font-medium text-gray-500">{k}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {result.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {Object.values(row).map((v: any, j) => (
                        <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {v === null ? <span className="text-gray-400">NULL</span> : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center py-8 text-gray-400 text-sm">{t('adminDash.noData')}</p>}
        </div>
      )}
    </div>
  )
}


const TIER_LABELS: Record<string, string> = {
  basic: 'adminDash.tier_basic', standard: 'adminDash.tier_standard', premium: 'adminDash.tier_premium', comprehensive: 'adminDash.tier_comprehensive'
}

function InsuranceTab() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-insurance-providers'],
    queryFn: () => api.get('/insurance/providers').then(r => r.data?.data ?? []),
  })

  const deleteProvider = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/insurance/providers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); toast.success(t('adminDash.deleted')) },
    onError: () => toast.error(t('adminDash.deleteError')),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/insurance/plans/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); toast.success(t('adminDash.deleted')) },
    onError: () => toast.error(t('adminDash.deleteError')),
  })

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const providersSheet = wb.Sheets['Insurance Providers']
      const plansSheet = wb.Sheets['Insurance Plans']
      const providers = providersSheet
        ? XLSX.utils.sheet_to_json(providersSheet, { range: 4 }).filter((r: any) => r['name *'] || r.name)
            .map((r: any) => ({ name: r['name *'] || r.name, name_el: r.name_el, website: r.website, phone: r.phone, email: r.email, description: r.description, logo_url: r.logo_url, display_order: r.display_order }))
        : []
      const plans = plansSheet
        ? XLSX.utils.sheet_to_json(plansSheet, { range: 4 }).filter((r: any) => r['provider_name *'] || r.provider_name)
            .map((r: any) => ({ provider_name: r['provider_name *'] || r.provider_name, plan_name: r['plan_name *'] || r.plan_name, plan_name_el: r.plan_name_el, tier: r['tier *'] || r.tier, price_monthly: r['price_monthly *'] || r.price_monthly, price_annual: r.price_annual, covers_accidents: r['covers_accidents *'] || r.covers_accidents, covers_illness: r['covers_illness *'] || r.covers_illness, covers_surgery: r.covers_surgery, covers_dental: r.covers_dental, covers_preventive: r.covers_preventive, covers_liability: r.covers_liability, covers_death: r.covers_death, annual_limit: r.annual_limit, deductible: r.deductible, reimbursement_pct: r.reimbursement_pct, waiting_days: r.waiting_days, pet_types: r.pet_types }))
        : []
      const result = await api.post('/insurance/bulk-import', { providers, plans })
      const { providers_created, plans_created, errors } = result.data
      toast.success(t('adminDash.importedInsurance', { providers: providers_created, plans: plans_created }))
      if (errors?.length > 0) toast.error(t('adminDash.importErrors', { count: errors.length }))
      queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('adminDash.importError'))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('adminDash.insuranceTitle')}</h2>
          <p className="text-sm text-gray-500">{t('adminDash.insuranceSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/templates/GlobiPet_Insurance_Import_Template.xlsx" download
            className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15}/> {t('adminDash.template')}
          </a>
          <label className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={15}/> {importing ? t('adminDash.importing') : t('adminDash.bulkImport')}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} disabled={importing}/>
          </label>
          <button onClick={() => { setEditingProvider(null); setShowProviderModal(true) }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15}/> {t('adminDash.newCompany')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full"/>)}</div>
      ) : providers.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield size={40} className="mx-auto text-gray-300 mb-3"/>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{t('adminDash.noCompanies')}</p>
          <button onClick={() => { setEditingProvider(null); setShowProviderModal(true) }} className="btn-primary inline-flex items-center gap-2 mt-2">
            <Plus size={15}/> {t('adminDash.add')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider: any) => (
            <div key={provider.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <button onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                  className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Shield size={18} className="text-brand-900"/>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{localName(provider, i18n.language)}</p>
                    <p className="text-xs text-gray-500">{t('adminDash.plansCount', { count: provider.plans?.length || 0 })}</p>
                  </div>
                  {expandedProvider === provider.id ? <ChevronDown size={16} className="text-gray-400 ml-auto"/> : <ChevronRight size={16} className="text-gray-400 ml-auto"/>}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingPlan({ provider_id: provider.id }); setShowPlanModal(true) }}
                    className="btn-ghost p-1.5 text-xs flex items-center gap-1 text-brand-900">
                    <Plus size={13}/> {t('adminDash.plan')}
                  </button>
                  <button onClick={() => { setEditingProvider(provider); setShowProviderModal(true) }} className="btn-ghost p-1.5">
                    <Edit2 size={14} className="text-gray-500"/>
                  </button>
                  <button onClick={() => { if (confirm(t('adminDash.confirmDeleteNamed', { name: provider.name }))) deleteProvider.mutate(provider.id) }} className="btn-ghost p-1.5">
                    <Trash2 size={14} className="text-red-500"/>
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expandedProvider === provider.id && provider.plans?.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {provider.plans.map((plan: any) => (
                        <div key={plan.id} className={cn('flex items-center gap-3 px-4 py-3', !plan.is_active && 'opacity-50')}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{localName(plan, i18n.language)}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 font-medium">{TIER_LABELS[plan.tier] ? t(TIER_LABELS[plan.tier]) : plan.tier}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{t('adminDash.perMonth', { price: plan.price_monthly })}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingPlan(plan); setShowPlanModal(true) }} className="btn-ghost p-1.5">
                              <Edit2 size={13} className="text-gray-500"/>
                            </button>
                            <button onClick={() => { if (confirm(t('adminDash.confirmDeleteNamed', { name: plan.name }))) deletePlan.mutate(plan.id) }} className="btn-ghost p-1.5">
                              <Trash2 size={13} className="text-red-500"/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <InsuranceProviderModal open={showProviderModal} onClose={() => { setShowProviderModal(false); setEditingProvider(null) }}
        editing={editingProvider} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowProviderModal(false); setEditingProvider(null) }}/>
      <InsurancePlanModal open={showPlanModal} onClose={() => { setShowPlanModal(false); setEditingPlan(null) }}
        editing={editingPlan} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowPlanModal(false); setEditingPlan(null) }}/>
    </div>
  )
}

function InsuranceProviderModal({ open, onClose, editing, onSaved }: any) {
  const { t } = useTranslation()
  const [form, setForm] = useState<any>({})
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { name: '', name_el: '', website: '', phone: '', email: '', description: '', is_active: true })
  }, [open, editing])
  const saveMutation = useMutation({
    mutationFn: () => editing ? api.patch(`/admin/insurance/providers/${editing.id}`, form) : api.post('/admin/insurance/providers', form),
    onSuccess: () => { toast.success(editing ? t('adminDash.updated') : t('adminDash.added')); onSaved() },
    onError: () => toast.error(t('adminDash.error')),
  })
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{editing ? t('adminDash.editCompany') : t('adminDash.newCompany')}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[['name','adminDash.f_name'],['name_el','adminDash.f_name_el'],['website','adminDash.f_website'],['phone','adminDash.f_phone'],['email','adminDash.f_email'],['logo_url','adminDash.f_logo_url']].map(([key,label]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t(label)}</label>
              <input className="input" value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.description')}</label>
            <textarea rows={3} className="input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> {t('adminDash.activeF')}</label>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">{t('adminDash.cancel')}</button>
          <button onClick={()=>saveMutation.mutate()} disabled={saveMutation.isPending||!form.name} className="btn-primary">
            {saveMutation.isPending?t('adminDash.saving'):(editing?t('adminDash.update'):t('adminDash.add'))}
          </button>
        </div>
      </div>
    </div>
  )
}

function InsurancePlanModal({ open, onClose, editing, onSaved }: any) {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState<any>({})
  const { data: providers = [] } = useQuery({
    queryKey: ['admin-insurance-providers'],
    queryFn: () => api.get('/insurance/providers').then(r => r.data?.data ?? []),
  })
  useEffect(() => {
    if (open) setForm(editing ? { ...editing, pet_types: editing.pet_types||[] } : {
      provider_id:'', name:'', name_el:'', tier:'basic', price_monthly:'',
      covers_accidents:true, covers_illness:true, covers_surgery:false, covers_dental:false,
      covers_preventive:false, covers_liability:false, covers_death:false,
      pet_types:[], is_active:true, is_featured:false,
    })
  }, [open, editing])
  const saveMutation = useMutation({
    mutationFn: () => editing?.id ? api.patch(`/admin/insurance/plans/${editing.id}`, form) : api.post('/admin/insurance/plans', form),
    onSuccess: () => { toast.success(editing?.id?t('adminDash.updated'):t('adminDash.added')); onSaved() },
    onError: (e:any) => toast.error(e.response?.data?.message||t('adminDash.error')),
  })
  const togglePetType = (type: string) => {
    const types = form.pet_types||[]
    setForm({...form, pet_types: types.includes(type)?types.filter((t:string)=>t!==type):[...types,type]})
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{editing?.id?t('adminDash.editPlan'):t('adminDash.newPlan')}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.companyReq')}</label>
            <select className="input" value={form.provider_id||''} onChange={e=>setForm({...form,provider_id:e.target.value})}>
              <option value="">{t('adminDash.chooseCompany')}</option>
              {providers.map((p:any)=><option key={p.id} value={p.id}>{localName(p, i18n.language)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.f_name')}</label><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.f_name_el')}</label><input className="input" value={form.name_el||''} onChange={e=>setForm({...form,name_el:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.categoryReq')}</label>
              <select className="input" value={form.tier||'basic'} onChange={e=>setForm({...form,tier:e.target.value})}>
                {Object.entries(TIER_LABELS).map(([k,v])=><option key={k} value={k}>{t(v)}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.priceMonthReq')}</label><input type="number" className="input" value={form.price_monthly||''} onChange={e=>setForm({...form,price_monthly:parseFloat(e.target.value)})}/></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminDash.priceYear')}</label><input type="number" className="input" value={form.price_annual||''} onChange={e=>setForm({...form,price_annual:parseFloat(e.target.value)||null})}/></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">{t('adminDash.coverage')}</label>
            <div className="flex flex-wrap gap-3">
              {[['covers_accidents','adminDash.cov_accidents'],['covers_illness','adminDash.cov_illness'],['covers_surgery','adminDash.cov_surgery'],['covers_dental','adminDash.cov_dental'],['covers_preventive','adminDash.cov_preventive'],['covers_liability','adminDash.cov_liability'],['covers_death','adminDash.cov_death']].map(([key,label])=>(
                <label key={key} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!form[key]} onChange={e=>setForm({...form,[key]:e.target.checked})}/> {t(label)}</label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">{t('adminDash.petTypes')}</label>
            <div className="flex gap-3">
              {[['dog','adminDash.pet_dog'],['cat','adminDash.pet_cat'],['rabbit','adminDash.pet_rabbit'],['bird','adminDash.pet_bird']].map(([type,label])=>(
                <label key={type} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={(form.pet_types||[]).includes(type)} onChange={()=>togglePetType(type)}/> {t(label)}</label>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> {t('adminDash.activeN')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_featured} onChange={e=>setForm({...form,is_featured:e.target.checked})}/> {t('adminDash.featured')}</label>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">{t('adminDash.cancel')}</button>
          <button onClick={()=>saveMutation.mutate()} disabled={saveMutation.isPending||!form.name||!form.provider_id||!form.price_monthly} className="btn-primary">
            {saveMutation.isPending?t('adminDash.saving'):(editing?.id?t('adminDash.update'):t('adminDash.add'))}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { t } = useTranslation()

  // Όλα τα hooks πριν από το υπό συνθήκη return (κανόνες hooks).
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: user?.role === 'admin',
  })

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const tabs = [
    { id: 'overview',  label: 'adminDash.tab_overview',  icon: TrendingUp },
    { id: 'users',     label: 'adminDash.tab_users',      icon: Users },
    { id: 'providers', label: 'adminDash.tab_providers',      icon: Shield },
    { id: 'products',  label: 'adminDash.tab_products',     icon: Package },
    { id: 'services',  label: 'adminDash.tab_services',    icon: PawPrint },
    { id: 'orders',    label: 'adminDash.tab_orders',  icon: ClipboardList },
    { id: 'bookings',  label: 'adminDash.tab_bookings',    icon: Calendar },
    { id: 'campaigns', label: 'adminDash.tab_campaigns',    icon: Megaphone },
    { id: 'pets',      label: 'adminDash.tab_pets',   icon: PawPrint },
    { id: 'revenue',   label: 'adminDash.tab_revenue',        icon: Euro },
    { id: 'database',  label: 'adminDash.tab_database',         icon: Database },
    { id: 'insurance', label: 'adminDash.tab_insurance',     icon: Shield },
  ]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">

      {/* adminBackButton — επιστροφή στο site.
          Σταθερή θέση πάνω αριστερά ώστε να είναι πάντα ορατή. */}
      <Link to="/" title={t('adminDash.backToSite')}
        className="inline-flex items-center gap-2 px-3 py-2 mb-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-900 hover:border-brand-400 dark:hover:text-yellow-400 transition-colors">
        <ArrowLeft size={16} /> {t('adminDash.backToSite')}
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Shield size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('adminDash.title')}</h1>
          <p className="text-sm text-gray-500">{t('adminDash.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15} />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}       label={t('adminDash.st_users')}     value={stats?.users ?? '—'}    change={12}  color="bg-blue-500" onClick={() => setActiveTab('users' as Tab)} />
            <StatCard icon={PawPrint}    label={t('adminDash.st_pets')}  value={stats?.pets ?? '—'}     change={8}   color="bg-orange-500" onClick={() => setActiveTab('pets' as Tab)} />
            <StatCard icon={ShoppingBag} label={t('adminDash.st_orders')} value={stats?.orders ?? '—'}   change={-3}  color="bg-green-500" onClick={() => setActiveTab('orders' as Tab)} />
            <StatCard icon={TrendingUp}  label={t('adminDash.st_revenue')}       value={`€${stats?.revenue ?? '0'}`} change={15} color="bg-purple-500" onClick={() => setActiveTab('revenue' as Tab)} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Shield}      label={t('adminDash.st_providers')}     value={stats?.providers ?? '—'} change={5}  color="bg-teal-500" onClick={() => setActiveTab('providers' as Tab)} />
            <StatCard icon={Package}     label={t('adminDash.st_products')}    value={stats?.products ?? '—'}  change={2}  color="bg-pink-500" onClick={() => setActiveTab('products' as Tab)} />
            <StatCard icon={ClipboardList} label={t('adminDash.st_bookings')} value={stats?.bookings ?? '—'}  change={18} color="bg-yellow-500" onClick={() => setActiveTab('bookings' as Tab)} />
            <StatCard icon={Database}    label={t('adminDash.st_records')} value={stats?.total_records ?? '—'} change={null} color="bg-gray-500" onClick={() => setActiveTab('database' as Tab)} />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('adminDash.quickActions')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: t('adminDash.qa_users'), tab: 'users' as Tab, icon: Users },
                { label: t('adminDash.qa_orders'), tab: 'orders' as Tab, icon: ClipboardList },
                { label: t('adminDash.qa_providers'), tab: 'providers' as Tab, icon: Shield },
                { label: t('adminDash.qa_products'), tab: 'products' as Tab, icon: Package },
                { label: t('adminDash.qa_sql'), tab: 'database' as Tab, icon: Database },
                { label: t('adminDash.newUser'), tab: 'users' as Tab, icon: Users },
              ].map((item, i) => (
                <button key={i} onClick={() => setActiveTab(item.tab)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border border-gray-100 dark:border-gray-800">
                  <item.icon size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <ChevronRight size={14} className="text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('adminDash.specialPages')}</h4>
              <div className="flex flex-wrap gap-3">
                <Link to="/admin/catalog" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Database size={15} className="text-gray-400"/> {t('adminDash.sp_catalog')} <ChevronRight size={13} className="text-gray-400"/>
                </Link>
                <button onClick={() => setActiveTab('insurance')} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Shield size={15} className="text-gray-400"/> {t('adminDash.insuranceTitle')} <ChevronRight size={13} className="text-gray-400"/>
                </button>
                <Link to="/admin/subscriptions" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Layers size={15} className="text-gray-400"/> {t('adminDash.sp_subscriptions')} <ChevronRight size={13} className="text-gray-400"/>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users'     && <UsersTab />}
      {activeTab === 'providers' && <ProvidersTab />}
      {activeTab === 'products'  && <ProductsTab />}
      {activeTab === 'services'  && <ServicesTab />}
      {activeTab === 'orders'    && <OrdersTab />}
      {activeTab === 'database'  && <DatabaseTab />}
      {activeTab === 'insurance' && <InsuranceTab />}
      {activeTab === 'bookings' && <AdminBookingsTab />}
      {activeTab === 'campaigns' && <ProviderMarketingPage />}
      {activeTab === 'pets' && <AdminPetsTab />}
      {activeTab === 'revenue' && <AdminRevenueTab />}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════
//  Όλες οι κρατήσεις — μόνο διαχειριστής
// ═══════════════════════════════════════════════════════════════════════

function AdminBookingsTab() {
  const { t, i18n } = useTranslation()
  // booking_date (YYYY-MM-DD) ως τοπική ημερομηνία — όχι new Date('YYYY-MM-DD') (UTC).
  const fmtDay = (ymd: string) => {
    const [y, m, d] = String(ymd ?? '').split('-').map(Number)
    if (!y || !m || !d) return ymd
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language)
  }
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 50

  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (status) params.set('status', status)
  params.set('limit', String(LIMIT))
  params.set('offset', String(page * LIMIT))

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', q, status, page],
    queryFn: () => api.get(`/bookings/all?${params}`).then(r => r.data),
  })

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const summary = data?.summary

  const STATUS_LABEL: Record<string, string> = {
    pending: t('adminDash.bs_pending'), confirmed: t('adminDash.bs_confirmed'),
    completed: t('adminDash.bs_completed'), cancelled: t('adminDash.bs_cancelled'),
  }

  return (
    <div className="space-y-4">

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{total}</p>
            <p className="text-xs text-gray-500">{t('adminDash.total')}</p>
          </div>
          {summary.byStatus.map((s: any) => (
            <div key={s.status} className="card p-4">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.count}</p>
              <p className="text-xs text-gray-500">{STATUS_LABEL[s.status] ?? s.status}</p>
            </div>
          ))}
          <div className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              €{Math.round(summary.revenue)}
            </p>
            <p className="text-xs text-gray-500">{t('adminDash.collected')}</p>
          </div>
        </div>
      )}

      <div className="card p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('adminDash.bookingSearchPh')}
            value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        </div>
        <select className="input w-auto" value={status}
          onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">{t('adminDash.allStatuses')}</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">{t('adminDash.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">{t('adminDash.noBookings')}</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-3 font-medium">{t('adminDash.date')}</th>
                  <th className="p-3 font-medium">{t('adminDash.customer')}</th>
                  <th className="p-3 font-medium">{t('adminDash.provider')}</th>
                  <th className="p-3 font-medium">{t('adminDash.amount')}</th>
                  <th className="p-3 font-medium">{t('adminDash.status')}</th>
                  <th className="p-3 font-medium">{t('adminDash.payment')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 whitespace-nowrap">
                      {fmtDay(b.booking_date)}
                      <span className="text-gray-400 ml-1">{b.booking_time}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{b.customer_name || '—'}</p>
                      <p className="text-xs text-gray-500">{b.customer_email}</p>
                    </td>
                    <td className="p-3">
                      <p>{b.provider_name || '—'}</p>
                      {b.staff_name && <p className="text-xs text-gray-500">{b.staff_name}</p>}
                    </td>
                    <td className="p-3 font-medium whitespace-nowrap">
                      €{Math.round(b.total_price ?? 0)}
                    </td>
                    <td className="p-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                        b.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : b.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cn('text-xs',
                        b.payment_status === 'paid' ? 'text-green-600' : 'text-gray-400')}>
                        {b.payment_status === 'paid' ? t('adminDash.paid') : t('adminDash.unpaid')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t('adminDash.pageRange', { from: page * LIMIT + 1, to: Math.min((page + 1) * LIMIT, total), total })}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0} className="btn-secondary text-sm">{t('adminDash.prevPage')}</button>
                <button onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * LIMIT >= total} className="btn-secondary text-sm">{t('adminDash.nextPage')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════
//  Κατοικίδια — ΧΩΡΙΣ ιατρικά δεδομένα
// ═══════════════════════════════════════════════════════════════════════

function AdminPetsTab() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [species, setSpecies] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 50

  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (species) params.set('species', species)
  params.set('limit', String(LIMIT))
  params.set('offset', String(page * LIMIT))

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pets', q, species, page],
    queryFn: () => api.get(`/admin/pets?${params}`).then(r => r.data),
  })

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const SPECIES: Record<string, string> = {
    dog: t('adminDash.sp_dog'), cat: t('adminDash.sp_cat'), bird: t('adminDash.sp_bird'),
    rabbit: t('adminDash.sp_rabbit'), reptile: t('adminDash.sp_reptile'), fish: t('adminDash.sp_fish'), other: t('adminDash.sp_other'),
  }

  return (
    <div className="space-y-4">
      {data?.summary?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{total}</p>
            <p className="text-xs text-gray-500">{t('adminDash.total')}</p>
          </div>
          {data.summary.map((s: any) => (
            <button key={s.species} onClick={() => { setSpecies(s.species); setPage(0) }}
              className="card p-4 text-left hover:border-brand-400 transition-colors">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.count}</p>
              <p className="text-xs text-gray-500">{SPECIES[s.species] ?? s.species}</p>
            </button>
          ))}
        </div>
      )}

      <div className="card p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('adminDash.petSearchPh')}
            value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        </div>
        {species && (
          <button onClick={() => { setSpecies(''); setPage(0) }} className="btn-secondary text-sm">
            {t('adminDash.clearFilter')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">{t('adminDash.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <PawPrint size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">{t('adminDash.noPets')}</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-3 font-medium">{t('adminDash.name')}</th>
                  <th className="p-3 font-medium">{t('adminDash.species')}</th>
                  <th className="p-3 font-medium">{t('adminDash.breed')}</th>
                  <th className="p-3 font-medium">{t('adminDash.age')}</th>
                  <th className="p-3 font-medium">{t('adminDash.weight')}</th>
                  <th className="p-3 font-medium">{t('adminDash.microchip')}</th>
                  <th className="p-3 font-medium">{t('adminDash.ownerCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          : <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <PawPrint size={14} className="text-gray-400" />
                            </div>}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.is_lost && <span className="text-[11px] text-red-600">{t('adminDash.lost')}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{SPECIES[p.species] ?? p.species}</td>
                    <td className="p-3 text-gray-500">{p.breed || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{p.age != null ? t('adminDash.ageYears', { count: p.age }) : '—'}</td>
                    <td className="p-3 whitespace-nowrap">{p.weight != null ? t('adminDash.weightKg', { value: p.weight }) : '—'}</td>
                    <td className="p-3 text-xs text-gray-500">{p.microchip_number || '—'}</td>
                    <td className="p-3 text-xs text-gray-500">{p.owner_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t('adminDash.pageRange', { from: page * LIMIT + 1, to: Math.min((page + 1) * LIMIT, total), total })}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0} className="btn-secondary text-sm">{t('adminDash.prevPage')}</button>
                <button onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * LIMIT >= total} className="btn-secondary text-sm">{t('adminDash.nextPage')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Έσοδα
// ═══════════════════════════════════════════════════════════════════════

function AdminRevenueTab() {
  const { t, i18n } = useTranslation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue', from, to],
    queryFn: () => api.get(`/admin/revenue?${params}`).then(r => r.data?.data),
  })

  const money = (n: any) => `€${Math.round(Number(n) || 0).toLocaleString(i18n.language)}`

  if (isLoading) return <div className="card p-12 text-center text-gray-500">{t('adminDash.loading')}</div>

  const b = data?.bookings ?? {}
  const o = data?.orders ?? {}
  const maxMonth = Math.max(1, ...(data?.monthly ?? []).map((m: any) => m.revenue))

  return (
    <div className="space-y-4">

      <div className="card p-3 flex gap-2 flex-wrap items-end">
        <div>
          <label className="label">{t('adminDash.from')}</label>
          <input className="input text-sm" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('adminDash.to')}</label>
          <input className="input text-sm" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="btn-secondary text-sm">
            {t('adminDash.clear')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          [t('adminDash.rv_bookings'), money(b.revenue), t('adminDash.bookingsCount', { count: b.count ?? 0 })],
          [t('adminDash.rv_commission'), money(b.commission), t('adminDash.fromBookings')],
          [t('adminDash.rv_payout'), money(b.payout), t('adminDash.afterCommission')],
          [t('adminDash.rv_store'), money(o.revenue), t('adminDash.ordersCount', { count: o.count ?? 0 })],
        ].map(([label, value, sub]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {data?.monthly?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('adminDash.byMonth')}</h3>
          <div className="space-y-2">
            {data.monthly.map((m: any) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div className="h-full bg-brand-900 dark:bg-yellow-500 rounded-lg transition-all"
                    style={{ width: `${Math.max(2, (m.revenue / maxMonth) * 100)}%` }} />
                </div>
                <span className="text-sm font-medium w-24 text-right shrink-0">{money(m.revenue)}</span>
                <span className="text-xs text-gray-400 w-20 text-right shrink-0 hidden sm:block">
                  {t('adminDash.bookingsShort', { count: m.bookings })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.byProvider?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white p-4 pb-2">{t('adminDash.byProvider')}</h3>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-800">
              <tr className="text-left text-xs text-gray-500">
                <th className="p-3 font-medium">{t('adminDash.provider')}</th>
                <th className="p-3 font-medium">{t('adminDash.bookingsCol')}</th>
                <th className="p-3 font-medium">{t('adminDash.revenueCol')}</th>
                <th className="p-3 font-medium">{t('adminDash.commissionCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.byProvider.map((p: any) => (
                <tr key={p.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3">
                    <p className="font-medium">{p.name || '—'}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </td>
                  <td className="p-3">{p.bookings}</td>
                  <td className="p-3 font-medium">{money(p.revenue)}</td>
                  <td className="p-3 text-gray-500">{money(p.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
