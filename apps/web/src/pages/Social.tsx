import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Share2, Plus, Image, X, Send, MoreHorizontal, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Social() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [newPost, setNewPost] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', activeFilter],
    queryFn: () => api.get(`/posts?filter=${activeFilter}&limit=20`).then(r => r.data?.data ?? []),
  })

  const createPost = useMutation({
    mutationFn: async () => {
      let image_url = null
      if (selectedImage) {
        const fd = new FormData(); fd.append('file', selectedImage); fd.append('folder', 'posts')
        const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        image_url = data.url
      }
      return api.post('/posts', { content: newPost, image_url, tags })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setNewPost(''); setSelectedImage(null); setImagePreview(null); setTags([]); setShowCompose(false)
      toast.success(t('social.published'))
    },
  })

  const likePost = useMutation({
    mutationFn: (id: string) => api.post(`/posts/${id}/like`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts', activeFilter] })
      queryClient.setQueryData(['posts', activeFilter], (old: any) =>
        old?.map((p: any) => p.id === id ? { ...p, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1, is_liked: !p.is_liked } : p)
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const filters = [
    { value: 'all', label: t('social.filters.all') },
    { value: 'following', label: t('social.filters.following') },
    { value: 'trending', label: t('social.filters.trending') },
  ]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">{t('social.title')}</h1>
        {isAuthenticated && (
          <button onClick={() => setShowCompose(!showCompose)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('social.newPost')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCompose && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-brand-900 font-semibold text-sm overflow-hidden">
                {user?.profile_photo ? <img src={user.profile_photo} className="w-full h-full object-cover" alt="" /> : getInitials(user?.full_name || 'U')}
              </div>
              <div className="flex-1">
                <textarea className="w-full bg-transparent resize-none text-sm placeholder:text-gray-400 outline-none min-h-[80px]"
                  placeholder={t('social.postPlaceholder')} value={newPost} onChange={e => setNewPost(e.target.value)} autoFocus />
                {imagePreview && (
                  <div className="relative mt-2 inline-block">
                    <img src={imagePreview} alt="" className="h-32 rounded-xl object-cover" />
                    <button onClick={() => { setSelectedImage(null); setImagePreview(null) }} className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center"><X size={12} /></button>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(tag => <span key={tag} className="badge-blue flex items-center gap-1">#{tag}<button onClick={() => setTags(t => t.filter(x => x !== tag))}><X size={10} /></button></span>)}
                  </div>
                )}
                <input type="text" placeholder={t('social.hashtagHint')} value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { setTags(p => [...p, tagInput.trim().replace('#','')]); setTagInput('') }}}
                  className="mt-2 text-xs bg-transparent outline-none text-gray-500 placeholder:text-gray-300 w-full" />
              </div>
            </div>
            <div className="divider my-3" />
            <div className="flex items-center justify-between">
              <label className="btn-ghost p-2 cursor-pointer"><Image size={18} className="text-gray-500" /><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){ setSelectedImage(f); setImagePreview(URL.createObjectURL(f)) }}} /></label>
              <div className="flex gap-2">
                <button onClick={() => setShowCompose(false)} className="btn-ghost text-sm">{t('social.cancel')}</button>
                <button onClick={() => createPost.mutate()} disabled={!newPost.trim() || createPost.isPending} className="btn-primary text-sm py-2 flex items-center gap-2">
                  <Send size={14} />{createPost.isPending ? t('social.publishing') : t('social.publish')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button key={f.value} onClick={() => setActiveFilter(f.value)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all', activeFilter===f.value ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 border border-gray-200 dark:border-gray-700')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card p-4 space-y-3"><div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-full"/><div className="flex-1 space-y-2"><div className="skeleton h-4 w-32"/><div className="skeleton h-3 w-20"/></div></div><div className="skeleton h-16 w-full"/></div>)}</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any, i: number) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm">
                    {post.author_photo ? <img src={post.author_photo} alt="" className="w-full h-full object-cover" /> : getInitials(post.author_name || 'U')}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{post.author_name}</p>
                    <p className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}{post.pet_name && <span className="text-brand-600"> · 🐾 {post.pet_name}</span>}</p>
                  </div>
                </div>
                <button className="btn-ghost p-1.5"><MoreHorizontal size={16} className="text-gray-400" /></button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="" className="w-full rounded-xl object-cover max-h-80 mb-3" />}
              {post.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{post.tags.map((tag: string) => <span key={tag} className="text-xs text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">#{tag}</span>)}</div>}
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => isAuthenticated && likePost.mutate(post.id)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors', post.is_liked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'} /><span>{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MessageCircle size={16} /><span>{post.comments_count}</span></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"><Bookmark size={16} /></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Share2 size={16} /></button>
              </div>
            </motion.div>
          ))}
          {posts.length === 0 && <div className="text-center py-16"><p className="text-4xl mb-3">🐾</p><p className="font-semibold text-gray-900 dark:text-white mb-1">{t('social.noPostsTitle')}</p><p className="text-sm text-gray-500">{t('social.noPostsDesc')}</p></div>}
        </div>
      )}
    </div>
  )
}
