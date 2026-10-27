import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Inbox, RefreshCw, Search, Crown, UserCheck, Reply, Archive, X, Save, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { dateLocale } from '@/lib/dates'

/**
 * Ε20 — Μηνύματα της φόρμας επικοινωνίας (routes/contact.ts, admin).
 *
 *   GET   /contact/messages?status=&q=&limit=  → { data: Msg[], unread }
 *         Χωρίς status ή status=new: τα νέα μηνύματα μελών GlobiPet Plus
 *         έρχονται πρώτα (η σειρά του server διατηρείται εδώ).
 *   PATCH /contact/messages/:id { status?, notes? } → { data }
 *         status ∈ new | read | replied | archived.
 *
 * Το κείμενο του μηνύματος εμφανίζεται ως απλό κείμενο (white-space:
 * pre-line) — ποτέ ως HTML.
 */

type Status = 'new' | 'read' | 'replied' | 'archived'
type Msg = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  user_email: string | null
  status: Status
  notes: string | null
  created_at: string
  updated_at: string
  is_member: boolean
}

const STATUSES: Status[] = ['new', 'read', 'replied', 'archived']
const TABS: (Status | 'all')[] = ['new', 'read', 'replied', 'archived', 'all']
const LIMIT = 200

const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-blue-50 text-blue-700',
  read: 'bg-gray-100 text-gray-700',
  replied: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

