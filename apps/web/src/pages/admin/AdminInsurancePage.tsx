import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Trash2, Edit2, Check, X, ArrowLeft, ChevronDown, ChevronRight, Upload, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const TIER_LABELS: Record<string, string> = {
  basic: 'Βασικό', standard: 'Standard', premium: 'Premium', comprehensive: 'Ολοκληρωμένο'
}

export default function AdminInsurancePage() {
  const queryClient = useQueryClient()
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
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
      
      toast.success(`✅ ${providers_created} εταιρείες, ${plans_created} πλάνα εισήχθησαν`)
      if (errors?.length > 0) {
        toast.error(`⚠️ ${errors.length} σφάλματα - δες console`)
        console.error('Import errors:', errors)
      }
      queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Σφάλμα κατά την εισαγωγή')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-insurance-providers'],
    queryFn: () => api.get('/insurance/providers').then(r => r.data?.data ?? []),
  })

  const deleteProvider = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/insurance/providers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); toast.success('Διαγράφηκε') },
    onError: () => toast.error('Σφάλμα διαγραφής'),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/insurance/plans/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); toast.success('Διαγράφηκε') },
    onError: () => toast.error('Σφάλμα διαγραφής'),
  })

  return (
    <div className="page-container py-8 pb-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="btn-ghost p-2"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={22}/> Ασφαλιστικές Εταιρείες
          </h1>
          <p className="text-sm text-gray-500">Διαχείριση ασφαλιστικών εταιρειών και πλάνων</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/templates/GlobiPet_Insurance_Import_Template.xlsx" download
            className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15}/> Template Excel
          </a>
          <label className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={15}/> {importing ? 'Εισαγωγή...' : 'Bulk Import Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} disabled={importing}/>
          </label>
          <button onClick={() => { setEditingProvider(null); setShowProviderModal(true) }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15}/> Νέα Εταιρεία
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full"/>)}</div>
      ) : providers.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Δεν υπάρχουν ασφαλιστικές εταιρείες</h3>
          <button onClick={() => { setEditingProvider(null); setShowProviderModal(true) }}
            className="btn-primary inline-flex items-center gap-2 mt-2">
            <Plus size={15}/> Προσθήκη
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider: any) => (
            <div key={provider.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <button onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                  className="flex items-center gap-3 flex-1 text-left">
                  {provider.logo_url
                    ? <img src={provider.logo_url} alt={provider.name} className="h-10 w-auto object-contain"/>
                    : <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Shield size={18} className="text-brand-900"/></div>
                  }
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{provider.name_el || provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.plans?.length || 0} πλάνα</p>
                  </div>
                  {expandedProvider === provider.id ? <ChevronDown size={16} className="text-gray-400 ml-auto"/> : <ChevronRight size={16} className="text-gray-400 ml-auto"/>}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingProvider(null); setEditingPlan({ provider_id: provider.id }); setShowPlanModal(true) }}
                    className="btn-ghost p-1.5 text-xs flex items-center gap-1 text-brand-900">
                    <Plus size={13}/> Πλάνο
                  </button>
                  <button onClick={() => { setEditingProvider(provider); setShowProviderModal(true) }} className="btn-ghost p-1.5">
                    <Edit2 size={14} className="text-gray-500"/>
                  </button>
                  <button onClick={() => { if (confirm(`Διαγραφή "${provider.name}";`)) deleteProvider.mutate(provider.id) }} className="btn-ghost p-1.5">
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
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name_el || plan.name}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 font-medium">{TIER_LABELS[plan.tier] || plan.tier}</span>
                              {plan.is_featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Featured</span>}
                              {!plan.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Ανενεργό</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">€{plan.price_monthly}/μήνα · {plan.pet_types?.join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingPlan(plan); setShowPlanModal(true) }} className="btn-ghost p-1.5">
                              <Edit2 size={13} className="text-gray-500"/>
                            </button>
                            <button onClick={() => { if (confirm(`Διαγραφή "${plan.name}";`)) deletePlan.mutate(plan.id) }} className="btn-ghost p-1.5">
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

      <ProviderModal open={showProviderModal} onClose={() => { setShowProviderModal(false); setEditingProvider(null) }}
        editing={editingProvider} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowProviderModal(false); setEditingProvider(null) }}/>

      <PlanModal open={showPlanModal} onClose={() => { setShowPlanModal(false); setEditingPlan(null) }}
        editing={editingPlan} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowPlanModal(false); setEditingPlan(null) }}/>
    </div>
  )
}

