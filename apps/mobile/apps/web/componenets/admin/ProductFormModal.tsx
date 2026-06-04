import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Package, Save } from 'lucide-react'
import ImageUploadField from '@/components/admin/ImageUploadField'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  product?: any  // For edit mode
}

const CATEGORIES = [
  { value: 'food',        label: 'Τροφές 🦴' },
  { value: 'toys',        label: 'Παιχνίδια 🎾' },
  { value: 'accessories', label: 'Αξεσουάρ 🎀' },
  { value: 'health',      label: 'Υγεία 💊' },
  { value: 'grooming',    label: 'Grooming ✂️' },
  { value: 'training',    label: 'Εκπαίδευση 🎓' },
  { value: 'housing',     label: 'Κατοικία 🏠' },
]

const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'horse']

export default function ProductFormModal({ open, onClose, product }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!product?.id

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'food', brand: '',
    stock: '0', image_url: '', target_species: [] as string[],
    is_featured: false, discount_percentage: '', sale_price: '',
  })

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        category: product.category || 'food',
        brand: product.brand || '',
        stock: String(product.stock || 0),
        image_url: product.image_url || '',
        target_species: product.target_species || [],
        is_featured: !!product.is_featured,
        discount_percentage: String(product.discount_percentage || ''),
        sale_price: String(product.sale_price || ''),
      })
    } else {
      setForm({
        name: '', description: '', price: '', category: 'food', brand: '',
        stock: '0', image_url: '', target_species: [],
        is_featured: false, discount_percentage: '', sale_price: '',
      })
    }
  }, [product, open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const save = useMutation({
    mutationFn: () => {
      const data: any = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        brand: form.brand || undefined,
        stock: parseInt(form.stock) || 0,
        image_url: form.image_url || undefined,
        target_species: form.target_species,
        is_featured: form.is_featured,
      }
      if (form.discount_percentage) data.discount_percentage = parseInt(form.discount_percentage)
      if (form.sale_price) data.sale_price = parseFloat(form.sale_price)
      return isEdit
        ? api.patch(`/products/${product.id}`, data)
        : api.post('/products', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success(isEdit ? 'Το προϊόν ενημερώθηκε' : 'Το προϊόν προστέθηκε')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Σφάλμα'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Το όνομα είναι υποχρεωτικό')
    if (!form.price || isNaN(parseFloat(form.price))) return toast.error('Μη έγκυρη τιμή')
    save.mutate()
  }

  const toggleSpecies = (s: string) => {
    setForm(f => ({
      ...f,
      target_species: f.target_species.includes(s)
        ? f.target_species.filter(x => x !== s)
        : [...f.target_species, s]
    }))
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
                <Package size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isEdit ? 'Επεξεργασία Προϊόντος' : 'Νέο Προϊόν'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Περιγραφή</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή (€) *</label>
                  <input type="number" step="0.01" className="input" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Κατηγορία *</label>
                  <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Μάρκα</label>
                  <input className="input" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Απόθεμα</label>
                  <input type="number" className="input" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              </div>

              <ImageUploadField
                label="Εικόνα προϊόντος"
                value={form.image_url}
                onChange={(url) => setForm({...form, image_url: url})}
                folder="products"
              />

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδος ζώου (multiple)</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpecies(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.target_species.includes(s)
                          ? 'bg-brand-900 text-white border-brand-900'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Έκπτωση %</label>
                  <input type="number" min="0" max="100" className="input" value={form.discount_percentage} onChange={e => setForm({...form, discount_percentage: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή Προσφοράς (€)</label>
                  <input type="number" step="0.01" className="input" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Προτεινόμενο προϊόν (Featured)</span>
              </label>
            </form>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-secondary">Ακύρωση</button>
              <button onClick={handleSubmit} disabled={save.isPending} className="btn-primary flex items-center gap-2">
                <Save size={16}/>{save.isPending ? 'Αποθήκευση...' : (isEdit ? 'Ενημέρωση' : 'Δημιουργία')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
