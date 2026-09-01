import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Filter, ChevronLeft, ChevronRight, Check, X, Ban } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Admin Audit Logs viewer — reads from GET /api/audit/ (admin-only endpoint).
 *
 * Backend supports these filters (all optional):
 *   actor, subject, action, resource, outcome, from, to, limit, offset
 *
 * The endpoint does not return a total count, so pagination shows
 * "next" whenever the current page is full.
 */

interface AuditLog {
  id: string
  action: string
  resource: string
  resource_id: string | null
  actor_email: string | null
  actor_role: string | null
  subject_email: string | null
  outcome: string
  ip: string | null
  metadata: any
  created_at: string
}

const LIMIT = 50

// Known actions — used to populate the filter dropdown. Static because the
// backend does not expose a distinct-actions endpoint.
const KNOWN_ACTIONS = [
  'register', 'login', 'password_reset_request', 'password_reset_complete', 'password_change',
  'profile_update', 'data_export', 'delete_request', 'cancel_delete_request', 'rectify',
  'consent_change',
  'admin_user_create', 'admin_user_update', 'admin_user_delete',
  'template_create', 'template_update', 'template_delete',
  'service_update', 'service_delete', 'package_update', 'package_delete',
  'subprocessor_create', 'subprocessor_update', 'subprocessor_delete',
  'breach_create', 'breach_update', 'breach_delete',
  'read', 'permission_denied',
].sort()

export default function AdminAuditLogPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({
    action: '', resource: '', actor: '', subject: '', outcome: '', from: '', to: '',
  })
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const query = useQuery({
    queryKey: ['admin-audit-logs', filters, offset],
    queryFn: async () => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
      params.set('limit', String(LIMIT))
      params.set('offset', String(offset))
      const { data } = await api.get(`/audit/?${params.toString()}`)
      return data as { data: AuditLog[]; limit: number; offset: number }
    },
  })

  const rows    = query.data?.data ?? []
  const hasNext = rows.length === LIMIT
  const hasPrev = offset > 0

  const applyFilter = (patch: Partial<typeof filters>) => {
    setFilters(f => ({ ...f, ...patch }))
    setOffset(0)
  }

  const clearFilters = () => {
    setFilters({ action: '', resource: '', actor: '', subject: '', outcome: '', from: '', to: '' })
    setOffset(0)
  }

  const outcomeBadge = (o: string) => {
    if (o === 'success') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><Check size={12}/> {o}</span>
    if (o === 'failure') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><X size={12}/> {o}</span>
    if (o === 'blocked' || o === 'denied') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Ban size={12}/> {o}</span>
    return <span className="text-xs text-gray-500">{o}</span>
  }

  return (
    <div className="page-container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          <ScrollText size={20} className="text-brand-900 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('adminAudit.title')}</h1>
          <p className="text-sm text-gray-500">{t('adminAudit.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('adminAudit.filters')}</span>
          <button onClick={clearFilters} className="ml-auto text-xs text-brand-900 dark:text-yellow-400 hover:underline">
            {t('adminAudit.clearFilters')}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select value={filters.action} onChange={e => applyFilter({ action: e.target.value })} className="input text-sm">
            <option value="">{t('adminAudit.action')}: {t('common.all')}</option>
            {KNOWN_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input value={filters.resource} onChange={e => applyFilter({ resource: e.target.value })} placeholder={t('adminAudit.resource')}     className="input text-sm" />
          <input value={filters.actor}    onChange={e => applyFilter({ actor: e.target.value })}    placeholder={t('adminAudit.actorEmail')}   className="input text-sm" />
          <input value={filters.subject}  onChange={e => applyFilter({ subject: e.target.value })}  placeholder={t('adminAudit.subjectEmail')} className="input text-sm" />
          <select value={filters.outcome} onChange={e => applyFilter({ outcome: e.target.value })}  className="input text-sm">
            <option value="">{t('adminAudit.outcome')}: {t('common.all')}</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
            <option value="blocked">blocked</option>
            <option value="denied">denied</option>
          </select>
          <input type="datetime-local" value={filters.from} onChange={e => applyFilter({ from: e.target.value })} className="input text-sm" title={t('adminAudit.from')}/>
          <input type="datetime-local" value={filters.to}   onChange={e => applyFilter({ to: e.target.value })}   className="input text-sm" title={t('adminAudit.to')}/>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{t('adminAudit.timestamp')}</th>
                <th className="px-3 py-2 text-left">{t('adminAudit.action')}</th>
                <th className="px-3 py-2 text-left">{t('adminAudit.resource')}</th>
                <th className="px-3 py-2 text-left">{t('adminAudit.actor')}</th>
                <th className="px-3 py-2 text-left">{t('adminAudit.subject')}</th>
                <th className="px-3 py-2 text-left">{t('adminAudit.outcome')}</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {query.isLoading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
              )}
              {!query.isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">{t('adminAudit.empty')}</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)} className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.action}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{r.resource}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{r.actor_email || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{r.subject_email || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2">{outcomeBadge(r.outcome)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{r.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-xs text-gray-500">
            {t('adminAudit.pageInfo', { from: rows.length === 0 ? 0 : offset + 1, to: offset + rows.length })}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={!hasPrev} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              <ChevronLeft size={14}/>
            </button>
            <button disabled={!hasNext} onClick={() => setOffset(offset + LIMIT)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{selected.action}</h2>
                <p className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18}/>
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {[
                ['ID',                       selected.id],
                [t('adminAudit.action'),     selected.action],
                [t('adminAudit.resource'),   `${selected.resource}${selected.resource_id ? ' · ' + selected.resource_id : ''}`],
                [t('adminAudit.actor'),      `${selected.actor_email || '—'}${selected.actor_role ? ' (' + selected.actor_role + ')' : ''}`],
                [t('adminAudit.subject'),    selected.subject_email || '—'],
                [t('adminAudit.outcome'),    selected.outcome],
                [t('adminAudit.ip'),         selected.ip || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="grid grid-cols-3 gap-3 py-1 border-b border-gray-50 dark:border-gray-800/50">
                  <div className="text-xs text-gray-500">{k}</div>
                  <div className="col-span-2 text-gray-900 dark:text-gray-100 break-all">{String(v)}</div>
                </div>
              ))}
              {selected.metadata && (
                <div className="pt-2">
                  <div className="text-xs text-gray-500 mb-1">metadata</div>
                  <pre className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">{JSON.stringify(selected.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
