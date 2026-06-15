import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, MapPin, Plus, X, Send, Image, ChevronLeft, Navigation, Loader2 } from 'lucide-react'
import { api, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

export default function Communities() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [msgText, setMsgText] = useState('')
  const [imgUploading, setImgUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState({
    name: '', description: '', address: '', city: user?.city || '',
    radius_km: 1.0, latitude: null as number | null, longitude: null as number | null,
  })

  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-800 dark:text-white"
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"

  // Get GPS
  const getGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); toast.success('Τοποθεσία εντοπίστηκε!') },
      () => { setGpsLoading(false); toast.error('Δεν επιτράπηκε πρόσβαση στην τοποθεσία') }
    )
  }

  const { data, isLoading } = useQuery({
    queryKey: ['communities', userCoords],
    queryFn: () => api.get('/communities', { params: userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : {} }).then(r => r.data),
    enabled: !!user,
  })

  const { data: communityData, refetch: refetchMessages } = useQuery({
    queryKey: ['community', selectedId],
    queryFn: () => api.get(`/communities/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  })

  // Poll messages every 3 seconds when in chat
  useEffect(() => {
    if (view === 'chat' && selectedId) {
      pollRef.current = setInterval(() => refetchMessages(), 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [view, selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [communityData?.messages])

  const createCommunity = useMutation({
    mutationFn: () => api.post('/communities', { ...form, latitude: form.latitude, longitude: form.longitude }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      setShowCreateModal(false)
      setForm({ name: '', description: '', address: '', city: user?.city || '', radius_km: 1.0, latitude: null, longitude: null })
      toast.success(`Κοινότητα δημιουργήθηκε! ${res.data.nearbyInvited > 0 ? `${res.data.nearbyInvited} χρήστες ειδοποιήθηκαν.` : ''}`)
    },
    onError: (e: any) => toast.error(e?.message || 'Σφάλμα δημιουργίας'),
  })

  const joinCommunity = useMutation({
    mutationFn: (id: string) => api.post(`/communities/${id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['communities'] }); qc.invalidateQueries({ queryKey: ['community', selectedId] }); toast.success('Έγινες μέλος!') },
  })

  const leaveCommunity = useMutation({
    mutationFn: (id: string) => api.delete(`/communities/${id}/leave`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['communities'] }); qc.invalidateQueries({ queryKey: ['community', selectedId] }); toast.success('Αποχώρησες') },
  })

  const sendMessage = useMutation({
    mutationFn: (payload: { content?: string; image_url?: string }) => api.post(`/communities/${selectedId}/messages`, payload),
    onSuccess: () => { refetchMessages(); setMsgText('') },
    onError: () => toast.error('Σφάλμα αποστολής'),
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgUploading(true)
    try {
      const url = await uploadFile(file, 'communities')
      sendMessage.mutate({ image_url: url })
    } catch { toast.error('Σφάλμα upload') }
    finally { setImgUploading(false) }
  }

  const geocodeAddress = async () => {
    if (!form.address && !form.city) return
    try {
      const res = await api.get('/communities/geocode', { params: { address: form.address || form.city } })
      if (res.data.lat) {
        setForm(f => ({ ...f, latitude: res.data.lat, longitude: res.data.lon }))
        toast.success('Διεύθυνση εντοπίστηκε!')
      } else toast.error('Δεν βρέθηκαν συντεταγμένες')
    } catch { toast.error('Σφάλμα geocoding') }
  }

  const openChat = (id: string) => { setSelectedId(id); setView('chat') }

  const community = communityData
  const isMember = community?.isMember
  const myEmail = user?.email

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {view === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Τοπικές Κοινότητες</h1>
                  <p className="text-sm text-gray-500">Βρες ιδιοκτήτες κοντά σου</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors">
                <Plus size={16} /> Νέα Κοινότητα
              </button>
            </div>

            {/* GPS Button */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Εύρεση κοντινών κοινοτήτων</p>
                <p className="text-xs text-gray-400">{userCoords ? `📍 GPS ενεργό` : 'Ενεργοποίησε το GPS για κοντινά αποτελέσματα'}</p>
              </div>
              <button onClick={getGPS} disabled={gpsLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${userCoords ? 'bg-green-100 text-green-700' : 'bg-purple-500 text-white hover:bg-purple-600'}`}>
                {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                {userCoords ? 'GPS Ενεργό' : 'GPS'}
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : data?.communities?.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                <p className="text-4xl mb-3">🏘️</p>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Δεν βρέθηκαν κοινότητες</p>
                <p className="text-sm text-gray-500 mb-4">Δημιούργησε την πρώτη κοινότητα στην περιοχή σου!</p>
                <button onClick={() => setShowCreateModal(true)} className="px-6 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium">Δημιουργία</button>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.communities?.map((c: any) => (
                  <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {c.image_url ? (
                        <img src={c.image_url} className="w-14 h-14 rounded-xl object-cover shrink-0" alt={c.name} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-2xl">🏘️</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                          {c.distance !== undefined && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{c.distance.toFixed(1)}km</span>
                          )}
                        </div>
                        {c.description && <p className="text-sm text-gray-500 mb-1 line-clamp-1">{c.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><MapPin size={10} />{c.city}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{c.member_count} μέλη</span>
                          <span>📏 {c.radius_km}km ακτίνα</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                      <button onClick={() => openChat(c.id)} className="flex-1 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-medium">
                        💬 Chat
                      </button>
                      {c.members?.some((m: any) => m.user_email === myEmail) ? (
                        <button onClick={() => leaveCommunity.mutate(c.id)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">
                          Αποχώρηση
                        </button>
                      ) : (
                        <button onClick={() => joinCommunity.mutate(c.id)} className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium">
                          Συμμετοχή
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'chat' && community && (
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Chat header */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-3 flex items-center gap-3">
              <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 dark:text-white">{community.name}</h2>
                <p className="text-xs text-gray-400">{community.member_count} μέλη · {community.city}</p>
              </div>
              {!isMember && (
                <button onClick={() => joinCommunity.mutate(community.id)} className="px-3 py-1.5 bg-purple-500 text-white rounded-xl text-xs font-medium">
                  Συμμετοχή
                </button>
              )}
            </div>

            {/* Members strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {community.members?.map((m: any) => (
                <div key={m.user_email} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center">
                    {m.user_photo ? <img src={m.user_photo} className="w-full h-full object-cover" /> : <span className="text-purple-700 text-xs font-bold">{m.user_name[0]}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 max-w-[40px] truncate">{m.user_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {community.messages?.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">Δεν υπάρχουν μηνύματα ακόμα. Ξεκίνησε τη συζήτηση!</div>
              )}
              {community.messages?.map((msg: any) => {
                const isMe = msg.author_email === myEmail
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center shrink-0">
                      {msg.author_photo ? <img src={msg.author_photo} className="w-full h-full object-cover" /> : <span className="text-purple-700 text-xs font-bold">{msg.author_name[0]}</span>}
                    </div>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMe && <span className="text-xs text-gray-400 mb-0.5 ml-1">{msg.author_name}</span>}
                      <div className={`rounded-2xl px-3 py-2 ${isMe ? 'bg-purple-500 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm shadow-sm'}`}>
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                        {msg.image_url && <img src={msg.image_url} className="max-w-full rounded-xl mt-1" alt="img" />}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 mx-1">{new Date(msg.created_at).toLocaleTimeString('el', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {isMember ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={imgUploading} className="p-2 text-gray-400 hover:text-purple-500 transition-colors">
                  {imgUploading ? <Loader2 size={18} className="animate-spin" /> : <Image size={18} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="Γράψε μήνυμα..." value={msgText} onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && msgText.trim()) { e.preventDefault(); sendMessage.mutate({ content: msgText.trim() }) } }} />
                <button onClick={() => msgText.trim() && sendMessage.mutate({ content: msgText.trim() })}
                  disabled={!msgText.trim() || sendMessage.isPending}
                  className="p-2 bg-purple-500 text-white rounded-xl disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            ) : (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-3 text-center text-sm text-purple-600">
                Γίνε μέλος για να στείλεις μήνυμα
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέα Κοινότητα</h3>
                <button onClick={() => setShowCreateModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Όνομα *</label><input className={inputCls} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="π.χ. Κυνόφιλοι Κολωνακίου" /></div>
                <div><label className={labelCls}>Περιγραφή</label><textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
                <div>
                  <label className={labelCls}>Διεύθυνση / Περιοχή *</label>
                  <div className="flex gap-2">
                    <input className={inputCls} value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="π.χ. Πλατεία Κολωνακίου, Αθήνα" />
                    <button onClick={geocodeAddress} className="px-3 py-2 bg-purple-500 text-white rounded-xl text-xs whitespace-nowrap">Εύρεση</button>
                  </div>
                  {form.latitude && <p className="text-xs text-green-600 mt-1">✅ {form.latitude.toFixed(4)}, {form.longitude?.toFixed(4)}</p>}
                </div>
                <div><label className={labelCls}>Ή χρησιμοποίησε GPS</label>
                  <button onClick={() => {
                    navigator.geolocation.getCurrentPosition(pos => {
                      setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
                      toast.success('GPS εντοπίστηκε!')
                    })
                  }} className="w-full py-2 border border-purple-200 text-purple-600 rounded-xl text-sm flex items-center justify-center gap-2">
                    <Navigation size={14} /> Χρήση GPS
                  </button>
                </div>
                <div><label className={labelCls}>Πόλη *</label><input className={inputCls} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
                <div>
                  <label className={labelCls}>Ακτίνα: {form.radius_km} km</label>
                  <input type="range" min="0.5" max="5" step="0.5" value={form.radius_km} onChange={e => setForm(f => ({...f, radius_km: parseFloat(e.target.value)}))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-xs text-gray-400"><span>0.5km</span><span>5km</span></div>
                </div>
              </div>
              <button onClick={() => createCommunity.mutate()} disabled={!form.name || !form.city || (!form.latitude && !form.address) || createCommunity.isPending}
                className="w-full mt-4 py-3 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50">
                {createCommunity.isPending ? 'Δημιουργία...' : 'Δημιουργία Κοινότητας'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
