import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingBag, TrendingUp, PawPrint, Search, Ban, CheckCircle, Trash2, Package, ClipboardList, Database, ChevronRight, X, Play, Shield, Plus, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'users' | 'providers' | 'products' | 'orders' | 'database'

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card p-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'user' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data?.data ?? []),
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/admin/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Χρήστης δημιουργήθηκε!')
      setShowCreate(false)
      setNewUser({ full_name: '', email: '', password: '', role: 'user' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Σφάλμα δημιουργίας'),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/admin/users/${id}`, data),
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 input">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder="Αναζήτηση χρήστη..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input text-sm">
          <option value="all">Όλοι</option>
          <option value="user">Ιδιοκτήτες</option>
          <option value="service_provider">Πάροχοι</option>
          <option value="admin">Admins</option>
        </select>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus size={16}/> Νέος χρήστης
        </button>
      </div>

      {/* Create user form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card p-5 border-2 border-brand-200 dark:border-brand-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Δημιουργία νέου χρήστη</h3>
              <button onClick={() => setShowCreate(false)} className="btn-ghost p-1"><X size={16}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ονοματεπώνυμο</label>
                <input className="input" placeholder="Γιώργης Παπαδόπουλος" value={newUser.full_name}
                  onChange={e => setNewUser(u => ({...u, full_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input className="input" type="email" placeholder="user@example.com" value={newUser.email}
                  onChange={e => setNewUser(u => ({...u, email: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κωδικός *</label>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="Τουλάχιστον 8 χαρακτήρες"
                    value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ρόλος</label>
                <select className="input" value={newUser.role} onChange={e => setNewUser(u => ({...u, role: e.target.value}))}>
                  <option value="user">Ιδιοκτήτης</option>
                  <option value="service_provider">Πάροχος</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={() => createUser.mutate()}
                disabled={!newUser.email || !newUser.password || createUser.isPending}
                className="btn-primary flex-1">
                {createUser.isPending ? 'Δημιουργία...' : 'Δημιουργία χρήστη'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Χρήστης</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ρόλος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Εγγραφή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                {users.length === 0 ? 'Δεν βρέθηκαν χρήστες στη βάση' : 'Δεν βρέθηκαν αποτελέσματα'}
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
                    <option value="user">Ιδιοκτήτης</option>
                    <option value="service_provider">Πάροχος</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('el-GR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { if(confirm(`Διαγραφή χρήστη ${u.email};`)) deleteUser.mutate(u.id) }}
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
            <p className="text-xs text-gray-500">{filtered.length} χρήστες</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DatabaseTab() {
  const [query, setQuery] = useState("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC;")
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
      setError(err.response?.data?.message || 'Σφάλμα εκτέλεσης')
    } finally { setLoading(false) }
  }

  const quickQueries = [
    { label: 'Χρήστες', sql: "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Παραγγελίες', sql: "SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Κατοικίδια', sql: "SELECT id, name, species, breed FROM pets ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Πίνακες', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQueries.map(q => (
            <button key={q.label} onClick={() => setQuery(q.sql)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
        <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4}
          className="w-full font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl resize-none outline-none border border-gray-700" />
        <div className="flex justify-end mt-2">
          <button onClick={runQuery} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
            <Play size={14} /> {loading ? 'Εκτέλεση...' : 'Εκτέλεση Query'}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200"><p className="text-sm text-red-600 font-mono">{error}</p></div>}

      {result && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between">
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
                        <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {v === null ? <span className="text-gray-400">NULL</span> : String(v)}
                        </td>
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

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const tabs = [
    { id: 'overview', label: 'Επισκόπηση', icon: TrendingUp },
    { id: 'users',    label: 'Χρήστες',    icon: Users },
    { id: 'database', label: 'Βάση',        icon: Database },
  ]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Shield size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Διαχείριση εφαρμογής GlobiPet</p>
        </div>
      </div>

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

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}       label="Χρήστες"     value={stats?.users}     color="bg-blue-500" />
          <StatCard icon={PawPrint}    label="Κατοικίδια"  value={stats?.pets}      color="bg-orange-500" />
          <StatCard icon={ShoppingBag} label="Παραγγελίες" value={stats?.orders}    color="bg-green-500" />
          <StatCard icon={TrendingUp}  label="Έσοδα"       value={`€${stats?.revenue ?? '0'}`} color="bg-purple-500" />
        </div>
      )}

      {activeTab === 'users'    && <UsersTab />}
      {activeTab === 'database' && <DatabaseTab />}
    </div>
  )
}
