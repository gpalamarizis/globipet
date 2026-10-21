import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

/**
 * Η απάντηση του παρόχου κάτω από μια κριτική.
 *
 * PATCH /reviews/:id/response { response } — επιτρέπεται μόνο στον πάροχο της
 * κριτικής (review.provider_email) ή στον διαχειριστή. Κενό κείμενο σβήνει
 * την απάντηση (ο server γράφει response = null). Όριο 2000 χαρακτήρες, όπως
 * ο server.
 *
 * Όλοι βλέπουν την απάντηση· μόνο όταν `canEdit` εμφανίζονται τα κουμπιά.
 * `invalidate`: τα queryKeys που ξαναφορτώνονται μετά την αποθήκευση.
 */
export const REVIEW_REPLY_MAX = 2000

export default function ReviewReply({
  review, canEdit, invalidate, label,
}: {
  review: { id: string; response?: string | null }
  canEdit: boolean
  invalidate: unknown[][]
  /** Τίτλος πάνω από την απάντηση (π.χ. «Απάντηση πωλητή» στα προϊόντα). */
  label?: string
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(review.response ?? '')

  const save = useMutation({
    mutationFn: (response: string) => api.patch(`/reviews/${review.id}/response`, { response }),
    onSuccess: (_r, response) => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key })
      toast.success(response.trim() ? t('reviewReply.saved') : t('reviewReply.removed'))
      setEditing(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const open = () => { setText(review.response ?? ''); setEditing(true) }
  const remove = () => { if (confirm(t('reviewReply.confirmRemove'))) save.mutate('') }

  if (editing) {
    return (
      <div className="mt-3 pl-3 border-l-2 border-brand-200 dark:border-brand-800">
        <label className="block text-xs font-semibold text-brand-900 dark:text-yellow-400 mb-1">
          {t('reviewReply.yourReply')}
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, REVIEW_REPLY_MAX))}
          rows={3}
          maxLength={REVIEW_REPLY_MAX}
          placeholder={t('reviewReply.placeholder')}
          className="input w-full resize-none text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-400">
            {t('reviewReply.publicHint')} · {text.length}/{REVIEW_REPLY_MAX}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={save.isPending}
              className="btn-secondary text-xs px-3 py-1.5">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={() => save.mutate(text)}
              disabled={save.isPending || !text.trim() || text.trim() === (review.response ?? '').trim()}
              className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
              <Save size={13} /> {save.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {review.response && (
        <div className="mt-3 pl-3 border-l-2 border-brand-200 dark:border-brand-800">
          <p className="text-xs font-semibold text-brand-900 dark:text-yellow-400 mb-0.5">
            {label ?? t('reviewReply.providerReply')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{review.response}</p>
        </div>
      )}
      {canEdit && (
        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={open}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900 dark:text-yellow-400 hover:underline">
            <MessageSquare size={13} />
            {review.response ? t('reviewReply.edit') : t('reviewReply.reply')}
          </button>
          {review.response && (
            <button type="button" onClick={remove} disabled={save.isPending}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
              <Trash2 size={13} /> {t('reviewReply.remove')}
            </button>
          )}
        </div>
      )}
    </>
  )
}