function ProviderModal({ open, onClose, editing, onSaved }: any) {
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { name: '', name_el: '', website: '', phone: '', email: '', description: '', is_active: true, display_order: 0 })
  }, [open, editing])

  const saveMutation = useMutation({
    mutationFn: () => editing ? api.patch(`/admin/insurance/providers/${editing.id}`, form) : api.post('/admin/insurance/providers', form),
    onSuccess: () => { toast.success(editing ? 'Ενημερώθηκε' : 'Προστέθηκε'); onSaved() },
    onError: () => toast.error('Σφάλμα'),
  })

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{editing ? 'Επεξεργασία Εταιρείας' : 'Νέα Εταιρεία'}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[['name', 'Όνομα (EN) *'], ['name_el', 'Όνομα (ΕΛ)'], ['website', 'Website'], ['phone', 'Τηλέφωνο'], ['email', 'Email'], ['logo_url', 'Logo URL']].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
              <input className="input" value={form[key] || ''} onChange={e => setForm({...form, [key]: e.target.value})}/>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
            <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}/>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/> Ενεργή
          </label>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Άκυρο</button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} className="btn-primary">
            {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlanModal({ open, onClose, editing, onSaved }: any) {
  const [form, setForm] = useState<any>({})
  const { data: providers = [] } = useQuery({
    queryKey: ['admin-insurance-providers'],
    queryFn: () => api.get('/insurance/providers').then(r => r.data?.data ?? []),
  })

  useEffect(() => {
    if (open) setForm(editing ? { ...editing, pet_types: editing.pet_types || [] } : {
      provider_id: '', name: '', name_el: '', tier: 'basic', price_monthly: '',
      price_annual: '', covers_accidents: true, covers_illness: true, covers_surgery: false,
      covers_dental: false, covers_preventive: false, covers_liability: false, covers_death: false,
      annual_limit: '', deductible: '', reimbursement_percent: 80, waiting_period_days: 14,
      pet_types: [], is_active: true, is_featured: false, display_order: 0,
    })
  }, [open, editing])

  const saveMutation = useMutation({
    mutationFn: () => editing && editing.id ? api.patch(`/admin/insurance/plans/${editing.id}`, form) : api.post('/admin/insurance/plans', form),
    onSuccess: () => { toast.success(editing?.id ? 'Ενημερώθηκε' : 'Προστέθηκε'); onSaved() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα'),
  })

  const togglePetType = (type: string) => {
    const types = form.pet_types || []
    setForm({...form, pet_types: types.includes(type) ? types.filter((t: string) => t !== type) : [...types, type]})
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{editing?.id ? 'Επεξεργασία Πλάνου' : 'Νέο Πλάνο'}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Εταιρεία *</label>
            <select className="input" value={form.provider_id || ''} onChange={e => setForm({...form, provider_id: e.target.value})}>
              <option value="">Επιλέξτε εταιρεία</option>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name_el || p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (EN) *</label>
              <input className="input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (ΕΛ)</label>
              <input className="input" value={form.name_el || ''} onChange={e => setForm({...form, name_el: e.target.value})}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία *</label>
              <select className="input" value={form.tier || 'basic'} onChange={e => setForm({...form, tier: e.target.value})}>
                {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">€/μήνα *</label>
              <input type="number" className="input" value={form.price_monthly || ''} onChange={e => setForm({...form, price_monthly: parseFloat(e.target.value)})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">€/χρόνο</label>
              <input type="number" className="input" value={form.price_annual || ''} onChange={e => setForm({...form, price_annual: parseFloat(e.target.value) || null})}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ετήσιο όριο (€)</label>
              <input type="number" className="input" value={form.annual_limit || ''} onChange={e => setForm({...form, annual_limit: parseFloat(e.target.value) || null})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Απαλλαγή (€)</label>
              <input type="number" className="input" value={form.deductible || ''} onChange={e => setForm({...form, deductible: parseFloat(e.target.value) || null})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Αποζημίωση %</label>
              <input type="number" className="input" value={form.reimbursement_percent || ''} onChange={e => setForm({...form, reimbursement_percent: parseInt(e.target.value) || null})}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Κάλυψη</label>
            <div className="flex flex-wrap gap-3">
              {[['covers_accidents','Ατυχήματα'],['covers_illness','Ασθένεια'],['covers_surgery','Χειρουργείο'],
                ['covers_dental','Οδοντιατρείο'],['covers_preventive','Πρόληψη'],['covers_liability','Αστ. ευθύνη'],['covers_death','Θάνατος']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({...form, [key]: e.target.checked})}/> {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Τύποι κατοικιδίων</label>
            <div className="flex gap-3">
              {[['dog','🐕 Σκύλος'],['cat','🐈 Γάτα'],['rabbit','🐇 Κουνέλι'],['bird','🦜 Πτηνό']].map(([type, label]) => (
                <label key={type} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={(form.pet_types||[]).includes(type)} onChange={() => togglePetType(type)}/> {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/> Ενεργό
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})}/> Featured
            </label>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Άκυρο</button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.provider_id || !form.price_monthly} className="btn-primary">
            {saveMutation.isPending ? 'Αποθήκευση...' : (editing?.id ? 'Ενημέρωση' : 'Προσθήκη')}
          </button>
        </div>
      </div>
    </div>
  )
}
