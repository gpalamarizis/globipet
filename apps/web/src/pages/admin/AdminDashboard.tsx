import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingBag, TrendingUp, PawPrint, Search, Ban, CheckCircle, Trash2, Eye, Package, ClipboardList, Database, ChevronRight, AlertTriangle, X, Play, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'providers' | 'products' | 'orders' | 'database'

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, change, color }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        {change && <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', change > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
          {change > 0 ? '+' : ''}{change}%
        </span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Users Tab ───────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data?.data ?? []),
  })

  const toggleUser = useMutation({
    mutationFn: ({ id, active }: any) => api.patch(`/admin/users/${id}`, { is_active: active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Χρήστης ενημερώθηκε') },
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Χρήστης διαγράφηκε') },
  })

  const filtered = users.filter((u: any) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση χρήστη..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input text-sm">
          <option value="all">Όλοι</option>
          <option value="user">Ιδιοκτήτες</option>
          <option value="service_provider">Πάροχοι</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Χρήστης</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ρόλος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Εγγραφή</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατάσταση</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Δεν βρέθηκαν χρήστες</td></tr>
            ) : filtered.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-xs shrink-0">
                      {u.profile_photo ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" /> : getInitials(u.full_name || 'U')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'service_provider' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700')}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'service_provider' ? 'Πάροχος' : 'Χρήστης'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('el-GR') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {u.is_active !== false ? 'Ενεργός' : 'Ανενεργός'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleUser.mutate({ id: u.id, active: u.is_active === false })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={u.is_active !== false ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}>
                      {u.is_active !== false ? <Ban size={14} className="text-orange-500" /> : <CheckCircle size={14} className="text-green-500" />}
                    </button>
                    <button onClick={() => { if(confirm('Διαγραφή χρήστη;')) deleteUser.mutate(u.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────
function ProductsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products?limit=50').then(r => r.data?.data ?? []),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Προϊόν διαγράφηκε') },
  })

  const filtered = products.filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center gap-2 input mb-4">
        <Search size={15} className="text-gray-400 shrink-0" />
        <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση προϊόντος..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Προϊόν</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατηγορία</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τιμή</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Απόθεμα</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Δεν βρέθηκαν προϊόντα</td></tr>
            : filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">📦</div>}
                    <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{p.price}</td>
                <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full', p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{p.stock ?? '—'}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if(confirm('Διαγραφή προϊόντος;')) deleteProduct.mutate(p.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────────
function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState('all')
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/orders?limit=50').then(r => r.data?.data ?? []),
  })
  const filtered = orders.filter((o: any) => statusFilter === 'all' || o.status === statusFilter)

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all','pending','confirmed','shipped','delivered','cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('text-xs px-3 py-1.5 rounded-full font-medium transition-all', statusFilter === s ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600')}>
            {s === 'all' ? 'Όλες' : s === 'pending' ? 'Εκκρεμείς' : s === 'confirmed' ? 'Επιβεβ.' : s === 'shipped' ? 'Αποστολή' : s === 'delivered' ? 'Παράδοση' : 'Ακυρ.'}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Χρήστης</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Σύνολο</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατάσταση</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ημερομηνία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Δεν βρέθηκαν παραγγελίες</td></tr>
            : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id?.slice(0,8)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{o.user_name || o.user_email || '—'}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{o.total_amount?.toFixed(2) || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700')}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString('el-GR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Providers Tab ────────────────────────────────────────────────
function ProvidersTab() {
  const queryClient = useQueryClient()
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => api.get('/admin/users?role=service_provider').then(r => r.data?.data ?? []),
  })

  const verifyProvider = useMutation({
    mutationFn: ({ id, verified }: any) => api.patch(`/admin/users/${id}`, { is_verified: verified }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-providers'] }); toast.success('Πάροχος ενημερώθηκε') },
  })

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πάροχος</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Υπηρεσίες</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Επαλήθευση</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
          : providers.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">Δεν βρέθηκαν πάροχοι</td></tr>
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
              <td className="px-4 py-3 text-gray-500">{p.services_count || '—'}</td>
              <td className="px-4 py-3">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', p.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                  {p.is_verified ? '✓ Επαληθευμένος' : '⏳ Εκκρεμεί'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => verifyProvider.mutate({ id: p.id, verified: !p.is_verified })}
                  className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-all', p.is_verified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                  {p.is_verified ? 'Αφαίρεση' : 'Επαλήθευση'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Database Tab ─────────────────────────────────────────────────
function DatabaseTab() {
  const [query, setQuery] = useState('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runQuery = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/admin/query', { sql: query })
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Σφάλμα εκτέλεσης query')
    } finally {
      setLoading(false)
    }
  }

  const quickQueries = [
    { label: 'Πίνακες', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
    { label: 'Χρήστες', sql: 'SELECT id, full_name, email, role, created_at FROM "User" ORDER BY created_at DESC LIMIT 20;' },
    { label: 'Παραγγελίες', sql: 'SELECT id, total_amount, status, created_at FROM "Order" ORDER BY created_at DESC LIMIT 20;' },
    { label: 'Κατοικίδια', sql: 'SELECT id, name, species, breed FROM "Pet" ORDER BY created_at DESC LIMIT 20;' },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-orange-500" />
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Προσοχή: Μόνο για διαχειριστές. Τα DELETE/DROP queries είναι μη αναστρέψιμα.</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQueries.map(q => (
            <button key={q.label} onClick={() => setQuery(q.sql)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
        <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4}
          className="w-full font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl resize-none outline-none border border-gray-700"
          placeholder="SELECT * FROM ..." />
        <div className="flex justify-end mt-2">
          <button onClick={runQuery} disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm">
            <Play size={14} /> {loading ? 'Εκτέλεση...' : 'Εκτέλεση Query'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 font-mono">{error}</p>
        </div>
      )}

      {result && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{result.rowCount ?? result.rows?.length ?? 0} αποτελέσματα</span>
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
                        <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{v === null ? <span className="text-gray-400">NULL</span> : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center py-8 text-gray-400 text-sm">Δεν επιστράφηκαν δεδομένα</p>}
        </div>
      )}
    </div>
  )
}

// ─── Main Admin Dashboard ─────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const tabs = [
    { id: 'overview',  label: 'Επισκόπηση',  icon: TrendingUp },
    { id: 'users',     label: 'Χρήστες',      icon: Users },
    { id: 'providers', label: 'Πάροχοι',      icon: Shield },
    { id: 'products',  label: 'Προϊόντα',     icon: Package },
    { id: 'orders',    label: 'Παραγγελίες',  icon: ClipboardList },
    { id: 'database',  label: 'Βάση',         icon: Database },
  ]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Shield size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Διαχείριση εφαρμογής GlobiPet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
              activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Χρήστες"        value={stats?.users ?? '—'}    change={12}  color="bg-blue-500" />
            <StatCard icon={PawPrint}    label="Κατοικίδια"     value={stats?.pets ?? '—'}     change={8}   color="bg-orange-500" />
            <StatCard icon={ShoppingBag} label="Παραγγελίες"    value={stats?.orders ?? '—'}   change={-3}  color="bg-green-500" />
            <StatCard icon={TrendingUp}  label="Έσοδα"          value={`€${stats?.revenue ?? '0'}`} change={15} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Shield}      label="Πάροχοι"        value={stats?.providers ?? '—'} change={5}  color="bg-teal-500" />
            <StatCard icon={Package}     label="Προϊόντα"       value={stats?.products ?? '—'}  change={2}  color="bg-pink-500" />
            <StatCard icon={ClipboardList} label="Κρατήσεις"   value={stats?.bookings ?? '—'}  change={18} color="bg-yellow-500" />
            <StatCard icon={Database}    label="Εγγραφές DB"    value={stats?.total_records ?? '—'} change={null} color="bg-gray-500" />
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Γρήγορες ενέργειες</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Νέοι χρήστες σήμερα', action: () => setActiveTab('users'), icon: Users },
                { label: 'Εκκρεμείς παραγγελίες', action: () => setActiveTab('orders'), icon: ClipboardList },
                { label: 'Επαλήθευση παρόχων', action: () => setActiveTab('providers'), icon: Shield },
                { label: 'Προϊόντα χωρίς απόθεμα', action: () => setActiveTab('products'), icon: Package },
                { label: 'SQL Query', action: () => setActiveTab('database'), icon: Database },
                { label: 'Διαχείριση χρηστών', action: () => setActiveTab('users'), icon: Users },
              ].map((item, i) => (
                <button key={i} onClick={item.action}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border border-gray-100 dark:border-gray-800">
                  <item.icon size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <ChevronRight size={14} className="text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users'     && <UsersTab />}
      {activeTab === 'providers' && <ProvidersTab />}
      {activeTab === 'products'  && <ProductsTab />}
      {activeTab === 'orders'    && <OrdersTab />}
      {activeTab === 'database'  && <DatabaseTab />}
    </div>
  )
}
