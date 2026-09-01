import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Users, AlertTriangle, Plus, Edit3, Trash2, X, Check, CircleDot } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * Admin Governance page — two tabs:
 *   • Subprocessors (Art. 28 DPA tracker)
 *   • Breach Incidents (Art. 33/34 log)
 *
 * Backend: /api/admin/governance/{subprocessors|breaches}
 */

type Tab = 'subprocessors' | 'breaches'

interface Subprocessor {
  id: string
  name: string
  purpose: string
  data_categories: string[]
  region: string | null
  transfer_mechanism: string | null
  dpa_status: 'pending' | 'signed' | 'not_required' | 'expired'
  dpa_signed_at: string | null
  dpa_expires_at: string | null
  dpa_url: string | null
  contact_email: string | null
  website: string | null
  is_active: boolean
  notes: string | null
}

interface BreachIncident {
  id: string
  reference: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'notified' | 'closed'
  detected_at: string
  confirmed_at: string | null
  contained_at: string | null
  root_cause: string | null
  affected_data_categories: string[]
  affected_user_count: number | null
  supervisory_notified: boolean
  supervisory_notified_at: string | null
  data_subjects_notified: boolean
  data_subjects_notified_at: string | null
  notification_method: string | null
  reporter_email: string
  remediation_actions: string | null
  lessons_learned: string | null
  attachments_url: string | null
}

const dpaStatusBadge = (s: string) => {
  const map: Record<string, string> = {
    signed:       'bg-emerald-100 text-emerald-700',
    pending:      'bg-amber-100 text-amber-700',
    not_required: 'bg-gray-100 text-gray-700',
    expired:      'bg-rose-100 text-rose-700',
  }
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>
}

