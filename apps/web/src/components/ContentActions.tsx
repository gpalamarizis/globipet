import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Flag, Ban, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * «⋯» σε περιεχόμενο χρηστών: Αναφορά περιεχομένου και Αποκλεισμός χρήστη.
 *
 * Ίδια λειτουργία με την εφαρμογή (mobile/src/components/ContentActions.tsx) —
 * App Store 1.2 / Google Play UGC. Στο δικό μου περιεχόμενο δεν εμφανίζεται.
 *   Αναφορά     → POST /moderation/report (ο admin ειδοποιείται, δράση ≤ 24 ώρες)
 *   Αποκλεισμός → POST /moderation/block (αναίρεση: Προφίλ → Αποκλεισμένοι χρήστες)
 */
export type ContentKind = 'post' | 'comment' | 'topic' | 'reply' | 'community_message'
const REASONS = ['spam', 'harassment', 'hate', 'inappropriate', 'other'] as const

export default function ContentActions({ type, id, isMine, size = 16, onBlocked, className = '' }: {
  type: ContentKind
  id: string
  isMine?: boolean
  size?: number
  onBlocked?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [menu, setMenu] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [sending, setSending] = useState(false)

  if (isMine) return null

  const open = () => {
    if (!isAuthenticated) { toast(t('moderation.loginHint')); navigate('/login'); return }
    setMenu(m => !m)
  }

  const report = async (reason: typeof REASONS[number]) => {
    if (sending) return
    setSending(true)
    try {
      await api.post('/moderation/report', { type, id, reason: t(`moderation.reason_${reason}`) })
      setReporting(false)
      toast.success(t('moderation.reportedHint'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'))
    } finally { setSending(false) }
  }

  const block = async () => {
    setMenu(false)
    if (!window.confirm(t('moderation.blockConfirm'))) return
    try {
      await api.post('/moderation/block', { type, id })
      await qc.invalidateQueries()
      onBlocked?.()
      toast.success(t('moderation.blockedHint'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'))
    }
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button type="button" onClick={open} aria-label={t('moderation.more')} title={t('moderation.more')}
        className="flex items-center justify-center p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
        <MoreHorizontal size={size} />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-max min-w-[200px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1">
            <button type="button" onClick={() => { setMenu(false); setReporting(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left whitespace-nowrap text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Flag size={14} /> {t('moderation.report')}
            </button>
            <button type="button" onClick={block}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left whitespace-nowrap text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Ban size={14} /> {t('moderation.blockUser')}
            </button>
          </div>
        </>
      )}
      {reporting && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setReporting(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('moderation.reportWhy')}</h3>
              <button type="button" onClick={() => setReporting(false)} aria-label={t('common.close')}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {REASONS.map(r => (
                <button key={r} type="button" disabled={sending} onClick={() => report(r)}
                  className="w-full text-left px-2 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  {t(`moderation.reason_${r}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
