import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Upload, FileSpreadsheet, FileText, Package, Scissors, Calendar, Star, TrendingUp, Eye, Edit, Trash2, CheckCircle, Clock, X, ChevronRight, Download, AlertCircle, Video, Stethoscope, Languages, ArrowLeft, Megaphone, Users, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { effectivePrice } from '@/lib/price'
import { fmtYmd } from '@/lib/dates'
import { Navigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import ProviderStaffPage from './ProviderStaffPage'
import MarketInsights from '@/pages/MarketInsights'
import ProviderTranslationsPage from './ProviderTranslationsPage'
import ProviderMarketingPage from './ProviderMarketingPage'
import ProviderCustomersPage from './ProviderCustomersPage'
import ProviderReviewsPage from './ProviderReviewsPage'
import ProviderTelehealthToday from '@/components/features/telehealth/ProviderTelehealthToday'
import StaffInvitationsCard from '@/components/StaffInvitationsCard'

// Το 'insights' υπήρχε στον πίνακα των καρτελών και στην απεικόνιση,
// αλλά έλειπε από τον τύπο — ο μεταγλωττιστής θεωρούσε τη σύγκριση αδύνατη.
type Tab = 'overview' | 'services' | 'staff' | 'products' | 'bookings' | 'calendar' | 'import' | 'translations' | 'marketing' | 'customers' | 'insights' | 'reviews'

// Ποιοι τύποι παρόχων πουλάνε ΚΑΙ προϊόντα (τροφές, σαμπουάν, αξεσουάρ).
// Ένας walker ή sitter δεν έχει κατάστημα — δεν βλέπει καθόλου Προϊόντα
// ούτε μαζικό Import. Άλλαξε ΜΟΝΟ αυτή τη γραμμή για να προσθέσεις τύπο.
const PRODUCT_TYPES = ['veterinary', 'grooming', 'boarding', 'training']

// Οι 8 τύποι υπηρεσιών, όπως ακριβώς αποθηκεύονται στο services.service_type
// Οι 8 τύποι υπηρεσιών, όπως ακριβώς αποθηκεύονται στο services.service_type.
//
// Κρατάμε ΚΛΕΙΔΙ μετάφρασης, όχι έτοιμο κείμενο: η σταθερά αποτιμάται μία
// φορά όταν φορτώνει το αρχείο, οπότε μεταφρασμένο κείμενο εδώ θα κλείδωνε
// στη γλώσσα της πρώτης φόρτωσης και δεν θα άλλαζε ποτέ. Η μετάφραση
// γίνεται τη στιγμή της απόδοσης.
const SERVICE_TYPES = [
  { value: 'veterinary',  labelKey: 'providerDash.catVeterinary' },
  { value: 'grooming',    labelKey: 'providerDash.catGrooming' },
  { value: 'walking',     labelKey: 'providerDash.catWalking' },
  { value: 'sitting',     labelKey: 'providerDash.catSitting' },
  { value: 'boarding',    labelKey: 'providerDash.catBoarding' },
  { value: 'training',    labelKey: 'providerDash.catTraining' },
  { value: 'transport',   labelKey: 'providerDash.catTransport' },
  { value: 'photography', labelKey: 'providerDash.catPhoto' },
]

// ─── Import Tab ───────────────────────────────────────────────────
function ImportTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  // ΟΛΕΣ οι γραμμές του αρχείου. Πριν εισάγονταν μόνο οι 5 της προεπισκόπησης.
  const [rows, setRows] = useState<any[]>([])
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
          const all = data.slice(1)
            .filter(row => row.some(c => String(c ?? '').trim() !== ''))
            .map(row => {
              const obj: any = {}
              headers.forEach((h, i) => obj[h] = row[i] ?? '')
              return obj
            })
          setRows(all)
          setPreview(all.slice(0, 5))
        }
      } else if (ext === 'docx' || ext === 'doc') {
        // For Word files, show manual entry guidance
        toast(t('providerDash.wordDetected'))
        setColumns([t('providerDash.name'), t('providerDash.price'), t('providerDash.description'), t('providerDash.category')])
        setPreview([{ [t('providerDash.colName')]: t('providerDash.sampleName'), [t('providerDash.colPrice')]: '10', [t('providerDash.colDesc')]: t('providerDash.description'), [t('providerDash.colCategory')]: 'other' }])
      }
    } catch (err) {
      toast.error(t('providerDash.errFileRead'))
    }
  }

  const doImport = async () => {
    if (!rows.length) return
    setImporting(true)
    try {
      const endpoint = importType === 'products' ? '/products/bulk' : '/services/bulk'
      const items = rows.map(row => ({
        name: row[t('providerDash.name')] || row['name'] || row['Name'] || Object.values(row)[0],
        price: parseFloat(String(row[t('providerDash.price')] || row['price'] || row['Price'] || '0').replace(',', '.')),
        description: row[t('providerDash.description')] || row['description'] || row['Description'] || '',
        category: row[t('providerDash.category')] || row['category'] || row['Category'] || 'other',
        type: row[t('providerDash.type')] || row['type'] || row['Type'] || undefined,
        stock: row[t('providerDash.stock')] || row['stock'] || row['Stock'] || undefined,
      }))
      let count = 0, failed = 0
      for (let i = 0; i < items.length; i += 500) {
        const res = await api.post(endpoint, { items: items.slice(i, i + 500) })
        count += res.data?.count ?? 0
        failed += res.data?.failed?.length ?? 0
      }
      toast.success(t('providerDash.importedOk', { count }))
      if (failed > 0) toast.error(t('providerEdit.importFailedRows', { count: failed }))
      queryClient.invalidateQueries({ queryKey: ['provider-products'] })
      queryClient.invalidateQueries({ queryKey: ['provider-services'] })
      setFile(null); setPreview([]); setRows([]); setColumns([])
    } catch (e: any) {
      // Μήνυμα του server, όπως στο κινητό.
      toast.error(e?.response?.data?.message || t('providerDash.errImport'))
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (type: 'products' | 'services') => {
    const headers = type === 'products'
      ? [t('providerDash.name'), t('providerDash.price'), t('providerDash.description'), t('providerDash.category'), t('providerDash.stock')]
      : [t('providerDash.name'), t('providerDash.price'), t('providerDash.description'), t('providerDash.type')]
    const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(() => t('providerDash.sampleName'))])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `globipet_${type}_template.xlsx`)
    toast.success(t('providerDash.templateDownloaded'))
  }

  return (
    <div className="space-y-6">
      {/* Import type */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('providerDash.importType')}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: 'products', label: t('providerDash.tabProducts'), icon: Package, desc: t('providerDash.importProducts') },
            { value: 'services', label: t('providerDash.tabServices'), icon: Scissors, desc: t('providerDash.importServices') },
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
            <Download size={13} />{t('providerDash.templateProducts')}</button>
          <button onClick={() => downloadTemplate('services')} className="flex items-center gap-2 text-xs text-brand-900 hover:underline">
            <Download size={13} />{t('providerDash.templateServices')}</button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('providerDash.uploadFile')}</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all">
          <div className="flex justify-center gap-4 mb-4">
            <FileSpreadsheet size={32} className="text-green-500" />
            <FileText size={32} className="text-blue-500" />
          </div>
          <p className="font-medium text-gray-700 dark:text-gray-300">{t('providerDash.dropHint')}</p>
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
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('providerDash.previewCount', { count: rows.length })}</h3>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle size={14} />{t('providerDash.readyToImport')}</div>
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
              <Upload size={16} /> {importing ? t('providerDash.importing') : t('providerDash.importRecords', { count: rows.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────
// ─── Bookings Tab ─────────────────────────────────────────────────
/**
 * Οι κρατήσεις του παρόχου με ενέργειες: επιβεβαίωση, ολοκλήρωση, «δεν
 * προσήλθε», ακύρωση (πάντα με πλήρη επιστροφή στον πελάτη) και αλλαγή
 * γιατρού.
 *
 * Πριν η καρτέλα έδειχνε μόνο «οι κρατήσεις θα εμφανιστούν εδώ» — ο πάροχος
 * δεν μπορούσε από το web ούτε να επιβεβαιώσει ούτε να ολοκληρώσει ραντεβού,
 * ενώ η λίστα υπήρχε στο κινητό.
 */
function BookingsTab() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'active' | 'done' | 'cancelled' | 'all'>('active')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get('/provider/bookings').then(r => r.data?.data ?? []),
    enabled: !!user,
  })
  const { data: allStaff = [] } = useQuery({
    queryKey: ['provider-staff-all'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? r.data ?? []),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/provider/bookings/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-bookings'] }); toast.success(t('bookingPolicy.updated')) },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerDash.error')),
  })
  const changeStaff = useMutation({
    mutationFn: ({ id, staff_id }: { id: string; staff_id: string }) =>
      api.patch(`/bookings/${id}/staff`, { staff_id: staff_id || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-bookings'] }); toast.success(t('providerDash.staffChanged')) },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerDash.error')),
  })

  const askCancel = (b: any) => {
    const msg = b.payment_status === 'paid'
      ? t('bookingPolicy.providerCancelPaid', { amount: Number(b.total_price ?? 0).toFixed(2) })
      : t('bookingPolicy.providerCancel')
    if (confirm(msg)) setStatus.mutate({ id: b.id, status: 'cancelled' })
  }

  const shown = bookings.filter((b: any) =>
    filter === 'all' ? true
      : filter === 'active' ? (b.status === 'pending' || b.status === 'confirmed')
      : filter === 'done' ? (b.status === 'completed' || b.status === 'no_show')
      : b.status === 'cancelled')

  const payBadge = (b: any) => b.payment_status === 'paid' ? ['bg-green-50 text-green-700', t('bookingPolicy.paid')]
    : b.payment_status === 'refunded' ? ['bg-gray-100 text-gray-600', t('bookingPolicy.refunded')]
    : b.payment_status === 'partially_refunded' ? ['bg-amber-50 text-amber-700', t('bookingPolicy.partiallyRefunded')]
    : ['bg-yellow-50 text-yellow-700', t('bookingPolicy.unpaidBadge')]

  const FILTERS = [
    { v: 'active', l: t('bookingPolicy.filterActive') }, { v: 'done', l: t('bookingPolicy.filterDone') },
    { v: 'cancelled', l: t('bookingPolicy.filterCancelled') }, { v: 'all', l: t('bookingPolicy.filterAll') },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              filter === f.v ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 border border-gray-200 dark:border-gray-700')}>
            {f.l}
          </button>
        ))}
      </div>

      {isLoading ? [1, 2, 3].map(i => <div key={i} className="card p-4"><div className="skeleton h-16 w-full" /></div>)
      : shown.length === 0 ? (
        <div className="card p-10 text-center">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{t('bookingPolicy.empty')}</p>
        </div>
      ) : shown.map((b: any) => {
        const [payCls, payLabel] = payBadge(b)
        const staffOpts = allStaff.filter((m: any) => m.service_id === b.service_id && m.is_active)
        const open = b.status === 'pending' || b.status === 'confirmed'
        return (
          <div key={b.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{b.service?.title || t('providerDash.booking')}</p>
                <p className="text-xs text-gray-500">{b.customer_name} · {fmtYmd(b.booking_date, i18n.language)}{b.booking_time ? ` ${b.booking_time}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">€{Number(b.total_price ?? 0).toFixed(2)}</p>
                <span className={cn('inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium', payCls)}>{payLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {String(t(`bookingPolicy.st${b.status.charAt(0).toUpperCase()}${b.status.slice(1)}`, b.status))}
              </span>
              {open && staffOpts.length > 0 && (
                <select className="input text-xs py-1 px-2 max-w-[160px]" value={b.staff_id ?? ''}
                  disabled={changeStaff.isPending}
                  onChange={e => changeStaff.mutate({ id: b.id, staff_id: e.target.value })}>
                  <option value="">{t('providerDash.noPractitioner')}</option>
                  {staffOpts.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              )}
              <div className="flex gap-1.5 ml-auto">
                {/* Επιβεβαίωση / «δεν προσήλθε» μόνο για πληρωμένη κράτηση (ο server
                    απαντά 400 αλλιώς). Απλήρωτη σε αναμονή: ετικέτα «Αναμένει πληρωμή». */}
                {b.status === 'pending' && b.payment_status === 'paid' && (
                  <button onClick={() => setStatus.mutate({ id: b.id, status: 'confirmed' })} disabled={setStatus.isPending}
                    className="btn-primary text-xs px-3 py-1.5">{t('bookingPolicy.confirm')}</button>
                )}
                {b.status === 'pending' && b.payment_status !== 'paid' && (
                  <span className="self-center text-xs px-2 py-1 rounded-full font-medium bg-yellow-50 text-yellow-700">
                    {t('providerPay.awaitingPayment')}
                  </span>
                )}
                {b.status === 'confirmed' && b.payment_status === 'paid' && (
                  <button onClick={() => setStatus.mutate({ id: b.id, status: 'completed' })} disabled={setStatus.isPending}
                    className="btn-primary text-xs px-3 py-1.5">{t('bookingPolicy.complete')}</button>
                )}
                {b.status === 'confirmed' && b.payment_status === 'paid' && (
                  <button onClick={() => setStatus.mutate({ id: b.id, status: 'no_show' })} disabled={setStatus.isPending}
                    className="btn-secondary text-xs px-3 py-1.5">{t('bookingPolicy.noShow')}</button>
                )}
                {open && (
                  <button onClick={() => askCancel(b)} disabled={setStatus.isPending}
                    className="btn-secondary text-xs px-3 py-1.5 text-red-600 border-red-200 hover:bg-red-50">{t('bookingPolicy.cancel')}</button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarTab() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  // Μήνας που δείχνει το ημερολόγιο (‹ ›). Το /provider/bookings φέρνει όλες
  // τις κρατήσεις, οπότε η αλλαγή μήνα φιλτράρει τοπικά — χωρίς νέο αίτημα.
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const shiftMonth = (delta: number) => setView(v => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  /**
   * Which calendars are attached to this account.
   *
   * There was nothing here before because nothing was stored — the old
   * callback threw the tokens away, so "connected" was a claim the app made
   * about a state it never kept.
   */
  const { data: connections = [] } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: () => api.get('/calendar/connections').then(r => r.data?.data ?? []),
  })
  const connected = (p: string) => connections.some((c: any) => c.provider === p && c.is_active)

  /**
   * Start the OAuth flow.
   *
   * The old handlers opened /calendar/<p>/auth?userId=<id> directly. That
   * route was never registered, so the popup showed a 404 — and passing the
   * user id in the URL meant anyone could attach their calendar to another
   * account. The endpoint now requires a session, issues a one-time state
   * server-side, and hands back the URL to open.
   */
  const connect = async (provider: 'google' | 'outlook') => {
    setSyncing(true)
    try {
      const { data } = await api.get(`/calendar/${provider}/connect`)
      const url = data?.data?.url
      if (!url) throw new Error(t('providerDash.errNoAuthUrl'))
      window.open(url, '_blank', 'width=520,height=640')
    } catch (err: any) {
      toast.error(err?.message || t('providerDash.errConnect'))
    } finally { setSyncing(false) }
  }

  const disconnect = async (provider: 'google' | 'outlook') => {
    try {
      await api.delete(`/calendar/${provider}`)
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] })
      toast.success(t('providerDash.connectionRemoved'))
    } catch (err: any) {
      toast.error(err?.message || t('providerDash.error'))
    }
  }

  // The popup redirects the opener back to /provider?calendar=… when it
  // finishes, so re-read the connection list on focus rather than making the
  // provider reload the page to see the result.
  useEffect(() => {
    const onFocus = () => queryClient.invalidateQueries({ queryKey: ['calendar-connections'] })
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [queryClient])

  const syncGoogle = () => connected('google') ? disconnect('google') : connect('google')
  const syncOutlook = () => connected('outlook') ? disconnect('outlook') : connect('outlook')

  // Το προσωπικό όλων των υπηρεσιών του παρόχου, για την αλλαγή γιατρού.
  const { data: allStaff = [] } = useQuery({
    queryKey: ['provider-staff-all'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? r.data ?? []),
  })

  /**
   * Αλλαγή γιατρού σε υπάρχουσα κράτηση.
   *
   * Ασθένεια, άδεια ή αλλαγή βάρδιας δεν πρέπει να σημαίνει ακύρωση και νέα
   * πληρωμή. Ο server ελέγχει ότι ο νέος γιατρός ανήκει στην ίδια υπηρεσία,
   * δεν ξαναϋπολογίζει τιμή, και ειδοποιεί τον πελάτη στη γλώσσα του.
   */
  const changeStaff = useMutation({
    mutationFn: ({ id, staff_id }: { id: string; staff_id: string }) =>
      api.patch(`/bookings/${id}/staff`, { staff_id: staff_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] })
      toast.success(t('providerDash.staffChanged'))
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerDash.error')),
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings'],
    // The provider's bookings live at /provider/bookings — bookings.ts has no
    // /provider path, so this request 404'd and the dashboard's calendar and
    // upcoming list were fed an empty array on every load.
    queryFn: () => api.get('/provider/bookings').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  // Simple calendar grid
  const today = new Date()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const firstDay = new Date(view.y, view.m, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Calendar sync */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('providerDash.calendarSync')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('providerDash.calendarSyncHint')}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={syncGoogle}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Google Calendar</p>
              {/* Say what pressing this will do, not what it is. */}
              <p className={cn('text-xs', connected('google') ? 'text-green-600' : 'text-gray-500')}>
                {connected('google') ? t('providerDash.connectedHint') : t('providerDash.connectGoogle')}
              </p>
            </div>
          </button>
          <button onClick={syncOutlook}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0078D4"><path d="M24 12.204c0-.687-.563-1.244-1.258-1.244h-9.416V3.258C13.326 2.563 12.763 2 12.07 2H1.258C.563 2 0 2.563 0 3.258v17.484C0 21.437.563 22 1.258 22h21.484C23.437 22 24 21.437 24 20.742v-8.538z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Microsoft Outlook</p>
              <p className={cn('text-xs', connected('outlook') ? 'text-green-600' : 'text-gray-500')}>
                {connected('outlook') ? t('providerDash.connectedHint') : t('providerDash.connectMicrosoft')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {new Date(view.y, view.m, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost p-2" onClick={() => shiftMonth(-1)} aria-label={t('common.previous')}>‹</button>
            <button type="button" className="btn-ghost p-2" onClick={() => shiftMonth(1)} aria-label={t('common.next')}>›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[t('providerDash.dSun'),t('providerDash.dMon'),t('providerDash.dTue'),t('providerDash.dWed'),t('providerDash.dThu'),t('providerDash.dFri'),t('providerDash.dSat')].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const isToday = view.y === today.getFullYear() && view.m === today.getMonth() && day === today.getDate()
            // Bookings store booking_date as a "YYYY-MM-DD" string. Reading
            // scheduled_at — a column that does not exist — gave Invalid Date,
            // so getDate() was NaN and no day ever showed a dot.
            // Σύγκριση του 'YYYY-MM-DD' ως κειμένου με την τοπική ημέρα — το
            // new Date('YYYY-MM-DD') είναι UTC και σε ζώνες πίσω από το UTC έπεφτε στην προηγούμενη μέρα.
            const dayYmd = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasBooking = bookings.some((b: any) =>
              !!b.booking_date && String(b.booking_date).slice(0, 10) === dayYmd)
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
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('providerDash.upcomingBookings')}</h3>
        {bookings.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">{t('providerDash.noBookings')}</p>
        ) : bookings.slice(0, 5).map((b: any) => (
          <div key={b.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-brand-900" />
            </div>
            <div className="flex-1">
              {/* service_name and user_name are not columns — the title comes
                  from the included service relation and the customer column
                  is customer_name. Both rendered blank before. */}
              <p className="font-medium text-sm text-gray-900 dark:text-white">{b.service?.title || t('providerDash.booking')}</p>
              <p className="text-xs text-gray-500">
                {b.customer_name} · {fmtYmd(b.booking_date, i18n.language)}{b.booking_time ? ` ${b.booking_time}` : ''}
              </p>
            </div>
            {/* Αλλαγή γιατρού από τη γραμματεία. Εμφανίζεται μόνο όπου
                υπάρχει προσωπικό για τη συγκεκριμένη υπηρεσία, και μόνο σε
                κρατήσεις που δεν έχουν ολοκληρωθεί ή ακυρωθεί. */}
            {b.status !== 'cancelled' && b.status !== 'completed' &&
             allStaff.some((m: any) => m.service_id === b.service_id) && (
              <select
                className="input text-xs py-1 px-2 max-w-[150px]"
                value={b.staff_id ?? ''}
                disabled={changeStaff.isPending}
                onChange={e => changeStaff.mutate({ id: b.id, staff_id: e.target.value })}>
                <option value="">{t('providerDash.noPractitioner')}</option>
                {allStaff
                  .filter((m: any) => m.service_id === b.service_id && m.is_active)
                  .map((m: any) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
              </select>
            )}

            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
              {b.status === 'confirmed' ? t('providerDash.confirmShort') : b.status === 'pending' ? t('providerDash.pending')
                : String(t(`bookingPolicy.st${String(b.status).charAt(0).toUpperCase()}${String(b.status).slice(1)}`, { defaultValue: b.status }))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Services Tab ─────────────────────────────────────────────────
/**
 * «Νέα υπηρεσία» ανοίγει τον ΙΔΙΟ οδηγό με το κινητό (/provider/packages,
 * κατηγορία → στοιχεία με πόλη, διεύθυνση, τοποθεσία στον χάρτη, βασική
 * τιμή, έτη εμπειρίας, κατ' οίκον/έκτακτα).
 *
 * Πριν υπήρχε εδώ μια γρήγορη φόρμα (όνομα/τύπος/τιμή/διάρκεια/περιγραφή)
 * που δεν είχε διεύθυνση ούτε τοποθεσία, έγραφε σταθερή πόλη όταν ο
 * χρήστης δεν είχε, και η «διάρκεια» δεν αποθηκευόταν πουθενά — άρα η
 * υπηρεσία από το web διέφερε από την ίδια υπηρεσία από το κινητό.
 */
function ServicesTab() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-services'] }); toast.success(t('providerDash.serviceDeleted')) },
    // Ο server απαντά 409 όταν η υπηρεσία έχει κρατήσεις. Δείχνουμε το δικό
    // του μήνυμα, που εξηγεί και την εναλλακτική — ποτέ ωμό σφάλμα βάσης.
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerDash.errDeleteService')),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{services.length} {t('providerDash.tabServices')}</p>
        <div className="flex gap-2">
        <Link to="/provider/packages" className="btn-secondary flex items-center gap-2 text-sm">{t('providerPkg.title')}</Link>
        <Link to="/provider/packages?new=1" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />{t('providerDash.newService')}</Link>
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading ? [1,2,3].map(i => <div key={i} className="card p-4"><div className="skeleton h-16 w-full"/></div>)
        : services.length === 0 ? (
          <div className="card p-10 text-center">
            <Scissors size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('providerDash.noServices')}</p>
            <Link to="/provider/packages?new=1" className="btn-primary mt-4 text-sm inline-block">{t('providerDash.addFirstService')}</Link>
          </div>
        ) : services.map((s: any) => (
          <div key={s.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <Scissors size={16} className="text-brand-900" />
            </div>
            <div className="flex-1">
              {/* Τα πεδία της βάσης λέγονται title και service_type — όχι name
                  και type. Με τα λάθος ονόματα η κάρτα έδειχνε κενό όνομα και
                  σκέτο «· min». Το duration_minutes δεν υπάρχει καν στο Service:
                  η διάρκεια ζει στα πακέτα, οπότε δεν τη δείχνουμε εδώ. */}
              <p className="font-medium text-gray-900 dark:text-white">{s.title || s.provider_name}</p>
              <p className="text-xs text-gray-500">
                {SERVICE_TYPES.find(st => st.value === s.service_type)
                  ? t(SERVICE_TYPES.find(st => st.value === s.service_type)!.labelKey)
                  : s.service_type}
                {s.city ? ` · ${s.city}` : ''}
              </p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{s.price}</p>
            <div className="flex gap-1">
              <Link to="/provider/packages" className="btn-ghost p-2" title={t('providerPkg.title')} aria-label={t('providerPkg.edit')}><Edit size={14} className="text-gray-400"/></Link>
              <button onClick={() => { if(confirm(t('providerDash.confirmDelete'))) deleteService.mutate(s.id) }} className="btn-ghost p-2"><Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────
function ProductsTab() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  // null = νέο προϊόν. Πριν το κουμπί «επεξεργασία» δεν έκανε τίποτα.
  const [editingId, setEditingId] = useState<string | null>(null)
  const EMPTY = { name: '', description: '', price: '', sale_price: '', category: 'food', stock: '0', brand: '', image_url: '' }
  const [form, setForm] = useState(EMPTY)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const openNew = () => { setEditingId(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name ?? '', description: p.description ?? '', price: String(p.price ?? ''),
      sale_price: p.sale_price != null ? String(p.sale_price) : '', category: p.category || 'other',
      stock: String(p.stock ?? 0), brand: p.brand ?? '', image_url: p.image_url || p.images?.[0] || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const price = parseFloat(form.price)
  const sale = form.sale_price.trim() ? parseFloat(form.sale_price) : null
  const valid = !!form.name.trim() && price > 0 && (sale === null || (sale > 0 && sale < price))

  const payload = () => ({
    name: form.name.trim(), description: form.description.trim() || form.name.trim(),
    category: form.category, price, sale_price: sale, stock: parseInt(form.stock) || 0,
    brand: form.brand.trim() || null, image_url: form.image_url || null,
    images: form.image_url ? [form.image_url] : [],
  })

  const saveProduct = useMutation({
    mutationFn: () => editingId ? api.patch(`/products/${editingId}`, payload()) : api.post('/products', payload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-products'] })
      toast.success(editingId ? t('providerEdit.productUpdated') : t('providerDash.productAdded'))
      setShowForm(false); setEditingId(null); setForm(EMPTY)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerEdit.errSave')),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['provider-products'] }); toast.success(t('providerDash.productDeleted')) },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('providerEdit.errSave')),
  })

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post('/upload?folder=products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = r.data?.url || r.data?.file_url
      if (url) setForm(f => ({ ...f, image_url: url }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploading(false) }
  }

  const CATEGORIES = ['food', 'toys', 'accessories', 'health', 'grooming', 'training', 'housing', 'other']
  const label = 'text-xs font-medium text-gray-500 mb-1 block'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{products.length} {t('providerDash.tabProducts')}</p>
        <button onClick={() => (showForm && !editingId ? setShowForm(false) : openNew())} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />{t('providerDash.newProduct')}</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
              {editingId ? t('providerEdit.editProduct') : t('providerDash.newProduct')}
            </h3>
            <div className="flex gap-4 items-start mb-3">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center text-xs text-gray-400 hover:border-brand-300">
                {form.image_url
                  ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="flex flex-col items-center gap-1"><Upload size={18} />{uploading ? t('providerEdit.uploading') : t('providerEdit.addPhoto')}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = '' }} />
              <div className="flex-1 grid grid-cols-1 gap-3">
                <div><label className={label}>{t('providerDash.name')}</label><input className="input" placeholder={t('providerDash.phProduct')} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
                <div><label className={label}>{t('providerEdit.brand')}</label><input className="input" value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={label}>{t('providerDash.category')}</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(`marketplace.categories.${c}`, c)}</option>)}
                </select>
              </div>
              <div><label className={label}>{t('providerDash.priceEur')}</label><input className="input" type="number" step="0.01" placeholder="15.99" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} /></div>
              <div><label className={label}>{t('providerEdit.salePrice')}</label><input className="input" type="number" step="0.01" placeholder="—" value={form.sale_price} onChange={e => setForm(f => ({...f, sale_price: e.target.value}))} /></div>
              <div><label className={label}>{t('providerDash.stock')}</label><input className="input" type="number" placeholder="100" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))} /></div>
              <div className="col-span-2 sm:col-span-4"><label className={label}>{t('providerDash.description')}</label><textarea className="input resize-none" rows={2} placeholder={t('providerDash.phProductDesc')} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            </div>
            {sale !== null && !(sale < price) && <p className="text-xs text-red-500 mt-2">{t('providerEdit.saleTooHigh')}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary flex-1">{t('providerDash.cancel')}</button>
              <button onClick={() => saveProduct.mutate()} disabled={!valid || saveProduct.isPending || uploading} className="btn-primary flex-1">
                {saveProduct.isPending ? t('providerDash.saving') : t('providerDash.save')}
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
            <p className="text-gray-500">{t('providerDash.noProducts')}</p>
            <button onClick={openNew} className="btn-primary mt-4 text-sm">{t('providerDash.addFirstProduct')}</button>
          </div>
        ) : products.map((p: any) => (
          <div key={p.id} className="card p-4 flex items-center gap-4">
            {(p.image_url || p.images?.[0]) ? <img src={p.image_url || p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              : <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-400" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
              <p className="text-xs text-gray-500">{t(`marketplace.categories.${p.category}`, p.category)} · {t('providerDash.stock')}: {p.stock ?? '—'}</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{effectivePrice(p).toFixed(2)}</p>
            <div className="flex gap-1">
              <button onClick={() => openEdit(p)} className="btn-ghost p-2" aria-label={t('providerEdit.editProduct')}><Edit size={14} className="text-gray-400"/></button>
              <button onClick={() => { if(confirm(t('providerDash.confirmDelete'))) deleteProduct.mutate(p.id) }} className="btn-ghost p-2" aria-label={t('providerPkg.delete')}><Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Provider Dashboard ──────────────────────────────────────
export default function ProviderDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const canAccess = user?.role === 'service_provider' || user?.role === 'both' || user?.role === 'admin'

  const { data: stats } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: () => api.get('/provider/stats').then(r => r.data),
    enabled: !!user,
  })

  // Availability for telehealth
  const { data: allMyServices = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })
  const myServices = allMyServices.filter((s: any) => s.service_type === 'veterinary')
  const isVet = myServices.length > 0
  const isAvailableNow = myServices.some((s: any) => s.is_available_now)

  const toggleAvailability = useMutation({
    mutationFn: (is_available: boolean) => api.patch('/telehealth/availability', { is_available }),
    onSuccess: (_, is_available) => {
      // Χωρίς αυτό το κουμπί έμενε στην παλιά κατάσταση μέχρι ανανέωση σελίδας.
      queryClient.invalidateQueries({ queryKey: ['my-services-all'] })
      toast.success(is_available ? t('providerDash.teleOn') : t('providerDash.teleOffMsg'))
    },
    onError: () => toast.error(t('providerDash.errAvailability')),
  })

  // Ο τύπος του παρόχου καθορίζει ποιες καρτέλες βλέπει.
  // Πριν εμφανίζονταν Προϊόντα και Import σε κάθε πάροχο, ακόμα και σε
  // κτηνιατρείο ή walker που δεν πουλάει τίποτα.
  const providerServiceType = allMyServices[0]?.service_type || ''
  const sellsProducts = PRODUCT_TYPES.includes(providerServiceType)
  const isClinic = providerServiceType === 'veterinary'

  useEffect(() => {
    if (!sellsProducts && (activeTab === 'products' || activeTab === 'import')) {
      setActiveTab('overview')
    }
  }, [sellsProducts, activeTab])

  const tabs = [
    { id: 'overview',  label: t('providerDash.tabOverview'), icon: TrendingUp },
    { id: 'services',  label: t('providerDash.tabServices'),  icon: Scissors },
    { id: 'staff',     label: isClinic ? t('providerDash.tabDoctors') : t('providerDash.tabStaff'), icon: Stethoscope },
    ...(sellsProducts ? [{ id: 'products', label: t('providerDash.tabProducts'), icon: Package }] : []),
    { id: 'bookings',  label: t('providerDash.tabBookings'),  icon: Clock },
    { id: 'calendar',  label: t('providerDash.tabCalendar'), icon: Calendar },
    { id: 'marketing',    label: t('providerDash.tabCampaigns'),   icon: Megaphone },
    { id: 'customers',    label: t('providerDash.tabCustomers'),     icon: Users },
    // Κριτικές που έλαβε ο πάροχος, με απάντηση (PATCH /reviews/:id/response).
    { id: 'reviews',      label: t('reviewReply.tab'),                icon: Star },
    { id: 'translations', label: t('providerDash.tabTranslations'), icon: Languages },
    // The insights page existed with no way to reach it.
    ...(sellsProducts ? [{ id: 'insights', label: t('providerDash.tabInsights'), icon: BarChart3 }] : []),
    ...(sellsProducts ? [{ id: 'import', label: 'Import', icon: Upload }] : []),
  ]

  if (!canAccess) return <Navigate to="/" replace />

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Επιστροφή στο site. Στη γραμμή του τίτλου ώστε να είναι ορατή —
              κάτω από τη μπάρα πλοήγησης κρυβόταν. */}
          <Link to="/" title={t('providerDash.backToGlobiPet')}
            className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-brand-900 hover:border-brand-400 dark:hover:text-yellow-400 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-900 font-bold text-lg shrink-0">
            {getInitials(user?.full_name || 'P')}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('providerDash.title')}</h1>
            <p className="text-sm text-gray-500">{user?.full_name} · {user?.email}</p>
          </div>
        </div>

        {/* Telehealth availability toggle — only shown to vets */}
        {isVet && (
          <button
            onClick={() => toggleAvailability.mutate(!isAvailableNow)}
            disabled={toggleAvailability.isPending}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border-2',
              isAvailableNow
                ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-400'
            )}>
            <Video size={16} />
            <span className={cn('w-2 h-2 rounded-full', isAvailableNow ? 'bg-white animate-pulse' : 'bg-gray-400')} />
            {isAvailableNow ? t('providerDash.teleAvailable') : t('providerDash.teleOff')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Γιατροί & προσωπικό */}
      {activeTab === 'staff' && <ProviderStaffPage />}
      {activeTab === 'insights' && <MarketInsights />}

      {/* Μεταφράσεις περιεχομένου παρόχου */}
      {activeTab === 'translations' && <ProviderTranslationsPage />}

      {/* Καμπάνιες και πελάτες */}
      {activeTab === 'marketing' && <ProviderMarketingPage />}
      {activeTab === 'customers' && <ProviderCustomersPage />}
      {activeTab === 'reviews' && <ProviderReviewsPage />}

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Σημερινές πληρωμένες τηλεσυνεδρίες — εδώ καταλήγει και η
              ειδοποίηση incoming_call (/provider/telehealth/:id → /provider/*). */}
          <ProviderTelehealthToday />

          {/* Προσκλήσεις στο προσωπικό ΑΛΛΟΥ παρόχου προς αυτόν τον λογαριασμό
              (αποδοχή/απόρριψη) — κρύβεται όταν δεν υπάρχει καμία. */}
          <StaffInvitationsCard />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('providerDash.totalBookings'), value: stats?.bookings ?? '0', icon: Calendar, color: 'bg-blue-500' },
              { label: t('providerDash.totalRevenue'), value: `€${stats?.revenue ?? '0'}`, icon: TrendingUp, color: 'bg-green-500' },
              { label: t('providerDash.tabServices'), value: stats?.services ?? '0', icon: Scissors, color: 'bg-orange-500' },
              { label: t('providerDash.rating'), value: stats?.rating ?? '—', icon: Star, color: 'bg-yellow-500' },
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('providerDash.quickActions')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: t('providerDash.addService'), tab: 'services' as Tab, icon: Scissors },
                { label: isClinic ? t('providerDash.doctorsStaff') : t('providerDash.tabStaff'), tab: 'staff' as Tab, icon: Stethoscope },
                { label: t('providerDash.tabCampaigns'), tab: 'marketing' as Tab, icon: Megaphone },
                { label: t('providerDash.tabCustomers'), tab: 'customers' as Tab, icon: Users },
                { label: t('providerDash.tabTranslations'), tab: 'translations' as Tab, icon: Languages },
                ...(sellsProducts ? [
                  { label: t('providerDash.addProduct'), tab: 'products' as Tab, icon: Package },
                  { label: t('providerDash.importExcel'), tab: 'import' as Tab, icon: FileSpreadsheet },
                ] : []),
                { label: t('providerDash.tabBookings'), tab: 'bookings' as Tab, icon: Clock },
                { label: t('providerDash.tabCalendar'), tab: 'calendar' as Tab, icon: Calendar },
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
      {activeTab === 'bookings' && <BookingsTab />}
    </div>
  )
}