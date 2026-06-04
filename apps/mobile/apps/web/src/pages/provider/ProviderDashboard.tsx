import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Upload, FileSpreadsheet, FileText, Package, Scissors, Calendar, Star, TrendingUp, Eye, Edit, Trash2, CheckCircle, Clock, X, ChevronRight, Download, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

type Tab = 'overview' | 'services' | 'products' | 'bookings' | 'calendar' | 'import'

// ─── Import Tab ───────────────────────────────────────────────────
function ImportTab() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [importType, setImportType] = useState<'products' | 'services'>('products')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseFile = async (f: File) => {
    setFile(f)
    const ext = f.name.split('.').pop()?.toLowerCase()
    
    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const buffer = await f.arrayBuffer()
        const wb = XLSX.read(buffer)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        if (data.length > 0) {
          const headers = data[0].map(String)
          setColumns(headers)
          setPreview(data.slice(1, 6).map(row => {
            const obj: any = {}
            headers.forEach((h, i) => obj[h] = row[i] ?? '')
            return obj
          }))
        }
      } else if (ext === 'docx' || ext === 'doc') {
        // For Word files, show manual entry guidance
        toast('Αρχείο Word εντοπίστηκε. Θα εξαχθούν δεδομένα αυτόματα.')
        setColumns(['Όνομα', 'Τιμή', 'Περιγραφή', 'Κατηγορία'])
        setPreview([{ 'Όνομα': 'Παράδειγμα', 'Τιμή': '10', 'Περιγραφή': 'Περιγραφή', 'Κατηγορία': 'other' }])
      }
    } catch (err) {
      toast.error('Σφάλμα ανάγνωσης αρχείου')
    }
  }

  const doImport = async () => {
    if (!preview.length) return
    setImporting(true)
    try {
      const endpoint = importType === 'products' ? '/products/bulk' : '/services/bulk'
      const items = preview.map(row => ({
        name: row['Όνομα'] || row['name'] || row['Name'] || Object.values(row)[0],
        price: parseFloat(row['Τιμή'] || row['price'] || row['Price'] || '0'),
        description: row['Περιγραφή'] || row['description'] || row['Description'] || '',
        category: row['Κατηγορία'] || row['category'] || row['Category'] || 'other',
      }))
      await api.post(endpoint, { items })
      toast.success(`${items.length} εγγραφές εισήχθησαν επιτυχώς!`)
      queryClient.invalidateQueries({ queryKey: ['provider-products'] })
      queryClient.invalidateQueries({ queryKey: ['provider-services'] })
      setFile(null); setPreview([]); setColumns([])
    } catch {
      toast.error('Σφάλμα εισαγωγής δεδομένων')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (type: 'products' | 'services') => {
    const headers = type === 'products'
      ? ['Όνομα', 'Τιμή', 'Περιγραφή', 'Κατηγορία', 'Απόθεμα']
      : ['Όνομα', 'Τιμή', 'Περιγραφή', 'Τύπος', 'Διάρκεια (λεπτά)']
    const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(() => 'Παράδειγμα')])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `globipet_${type}_template.xlsx`)
    toast.success('Template κατεβάστηκε!')
  }

  return (
    <div className="space-y-6">
      {/* Import type */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Τύπος εισαγωγής</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: 'products', label: 'Προϊόντα', icon: Package, desc: 'Εισαγωγή προϊόντων marketplace' },
            { value: 'services', label: 'Υπηρεσίες', icon: Scissors, desc: 'Εισαγωγή υπηρεσιών' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setImportType(opt.value as any)}
              className={cn('p-4 rounded-xl border text-left transition-all', importType === opt.value ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700')}>
              <opt.icon size={20} className={cn('mb-2', importType === opt.value ? 'text-brand-900' : 'text-gray-400')} />
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Download templates */}
        <div className="flex gap-3">
          <button onClick={() => downloadTemplate('products')} className="flex items-center gap-2 text-xs text-brand-900 hover:underline">
            <Download size={13} /> Template Προϊόντων (.xlsx)
          </button>
          <button onClick={() => downloadTemplate('services')} className="flex items-center gap-2 text-xs text-brand-900 hover:underline">
            <Download size={13} /> Template Υπηρεσιών (.xlsx)
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ανέβασμα αρχείου</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all">
          <div className="flex justify-center gap-4 mb-4">
            <FileSpreadsheet size={32} className="text-green-500" />
            <FileText size={32} className="text-blue-500" />
          </div>
          <p className="font-medium text-gray-700 dark:text-gray-300">Σύρετε αρχείο ή κλικ για επιλογή</p>
          <p className="text-sm text-gray-400 mt-1">Excel (.xlsx, .xls), CSV, Word (.docx)</p>
          {file && <p className="text-sm text-brand-900 font-medium mt-3">✓ {file.name}</p>}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.docx,.doc" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if(f) parseFile(f) }} />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Προεπισκόπηση ({preview.length} εγγραφές)</h3>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle size={14} /> Έτοιμο για εισαγωγή
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>{columns.map(c => <th key={c} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.map((row, i) => (
                  <tr key={i}>{columns.map(c => <td key={c} className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{row[c]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button onClick={doImport} disabled={importing} className="btn-primary flex items-center gap-2">
              <Upload size={16} /> {importing ? 'Εισαγωγή...' : `Εισαγωγή ${preview.length} εγγραφών`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────
function CalendarTab() {
  const { user } = useAuthStore()
  const [syncing, setSyncing] = useState(false)

  const syncGoogle = async () => {
    setSyncing(true)
    try {
      window.open(`https://globipetbackend-production.up.railway.app/api/calendar/google/auth?userId=${user?.id}`, '_blank', 'width=500,height=600')
      toast.success('Ανοίχτηκε η σύνδεση Google Calendar')
    } finally { setSyncing(false) }
  }

  const syncOutlook = async () => {
    setSyncing(true)
    try {
      window.open(`https://globipetbackend-production.up.railway.app/api/calendar/outlook/auth?userId=${user?.id}`, '_blank', 'width=500,height=600')
      toast.success('Ανοίχτηκε η σύνδεση Microsoft Outlook')
    } finally { setSyncing(false) }
  }

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get('/bookings/provider').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  // Simple calendar grid
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Calendar sync */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Συγχρονισμός Ημερολογίου</h3>
        <p className="text-sm text-gray-500 mb-4">Συνδέστε το ημερολόγιό σας για αυτόματο συγχρονισμό κρατήσεων</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={syncGoogle}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Google Calendar</p>
              <p className="text-xs text-gray-500">Σύνδεση με Google</p>
            </div>
          </button>
          <button onClick={syncOutlook}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0078D4"><path d="M24 12.204c0-.687-.563-1.244-1.258-1.244h-9.416V3.258C13.326 2.563 12.763 2 12.07 2H1.258C.563 2 0 2.563 0 3.258v17.484C0 21.437.563 22 1.258 22h21.484C23.437 22 24 21.437 24 20.742v-8.538z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Microsoft Outlook</p>
              <p className="text-xs text-gray-500">Σύνδεση με Microsoft</p>
            </div>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {today.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button className="btn-ghost p-2">‹</button>
            <button className="btn-ghost p-2">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Κυ','Δε','Τρ','Τε','Πέ','Πα','Σά'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const isToday = day === today.getDate()
            const hasBooking = bookings.some((b: any) => new Date(b.scheduled_at).getDate() === day)
            return (
              <div key={day} className={cn('aspect-square flex items-center justify-center rounded-xl text-sm cursor-pointer transition-all relative',
                isToday ? 'bg-brand-900 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}>
                {day}
                {hasBooking && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Επερχόμενες Κρατήσεις</h3>
        {bookings.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Δεν υπάρχουν κρατήσεις</p>
        ) : bookings.slice(0, 5).map((b: any) => (
          <div key={b.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-brand-900" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{b.service_name || 'Κράτηση'}</p>
              <p className="text-xs text-gray-500">{b.user_name} · {new Date(b.scheduled_at).toLocaleDateString('el-GR')}</p>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
              {b.status === 'confirmed' ? 'Επιβεβ.' : b.status === 'pending' ? 'Εκκρεμεί' : b.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Services Tab ─────────────────────────────────────────────────
function ServicesTab() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', type: 'grooming', duration_minutes: '60' })

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const addService = useMutation({
    mutationFn: () => api.post('/services', { ...form, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] })
      toast.success('Υπηρεσία προστέθηκε!')
      setShowForm(false)
      setForm({ name: '', description: '', price: '', type: 'grooming', duration_minutes: '60' })
    },
    onError: () => toast.error('Σφάλμα προσθήκης υπηρεσίας'),
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-services'] }); toast.success('Υπηρεσία διαγράφηκε') },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{services.length} υπηρεσίες</p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Νέα Υπηρεσία
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Νέα Υπηρεσία</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα</label><input className="input" placeholder="π.χ. Grooming Σκύλου" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                  {['grooming','veterinary','walking','pet_sitting','training','boarding','photography','pet_taxi','other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€)</label><input className="input" type="number" placeholder="25" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label><input className="input" type="number" placeholder="60" value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label><textarea className="input resize-none" rows={2} placeholder="Περιγραφή υπηρεσίας..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={() => addService.mutate()} disabled={!form.name || !form.price || addService.isPending} className="btn-primary flex-1">
                {addService.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {isLoading ? [1,2,3].map(i => <div key={i} className="card p-4"><div className="skeleton h-16 w-full"/></div>)
        : services.length === 0 ? (
          <div className="card p-10 text-center">
            <Scissors size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Δεν έχετε υπηρεσίες ακόμα</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">Προσθήκη πρώτης υπηρεσίας</button>
          </div>
        ) : services.map((s: any) => (
          <div key={s.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <Scissors size={16} className="text-brand-900" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
              <p className="text-xs text-gray-500">{s.type} · {s.duration_minutes} λεπτά</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{s.price}</p>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><Edit size={14} className="text-gray-400"/></button>
              <button onClick={() => { if(confirm('Διαγραφή;')) deleteService.mutate(s.id) }} className="btn-ghost p-2"><Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────
function ProductsTab() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'food', stock: '0' })
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const addProduct = useMutation({
    mutationFn: () => api.post('/products', { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-products'] })
      toast.success('Προϊόν προστέθηκε!')
      setShowForm(false)
      setForm({ name: '', description: '', price: '', category: 'food', stock: '0' })
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-products'] }); toast.success('Προϊόν διαγράφηκε') },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{products.length} προϊόντα</p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Νέο Προϊόν
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Νέο Προϊόν</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα</label><input className="input" placeholder="π.χ. Royal Canin Adult" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  {['food','toys','accessories','health','grooming','training','housing','other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€)</label><input className="input" type="number" placeholder="15.99" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Απόθεμα</label><input className="input" type="number" placeholder="100" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))} /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label><textarea className="input resize-none" rows={2} placeholder="Περιγραφή προϊόντος..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={() => addProduct.mutate()} disabled={!form.name || !form.price || addProduct.isPending} className="btn-primary flex-1">
                {addProduct.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {isLoading ? [1,2,3].map(i => <div key={i} className="card p-4"><div className="skeleton h-16 w-full"/></div>)
        : products.length === 0 ? (
          <div className="card p-10 text-center">
            <Package size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Δεν έχετε προϊόντα ακόμα</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">Προσθήκη πρώτου προϊόντος</button>
          </div>
        ) : products.map((p: any) => (
          <div key={p.id} className="card p-4 flex items-center gap-4">
            {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              : <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xl">📦</div>}
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
              <p className="text-xs text-gray-500">{p.category} · Απόθεμα: {p.stock ?? '—'}</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{p.price}</p>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><Edit size={14} className="text-gray-400"/></button>
              <button onClick={() => { if(confirm('Διαγραφή;')) deleteProduct.mutate(p.id) }} className="btn-ghost p-2"><Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Provider Dashboard ──────────────────────────────────────
export default function ProviderDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const canAccess = user?.role === 'service_provider' || user?.role === 'both' || user?.role === 'admin'
  if (!canAccess) return <Navigate to="/" replace />

  const { data: stats } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: () => api.get('/provider/stats').then(r => r.data),
    enabled: !!user,
  })

  const tabs = [
    { id: 'overview',  label: 'Επισκόπηση', icon: TrendingUp },
    { id: 'services',  label: 'Υπηρεσίες',  icon: Scissors },
    { id: 'products',  label: 'Προϊόντα',   icon: Package },
    { id: 'bookings',  label: 'Κρατήσεις',  icon: Clock },
    { id: 'calendar',  label: 'Ημερολόγιο', icon: Calendar },
    { id: 'import',    label: 'Import',      icon: Upload },
  ]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-900 font-bold text-lg shrink-0">
          {getInitials(user?.full_name || 'P')}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Dashboard Παρόχου</h1>
          <p className="text-sm text-gray-500">{user?.full_name} · {user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
              activeTab === tab.id ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Συνολικές κρατήσεις', value: stats?.bookings ?? '0', icon: Calendar, color: 'bg-blue-500' },
              { label: 'Συνολικά έσοδα', value: `€${stats?.revenue ?? '0'}`, icon: TrendingUp, color: 'bg-green-500' },
              { label: 'Υπηρεσίες', value: stats?.services ?? '0', icon: Scissors, color: 'bg-orange-500' },
              { label: 'Αξιολόγηση', value: stats?.rating ?? '—', icon: Star, color: 'bg-yellow-500' },
            ].map((s, i) => (
              <div key={i} className="card p-5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.color)}>
                  <s.icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Γρήγορες ενέργειες</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Προσθήκη υπηρεσίας', tab: 'services' as Tab, icon: Scissors },
                { label: 'Προσθήκη προϊόντος', tab: 'products' as Tab, icon: Package },
                { label: 'Import από Excel', tab: 'import' as Tab, icon: FileSpreadsheet },
                { label: 'Κρατήσεις', tab: 'bookings' as Tab, icon: Clock },
                { label: 'Ημερολόγιο', tab: 'calendar' as Tab, icon: Calendar },
                { label: 'Google Calendar', tab: 'calendar' as Tab, icon: Calendar },
              ].map((item, i) => (
                <button key={i} onClick={() => setActiveTab(item.tab)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 transition-colors text-left">
                  <item.icon size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <ChevronRight size={14} className="text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'import'   && <ImportTab />}
      {activeTab === 'bookings' && (
        <div className="card p-5 text-center py-12">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Οι κρατήσεις θα εμφανιστούν εδώ</p>
        </div>
      )}
    </div>
  )
}
