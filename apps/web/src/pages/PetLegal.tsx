import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Send, ChevronDown, ChevronRight, AlertTriangle, BookOpen, Users, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const GREEK_LAWS = [
  {
    law: 'Ν. 4830/2021',
    title: 'Νέο Πλαίσιο Ζώων Συντροφιάς',
    year: 2021,
    summary: 'Ο βασικός ισχύων νόμος. Υποχρεωτικό μικροτσίπ, εγγραφή στο ΕΜΖΕ, υποχρεωτική στείρωση, ηλεκτρονικό βιβλιάριο υγείας. Πρόστιμα €1.000–€30.000.',
    key_points: [
      'Υποχρεωτικό μικροτσίπ ISO 11784/11785',
      'Εγγραφή στο ΕΜΖΕ (Εθνικό Μητρώο Ζώων Συντροφιάς)',
      'Υποχρεωτική στείρωση σκύλων & γάτων',
      'Απαγόρευση πώλησης σε pet shops',
      'Απαγόρευση κατηγορίας ευθανασίας αδέσποτων',
    ],
    color: '#E65100',
  },
  {
    law: 'Ν. 4039/2012',
    title: 'Αδέσποτα Ζώα Συντροφιάς',
    year: 2012,
    summary: 'Δημοτικά καταφύγια, πρόγραμμα ΔΤΣΤΕ (Διαχείριση-Τσίπ-Στείρωση-Τοποθέτηση-Επιστροφή), ευθύνη δήμων.',
    key_points: [
      'Υποχρέωση δήμων για καταφύγια',
      'Πρόγραμμα ΔΤΣΤΕ',
      'Υιοθεσία μέσω δήμου',
      'Ευθύνη τροφοδοτών αδέσποτων',
    ],
    color: '#1D4ED8',
  },
  {
    law: 'ΑΚ 924',
    title: 'Αστική Ευθύνη Ιδιοκτήτη Ζώου',
    year: null,
    summary: 'Ο ιδιοκτήτης ευθύνεται για ζημιές που προκαλεί το ζώο του, εκτός εάν αποδείξει ότι κατέβαλε την επιμέλεια ή η ζημιά οφείλεται σε ανωτέρα βία.',
    key_points: [
      'Αντικειμενική ευθύνη ιδιοκτήτη',
      'Αποζημίωση τρίτων για ζημιές',
      'Ηθική βλάβη σε σοβαρές περιπτώσεις',
    ],
    color: '#7C3AED',
  },
]

const COMMON_QUESTIONS = [
  'Ο ιδιοκτήτης μπορεί να μου απαγορεύσει να έχω σκύλο στο ενοικιαζόμενο;',
  'Τι πρόστιμο υπάρχει αν δεν έχω μικροτσίπ στο σκύλο μου;',
  'Ένα αδέσποτο με δάγκωσε — τι δικαιώματα έχω;',
  'Μπορώ να ταξιδέψω με τη γάτα μου στην Ευρώπη;',
  'Ποιες ράτσες απαιτούν ειδική άδεια στην Ελλάδα;',
  'Αγόρασα σκύλο από pet shop — είναι νόμιμο;',
  'Τι ισχύει για σκύλους σε πολυκατοικία;',
]