/** mailto: η διεύθυνση και το θέμα κωδικοποιούνται (το @ μένει αναγνώσιμο). */
function mailtoHref(email: string, subject: string) {
  return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}`
}

export default function AdminContactMessagesPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Status | 'all'>('new')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Msg | null>(null)
  const [notes, setNotes] = useState('')
  const [suggestReplied, setSuggestReplied] = useState(false)

  // Αναζήτηση στον server, με μικρή καθυστέρηση ώστε να μη φεύγει αίτημα ανά πλήκτρο.
  useEffect(() => {
    const h = setTimeout(() => setQ(search.trim()), 350)
    return () => clearTimeout(h)
  }, [search])

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-contact-messages', tab, q],
    queryFn: () => api.get('/contact/messages', {
      params: { ...(tab !== 'all' ? { status: tab } : {}), ...(q ? { q } : {}), limit: LIMIT },
    }).then(r => r.data),
  })
  const rows: Msg[] = data?.data ?? []
  const unread: number = data?.unread ?? 0

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-contact-messages'] })

  const when = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString(dateLocale(i18n.language), {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const patch = useMutation({
    mutationFn: (v: { id: string; status?: Status; notes?: string | null; silent?: boolean; close?: boolean }) =>
      api.patch(`/contact/messages/${encodeURIComponent(v.id)}`, {
        ...(v.status !== undefined ? { status: v.status } : {}),
        ...(v.notes !== undefined ? { notes: v.notes } : {}),
      }).then(r => r.data),
    onSuccess: (res: any, v) => {
      const u = res?.data as Partial<Msg> | undefined
      setOpen(cur => (cur && cur.id === v.id && u ? { ...cur, status: (u.status as Status) ?? cur.status, notes: u.notes ?? null } : cur))
      if (v.status === 'replied') setSuggestReplied(false)
      if (v.close) setOpen(null)
      refresh()
      if (!v.silent) {
        toast.success(v.notes !== undefined ? t('adminContact.notesSaved')
          : v.status === 'archived' ? t('adminContact.archived') : t('adminContact.statusSaved'))
      }
    },
    onError: (err: any, v) => {
      refresh()
      if (!v.silent) toast.error(err?.message || t('adminContact.error'))
    },
  })

  const openMsg = (m: Msg) => {
    setOpen(m)
    setNotes(m.notes ?? '')
    setSuggestReplied(false)
    // Αυτόματη σήμανση «Διαβασμένο» όταν ανοίγει νέο μήνυμα.
    if (m.status === 'new') patch.mutate({ id: m.id, status: 'read', silent: true })
  }
  const close = () => { setOpen(null); setSuggestReplied(false) }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const notesDirty = !!open && (notes.trim() || null) !== (open.notes ?? null)

  const Badges = ({ m }: { m: Msg }) => (
    <>
      {m.is_member && (
        <span className="badge text-xs whitespace-nowrap inline-flex items-center gap-1 bg-amber-100 text-amber-800">
          <Crown size={11} /> {t('adminContact.memberBadge')}
        </span>
      )}
      {m.user_email && (
        <span className="badge text-xs whitespace-nowrap inline-flex items-center gap-1 bg-brand-50 text-brand-900 dark:bg-brand-900/20 dark:text-yellow-400">
          <UserCheck size={11} /> {t('adminContact.loggedInBadge')}
        </span>
      )}
    </>
  )

  return (
    <div className="page-container py-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Inbox size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {t('adminContact.title')}
            </h1>
            <p className="text-sm text-gray-500">{t('adminContact.subtitle', { count: unread })}</p>
          </div>
        </div>
        <button onClick={() => { refresh() }} disabled={isFetching}
          className="btn-secondary text-sm inline-flex items-center gap-1.5">
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} /> {t('adminContact.refresh')}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1 flex-1">
          {TABS.map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={cn('inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                tab === s ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              {t(`adminContact.tab_${s}`)}
              {s === 'new' && unread > 0 && (
                <span className={cn('min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs leading-5 text-center',
                  tab === s ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700')}>{unread}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} maxLength={100}
            placeholder={t('adminContact.searchPh')} className="input w-full pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <AlertTriangle size={32} className="mx-auto text-red-300 mb-3" />
          <p className="text-red-600 text-sm mb-4">{(error as any)?.message || t('adminContact.error')}</p>
          <button onClick={() => refetch()} className="btn-secondary text-sm">{t('adminContact.retry')}</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">{q ? t('adminContact.emptySearch') : t('adminContact.empty')}</p>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(m => (
              <button key={m.id} onClick={() => openMsg(m)}
                className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors block',
                  m.status === 'new' && 'bg-blue-50/40 dark:bg-blue-900/10')}>
                <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4">
                  <div className="md:w-56 shrink-0 min-w-0">
                    <div className={cn('text-gray-900 dark:text-white truncate', m.status === 'new' ? 'font-bold' : 'font-medium')}>{m.name}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm text-gray-900 dark:text-white truncate', m.status === 'new' && 'font-semibold')}>
                      {m.subject || <span className="text-gray-400 italic">{t('adminContact.noSubject')}</span>}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-2 break-words">{m.message}</div>
                    {(m.is_member || m.user_email) && (
                      <div className="flex flex-wrap gap-1 mt-1.5"><Badges m={m} /></div>
                    )}
                  </div>
                  <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-1 shrink-0 mt-1 md:mt-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{when(m.created_at)}</span>
                    <span className={cn('badge text-xs whitespace-nowrap', STATUS_STYLE[m.status] ?? STATUS_STYLE.read)}>
                      {STATUSES.includes(m.status) ? t(`adminContact.status_${m.status}`) : m.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {rows.length >= LIMIT && (
            <p className="text-xs text-gray-500 mt-3 text-center">{t('adminContact.limitHint', { count: LIMIT })}</p>
          )}
        </>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white break-words">
                  {open.subject || <span className="text-gray-400 italic font-medium">{t('adminContact.noSubject')}</span>}
                </h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                  {open.name} · <a href={mailtoHref(open.email, '')} className="text-brand-900 dark:text-yellow-400 hover:underline break-all">{open.email}</a>
                </div>
                {open.user_email && open.user_email.toLowerCase() !== open.email.toLowerCase() && (
                  <div className="text-xs text-gray-500 mt-0.5 break-all">{t('adminContact.accountEmail', { email: open.user_email })}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">{when(open.created_at)}</div>
                {(open.is_member || open.user_email) && (
                  <div className="flex flex-wrap gap-1 mt-2"><Badges m={open} /></div>
                )}
              </div>
              <button onClick={close} aria-label={t('adminContact.close')}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="text-sm text-gray-800 dark:text-gray-200 break-words" style={{ whiteSpace: 'pre-line' }}>
                {open.message}
              </div>

              {suggestReplied && open.status !== 'replied' && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="text-sm text-green-800 dark:text-green-300 flex-1">{t('adminContact.markRepliedPrompt')}</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setSuggestReplied(false)} className="btn-secondary text-xs">{t('adminContact.notNow')}</button>
                    <button onClick={() => patch.mutate({ id: open.id, status: 'replied' })} disabled={patch.isPending}
                      className="btn-primary text-xs">{t('adminContact.markReplied')}</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{t('adminContact.statusLabel')}</label>
                <select value={open.status} disabled={patch.isPending}
                  onChange={e => patch.mutate({ id: open.id, status: e.target.value as Status })}
                  className="input w-full sm:w-60">
                  {STATUSES.map(s => <option key={s} value={s}>{t(`adminContact.status_${s}`)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{t('adminContact.notesLabel')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000}
                  placeholder={t('adminContact.notesPh')} className="input w-full" />
                <div className="flex justify-end mt-2">
                  <button onClick={() => patch.mutate({ id: open.id, notes: notes.trim() || null })}
                    disabled={!notesDirty || patch.isPending}
                    className="btn-secondary text-xs inline-flex items-center gap-1">
                    <Save size={12} /> {t('adminContact.saveNotes')}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              {open.status !== 'archived' && (
                <button onClick={() => patch.mutate({ id: open.id, status: 'archived', close: true })} disabled={patch.isPending}
                  className="btn-secondary text-sm inline-flex items-center justify-center gap-1.5">
                  <Archive size={14} /> {t('adminContact.archive')}
                </button>
              )}
              <a href={mailtoHref(open.email, `Re: ${open.subject || t('adminContact.noSubject')}`)}
                onClick={() => setSuggestReplied(true)}
                className="btn-primary text-sm inline-flex items-center justify-center gap-1.5">
                <Reply size={14} /> {t('adminContact.reply')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
