import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Inbox, Mail, MailOpen, X, Tag, Clock, ArrowRight, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Τα μηνύματα που έλαβε ο πελάτης από παρόχους.
 *
 * ΓΙΑΤΙ ΕΝΤΟΣ ΠΛΑΤΦΟΡΜΑΣ
 *   Καμία αποστολή email. Ο πάροχος επικοινωνεί μέσα στο GlobiPet, ο
 *   πελάτης απαντά ή αξιοποιεί την προσφορά χωρίς να φύγει από το site.
 *
 * Όταν το μήνυμα συνοδεύεται από καμπάνια, εμφανίζεται και η προσφορά με
 * τον χρόνο που απομένει — αλλιώς ο πελάτης θα έβλεπε μόνο κείμενο και
 * δεν θα ήξερε τι κερδίζει.
 */

type Message = {
  id: string
  provider_email: string
  provider_name: string | null
  subject: string | null
  body: string
  campaign_id: string | null
  campaign_title: string | null
  discount_type: 'percent' | 'amount' | null
  discount_value: number | null
  ends_at: string | null
  read_at: string | null
  created_at: string
}

export default function InboxPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState<Message | null>(null)

  const { data, isLoading } = useQuery<{ data: Message[]; unread: number }>({
    queryKey: ['inbox'],
    queryFn: () => api.get('/customers/inbox').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/customers/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  const messages = data?.data ?? []
  const unread = data?.unread ?? 0

  const openMessage = (m: Message) => {
    setOpen(m)
    if (!m.read_at) markRead.mutate(m.id)
  }

  const discount = (m: Message) =>
    !m.discount_type ? null
      : m.discount_type === 'percent' ? `−${m.discount_value}%` : `−${m.discount_value}€`

  const daysLeft = (iso?: string | null) =>
    iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5) : null

  const when = (iso: string) => {
    const d = new Date(iso)
    const h = Math.round((Date.now() - d.getTime()) / 36e5)
    if (h < 1) return 'μόλις τώρα'
    if (h < 24) return `πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`
    const days = Math.round(h / 24)
    if (days < 7) return `πριν ${days} ${days === 1 ? 'μέρα' : 'μέρες'}`
    return d.toLocaleDateString('el-GR')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Inbox size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              Μηνύματα
            </h1>
            <p className="text-sm text-gray-500">
              {unread > 0 ? `${unread} νέα` : 'Από τους παρόχους σου'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="card p-12 text-center text-gray-500">Φόρτωση...</div>
        ) : messages.length === 0 ? (
          <div className="card p-12 text-center">
            <Inbox size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Κανένα μήνυμα</p>
            <p className="text-sm text-gray-500 mt-1">
              Εδώ θα βλέπεις προσφορές και ενημερώσεις από τους παρόχους που
              έχεις χρησιμοποιήσει.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {messages.map(m => {
              const off = discount(m)
              const left = daysLeft(m.ends_at)
              return (
                <button key={m.id} onClick={() => openMessage(m)}
                  className={cn('w-full flex items-start gap-3 p-4 text-left transition-colors',
                    m.read_at
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      : 'bg-brand-50/40 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20')}>

                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    m.read_at ? 'bg-gray-100 dark:bg-gray-800' : 'bg-brand-100 dark:bg-brand-900/30')}>
                    {m.read_at
                      ? <MailOpen size={16} className="text-gray-400" />
                      : <Mail size={16} className="text-brand-900 dark:text-yellow-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-sm truncate',
                        m.read_at ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white')}>
                        {m.provider_name || m.provider_email}
                      </span>
                      {off && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-brand-900 text-white">
                          {off}
                        </span>
                      )}
                    </div>
                    {m.subject && (
                      <p className={cn('text-sm truncate mt-0.5',
                        m.read_at ? 'text-gray-600 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-white')}>
                        {m.subject}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{m.body}</p>
                  </div>

                  <span className="text-[11px] text-gray-400 shrink-0">{when(m.created_at)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Ανάγνωση ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}>
            <motion.div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">
                    {open.provider_name || open.provider_email}
                  </p>
                  {open.subject && (
                    <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                      {open.subject}
                    </h3>
                  )}
                </div>
                <button onClick={() => setOpen(null)} className="btn-ghost p-2 shrink-0">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">{when(open.created_at)}</p>

              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {open.body}
              </p>

              {/* Η συνοδευτική προσφορά */}
              {open.campaign_id && open.discount_type && (
                <div className="mt-5 rounded-2xl border-2 border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-900/10 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={15} className="text-brand-900 dark:text-yellow-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {open.campaign_title || 'Ειδική προσφορά'}
                    </span>
                  </div>

                  <p className="text-2xl font-bold text-brand-900 dark:text-yellow-400">
                    {discount(open)}
                  </p>

                  {(() => {
                    const left = daysLeft(open.ends_at)
                    return left != null && left > 0 ? (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Clock size={11} />
                        Ισχύει για {left} {left === 1 ? 'ακόμα μέρα' : 'ακόμα μέρες'}
                      </p>
                    ) : left != null ? (
                      <p className="text-xs text-red-500 mt-1">Η προσφορά έληξε</p>
                    ) : null
                  })()}

                  <Link to="/services" onClick={() => setOpen(null)}
                    className="btn-primary w-full justify-center mt-3 text-sm">
                    Δες τις υπηρεσίες <ArrowRight size={15} className="ml-1" />
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
