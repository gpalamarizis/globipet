import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingBag, TrendingUp, PawPrint, Search, Ban, CheckCircle, Trash2, Eye, EyeOff, Package, ClipboardList, Database, ChevronRight, AlertTriangle, X, Play, Shield, Plus, Key, Globe, Edit2, FileSpreadsheet } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { Navigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import ChangePasswordModal from '@/components/admin/ChangePasswordModal'
import TranslationEditor from '@/components/admin/TranslationEditor'
import ProductFormModal from '@/components/admin/ProductFormModal'
import ServiceFormModal from '@/components/admin/ServiceFormModal'
import BulkImportModal from '@/components/admin/BulkImportModal'

type Tab = 'overview' | 'users' | 'providers' | 'products' | 'services' | 'orders' | 'database'

function StatCard({ icon: Icon, label, value, change, color }: any) {
  return (
    <div className="card p-5">
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
  const [passwordUser, setPasswordUser] = useState<any>(null)

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
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus size={16}/> Νέος χρήστης
        </button>
      </div>

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
                  <input className="input pr-10" type={showPass ? 'text' : 'password'}
                    placeholder="Τουλάχιστον 8 χαρακτήρες"
                    value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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
              [1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                {users.length === 0 ? 'Δεν βρέθηκαν χρήστες' : 'Δεν βρέθηκαν αποτελέσματα'}
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
                      onClick={() => setPasswordUser(u)}
                      title="Αλλαγή κωδικού"
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Key size={14} className="text-blue-500" />
                    </button>
                    <button
                      onClick={() => { if(confirm(`Διαγραφή χρήστη ${u.email};`)) deleteUser.mutate(u.id) }}
                      title="Διαγραφή χρήστη"
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

      <ChangePasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
    </div>
  )
}

function ProvidersTab() {
  const queryClient = useQueryClient()
  const [showImport, setShowImport] = useState(false)
  const [showAddOne, setShowAddOne] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [newProvider, setNewProvider] = useState<any>({
    full_name: '', email: '', phone: '', password: '', city: '', country: 'GR',
    service_type: 'grooming', service_title: '', description: '', price: '',
    duration_minutes: 60, location: '', home_visits: false, emergency_available: false,
    years_experience: 0, specializations: '', pet_types: '', languages: 'el,en', is_verified: false,
  })

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => api.get('/admin/users?role=service_provider').then(r => r.data?.data ?? []),
  })

  const verifyProvider = useMutation({
    mutationFn: ({ id, verified }: any) => api.post(`/admin/providers/${id}/verify`, { verified }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      const count = res.data?.services_updated ?? 0
      toast.success(`Πάροχος ενημερώθηκε${count > 0 ? ` (${count} υπηρεσίες)` : ''}`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Σφάλμα επαλήθευσης'),
  })

  const bulkImport = useMutation({
    mutationFn: (rows: any[]) => api.post('/admin/providers/bulk-import', { rows }),
    onSuccess: (res: any) => {
      setImportResult(res.data)
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      toast.success(`${res.data.created} πάροχοι εισήχθησαν`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Σφάλμα εισαγωγής'),
  })

  const addOne = useMutation({
    mutationFn: () => api.post('/admin/providers/bulk-import', { rows: [newProvider] }),
    onSuccess: (res: any) => {
      if (res.data.created > 0) {
        toast.success('Πάροχος προστέθηκε')
        setShowAddOne(false)
        setNewProvider({
          full_name: '', email: '', phone: '', password: '', city: '', country: 'GR',
          service_type: 'grooming', service_title: '', description: '', price: '',
          duration_minutes: 60, location: '', home_visits: false, emergency_available: false,
          years_experience: 0, specializations: '', pet_types: '', languages: 'el,en', is_verified: false,
        })
        queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      } else {
        toast.error(res.data.errors?.[0]?.message || 'Σφάλμα προσθήκης')
      }
    },
  })

  const handleFile = async (file: File) => {
    setImportFile(file)
    setImportResult(null)
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    setImportPreview(rows as any[])
  }

  const downloadTemplate = () => {
    window.open('/templates/GlobiPet_Providers_Template.xlsx', '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
          <FileSpreadsheet size={15}/> Λήψη προτύπου Excel
        </button>
        <button onClick={() => setShowAddOne(true)} className="btn-secondary flex items-center gap-2 text-sm">
          <Plus size={15}/> Προσθήκη ενός
        </button>
        <button onClick={() => setShowImport(true)} className="btn-primary flex items-center gap-2 text-sm">
          <FileSpreadsheet size={15}/> Μαζική εισαγωγή
        </button>
      </div>

      {/* Providers table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πάροχος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Επαλήθευση</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={3} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : providers.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-gray-400">Δεν βρέθηκαν πάροχοι</td></tr>
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
                    {p.is_verified ? '✓ Επαληθευμένος' : '⏳ Εκκρεμεί'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => verifyProvider.mutate({ id: p.id, verified: !p.is_verified })}
                    disabled={verifyProvider.isPending}
                    className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-all', p.is_verified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                    {p.is_verified ? 'Αφαίρεση' : 'Επαλήθευση'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk import modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResult(null) }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={18}/> Μαζική εισαγωγή παρόχων
                </h3>
                <button onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResult(null) }} className="btn-ghost p-2">
                  <X size={18}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {!importResult && (
                  <>
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-semibold mb-1">Οδηγίες</p>
                      <p>1. Κάνε λήψη του προτύπου Excel.</p>
                      <p>2. Συμπλήρωσε τις γραμμές με τους παρόχους.</p>
                      <p>3. Ανέβασε το αρχείο εδώ για προεπισκόπηση.</p>
                      <p>4. Πάτησε "Εισαγωγή" για ολοκλήρωση.</p>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
                        <FileSpreadsheet size={15}/> Λήψη προτύπου
                      </button>
                      <label className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                        <Plus size={15}/> Επιλογή Excel
                        <input type="file" accept=".xlsx,.xls" className="hidden"
                          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      </label>
                    </div>

                    {importFile && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Αρχείο: <strong>{importFile.name}</strong> ({importPreview.length} γραμμές)
                      </div>
                    )}

                    {importPreview.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Όνομα</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Υπηρεσία</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Τιμή</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {importPreview.slice(0, 50).map((row: any, i: number) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-white">{row.full_name}</td>
                                <td className="px-3 py-2 text-gray-600">{row.email}</td>
                                <td className="px-3 py-2 text-gray-600">{row.service_title || row.service_type}</td>
                                <td className="px-3 py-2 text-gray-600">{row.price ? `€${row.price}` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {importResult && (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        ✓ Εισήχθησαν {importResult.created} πάροχοι
                      </p>
                      {importResult.skipped > 0 && (
                        <p className="text-sm text-yellow-700 mt-1">
                          ⚠ Παραλήφθηκαν {importResult.skipped} (διπλότυπα emails)
                        </p>
                      )}
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <p className="font-semibold text-red-700 dark:text-red-300 mb-2">Σφάλματα:</p>
                        <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                          {importResult.errors.map((e: any, i: number) => (
                            <li key={i}>Γραμμή {e.row}: {e.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
                <button onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResult(null) }} className="btn-secondary">
                  Κλείσιμο
                </button>
                {!importResult && importPreview.length > 0 && (
                  <button onClick={() => bulkImport.mutate(importPreview)} disabled={bulkImport.isPending} className="btn-primary">
                    {bulkImport.isPending ? 'Εισαγωγή...' : `Εισαγωγή ${importPreview.length} εγγραφών`}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add one provider modal */}
      <AnimatePresence>
        {showAddOne && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddOne(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus size={18}/> Προσθήκη παρόχου
                </h3>
                <button onClick={() => setShowAddOne(false)} className="btn-ghost p-2"><X size={18}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ονοματεπώνυμο / Επωνυμία *</label>
                    <input className="input" value={newProvider.full_name} onChange={e => setNewProvider({...newProvider, full_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                    <input type="email" className="input" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Τηλέφωνο</label>
                    <input className="input" value={newProvider.phone} onChange={e => setNewProvider({...newProvider, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Κωδικός *</label>
                    <input type="text" className="input" value={newProvider.password} onChange={e => setNewProvider({...newProvider, password: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                    <input className="input" value={newProvider.city} onChange={e => setNewProvider({...newProvider, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος υπηρεσίας</label>
                    <select className="input" value={newProvider.service_type} onChange={e => setNewProvider({...newProvider, service_type: e.target.value})}>
                      <option value="grooming">Grooming</option>
                      <option value="walking">Walking</option>
                      <option value="veterinary">Κτηνίατρος</option>
                      <option value="training">Εκπαίδευση</option>
                      <option value="sitting">Pet sitting</option>
                      <option value="daycare">Daycare</option>
                      <option value="boarding">Boarding</option>
                      <option value="transport">Μεταφορά</option>
                      <option value="photography">Φωτογράφιση</option>
                      <option value="other">Άλλο</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€)</label>
                    <input type="number" step="0.01" className="input" value={newProvider.price} onChange={e => setNewProvider({...newProvider, price: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Τίτλος υπηρεσίας *</label>
                    <input className="input" value={newProvider.service_title} onChange={e => setNewProvider({...newProvider, service_title: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
                    <textarea className="input" rows={3} value={newProvider.description} onChange={e => setNewProvider({...newProvider, description: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
                    <input className="input" value={newProvider.location} onChange={e => setNewProvider({...newProvider, location: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
                    <input type="number" className="input" value={newProvider.years_experience} onChange={e => setNewProvider({...newProvider, years_experience: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                    <input type="number" className="input" value={newProvider.duration_minutes} onChange={e => setNewProvider({...newProvider, duration_minutes: parseInt(e.target.value) || 60})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Εξειδικεύσεις (χωρισμένες με κόμμα)</label>
                    <input className="input" placeholder="κουρά, μπάνιο, ξεκοτσίδωμα" value={newProvider.specializations} onChange={e => setNewProvider({...newProvider, specializations: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Τύποι κατοικιδίων</label>
                    <input className="input" placeholder="dog,cat,bird" value={newProvider.pet_types} onChange={e => setNewProvider({...newProvider, pet_types: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Γλώσσες</label>
                    <input className="input" placeholder="el,en" value={newProvider.languages} onChange={e => setNewProvider({...newProvider, languages: e.target.value})} />
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newProvider.home_visits} onChange={e => setNewProvider({...newProvider, home_visits: e.target.checked})} />
                      Κατ' οίκον επισκέψεις
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newProvider.emergency_available} onChange={e => setNewProvider({...newProvider, emergency_available: e.target.checked})} />
                      Διαθέσιμος για έκτακτα
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newProvider.is_verified} onChange={e => setNewProvider({...newProvider, is_verified: e.target.checked})} />
                      Άμεσα επαληθευμένος
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
                <button onClick={() => setShowAddOne(false)} className="btn-secondary">Άκυρο</button>
                <button onClick={() => addOne.mutate()}
                  disabled={addOne.isPending || !newProvider.full_name || !newProvider.email || !newProvider.password}
                  className="btn-primary">
                  {addOne.isPending ? 'Προσθήκη...' : 'Προσθήκη παρόχου'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProductsTab() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Προϊόν διαγράφηκε') },
  })

  const saveTranslations = useMutation({
    mutationFn: (vars: { id: string; translations: any }) => api.patch(`/products/${vars.id}`, {
      name_translations: vars.translations.name,
      description_translations: vars.translations.description,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Οι μεταφράσεις αποθηκεύτηκαν') },
  })

  const filtered = products.filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 input flex-1">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση προϊόντος..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <FileSpreadsheet size={14}/> Excel Import
        </button>
        <button onClick={() => setNewProductOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <Plus size={14}/> Νέο Προϊόν
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Προϊόν</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατηγορία</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τιμή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">Δεν βρέθηκαν προϊόντα</td></tr>
            : filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">📦</div>
                    <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{p.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditProduct(p)} title="Επεξεργασία"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit2 size={14} className="text-gray-600" /></button>
                    <button onClick={() => setTranslateProduct(p)} title="Μεταφράσεις"
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Globe size={14} className="text-blue-500" /></button>
                    <button onClick={() => { if(confirm('Διαγραφή προϊόντος;')) deleteProduct.mutate(p.id) }}
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
        title={`Μεταφράσεις: ${translateProduct?.name || ''}`}
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Υπηρεσία διαγράφηκε') },
  })

  const saveTranslations = useMutation({
    mutationFn: (vars: { id: string; translations: any }) => api.patch(`/services/${vars.id}`, {
      provider_name_translations: vars.translations.name,
      description_translations: vars.translations.description,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Οι μεταφράσεις αποθηκεύτηκαν') },
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
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση υπηρεσίας..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <FileSpreadsheet size={14}/> Excel Import
        </button>
        <button onClick={() => setNewServiceOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <Plus size={14}/> Νέα Υπηρεσία
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πάροχος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τύπος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πόλη</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τιμή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Δεν βρέθηκαν υπηρεσίες</td></tr>
            : filtered.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">🩺</div>
                    <span className="font-medium text-gray-900 dark:text-white">{s.provider_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.service_type}</td>
                <td className="px-4 py-3 text-gray-500">{s.city}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{s.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditService(s)} title="Επεξεργασία"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit2 size={14} className="text-gray-600" /></button>
                    <button onClick={() => setTranslateService(s)} title="Μεταφράσεις"
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Globe size={14} className="text-blue-500" /></button>
                    <button onClick={() => { if(confirm('Διαγραφή υπηρεσίας;')) deleteService.mutate(s.id) }}
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
        title={`Μεταφράσεις: ${translateService?.provider_name || ''}`}
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
            {s === 'all' ? 'Όλες' : s === 'pending' ? 'Εκκρεμείς' : s === 'confirmed' ? 'Επιβεβ.' : s === 'shipped' ? 'Αποστολή' : s === 'delivered' ? 'Παράδοση' : 'Ακυρ.'}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Σύνολο</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατάσταση</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ημερομηνία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1,2,3].map(i => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">Δεν βρέθηκαν παραγγελίες</td></tr>
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

function DatabaseTab() {
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
      setError(err.response?.data?.message || 'Σφάλμα εκτέλεσης query')
    } finally { setLoading(false) }
  }

  const quickQueries = [
    { label: 'Χρήστες', sql: "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Παραγγελίες', sql: "SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Κατοικίδια', sql: "SELECT id, name, species, breed FROM pets ORDER BY created_at DESC LIMIT 20;" },
    { label: 'Πίνακες', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
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
    { id: 'overview',  label: 'Επισκόπηση',  icon: TrendingUp },
    { id: 'users',     label: 'Χρήστες',      icon: Users },
    { id: 'providers', label: 'Πάροχοι',      icon: Shield },
    { id: 'products',  label: 'Προϊόντα',     icon: Package },
    { id: 'services',  label: 'Υπηρεσίες',    icon: PawPrint },
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Χρήστες"     value={stats?.users ?? '—'}    change={12}  color="bg-blue-500" />
            <StatCard icon={PawPrint}    label="Κατοικίδια"  value={stats?.pets ?? '—'}     change={8}   color="bg-orange-500" />
            <StatCard icon={ShoppingBag} label="Παραγγελίες" value={stats?.orders ?? '—'}   change={-3}  color="bg-green-500" />
            <StatCard icon={TrendingUp}  label="Έσοδα"       value={`€${stats?.revenue ?? '0'}`} change={15} color="bg-purple-500" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Shield}      label="Πάροχοι"     value={stats?.providers ?? '—'} change={5}  color="bg-teal-500" />
            <StatCard icon={Package}     label="Προϊόντα"    value={stats?.products ?? '—'}  change={2}  color="bg-pink-500" />
            <StatCard icon={ClipboardList} label="Κρατήσεις" value={stats?.bookings ?? '—'}  change={18} color="bg-yellow-500" />
            <StatCard icon={Database}    label="Εγγραφές DB" value={stats?.total_records ?? '—'} change={null} color="bg-gray-500" />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Γρήγορες ενέργειες</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Διαχείριση χρηστών', tab: 'users' as Tab, icon: Users },
                { label: 'Εκκρεμείς παραγγελίες', tab: 'orders' as Tab, icon: ClipboardList },
                { label: 'Επαλήθευση παρόχων', tab: 'providers' as Tab, icon: Shield },
                { label: 'Προϊόντα', tab: 'products' as Tab, icon: Package },
                { label: 'SQL Query', tab: 'database' as Tab, icon: Database },
                { label: 'Νέος χρήστης', tab: 'users' as Tab, icon: Users },
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
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ειδικές σελίδες</h4>
              <div className="flex flex-wrap gap-3">
                <Link to="/admin/catalog" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Database size={15} className="text-gray-400"/> Κατάλογος Υπηρεσιών <ChevronRight size={13} className="text-gray-400"/>
                </Link>
                <Link to="/admin/insurance" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Shield size={15} className="text-gray-400"/> Ασφαλιστικές Εταιρείες <ChevronRight size={13} className="text-gray-400"/>
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
    </div>
  )
}
