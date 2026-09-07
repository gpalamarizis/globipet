import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck, Clock, X, Check, Globe, Phone, MapPin, Briefcase, Building2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

/**
 * Αιτήσεις επαλήθευσης παρόχων.
 *
 * Η οθόνη στο mobile έστελνε αιτήσεις σε endpoint που δεν υπήρχε — κάθε
 * πάροχος που συμπλήρωσε ΑΦΜ και βιογραφικό πήρε σφάλμα και η αίτηση
 * χάθηκε. Τώρα φτάνουν εδώ.
 */

const STATUS = {
  pending:  { label: 'Εκκρεμεί',    cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Εγκρίθηκε',   cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Απορρίφθηκε', cls: 'bg-red-100 text-red-700' },
} as const

export default function AdminVerificationsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [reviewing, setReviewing] = useState<any>(null)
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verifications', filter],
    queryFn: () => api.get('/admin/verifications', {
      params: filter ? { status: filter } : {},
    }).then(r => r.data),
  })

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api.patch(`/admin/verifications/${id}`, { status, review_notes: notes.trim() || undefined }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-verifications'] })
      setReviewing(null)
      setNotes('')
      toast.success(v.status === 'approved' ? 'Ο πάροχος επαληθεύτηκε' : 'Η αίτηση απορρίφθηκε')
    },
    onError: (err: any) => toast.error(err?.message || 'Κάτι πήγε στραβά'),
  })

  const rows = data?.data ?? []

  if (isLoading) return (
    <div className="page-container py-16 flex justify-center"><LoadingSpinner /></div>
  )

  return (
    <div className="page-container py-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              Επαληθεύσεις παρόχων
            </h1>
            <p className="text-sm text-gray-500">
              {data?.pending ?? 0} εκκρεμείς αιτήσεις
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {[
            { v: 'pending',  l: 'Εκκρεμείς' },
            { v: 'approved', l: 'Εγκεκριμένες' },
            { v: 'rejected', l: 'Απορριφθείσες' },
            { v: '',         l: 'Όλες' },
          ].map(f => (
            <button key={f.v || 'all'} onClick={() => setFilter(f.v as any)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f.v
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500')}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldCheck size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Καμία αίτηση σε αυτή την κατηγορία</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => {
            const st = (STATUS as any)[r.status] ?? STATUS.pending
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{r.full_name}</h3>
                    <p className="text-sm text-gray-500">{r.user_email}</p>
                  </div>
                  <span className={cn('badge text-xs shrink-0', st.cls)}>{st.label}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {r.business_name && (
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-400" />{r.business_name}
                    </span>
                  )}
                  {r.tax_number && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-gray-400" />ΑΦΜ {r.tax_number}
                    </span>
                  )}
                  {r.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />{r.city}
                    </span>
                  )}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-brand-900">
                      <Phone size={14} className="text-gray-400" />{r.phone}
                    </a>
                  )}
                  {r.years_experience != null && (
                    <span className="flex items-center gap-1.5">
                      ⏳ {r.years_experience} χρόνια εμπειρίας
                    </span>
                  )}
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-brand-900 hover:underline">
                      <Globe size={14} />Ιστοσελίδα
                    </a>
                  )}
                </div>

                {r.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {r.specializations.map((sp: string) => (
                      <span key={sp} className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {sp}
                      </span>
                    ))}
                  </div>
                )}

                {r.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-3">
                    {r.bio}
                  </p>
                )}

                {r.review_notes && (
                  <p className="text-xs text-gray-500 border-l-2 border-gray-200 dark:border-gray-700 pl-3 mb-3">
                    <strong>Σημείωση:</strong> {r.review_notes}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(r.created_at).toLocaleDateString('el-GR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                    {r.reviewed_by && ` · έλεγχος από ${r.reviewed_by}`}
                  </span>

                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setReviewing({ ...r, action: 'rejected' }); setNotes('') }}
                        className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1.5">
                        <X size={14} /> Απόρριψη
                      </button>
                      <button
                        onClick={() => review.mutate({ id: r.id, status: 'approved' })}
                        disabled={review.isPending}
                        className="btn-primary text-sm inline-flex items-center gap-1.5">
                        <Check size={14} /> Έγκριση
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Η απόρριψη ζητά λόγο — ο πάροχος τον λαμβάνει και ξέρει τι να
          διορθώσει. Μια απόρριψη χωρίς εξήγηση δεν βοηθά κανέναν. */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setReviewing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">
              Απόρριψη αίτησης
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Ο λόγος στέλνεται στον {reviewing.full_name}.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="π.χ. Το ΑΦΜ δεν αντιστοιχεί στην επωνυμία"
              className="input w-full" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReviewing(null)} className="btn-secondary text-sm">
                Άκυρο
              </button>
              <button
                onClick={() => review.mutate({ id: reviewing.id, status: 'rejected' })}
                disabled={review.isPending}
                className="btn-primary text-sm bg-red-600 hover:bg-red-700">
                {review.isPending ? 'Αποστολή…' : 'Απόρριψη'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