const severityBadge = (s: string) => {
  const map: Record<string, string> = {
    low:      'bg-emerald-100 text-emerald-700',
    medium:   'bg-amber-100 text-amber-700',
    high:     'bg-orange-100 text-orange-700',
    critical: 'bg-rose-100 text-rose-700',
  }
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    open:          'bg-rose-100 text-rose-700',
    investigating: 'bg-amber-100 text-amber-700',
    contained:     'bg-blue-100 text-blue-700',
    notified:      'bg-purple-100 text-purple-700',
    closed:        'bg-emerald-100 text-emerald-700',
  }
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${map[s] || 'bg-gray-100 text-gray-700'}`}><CircleDot size={10}/> {s}</span>
}

export default function AdminGovernancePage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('subprocessors')
  const [editingSubproc,   setEditingSubproc]   = useState<Partial<Subprocessor> | null>(null)
  const [editingBreach,    setEditingBreach]    = useState<Partial<BreachIncident> | null>(null)
  const qc = useQueryClient()

  // ─── SUBPROCESSORS ────────────────────────────────────────────

  const subprocsQuery = useQuery({
    queryKey: ['admin-subprocessors'],
    queryFn: () => api.get('/admin/governance/subprocessors').then(r => r.data.data as Subprocessor[]),
    enabled: tab === 'subprocessors',
  })

  const saveSubproc = useMutation({
    mutationFn: (payload: Partial<Subprocessor>) =>
      payload.id
        ? api.patch(`/admin/governance/subprocessors/${payload.id}`, payload).then(r => r.data.data)
        : api.post('/admin/governance/subprocessors', payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subprocessors'] })
      toast.success(t('common.saved'))
      setEditingSubproc(null)
    },
    onError: () => toast.error(t('common.error')),
  })

  const deleteSubproc = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/governance/subprocessors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subprocessors'] })
      toast.success(t('common.deleted'))
    },
  })

  // ─── BREACHES ─────────────────────────────────────────────────

  const breachesQuery = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: () => api.get('/admin/governance/breaches').then(r => r.data.data as BreachIncident[]),
    enabled: tab === 'breaches',
  })

  const saveBreach = useMutation({
    mutationFn: (payload: Partial<BreachIncident>) =>
      payload.id
        ? api.patch(`/admin/governance/breaches/${payload.id}`, payload).then(r => r.data.data)
        : api.post('/admin/governance/breaches', payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-breaches'] })
      toast.success(t('common.saved'))
      setEditingBreach(null)
    },
    onError: () => toast.error(t('common.error')),
  })

  return (
    <div className="page-container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          <ShieldCheck size={20} className="text-brand-900 dark:text-yellow-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('adminGovernance.title')}</h1>
          <p className="text-sm text-gray-500">{t('adminGovernance.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab('subprocessors')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${tab === 'subprocessors' ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <Users size={16}/> {t('adminGovernance.subprocessors')}
        </button>
        <button onClick={() => setTab('breaches')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${tab === 'breaches' ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <AlertTriangle size={16}/> {t('adminGovernance.breaches')}
        </button>
      </div>

      {/* ─── SUBPROCESSORS TAB ─── */}
      {tab === 'subprocessors' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setEditingSubproc({ dpa_status: 'pending', is_active: true, data_categories: [] })} className="btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14}/> {t('adminGovernance.addSubprocessor')}
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.name')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.purpose')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.region')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.dpaStatus')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.active')}</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subprocsQuery.isLoading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('common.loading')}</td></tr>}
                  {subprocsQuery.data?.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('common.empty')}</td></tr>}
                  {subprocsQuery.data?.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{s.purpose}</td>
                      <td className="px-3 py-2 text-gray-500">{s.region || '—'}</td>
                      <td className="px-3 py-2">{dpaStatusBadge(s.dpa_status)}</td>
                      <td className="px-3 py-2">{s.is_active ? <Check size={16} className="text-emerald-600"/> : <X size={16} className="text-gray-400"/>}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingSubproc(s)} className="text-gray-500 hover:text-brand-900 p-1"><Edit3 size={14}/></button>
                        <button onClick={() => { if (confirm(t('common.confirmDelete'))) deleteSubproc.mutate(s.id) }} className="text-gray-500 hover:text-rose-600 p-1 ml-1"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── BREACHES TAB ─── */}
      {tab === 'breaches' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setEditingBreach({ severity: 'low', status: 'open', detected_at: new Date().toISOString().slice(0,16), affected_data_categories: [] })} className="btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14}/> {t('adminGovernance.addBreach')}
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Ref</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.title2')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.severity')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.status')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.detectedAt')}</th>
                    <th className="px-3 py-2 text-left">{t('adminGovernance.affected')}</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {breachesQuery.isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('common.loading')}</td></tr>}
                  {breachesQuery.data?.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('common.empty')}</td></tr>}
                  {breachesQuery.data?.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{b.reference}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{b.title}</td>
                      <td className="px-3 py-2">{severityBadge(b.severity)}</td>
                      <td className="px-3 py-2">{statusBadge(b.status)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(b.detected_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{b.affected_user_count ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingBreach(b)} className="text-gray-500 hover:text-brand-900 p-1"><Edit3 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subprocessor edit modal */}
      {editingSubproc && (
        <SubprocessorEditor
          value={editingSubproc}
          onCancel={() => setEditingSubproc(null)}
          onSave={p => saveSubproc.mutate(p)}
          t={t}
        />
      )}

      {/* Breach edit modal */}
      {editingBreach && (
        <BreachEditor
          value={editingBreach}
          onCancel={() => setEditingBreach(null)}
          onSave={p => saveBreach.mutate(p)}
          t={t}
        />
      )}
    </div>
  )
}

// ─── Editors ──────────────────────────────────────────────────

function SubprocessorEditor({ value, onCancel, onSave, t }: any) {
  const [f, setF] = useState<Partial<Subprocessor>>(value)
  const set = (patch: Partial<Subprocessor>) => setF(prev => ({ ...prev, ...patch }))
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">{f.id ? t('adminGovernance.editSubprocessor') : t('adminGovernance.addSubprocessor')}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <input placeholder={t('adminGovernance.name')}    value={f.name || ''}    onChange={e => set({ name: e.target.value })}    className="input w-full"/>
          <input placeholder={t('adminGovernance.purpose')} value={f.purpose || ''} onChange={e => set({ purpose: e.target.value })} className="input w-full"/>
          <input placeholder={t('adminGovernance.dataCategories') + ' (comma-separated)'} value={(f.data_categories || []).join(', ')} onChange={e => set({ data_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="input w-full"/>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder={t('adminGovernance.region')} value={f.region || ''}             onChange={e => set({ region: e.target.value })}             className="input"/>
            <input placeholder="SCC / DPF / N/A"             value={f.transfer_mechanism || ''} onChange={e => set({ transfer_mechanism: e.target.value })} className="input"/>
          </div>
          <select value={f.dpa_status || 'pending'} onChange={e => set({ dpa_status: e.target.value as any })} className="input w-full">
            <option value="pending">pending</option>
            <option value="signed">signed</option>
            <option value="not_required">not_required</option>
            <option value="expired">expired</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" placeholder="DPA signed" value={f.dpa_signed_at?.slice(0,10)  || ''} onChange={e => set({ dpa_signed_at:  e.target.value || null })} className="input"/>
            <input type="date" placeholder="DPA expires" value={f.dpa_expires_at?.slice(0,10) || ''} onChange={e => set({ dpa_expires_at: e.target.value || null })} className="input"/>
          </div>
          <input placeholder="DPA URL"       value={f.dpa_url || ''}       onChange={e => set({ dpa_url: e.target.value })}       className="input w-full"/>
          <input placeholder="Contact email" value={f.contact_email || ''} onChange={e => set({ contact_email: e.target.value })} className="input w-full"/>
          <input placeholder="Website"       value={f.website || ''}       onChange={e => set({ website: e.target.value })}       className="input w-full"/>
          <textarea placeholder={t('adminGovernance.notes')} value={f.notes || ''} onChange={e => set({ notes: e.target.value })} className="input w-full h-20"/>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.is_active} onChange={e => set({ is_active: e.target.checked })}/>
            <span>{t('adminGovernance.active')}</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onCancel} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button onClick={() => onSave(f)} className="btn-primary text-sm">{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}

function BreachEditor({ value, onCancel, onSave, t }: any) {
  const [f, setF] = useState<Partial<BreachIncident>>(value)
  const set = (patch: Partial<BreachIncident>) => setF(prev => ({ ...prev, ...patch }))
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">{f.id ? t('adminGovernance.editBreach') : t('adminGovernance.addBreach')}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Reference (e.g. GP-2026-001)" value={f.reference || ''} onChange={e => set({ reference: e.target.value })} className="input"/>
            <input placeholder={t('adminGovernance.reporterEmail')} value={f.reporter_email || ''} onChange={e => set({ reporter_email: e.target.value })} className="input"/>
          </div>
          <input placeholder={t('adminGovernance.title2')} value={f.title || ''} onChange={e => set({ title: e.target.value })} className="input w-full"/>
          <textarea placeholder={t('adminGovernance.description')} value={f.description || ''} onChange={e => set({ description: e.target.value })} className="input w-full h-24"/>
          <div className="grid grid-cols-2 gap-2">
            <select value={f.severity || 'low'} onChange={e => set({ severity: e.target.value as any })} className="input">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <select value={f.status || 'open'} onChange={e => set({ status: e.target.value as any })} className="input">
              <option value="open">open</option>
              <option value="investigating">investigating</option>
              <option value="contained">contained</option>
              <option value="notified">notified</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-gray-500 col-span-3 -mb-1">{t('adminGovernance.timeline')}</label>
            <input type="datetime-local" title="Detected"  value={f.detected_at?.slice(0,16)  || ''} onChange={e => set({ detected_at: e.target.value })} className="input"/>
            <input type="datetime-local" title="Confirmed" value={f.confirmed_at?.slice(0,16) || ''} onChange={e => set({ confirmed_at: e.target.value || null })} className="input"/>
            <input type="datetime-local" title="Contained" value={f.contained_at?.slice(0,16) || ''} onChange={e => set({ contained_at: e.target.value || null })} className="input"/>
          </div>
          <textarea placeholder={t('adminGovernance.rootCause')} value={f.root_cause || ''} onChange={e => set({ root_cause: e.target.value })} className="input w-full h-16"/>
          <input placeholder={t('adminGovernance.affectedCategories') + ' (comma-separated)'} value={(f.affected_data_categories || []).join(', ')} onChange={e => set({ affected_data_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="input w-full"/>
          <input type="number" placeholder={t('adminGovernance.affectedCount')} value={f.affected_user_count ?? ''} onChange={e => set({ affected_user_count: e.target.value ? parseInt(e.target.value) : null })} className="input w-full"/>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.supervisory_notified}   onChange={e => set({ supervisory_notified: e.target.checked })}/>
              <span>{t('adminGovernance.supervisoryNotified')}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.data_subjects_notified} onChange={e => set({ data_subjects_notified: e.target.checked })}/>
              <span>{t('adminGovernance.subjectsNotified')}</span>
            </label>
          </div>
          <textarea placeholder={t('adminGovernance.remediation')}   value={f.remediation_actions || ''} onChange={e => set({ remediation_actions: e.target.value })} className="input w-full h-16"/>
          <textarea placeholder={t('adminGovernance.lessonsLearned')} value={f.lessons_learned || ''}    onChange={e => set({ lessons_learned: e.target.value })}    className="input w-full h-16"/>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onCancel} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button onClick={() => onSave(f)} className="btn-primary text-sm">{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}
