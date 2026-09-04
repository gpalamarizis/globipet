import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Plus, Pin, CheckCircle2, Eye, X, Send,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

/**
 * Forum index.
 *
 * forum.ts has served this data from the start; the route rendered a "page
 * under development" placeholder. Replies only became possible with the
 * forum_replies table — before that, replies_count was a column nothing wrote
 * to and every thread showed zero.
 */

const CATEGORIES = [
  { value: '',          labelKey: 'forum.categories.all',       fallback: 'Όλα',        emoji: '💬' },
  { value: 'health',    labelKey: 'forum.categories.health',    fallback: 'Υγεία',      emoji: '🩺' },
  { value: 'nutrition', labelKey: 'forum.categories.nutrition', fallback: 'Διατροφή',   emoji: '🍽️' },
  { value: 'training',  labelKey: 'forum.categories.training',  fallback: 'Εκπαίδευση', emoji: '🎓' },
  { value: 'behavior',  labelKey: 'forum.categories.behavior',  fallback: 'Συμπεριφορά',emoji: '🧠' },
  { value: 'adoption',  labelKey: 'forum.categories.adoption',  fallback: 'Υιοθεσία',   emoji: '🏠' },
  { value: 'general',   labelKey: 'forum.categories.general',   fallback: 'Γενικά',     emoji: '🐾' },
]

export default function Forum() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [compose, setCompose] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'general' })

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topics', { search, category }],
    queryFn: () => api.get('/forum', {
      params: { q: search || undefined, category: category || undefined, limit: 30 },
    }).then(r => r.data),
  })

  const createTopic = useMutation({
    mutationFn: () => api.post('/forum', {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
      setForm({ title: '', content: '', category: 'general' })
      setCompose(false)
      toast.success(t('forum.posted', 'Το θέμα δημοσιεύτηκε'))
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const topics = data?.data ?? []
  const catLabel = (v: string) => {
    const c = CATEGORIES.find(x => x.value === v)
    return c ? t(c.labelKey, c.fallback) : v
  }

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="section-title mb-1">{t('nav.forum', 'Φόρουμ')}</h1>
          <p className="text-gray-500 text-sm">
            {t('forum.subtitle', 'Ρώτησε την κοινότητα, μοιράσου την εμπειρία σου')}
          </p>
        </div>
        {isAuthenticated && (
          <button onClick={() => setCompose(!compose)} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={16} /> {t('forum.newTopic', 'Νέο θέμα')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {compose && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="card p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {t('forum.newTopic', 'Νέο θέμα')}
              </p>
              <button onClick={() => setCompose(false)} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <input className="input" placeholder={t('forum.titlePlaceholder', 'Τίτλος...')}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <select className="input" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.filter(c => c.value).map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {t(c.labelKey, c.fallback)}</option>
              ))}
            </select>
            <textarea className="input resize-none" rows={5}
              placeholder={t('forum.contentPlaceholder', 'Περίγραψε το ερώτημά σου...')}
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            <div className="flex justify-end">
              <button onClick={() => createTopic.mutate()}
                disabled={!form.title.trim() || !form.content.trim() || createTopic.isPending}
                className="btn-primary text-sm flex items-center gap-1.5">
                <Send size={14} />
                {createTopic.isPending ? t('common.loading') : t('forum.publish', 'Δημοσίευση')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input className="input pl-10 py-2.5" placeholder={t('forum.searchPlaceholder', 'Αναζήτηση θέματος...')}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)}
            className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
              category === c.value
                ? 'bg-brand-900 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
            <span>{c.emoji}</span>{t(c.labelKey, c.fallback)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="list-row" count={6} />
      ) : topics.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={44} className="mx-auto text-gray-200 mb-4" />
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {t('forum.empty', 'Κανένα θέμα ακόμη')}
          </p>
          <p className="text-gray-500 text-sm">
            {t('forum.emptyDesc', 'Ξεκίνησε εσύ τη συζήτηση.')}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {topics.map((topic: any, i: number) => (
            <motion.div key={topic.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/forum/${topic.id}`}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-900 dark:text-yellow-400 font-semibold text-xs shrink-0">
                  {getInitials(topic.author_name || 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {topic.is_pinned && <Pin size={12} className="text-brand-900 dark:text-yellow-400 shrink-0" />}
                    {topic.is_solved && <CheckCircle2 size={13} className="text-green-500 shrink-0" />}
                    <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                      {topic.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{topic.content}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 flex-wrap">
                    <span>{topic.author_name}</span>
                    <span>{formatRelativeTime(topic.created_at)}</span>
                    <span className="bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                      {catLabel(topic.category)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-[11px] text-gray-400 shrink-0">
                  <span className="flex items-center gap-1"><MessageSquare size={11} />{topic.replies_count}</span>
                  <span className="flex items-center gap-1"><Eye size={11} />{topic.views_count}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
