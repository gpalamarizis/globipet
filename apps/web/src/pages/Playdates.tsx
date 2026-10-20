import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Calendar, Clock, Users, Plus, X, Check, Dog, Heart, Map, List } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import CampaignBanner from '@/components/CampaignBanner'

const eventTypes = [
  { value: 'walk', emoji: '🚶', labelKey: 'pgPlaydates.types.walk' },
  { value: 'play', emoji: '🎾', labelKey: 'pgPlaydates.types.play' },
  { value: 'meetup', emoji: '🐾', labelKey: 'pgPlaydates.types.meetup' },
  { value: 'training', emoji: '🎓', labelKey: 'pgPlaydates.types.training' },
  { value: 'other', emoji: '✨', labelKey: 'pgPlaydates.types.other' },
]

const petTypeOptions = ['dog', 'cat', 'rabbit', 'bird', 'other']
const petTypeEmoji: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' }

// 'YYYY-MM-DD' ως τοπική ημερομηνία στη γλώσσα του χρήστη (όπως το κινητό):
// το new Date('YYYY-MM-DD') είναι UTC και σε ζώνες πίσω από το UTC έδειχνε την προηγούμενη μέρα.
const fmtDate = (d: string | undefined, lang: string) => {
  if (!d) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  const x = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d)
  return isNaN(x.getTime()) ? d
    : x.toLocaleDateString(lang, { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function Playdates() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [cityFilter, setCityFilter] = useState('')

  const [form, setForm] = useState({
    title: '', description: '', event_type: 'meetup',
    date: '', time: '', duration_minutes: 60,
    location: '', city: user?.city || '',
    max_participants: 10, pet_types: [] as string[], is_public: true,
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUserId, setInviteUserId] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['playdates', cityFilter, filterType],
    queryFn: () => api.get('/playdates', { params: { city: cityFilter || undefined, event_type: filterType !== 'all' ? filterType : undefined } }).then(r => r.data),
    enabled: !!user,
  })

  const { data: myData } = useQuery({
    queryKey: ['playdates-my'],
    queryFn: () => api.get('/playdates/my').then(r => r.data),
    enabled: !!user && tab === 'my',
  })

  const createEvent = useMutation({
    mutationFn: () => api.post('/playdates', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); setShowCreateModal(false); setForm({ title: '', description: '', event_type: 'meetup', date: '', time: '', duration_minutes: 60, location: '', city: user?.city || '', max_participants: 10, pet_types: [], is_public: true }); toast.success(t('pgPlaydates.created')) },
    onError: () => toast.error(t('pgPlaydates.createError')),
  })

  const sendInvite = useMutation({
    // invitee_id covers the nearby-owner cards, which no longer receive an
    // email address; invitee_email still works for someone typing one in.
    mutationFn: () => api.post(`/playdates/${showInviteModal}/invite`,
      inviteUserId
        ? { invitee_id: inviteUserId, message: inviteMsg }
        : { invitee_email: inviteEmail, message: inviteMsg }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates-my'] }); setShowInviteModal(null); setInviteEmail(''); setInviteUserId(null); setInviteMsg(''); toast.success(t('pgPlaydates.inviteSent')) },
    // Ήταν γραμμένο δύο φορές. Το δεύτερο υπερίσχυε, οπότε ο χρήστης
    // έβλεπε σκέτο «Σφάλμα» αντί για το ειδικό μήνυμα.
    onError: (e: any) => toast.error(e?.message || t('pgPlaydates.inviteFailed')),
  })

  // Συμμετοχή/αποχώρηση από τον ίδιο τον χρήστη (POST/DELETE /playdates/:id/join).
  // Πριν, το «Συμμετοχή» άνοιγε το παράθυρο πρόσκλησης, που επιτρέπεται μόνο στον διοργανωτή.
  const joinEvent = useMutation({
    mutationFn: ({ id, leave }: { id: string; leave: boolean }) =>
      leave ? api.delete(`/playdates/${id}/join`) : api.post(`/playdates/${id}/join`),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] })
      toast.success(v.leave ? t('pgPlaydates.left') : t('pgPlaydates.joined'))
    },
    onError: (e: any, v) => toast.error(e?.message || (v.leave ? t('pgPlaydates.leaveFailed') : t('pgPlaydates.joinFailed'))),
  })

  const respondInvite = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/playdates/invitation/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates-my'] }); toast.success(t('pgPlaydates.responseSaved')) },
    onError: (e: any) => toast.error(e?.message || t('pgPlaydates.responseFailed')),
  })

  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); toast.success(t('common.deleted')) },
    onError: (e: any) => toast.error(e?.message || t('pgPlaydates.deleteFailed')),
  })
  // Επιβεβαίωση πριν τη διαγραφή (όπως το κινητό).
  const confirmDelete = (ev: any) => {
    if (window.confirm(t('pgPlaydates.deleteQ', { title: ev.title }))) deleteEvent.mutate(ev.id)
  }

  const togglePetType = (pt: string) => setForm(f => ({ ...f, pet_types: f.pet_types.includes(pt) ? f.pet_types.filter(p => p !== pt) : [...f.pet_types, pt] }))

  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white"
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">

      {/* Καμπάνιες: αν δεν υπάρχει ενεργή, δεν αποδίδεται τίποτα */}
      <CampaignBanner page="playdates" slot="banner" className="mb-6" />

      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Dog size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('pgPlaydates.title')}</h1>
              <p className="text-sm text-gray-500">{t('pgPlaydates.subtitle')}</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            <Plus size={16} /> {t('pgPlaydates.newEvent')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-2xl p-1.5 mb-4 shadow-sm">
          {[{ id: 'discover', label: t('pgPlaydates.tabs.discover') }, { id: 'my', label: t('pgPlaydates.tabs.mine') }].map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === tb.id ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'discover' && (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input className="flex-1 min-w-32 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none dark:bg-gray-900"
                placeholder={t('pgPlaydates.cityFilter')} value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
              <div className="flex gap-1 overflow-x-auto">
                <button onClick={() => setFilterType('all')} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filterType === 'all' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600'}`}>{t('common.all')}</button>
                {eventTypes.map(et => (
                  <button key={et.value} onClick={() => setFilterType(et.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filterType === et.value ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                    {et.emoji} {t(et.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Events */}
                {data?.events?.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('pgPlaydates.eventsNearYou')}</h2>
                    <div className="space-y-3">
                      {data.events.map((ev: any) => (
                        <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{eventTypes.find(et => et.value === ev.event_type)?.emoji || '🐾'}</span>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                              </div>
                              {ev.description && <p className="text-sm text-gray-500 mb-2">{ev.description}</p>}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Calendar size={12} />{fmtDate(ev.date, i18n.language)} {ev.time}</span>
                                <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}, {ev.city}</span>
                                <span className="flex items-center gap-1"><Users size={12} />{ev.invitations?.length || 0}/{ev.max_participants}</span>
                              </div>
                            </div>
                            {ev.creator_email === user?.email && (
                              <div className="flex gap-1">
                                <button onClick={() => setShowInviteModal(ev.id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">{t('pgPlaydates.invite')}</button>
                                <button onClick={() => confirmDelete(ev)} disabled={deleteEvent.isPending} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                              </div>
                            )}
                            {ev.creator_email !== user?.email && (() => {
                              const joined = (ev.invitations ?? []).some((i: any) => i.invitee_email === user?.email)
                              const full = !!ev.max_participants && (ev.invitations?.length || 0) >= ev.max_participants
                              return (
                                <button onClick={() => joinEvent.mutate({ id: ev.id, leave: joined })}
                                  disabled={(!joined && full) || (joinEvent.isPending && joinEvent.variables?.id === ev.id)}
                                  className={`px-3 py-1.5 text-xs rounded-xl disabled:opacity-50 ${joined ? 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400' : 'bg-green-500 text-white'}`}>
                                  {joined ? t('pgPlaydates.leave') : full ? t('pgPlaydates.full') : t('pgPlaydates.join')}
                                </button>
                              )
                            })()}
                          </div>
                          {ev.invitations?.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                              <span className="text-xs text-gray-400">{t('pgPlaydates.participants')}</span>
                              {ev.invitations.slice(0, 5).map((inv: any, i: number) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs overflow-hidden">
                                  {inv.invitee_photo ? <img src={inv.invitee_photo} className="w-full h-full object-cover" /> : inv.invitee_name[0]}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby owners */}
                {data?.nearbyOwners?.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('pgPlaydates.ownersNearYou')}</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {data.nearbyOwners.map((owner: any) => (
                        <button key={owner.id}
                          onClick={() => {
                            const mine = data?.events?.filter((e: any) => e.creator_email === user?.email) ?? []
                            if (!mine.length) { toast.error(t('pgPlaydates.createEventFirst')); return }
                            setInviteUserId(owner.id)
                            setInviteEmail('')
                            setShowInviteModal(mine[0].id)
                          }}
                          className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left w-full hover:shadow-md transition-shadow">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                            {owner.profile_photo ? <img src={owner.profile_photo} className="w-full h-full object-cover" /> : <span className="text-green-700 font-semibold text-sm">{owner.full_name[0]}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{owner.full_name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{owner.city}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {data?.events?.length === 0 && data?.nearbyOwners?.length === 0 && (
                  <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                    <p className="text-4xl mb-3">🐾</p>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('common.noResults')}</p>
                    <p className="text-sm text-gray-500">{t('pgPlaydates.emptyHint')}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'my' && (
          <div className="space-y-6">
            {/* My events */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('pgPlaydates.myEvents')}</h2>
              {myData?.events?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('pgPlaydates.noMyEvents')}</p>}
              <div className="space-y-3">
                {myData?.events?.map((ev: any) => (
                  <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setShowInviteModal(ev.id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">{t('pgPlaydates.addInvite')}</button>
                        <button onClick={() => confirmDelete(ev)} disabled={deleteEvent.isPending} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(ev.date, i18n.language)} {ev.time} · {ev.location}</p>
                    <p className="text-xs text-gray-400">{t('pgPlaydates.acceptedCount', { count: ev.invitations?.filter((i: any) => i.status === 'accepted').length })}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* My invitations */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('pgPlaydates.receivedInvites')}</h2>
              {myData?.invitations?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('pgPlaydates.noInvites')}</p>}
              <div className="space-y-3">
                {myData?.invitations?.map((inv: any) => (
                  <div key={inv.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{inv.event.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(inv.event.date, i18n.language)} {inv.event.time} · {inv.event.location}</p>
                    {inv.message && <p className="text-sm text-gray-500 mt-1 italic">"{inv.message}"</p>}
                    {inv.status === 'pending' ? (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => respondInvite.mutate({ id: inv.id, status: 'accepted' })}
                          className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                          <Check size={14} /> {t('pgPlaydates.accept')}
                        </button>
                        <button onClick={() => respondInvite.mutate({ id: inv.id, status: 'declined' })}
                          className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                          {t('pgPlaydates.decline')}
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {inv.status === 'accepted' ? t('pgPlaydates.youAccepted') : t('pgPlaydates.youDeclined')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('pgPlaydates.modalTitle')}</h3>
                <button onClick={() => setShowCreateModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>{t('pgPlaydates.form.title')}</label><input className={inputCls} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder={t('pgPlaydates.form.titlePlaceholder')} /></div>
                <div><label className={labelCls}>{t('pgPlaydates.form.type')}</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(et => (
                      <button key={et.value} type="button" onClick={() => setForm(f => ({...f, event_type: et.value}))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.event_type === et.value ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                        {et.emoji} {t(et.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className={labelCls}>{t('pgPlaydates.form.description')}</label><textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>{t('pgPlaydates.form.date')}</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
                  <div><label className={labelCls}>{t('pgPlaydates.form.time')}</label><input type="time" className={inputCls} value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} /></div>
                </div>
                <div><label className={labelCls}>{t('pgPlaydates.form.location')}</label><input className={inputCls} value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder={t('pgPlaydates.form.locationPlaceholder')} /></div>
                <div><label className={labelCls}>{t('pgPlaydates.form.city')}</label><input className={inputCls} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>{t('pgPlaydates.form.duration')}</label><input type="number" className={inputCls} value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: Number(e.target.value)}))} /></div>
                  <div><label className={labelCls}>{t('pgPlaydates.form.maxParticipants')}</label><input type="number" className={inputCls} value={form.max_participants} onChange={e => setForm(f => ({...f, max_participants: Number(e.target.value)}))} /></div>
                </div>
                <div><label className={labelCls}>{t('pgPlaydates.form.petTypes')}</label>
                  <div className="flex flex-wrap gap-2">
                    {petTypeOptions.map(pt => (
                      <button key={pt} type="button" onClick={() => togglePetType(pt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.pet_types.includes(pt) ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                        {petTypeEmoji[pt]} {t(`pgPlaydates.petTypes.${pt}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => createEvent.mutate()} disabled={!form.title || !form.date || !form.time || !form.location || !form.city || createEvent.isPending}
                className="w-full mt-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50">
                {createEvent.isPending ? t('pgPlaydates.creating') : t('pgPlaydates.createEvent')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowInviteModal(null); setInviteUserId(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('pgPlaydates.sendInvite')}</h3>
                <button onClick={() => { setShowInviteModal(null); setInviteUserId(null) }}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                {inviteUserId ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pgPlaydates.inviteTo')}{' '}
                    <strong className="text-gray-900 dark:text-white">
                      {data?.nearbyOwners?.find((o: any) => o.id === inviteUserId)?.full_name ?? t('pgPlaydates.theUser')}
                    </strong>
                  </p>
                ) : (
                  <div><label className={labelCls}>{t('pgPlaydates.userEmail')}</label><input className={inputCls} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" /></div>
                )}
                <div><label className={labelCls}>{t('pgPlaydates.messageOptional')}</label><textarea className={inputCls} rows={2} value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} placeholder={t('pgPlaydates.messagePlaceholder')} /></div>
              </div>
              <button onClick={() => sendInvite.mutate()} disabled={(!inviteUserId && !inviteEmail.trim()) || sendInvite.isPending}
                className="w-full mt-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {sendInvite.isPending ? t('pgPlaydates.sending') : t('pgPlaydates.sendInvite')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}