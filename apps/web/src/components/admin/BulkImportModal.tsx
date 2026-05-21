import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  type: 'products' | 'services'
}

const CONFIG = {
  products: {
    title: 'Μαζική Εισαγωγή Προϊόντων',
    endpoint: '/admin/bulk-import/products',
    queryKey: 'admin-products',
    templateUrl: '/templates/products_template.xlsx',
    templateName: 'products_template.xlsx',
    required: ['name', 'price', 'category'],
  },
  services: {
    title: 'Μαζική Εισαγωγή Υπηρεσιών',
    endpoint: '/admin/bulk-import/services',
    queryKey: 'admin-services',
    templateUrl: '/templates/services_template.xlsx',
    templateName: 'services_template.xlsx',
    required: ['provider_name', 'provider_email', 'service_type', 'city'],
  },
}

export default function BulkImportModal({ open, onClose, type }: Props) {
  const queryClient = useQueryClient()
  const cfg = CONFIG[type]
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<any[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null); setParsed([]); setParseErrors([]); setResult(null)
    }
  }, [open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleFile = async (f: File) => {
    setFile(f)
    setParsed([])
    setParseErrors([])
    setResult(null)

    try {
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      // Use first sheet
      const sheet = wb.Sheets[wb.SheetNames[0]]

      // Row 1 = keys (machine-readable), Row 2 = labels (skip), Row 3+ = data
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
      if (rows.length < 3) {
        setParseErrors(['Το αρχείο δεν περιέχει δεδομένα. Συμπληρώστε γραμμές από τη γραμμή 3.'])
        return
      }

      const keys = rows[0].map(k => String(k).trim())
      const dataRows = rows.slice(2)  // Skip header (row 1) and label (row 2)

      const items: any[] = []
      const errors: string[] = []

      dataRows.forEach((row, idx) => {
        // Skip empty rows
        if (row.every(c => !c || String(c).trim() === '')) return

        const obj: any = {}
        keys.forEach((key, i) => {
          const val = row[i]
          if (val !== '' && val !== null && val !== undefined) {
            obj[key] = val
          }
        })

        // Validate required
        const missing = cfg.required.filter(r => !obj[r] && obj[r] !== 0)
        if (missing.length > 0) {
          errors.push(`Γραμμή ${idx + 3}: Λείπουν τα πεδία: ${missing.join(', ')}`)
        } else {
          items.push(obj)
        }
      })

      setParsed(items)
      setParseErrors(errors)

      if (items.length === 0 && errors.length === 0) {
        setParseErrors(['Δεν βρέθηκαν δεδομένα στο αρχείο'])
      }
    } catch (err: any) {
      setParseErrors(['Δεν μπόρεσα να διαβάσω το αρχείο: ' + err.message])
    }
  }

  const importData = useMutation({
    mutationFn: () => api.post(cfg.endpoint, { items: parsed }).then(r => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: [cfg.queryKey] })
      if (data.failed === 0) {
        toast.success(`Εισήχθησαν ${data.created} εγγραφές επιτυχώς!`)
      } else {
        toast.success(`Εισήχθησαν ${data.created} εγγραφές, ${data.failed} απέτυχαν`)
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Σφάλμα κατά την εισαγωγή'),
  })

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = cfg.templateUrl
    link.download = cfg.templateName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cfg.title}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Step 1: Download template */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Κατεβάστε το template</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Συμπληρώστε το Excel αρχείο με τα δεδομένα σας. Δείτε τις οδηγίες στο 2ο sheet.
                  </p>
                  <button onClick={downloadTemplate} className="btn-secondary text-xs flex items-center gap-1.5">
                    <Download size={14}/> Κατέβασμα Template
                  </button>
                </div>
              </div>

              {/* Step 2: Upload file */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Ανέβασμα συμπληρωμένου Excel</p>
                    <p className="text-xs text-gray-500 mb-3">.xlsx, .xls, ή .csv</p>

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                    <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs flex items-center gap-1.5">
                      <Upload size={14}/> {file ? 'Αλλαγή αρχείου' : 'Επιλογή αρχείου'}
                    </button>
                    {file && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-600"/>
                    <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Σφάλματα στο αρχείο</p>
                  </div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                    {parseErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {parseErrors.length > 10 && <li>...και άλλα {parseErrors.length - 10}</li>}
                  </ul>
                </div>
              )}

              {/* Parsed preview */}
              {parsed.length > 0 && !result && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600"/>
                    <p className="font-semibold text-green-700 dark:text-green-400 text-sm">
                      Βρέθηκαν {parsed.length} εγγραφές έτοιμες για εισαγωγή
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Πατήστε "Εισαγωγή" για να τις προσθέσετε στη βάση.
                  </p>
                </div>
              )}

              {/* Import result */}
              {result && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{result.created}</p>
                      <p className="text-xs text-gray-500">Επιτυχείς</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                      <p className="text-xs text-gray-500">Αποτυχίες</p>
                    </div>
                  </div>
                  {result.errors?.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Σφάλματα:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {result.errors.map((e: any, i: number) => (
                          <li key={i}>• Γραμμή {e.row}: {e.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-secondary">
                {result ? 'Κλείσιμο' : 'Ακύρωση'}
              </button>
              {!result && parsed.length > 0 && (
                <button onClick={() => importData.mutate()} disabled={importData.isPending} className="btn-primary flex items-center gap-2">
                  {importData.isPending ? <><Loader2 size={16} className="animate-spin"/>Εισαγωγή...</> : <><Upload size={16}/>Εισαγωγή {parsed.length} εγγραφών</>}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
