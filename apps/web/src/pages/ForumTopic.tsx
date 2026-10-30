import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MessageSquare, Eye, Pin, CheckCircle2, Send, Trash2, Check, Pencil,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ContentActions from '@/components/ContentActions'

/**
 * A forum thread and its replies.
 *
 * Replies became possible with the forum_replies table — the topic row had a
 * replies_count column from the beginning, but nothing to count.
 */
export default function ForumTopic() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [reply, setReply] = useState('')
  // Επεξεργασία θέματος (PATCH /forum/:id: title, content) και απάντησης
  // (PATCH /forum/replies/:replyId: content) — συντάκτης ή admin, όπως ο server.
  const [editingTopic, setEditingTopic] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')

  const { data: topic, isLoading, isError } = useQuery({
    queryKey: ['forum-topic', id],
    queryFn: () => api.get(`/forum/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['forum-topic', id] })
    queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
  }

  const postReply = useMutation({
    mutationFn: () => api.post(`/forum/${id}/replies`, { content: reply.trim() }),
    onSuccess: () => { setReply(''); invalidate(); toast.success(t('forum.replied')) },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const markAnswer = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/replies/${replyId}/answer`),
    onSuccess: () => { invalidate(); toast.success(t('forum.markedAnswer')) },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const deleteReply = useMutation({
    mutationFn: (replyId: string) => api.delete(`/forum/replies/${replyId}`),
    onSuccess: () => { invalidate(); toast.success(t('common.deleted')) },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const updateTopic = useMutation({
    mutationFn: () => api.patch(`/forum/${id}`, { title: editTitle.trim(), content: editContent.trim() }),
    onSuccess: () => { setEditingTopic(false); invalidate(); toast.success(t('common.saved')) },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const deleteTopic = useMutation({
    mutationFn: () => api.delete(`/forum/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
      toast.success(t('common.deleted'))
      navigate('/forum')
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const updateReply = useMutation({
    mutationFn: (replyId: string) => api.patch(`/forum/replies/${replyId}`, { content: editReplyText.trim() }),
    onSuccess: () => { setEditingReplyId(null); invalidate(); toast.success(t('common.saved')) },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
  )

  if (isError || !topic) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">💬</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {t('forum.notFound')}
      </p>
      <Link to="/forum" className="btn-primary">{t('nav.forum')}</Link>
    </div>
  )

  const replies = topic.replies ?? []
  // is_mine: από τον server (το author_email δεν επιστρέφεται πια δημόσια).
  const isTopicAuthor = !!user && topic.is_mine === true
  const isAdmin = (user as any)?.role === 'admin'

  return (
    <div className="page-container py-6 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/forum')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-900 mb-4">
        <ArrowLeft size={15} /> {t('nav.forum')}
      </button>

      {/* The question */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {topic.is_pinned && <Pin size={13} className="text-brand-900 dark:text-yellow-400" />}
          {topic.is_solved && (
            <span className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> {t('forum.solved')}
            </span>
          )}
          <span className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
            {topic.category}
          </span>
        </div>

        {editingTopic ? (
          <input className="input mb-3" value={editTitle} maxLength={300}
            placeholder={t('forum.titlePlaceholder')}
            onChange={e => setEditTitle(e.target.value)} />
        ) : (
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">
            {topic.title}
          </h1>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-900 dark:text-yellow-400 font-semibold text-xs">
            {getInitials(topic.author_name || 'U')}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.author_name}</p>
            <p className="text-[11px] text-gray-400">{formatRelativeTime(topic.created_at)}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><MessageSquare size={11} />{topic.replies_count}</span>
            <span className="flex items-center gap-1"><Eye size={11} />{topic.views_count}</span>
            <ContentActions type="topic" id={String(topic.id)} isMine={topic.is_mine === true} size={14}
              onBlocked={() => navigate('/forum')} />
          </div>
        </div>

        {editingTopic ? (
          <>
            <textarea className="input resize-none" rows={6} value={editContent}
              placeholder={t('forum.contentPlaceholder')}
              onChange={e => setEditContent(e.target.value)} />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setEditingTopic(false)} className="btn-secondary text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={() => updateTopic.mutate()}
                disabled={!editTitle.trim() || !editContent.trim() || updateTopic.isPending}
                className="btn-primary text-sm">
                {updateTopic.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {topic.content}
          </p>
        )}

        {/* Ο συντάκτης (ή admin) διορθώνει ή διαγράφει το θέμα του. */}
        {(isTopicAuthor || isAdmin) && !editingTopic && (
          <div className="flex justify-end gap-1 mt-3">
            <button onClick={() => { setEditTitle(topic.title ?? ''); setEditContent(topic.content ?? ''); setEditingTopic(true) }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-900 px-2 py-1">
              <Pencil size={13} /> {t('common.edit')}
            </button>
            <button onClick={() => { if (confirm(t('forum.confirmDeleteTopic'))) deleteTopic.mutate() }}
              disabled={deleteTopic.isPending}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1">
              <Trash2 size={13} /> {t('common.delete')}
            </button>
          </div>
        )}

        {topic.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {topic.tags.map((tag: string) => (
              <span key={tag} className="text-xs text-brand-700 dark:text-brand-400">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Replies */}
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {t('forum.repliesCount', { count: replies.length })}
      </p>

      <div className="space-y-3 mb-6">
        {replies.map((r: any, i: number) => (
          <motion.div key={r.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={cn('card p-4', r.is_answer && 'ring-2 ring-green-400 dark:ring-green-600')}>
            {r.is_answer && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium mb-2">
                <CheckCircle2 size={12} /> {t('forum.acceptedAnswer')}
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-gray-600 dark:text-gray-300 text-[11px] font-semibold">
                {r.author_photo
                  ? <img src={r.author_photo} alt="" className="w-full h-full object-cover" />
                  : getInitials(r.author_name || 'U')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.author_name}</p>
                <p className="text-[11px] text-gray-400">{formatRelativeTime(r.created_at)}</p>
              </div>

              <div className="ml-auto flex items-center gap-1 shrink-0">
                {/* Only the person who asked decides what answered it. */}
                {(isTopicAuthor || isAdmin) && !r.is_answer && (
                  <button onClick={() => markAnswer.mutate(r.id)}
                    title={t('forum.markAnswer')}
                    className="text-gray-400 hover:text-green-600 p-1">
                    <Check size={14} />
                  </button>
                )}
                {((!!user && r.is_mine === true) || isAdmin) && editingReplyId !== r.id && (
                  <button onClick={() => { setEditReplyText(r.content ?? ''); setEditingReplyId(r.id) }}
                    title={t('common.edit')}
                    className="text-gray-400 hover:text-brand-900 p-1">
                    <Pencil size={14} />
                  </button>
                )}
                {((!!user && r.is_mine === true) || isAdmin) && (
                  <button onClick={() => {
                      if (confirm(t('forum.confirmDelete'))) deleteReply.mutate(r.id)
                    }}
                    className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                )}
                <ContentActions type="reply" id={String(r.id)} isMine={r.is_mine === true} size={14} />
              </div>
            </div>
            {editingReplyId === r.id ? (
              <>
                <textarea className="input resize-none" rows={4} value={editReplyText}
                  onChange={e => setEditReplyText(e.target.value)} />
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setEditingReplyId(null)} className="btn-secondary text-sm">
                    {t('common.cancel')}
                  </button>
                  <button onClick={() => updateReply.mutate(r.id)}
                    disabled={!editReplyText.trim() || updateReply.isPending}
                    className="btn-primary text-sm">
                    {updateReply.isPending ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {r.content}
              </p>
            )}
          </motion.div>
        ))}

        {replies.length === 0 && (
          <div className="card p-8 text-center">
            <MessageSquare size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-500">
              {t('forum.noReplies')}
            </p>
          </div>
        )}
      </div>

      {/* Reply box */}
      {isAuthenticated ? (
        <div className="card p-4">
          <textarea className="input resize-none" rows={4}
            placeholder={t('forum.replyPlaceholder')}
            value={reply} onChange={e => setReply(e.target.value)} />
          <div className="flex justify-end mt-3">
            <button onClick={() => postReply.mutate()}
              disabled={!reply.trim() || postReply.isPending}
              className="btn-primary text-sm flex items-center gap-1.5">
              <Send size={14} />
              {postReply.isPending ? t('common.loading') : t('forum.reply')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {t('forum.loginToReply')}
          </p>
          <Link to="/login" className="btn-primary text-sm">{t('auth.login')}</Link>
        </div>
      )}
    </div>
  )
}
