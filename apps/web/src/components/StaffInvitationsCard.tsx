import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { UserPlus, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

/**
 * Προσκλήσεις στο προσωπικό ενός παρόχου (GET /staff/invitations).
 *
 * Ο πάροχος προσθέτει μέλος με το email του χρήστη· η σύνδεση γίνεται ΜΟΝΟ
 * όταν ο χρήστης την αποδεχθεί εδώ (POST /staff/:id/accept). Η απόρριψη
 * (POST /staff/:id/decline) αφαιρεί το email από το μέλος.
 * Η κάρτα δεν εμφανίζεται όταν δεν υπάρχει καμία πρόσκληση.
 * Ίδια λειτουργία στο κινητό: mobile/src/components/StaffInvitationsCard.tsx.
 */
type Invitation = {
  id: string
  full_name: string
  title: string | null
  business_name: string | null
  service_type: string | null
  city: string | null
}

export default function StaffInvitationsCard() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['staff-invitations'],
    queryFn: () => api.get('/staff/invitations').then(r => (r.data?.data ?? []) as Invitation[]),
  })
  const rows = data ?? []

  const answer = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api.post(`/staff/${id}/${accept ? 'accept' : 'decline'}`, {}).then(r => r.data),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ['staff-invitations'] })
      qc.invalidateQueries({ queryKey: ['staff-me'] })
      toast.success(v.accept ? t('staffInvite.accepted') : t('staffInvite.declined'))
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['staff-invitations'] })
      toast.error(e?.response?.data?.message || e?.message || t('common.error'))
    },
  })

  if (rows.length === 0) return null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus size={18} className="text-brand-900 dark:text-yellow-400" />
        <h3 className="font-bold text-gray-900 dark:text-white">{t('staffInvite.title')}</h3>
      </div>
      <p className="text-sm text-gray-500">{t('staffInvite.subtitle')}</p>
      <ul className="space-y-3">
        {rows.map(inv => (
          <li key={inv.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white truncate">
                {inv.business_name || t('staffInvite.unknownBusiness')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {t('staffInvite.asMember', { name: inv.full_name })}
                {inv.title ? ` · ${inv.title}` : ''}
              </div>
              {(inv.service_type || inv.city) && (
                <div className="text-xs text-gray-400 truncate">
                  {[
                    inv.service_type ? t(`services.types.${inv.service_type}`, { defaultValue: inv.service_type }) : null,
                    inv.city,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => answer.mutate({ id: inv.id, accept: false })}
                disabled={answer.isPending}
                className="btn-secondary text-sm inline-flex items-center gap-1.5">
                <X size={14} /> {t('staffInvite.decline')}
              </button>
              <button
                onClick={() => answer.mutate({ id: inv.id, accept: true })}
                disabled={answer.isPending}
                className="btn-primary text-sm inline-flex items-center gap-1.5">
                <Check size={14} /> {t('staffInvite.accept')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