export default function PetLegalPage() {
  const [question, setQuestion] = useState('')
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null)
  const [answer, setAnswer] = useState<any>(null)
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: any }>>([])

  const { data: lawyers = [] } = useQuery({
    queryKey: ['legal-lawyers'],
    queryFn: () => api.get('/services?service_type=legal&limit=6').then(r => r.data?.data ?? []),
  })

  const askAI = useMutation({
    mutationFn: (q: string) => api.post('/ai/legal', { question: q }).then(r => r.data),
    onSuccess: (data, q) => {
      setChatHistory(prev => [...prev, { q, a: data }])
      setQuestion('')
      setAnswer(data)
    },
    onError: () => toast.error('Σφάλμα επικοινωνίας με τον AI σύμβουλο'),
  })

  const handleAsk = (q: string) => {
    if (!q.trim()) return
    setAnswer(null)
    askAI.mutate(q)
  }

  const urgencyColor = (u: string) => ({ low: '#10B981', medium: '#F59E0B', high: '#EF4444' }[u] || '#6B7280')
  const urgencyLabel = (u: string) => ({ low: 'Χαμηλή Επείγουσα', medium: 'Μέτρια', high: 'Υψηλή — Ζητήστε Δικηγόρο' }[u] || u)

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <Scale size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Νομική Υποστήριξη Κατοικιδίων</h1>
          <p className="text-sm text-gray-500">AI νομικός σύμβουλος + σύνδεση με εξειδικευμένους δικηγόρους</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main AI Chat */}
        <div className="lg:col-span-2 space-y-5">

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Ο AI νομικός σύμβουλος παρέχει <strong>ενημερωτικές</strong> απαντήσεις βάσει της ελληνικής νομοθεσίας. Για σοβαρές νομικές υποθέσεις, επικοινωνήστε με εξειδικευμένο δικηγόρο.
            </p>
          </div>

          {/* Question box */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Κάνε την ερώτησή σου</p>
            <div className="flex gap-2">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(question) } }}
                placeholder="π.χ. Μπορεί ο ιδιοκτήτης να μου απαγορεύσει σκύλο στο ενοικιαζόμενο;"
                className="input flex-1 resize-none text-sm"
                rows={3}
              />
              <button onClick={() => handleAsk(question)} disabled={!question.trim() || askAI.isPending}
                className="btn-primary px-4 py-2 h-fit flex items-center gap-2 self-end">
                {askAI.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                Ρώτησε
              </button>
            </div>

            {/* Quick questions */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Συχνές ερωτήσεις:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_QUESTIONS.slice(0, 4).map(q => (
                  <button key={q} onClick={() => handleAsk(q)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/20 transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading */}
          {askAI.isPending && (
            <div className="card p-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Scale size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Ο AI νομικός σύμβουλος επεξεργάζεται...</p>
                <p className="text-xs text-gray-500 mt-0.5">Ελέγχω τη σχετική νομοθεσία</p>
              </div>
            </div>
          )}

          {/* Latest Answer */}
          <AnimatePresence>
            {answer && !askAI.isPending && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <Scale size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Νομικός Σύμβουλος</span>
                    </div>
                    {answer.urgency && (
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: urgencyColor(answer.urgency) }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: urgencyColor(answer.urgency) }} />
                        {urgencyLabel(answer.urgency)}
                      </div>
                    )}
                  </div>

                  {/* Answer text */}
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{answer.answer}</p>
                  </div>

                  {/* Relevant laws */}
                  {answer.relevant_laws?.length > 0 && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mb-3">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">📖 Σχετική Νομοθεσία</p>
                      <div className="flex flex-wrap gap-1.5">
                        {answer.relevant_laws.map((law: string) => (
                          <span key={law} className="text-xs bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700">{law}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practical steps */}
                  {answer.practical_steps?.length > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl mb-3">
                      <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-2">✅ Πρακτικά Βήματα</p>
                      <ol className="space-y-1">
                        {answer.practical_steps.map((step: string, i: number) => (
                          <li key={i} className="text-xs text-green-700 dark:text-green-300 flex gap-2">
                            <span className="font-bold shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {answer.recommend_lawyer && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                      <p className="text-xs text-red-700 dark:text-red-400">⚠️ <strong>Συστήνεται δικηγόρος</strong> για αυτή την υπόθεση. Δείτε τους εξειδικευμένους δικηγόρους παρακάτω.</p>
                    </div>
                  )}

                  {answer.disclaimer && <p className="text-xs text-gray-400 mt-3 italic">{answer.disclaimer}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat history */}
          {chatHistory.length > 1 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium">Προηγούμενες ερωτήσεις</p>
              {chatHistory.slice(0, -1).reverse().map((entry, i) => (
                <div key={i} className="card p-4 opacity-70">
                  <p className="text-xs text-gray-500 mb-1">❓ {entry.q}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{entry.a.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Key Laws */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-600" /> Βασική Νομοθεσία
            </h3>
            <div className="space-y-2">
              {GREEK_LAWS.map(law => (
                <div key={law.law} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedLaw(expandedLaw === law.law ? null : law.law)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white shrink-0" style={{ backgroundColor: law.color }}>{law.law}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">{law.title}</span>
                    </div>
                    <ChevronDown size={14} className={cn('text-gray-400 shrink-0 transition-transform', expandedLaw === law.law && 'rotate-180')} />
                  </button>
                  {expandedLaw === law.law && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{law.summary}</p>
                      <ul className="space-y-1">
                        {law.key_points.map(pt => (
                          <li key={pt} className="text-xs text-gray-500 flex gap-1.5"><span className="text-green-500 shrink-0">•</span>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lawyers */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" /> Εξειδικευμένοι Δικηγόροι
            </h3>
            {lawyers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">⚖️</p>
                <p className="text-sm text-gray-500 mb-3">Σύντομα στη πλατφόρμα</p>
                <p className="text-xs text-gray-400">Εγγράψτε τον δικηγόρο σας στο GlobiPet Legal Network</p>
                <a href="/provider/register" className="btn-primary text-xs px-4 py-2 mt-3 inline-block">Εγγραφή Δικηγόρου</a>
              </div>
            ) : (
              <div className="space-y-3">
                {lawyers.map((l: any) => (
                  <div key={l.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                      {l.provider_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{l.provider_name}</p>
                      <p className="text-xs text-gray-500 truncate">{l.city}</p>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">€{l.price}/ώρα</p>
                    </div>
                    <a href={`/services/${l.id}`} className="btn-ghost p-1.5"><ChevronRight size={16} className="text-gray-400" /></a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Useful links */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">🔗 Χρήσιμοι Σύνδεσμοι</h3>
            <div className="space-y-2">
              {[
                { label: 'ΕΜΖΕ - Εθνικό Μητρώο', url: 'https://emze.gr' },
                { label: 'Ν.4830/2021 - ΦΕΚ', url: 'https://www.e-nomothesia.gr/oikogeneia-katoikidiazoa/nomos-4830-2021.html' },
                { label: 'Δ.Σ. Αθηνών - Νομική Υποστήριξη', url: 'https://www.dsa.gr' },
                { label: 'Ελληνική Φιλοζωική Εταιρεία', url: 'https://hps.gr' },
              ].map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                  <ExternalLink size={12} className="shrink-0" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}