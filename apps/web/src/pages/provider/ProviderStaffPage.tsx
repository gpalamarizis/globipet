import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Edit3, Trash2, Mail, Check, Clock, X, Save } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * Provider staff management — the employer's view of "my team".
 *
 * BACKEND
 *   GET    /api/staff/mine        list of all staff across all my services
 *   POST   /api/staff             add staff to a specific service
 *   PATCH  /api/staff/:id         update
 *   DELETE /api/staff/:id         remove (bookings stay, just lose staff link)
 *
 * AUTO-LINK
 *   When adding a staff member we only need their email + name. As soon as
 *   that person registers (or logs in) with the same email, their user
 *   account is linked to this staff record automatically — no follow-up
 *   step from the employer. The `has_account` flag in the row tells us
 *   whether the link has happened yet.
 */

type StaffRow = {
  id: string
  service_id: string
  full_name: string
  email?: string
  title?: string
  license_number?: string
  phone?: string
  specialties?: string[]
  is_active: boolean
  has_account: boolean
  bookings_count: number
}

type Service = { id: string; title: string; service_type: string }

const TITLE_OPTIONS = [
  { value: '',       labelKey: 'providerStaff.titles.none' },
  { value: 'dr',     labelKey: 'providerStaff.titles.dr' },
  { value: 'md',     labelKey: 'providerStaff.titles.md' },
  { value: 'dvm',    labelKey: 'providerStaff.titles.dvm' },
  { value: 'nurse',  labelKey: 'providerStaff.titles.nurse' },
  { value: 'tech',   labelKey: 'providerStaff.titles.tech' },
  { value: 'other',  labelKey: 'providerStaff.titles.other' },
]

export default function ProviderStaffPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [editing, setEditing] = useState<StaffRow | 'new' | null>(null)

  // Load the provider's own services so we can group staff and let the
  // employer pick which service a new member belongs to.
  const servicesQuery = useQuery({
    queryKey: ['my-services'],
    queryFn: () => api.get('/services/my').then(r => (r.data?.data ?? []) as Service[]),
  })

  const staffQuery = useQuery({
    queryKey: ['staff-mine'],
    queryFn: () => api.get('/staff/mine').then(r => (r.data?.data ?? []) as StaffRow[]),
  })

  const rows = useMemo(() => {
    const all = staffQuery.data ?? []
    return serviceFilter === 'all' ? all : all.filter(r => r.service_id === serviceFilter)
  }, [staffQuery.data, serviceFilter])

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      toast.success(t('common.deleted'))
      qc.invalidateQueries({ queryKey: ['staff-mine'] })
    },
    onError: () => toast.error(t('common.error')),
  })

  const serviceName = (id: string) =>
    servicesQuery.data?.find(s => s.id === id)?.title ?? id.slice(0, 8)

  return (
    <div className="page-container py-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Users size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {t('providerStaff.title')}
            </h1>
            <p className="text-sm text-gray-500">{t('providerStaff.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          disabled={!servicesQuery.data?.length}
          className="btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus size={16}/>
          {t('providerStaff.add')}
        </button>
      </div>

      {/* Empty state — no services */}
      {servicesQuery.data && !servicesQuery.data.length && (
        <div className="card p-6 text-center text-gray-500">
          {t('providerStaff.noServices')}
        </div>
      )}

      {/* Service filter */}
      {servicesQuery.data && servicesQuery.data.length > 1 && (
        <div className="mb-4">
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="input text-sm">
            <option value="all">{t('providerStaff.allServices')}</option>
            {servicesQuery.data.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Staff list */}
      {servicesQuery.data && servicesQuery.data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">{t('providerStaff.name')}</th>
                  <th className="px-3 py-2 text-left">{t('providerStaff.email')}</th>
                  <th className="px-3 py-2 text-left">{t('providerStaff.service')}</th>
                  <th className="px-3 py-2 text-left">{t('providerStaff.status')}</th>
                  <th className="px-3 py-2 text-right">{t('providerStaff.bookings')}</th>
                  <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {staffQuery.isLoading && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
                )}
                {!staffQuery.isLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">{t('providerStaff.empty')}</td></tr>
                )}
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-white">{r.full_name}</div>
                      {r.title && <div className="text-xs text-gray-500 uppercase">{r.title}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {r.email ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                      {serviceName(r.service_id)}
                    </td>
                    <td className="px-3 py-2">
                      {r.has_account ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                          <Check size={12}/> {t('providerStaff.linked')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                          <Clock size={12}/> {t('providerStaff.pending')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                      {r.bookings_count}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button onClick={() => setEditing(r)} className="text-gray-500 hover:text-brand-900 p-1">
                        <Edit3 size={14}/>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('providerStaff.confirmDelete', { name: r.full_name }))) del.mutate(r.id)
                        }}
                        className="text-gray-500 hover:text-red-600 p-1">
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor modal */}
      {editing !== null && servicesQuery.data && (
        <StaffEditor
          staff={editing === 'new' ? null : editing}
          services={servicesQuery.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['staff-mine'] })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Editor modal ─────────────────────────────────────────────────────

function StaffEditor({
  staff, services, onClose, onSaved,
}: {
  staff: StaffRow | null
  services: Service[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const isNew = !staff
  const [form, setForm] = useState({
    service_id: staff?.service_id ?? services[0]?.id ?? '',
    full_name: staff?.full_name ?? '',
    email: staff?.email ?? '',
    title: staff?.title ?? '',
    license_number: staff?.license_number ?? '',
    phone: staff?.phone ?? '',
    specialties: (staff?.specialties ?? []).join(', '),
    is_active: staff?.is_active ?? true,
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        title: form.title || undefined,
        license_number: form.license_number.trim() || undefined,
        phone: form.phone.trim() || undefined,
        specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
        is_active: form.is_active,
      }
      if (isNew) {
        payload.service_id = form.service_id
        return api.post('/staff', payload)
      }
      return api.patch(`/staff/${staff!.id}`, payload)
    },
    onSuccess: () => {
      toast.success(t('common.saved'))
      onSaved()
    },
    onError: () => toast.error(t('common.error')),
  })

  const setField = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isNew ? t('providerStaff.addTitle') : t('providerStaff.editTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {isNew && services.length > 1 && (
            <Field label={t('providerStaff.service')}>
              <select value={form.service_id} onChange={e => setField('service_id', e.target.value)} className="input w-full">
                {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </Field>
          )}

          <Field label={t('providerStaff.nameLabel')} required>
            <input value={form.full_name} onChange={e => setField('full_name', e.target.value)} className="input w-full" />
          </Field>

          <Field
            label={t('providerStaff.emailLabel')}
            hint={t('providerStaff.emailHint')}>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                     className="input w-full pl-8" placeholder="staff@example.com" />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('providerStaff.titleLabel')}>
              <select value={form.title} onChange={e => setField('title', e.target.value)} className="input w-full">
                {TITLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
            </Field>
            <Field label={t('providerStaff.licenseLabel')}>
              <input value={form.license_number} onChange={e => setField('license_number', e.target.value)} className="input w-full" />
            </Field>
          </div>

          <Field label={t('providerStaff.phoneLabel')}>
            <input value={form.phone} onChange={e => setField('phone', e.target.value)} className="input w-full" />
          </Field>

          <Field label={t('providerStaff.specialtiesLabel')} hint={t('providerStaff.specialtiesHint')}>
            <input value={form.specialties} onChange={e => setField('specialties', e.target.value)} className="input w-full" />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} />
            {t('providerStaff.isActive')}
          </label>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.full_name.trim() || (isNew && !form.service_id)}
            className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Save size={14}/> {save.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: any }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
