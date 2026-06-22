import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Mail, Send, Users, User, Search, CheckCircle, AlertCircle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const ROLE_GROUPS = [
  { value: 'all',              label: 'Όλοι οι χρήστες',    emoji: '👥', color: 'bg-gray-100 text-gray-700' },
  { value: 'user',             label: 'Μόνο χρήστες',       emoji: '🙋', color: 'bg-blue-100 text-blue-700' },
  { value: 'service_provider', label: 'Πάροχοι υπηρεσιών',  emoji: '🔧', color: 'bg-orange-100 text-orange-700' },
  { value: 'both',             label: 'Χρήστες & Πάροχοι',  emoji: '🤝', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin',            label: 'Διαχειριστές',        emoji: '🛡️', color: 'bg-red-100 text-red-700' },
]

type Mode = 'single' | 'broadcast'

export default function AdminMessagesPage() {
  const [mode, setMode] = useState<Mode>('single')
  const [searchQ, setSearchQ] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<any>(null)

  const { data: searchResults = [] } = useQuery({
    queryKey: ['admin-user-search', searchQ],
    queryFn: () => api.get(`/admin/users/search?q=${encodeURIComponent(searchQ)}`).then(r => r.data?.data ?? []),
    enabled: searchQ.length >= 2 && mode === 'single',
  })

  const sendEmail = useMutation({
    mutationFn: () => {
      const payload: any = { subject, body }
      if (mode === 'single') {
        if (!selectedUser) throw new Error('Επίλεξε παραλήπτη')
        payload.to_email = selectedUser.email
      } else {
        payload.to_role = selectedRole
      }
      return api.post('/admin/email', payload)
    },
    onSuccess: (res) => {
      setResult(res.data)
      toast.success(res.data.message || 'Εστάλη επιτυχώς')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Σφάλμα αποστολής'),
  })

  const canSend = subject.trim() && body.trim() && (mode === 'broadcast' || selectedUser)

  return (
    <div className="page-container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Mail size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Αποστολή Email</h1>
          <p className="text-sm text-gray-500">Επικοινώνησε απευθείας με χρήστες ή παρόχους</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button onClick={() => { setMode('single'); setResult(null) }}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            mode === 'single' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
          <User size={15} /> Συγκεκριμένος Χρήστης
        </button>
        <button onClick={() => { setMode('broadcast'); setResult(null) }}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            mode === 'broadcast' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
          <Users size={15} /> Broadcast σε Ομάδα
        </button>
      </div>

      <div className="card p-6 space-y-5">
        {/* Single user picker */}
        {mode === 'single' && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Παραλήπτης</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                  {selectedUser.full_name?.[0] || selectedUser.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedUser.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                </div>
                <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg text-gray-500">{selectedUser.role}</span>
                <button onClick={() => setSelectedUser(null)} className="btn-ghost p-1.5">
                  <X size={15} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                  <Search size={15} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Αναζήτηση με email ή όνομα..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none"
                  />
                </div>
                {searchResults.length > 0 && searchQ.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 card shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                    {searchResults.map((u: any) => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setSearchQ('') }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
                          {u.full_name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400 shrink-0">{u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Broadcast group picker */}
        {mode === 'broadcast' && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Ομάδα Παραληπτών</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_GROUPS.map(g => (
                <button key={g.value} onClick={() => setSelectedRole(g.value)}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                    selectedRole === g.value ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  <span>{g.emoji}</span>{g.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
              ⚠️ Το broadcast αποστέλλεται σε <strong>όλους</strong> τους χρήστες της επιλεγμένης ομάδας. Σιγουρέψου ότι το περιεχόμενο είναι κατάλληλο.
            </p>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Θέμα Email</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="π.χ. Σημαντική ενημέρωση για το λογαριασμό σας"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white" />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Κείμενο Μηνύματος</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
            placeholder="Γράψε το μήνυμά σου εδώ...&#10;&#10;Η αλλαγή γραμμής αντιστοιχεί σε νέα παράγραφο στο email."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white resize-none" />
          <p className="text-xs text-gray-400 mt-1">{body.length} χαρακτήρες</p>
        </div>

        {/* Send button */}
        <button
          onClick={() => { setResult(null); sendEmail.mutate() }}
          disabled={!canSend || sendEmail.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50">
          <Send size={16} />
          {sendEmail.isPending
            ? 'Αποστολή...'
            : mode === 'broadcast'
              ? `Broadcast σε ${ROLE_GROUPS.find(g => g.value === selectedRole)?.label}`
              : 'Αποστολή Email'}
        </button>

        {/* Result */}
        {result && (
          <div className={cn('flex items-start gap-3 p-4 rounded-xl', result.failed === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20')}>
            {result.failed === 0
              ? <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
              : <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{result.message}</p>
              {result.recipients_count > 1 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Σύνολο: {result.recipients_count} παραλήπτες · Επιτυχία: {result.sent} · Αποτυχία: {result.failed}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}