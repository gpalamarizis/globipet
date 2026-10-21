import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Send, ChevronDown, ChevronRight, AlertTriangle, BookOpen, Users, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const GREEK_LAWS = [
  {
    id: 'n4830',
    lawKey: 'pgLegal.laws.n4830',
    titleKey: 'pgLegal.laws.n4830Title',
    year: 2021,
    summaryKey: 'pgLegal.laws.n4830Summary',
    pointKeys: [
      'pgLegal.laws.n4830P1',
      'pgLegal.laws.n4830P2',
      'pgLegal.laws.n4830P3',
      'pgLegal.laws.n4830P4',
      'pgLegal.laws.n4830P5',
    ],
    color: '#E65100',
  },
  {
    id: 'n4039',
    lawKey: 'pgLegal.laws.n4039',
    titleKey: 'pgLegal.laws.n4039Title',
    year: 2012,
    summaryKey: 'pgLegal.laws.n4039Summary',
    pointKeys: [
      'pgLegal.laws.n4039P1',
      'pgLegal.laws.n4039P2',
      'pgLegal.laws.n4039P3',
      'pgLegal.laws.n4039P4',
    ],
    color: '#1D4ED8',
  },
  {
    id: 'ak924',
    lawKey: 'pgLegal.laws.ak924',
    titleKey: 'pgLegal.laws.ak924Title',
    year: null,
    summaryKey: 'pgLegal.laws.ak924Summary',
    pointKeys: [
      'pgLegal.laws.ak924P1',
      'pgLegal.laws.ak924P2',
      'pgLegal.laws.ak924P3',
    ],
    color: '#7C3AED',
  },
]

const COMMON_QUESTION_KEYS = [
  'pgLegal.questions.q1',
  'pgLegal.questions.q2',
  'pgLegal.questions.q3',
  'pgLegal.questions.q4',
  'pgLegal.questions.q5',
  'pgLegal.questions.q6',
  'pgLegal.questions.q7',
]

export default function PetLegalPage() {
  const { t } = useTranslation()
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
    onError: (e: any) => toast.error(e?.response?.data?.message || t('pgLegal.errAsk')),
  })

  const handleAsk = (q: string) => {
    if (!q.trim()) return
    setAnswer(null)
    askAI.mutate(q)
  }

  const urgencyColor = (u: string) => ({ low: '#10B981', medium: '#F59E0B', high: '#EF4444' }[u] || '#6B7280')
  const urgencyLabel = (u: string) => ({ low: t('pgLegal.urgencyLow'), medium: t('pgLegal.urgencyMedium'), high: t('pgLegal.urgencyHigh') }[u] || u)

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <Scale size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('pgLegal.title')}</h1>
          <p className="text-sm text-gray-500">{t('pgLegal.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main AI Chat */}
        <div className="lg:col-span-2 space-y-5">

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('pgLegal.disclaimerPre')}<strong>{t('pgLegal.disclaimerStrong')}</strong>{t('pgLegal.disclaimerPost')}
            </p>
          </div>

          {/* Question box */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('pgLegal.askTitle')}</p>
            <div className="flex gap-2">
              <textarea
                value={question}
                maxLength={2000}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(question) } }}
                placeholder={t('pgLegal.placeholder')}
                className="input flex-1 resize-none text-sm"
                rows={3}
              />
              <button onClick={() => handleAsk(question)} disabled={!question.trim() || askAI.isPending}
                className="btn-primary px-4 py-2 h-fit flex items-center gap-2 self-end">
                {askAI.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                {t('pgLegal.ask')}
              </button>
            </div>

            {/* Quick questions */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">{t('pgLegal.commonQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_QUESTION_KEYS.slice(0, 4).map(k => t(k)).map(q => (
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
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('pgLegal.processing')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('pgLegal.checkingLaw')}</p>
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
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('pgLegal.advisorName')}</span>
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
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">{t('pgLegal.relevantLaws')}</p>
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
                      <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-2">{t('pgLegal.practicalSteps')}</p>
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
                      <p className="text-xs text-red-700 dark:text-red-400">⚠️ <strong>{t('pgLegal.lawyerRecommended')}</strong>{t('pgLegal.lawyerRecommendedRest')}</p>
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
              <p className="text-xs text-gray-400 font-medium">{t('pgLegal.previousQuestions')}</p>
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
              <BookOpen size={16} className="text-indigo-600" /> {t('pgLegal.keyLaws')}
            </h3>
            <div className="space-y-2">
              {GREEK_LAWS.map(law => (
                <div key={law.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedLaw(expandedLaw === law.id ? null : law.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white shrink-0" style={{ backgroundColor: law.color }}>{t(law.lawKey)}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">{t(law.titleKey)}</span>
                    </div>
                    <ChevronDown size={14} className={cn('text-gray-400 shrink-0 transition-transform', expandedLaw === law.id && 'rotate-180')} />
                  </button>
                  {expandedLaw === law.id && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t(law.summaryKey)}</p>
                      <ul className="space-y-1">
                        {law.pointKeys.map(pt => (
                          <li key={pt} className="text-xs text-gray-500 flex gap-1.5"><span className="text-green-500 shrink-0">•</span>{t(pt)}</li>
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
              <Users size={16} className="text-indigo-600" /> {t('pgLegal.specialistLawyers')}
            </h3>
            {lawyers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">⚖️</p>
                <p className="text-sm text-gray-500 mb-3">{t('pgLegal.comingSoon')}</p>
                <p className="text-xs text-gray-400">{t('pgLegal.registerLawyerHint')}</p>
                <a href="/register?role=service_provider" className="btn-primary text-xs px-4 py-2 mt-3 inline-block">{t('pgLegal.registerLawyer')}</a>
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
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">{t('pgLegal.pricePerHour', { price: l.price })}</p>
                    </div>
                    <a href={`/services/${l.id}`} className="btn-ghost p-1.5"><ChevronRight size={16} className="text-gray-400" /></a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Useful links */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">{t('pgLegal.usefulLinks')}</h3>
            <div className="space-y-2">
              {[
                { label: t('pgLegal.links.emze'), url: 'https://emze.gr' },
                { label: t('pgLegal.links.fek'), url: 'https://www.e-nomothesia.gr/oikogeneia-katoikidiazoa/nomos-4830-2021.html' },
                { label: t('pgLegal.links.dsa'), url: 'https://www.dsa.gr' },
                { label: t('pgLegal.links.hps'), url: 'https://hps.gr' },
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