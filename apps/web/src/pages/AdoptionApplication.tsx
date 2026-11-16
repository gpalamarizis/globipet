import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Phone, FileSignature, Printer, PawPrint, CheckCircle2, XCircle, Clock3, PartyPopper } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fmtDateShort } from '@/lib/dates'
import { useAuthStore } from '@/store/auth'
import { APP_STATUS_CLS, Modal, SPECIES_EMOJI, useAdoptionRules, countryName } from '@/components/features/adoption/shared'

/**
 * Μία αίτηση υιοθεσίας — ΚΟΙΝΗ σελίδα για τις δύο πλευρές (ο server λέει
 * ποιος είναι ο θεατής: my_role = lister | applicant). Εδώ γίνονται όλα:
 * μηνύματα, έγκριση/απόρριψη, ολοκλήρωση με τα βήματα του νόμου,
 * συμφωνητικό, μεταφορά στα «Κατοικίδιά μου».
 */
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export default function AdoptionApplicationPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [acks, setAcks] = useState<string[]>([])
  const [cec, setCec] = useState('')
  const [showContract, setShowContract] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  const { data: a, isLoading, isError } = useQuery<any>({
    queryKey: ['adoption-application', id],
    queryFn: () => api.get(`/adoption/applications/${id}`).then(r => r.data.data),
    enabled: !!id, retry: false, refetchInterval: 15000,
  })
  const { data: rules } = useAdoptionRules(a?.listing?.country ?? '')
  const { data: contract } = useQuery<any>({
    queryKey: ['adoption-contract', id, lang],
    queryFn: () => api.get(`/adoption/applications/${id}/contract`, { params: { lang } }).then(r => r.data.data),
    enabled: showContract && !!a?.contract_available,
  })

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [a?.messages?.length])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['adoption-application', id] })
    qc.invalidateQueries({ queryKey: ['adoption-received'] })
    qc.invalidateQueries({ queryKey: ['adoption-mine'] })
    qc.invalidateQueries({ queryKey: ['adoption-my-applications'] })
  }
  const onErr = (e: any) => toast.error(e?.response?.data?.message || t('adoption.common.error'))

  const send = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/messages`, { body: msg }), onSuccess: () => { setMsg(''); refresh() }, onError: onErr })
  const patch = useMutation({ mutationFn: (body: any) => api.patch(`/adoption/applications/${id}`, body), onSuccess: (_d, v: any) => { if ('lister_note' in v && !v.status) toast.success(t('adoption.app.noteSaved')); refresh() }, onError: onErr })
  const withdraw = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/withdraw`, {}), onSuccess: refresh, onError: onErr })
  const complete = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/complete`, { acks, cec_date: cec || null }), onSuccess: () => { toast.success(t('adoption.app.completed')); refresh() }, onError: onErr })
  const addPet = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/add-pet`, {}).then(r => r.data.data), onSuccess: () => { toast.success(t('adoption.app.addedToPets')); refresh() }, onError: onErr })

  if (isLoading) return <div className="page-container py-8"><div className="card h-96 skeleton" /></div>
  if (isError || !a) return <div className="page-container py-16 text-center text-gray-500">{t('adoption.common.error')}</div>

  const lister = a.my_role === 'lister'
  const l = a.listing
  const open = ['pending', 'reviewing', 'approved'].includes(a.status)
  const chatOpen = !(a.status === 'withdrawn' || (a.status === 'rejected' && !lister))
  const allAcks = a.completion.acks.every((k: any) => acks.includes(k.key)) && (!a.completion.cec_required || !!cec || !!a.cec_date)

  const printContract = () => {
    if (!contract) return
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    const sections = contract.sections.map((s: any) => `<h2>${esc(s.heading)}</h2>${s.body.map((b: string) => `<p>${esc(b)}</p>`).join('')}`).join('')
    const sign = contract.signatures.map((s: string) => `<div class="sig"><div class="line"></div>${esc(s)}</div>`).join('')
    w.document.write(`<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><title>${esc(contract.title)}</title><style>
      body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5}
      h1{font-size:22px;margin:0 0 24px}h2{font-size:15px;margin:22px 0 6px}p{margin:3px 0;font-size:14px}
      .sigs{display:flex;gap:48px;margin-top:56px}.sig{flex:1;font-size:13px;text-align:center}.line{border-top:1px solid #111;margin-bottom:6px;height:40px}
      .meta{margin-top:36px;font-size:13px}</style></head><body><h1>${esc(contract.title)}</h1>${sections}
      <p class="meta">${esc(contract.place_date_label)}: ______________________ / ${esc(contract.date)}</p><div class="sigs">${sign}</div>
      <script>window.onload=function(){window.print()}</script></body></html>`)
    w.document.close()
  }

  const StatusIcon = a.status === 'completed' ? PartyPopper : a.status === 'approved' ? CheckCircle2 : ['rejected', 'withdrawn'].includes(a.status) ? XCircle : Clock3
  const answerVal = (k: string, v: any) => {
    if (typeof v === 'boolean') return v ? t('adoption.tristate.yes') : t('adoption.tristate.no')
    if (k === 'country') return countryName(t, String(v))
    if (k === 'housing') return t(`adoption.apply.housing${String(v).charAt(0).toUpperCase()}${String(v).slice(1)}`)
    if (k === 'ownership') return t(`adoption.apply.${v}`)
    return v === null || v === '' ? '—' : String(v)
  }

  return (
    <div className="page-container py-8 space-y-6">
      <Link to={lister ? (user?.role === 'service_provider' ? '/provider?tab=adoption' : '/adoption/manage') : '/adoption/applications'}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft size={16} />{t('adoption.detail.back')}</Link>

      {/* Κεφαλίδα */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-3xl">
          {l.photos?.[0] ? <img src={l.photos[0]} alt="" className="w-full h-full object-cover" /> : SPECIES_EMOJI[l.species]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{t('adoption.app.title')}</p>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white truncate">{l.name}</h1>
          <p className="text-sm text-gray-500 truncate">{lister ? `${t('adoption.app.applicant')}: ${a.applicant_name}` : `${t('adoption.detail.listedBy')}: ${l.lister?.name ?? ''}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon size={18} className={a.status === 'completed' || a.status === 'approved' ? 'text-green-600' : 'text-gray-400'} />
          <span className={APP_STATUS_CLS[a.status]}>{t(`adoption.appStatus.${a.status}`)}</span>
          <Link to={`/adoption/${l.id}`} className="btn-ghost text-sm">{t('adoption.manage.view')}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Μηνύματα πρώτα για τον αιτούντα, μετά από τις απαντήσεις για τον καταχωρίζοντα */}
          {lister && (
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('adoption.app.answers')}</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(a.answers ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 text-sm">
                    <dt className="text-gray-500">{t(`adoption.app.labels.${k}`, { defaultValue: k })}</dt>
                    <dd className="text-gray-900 dark:text-white text-right">{answerVal(k, v)}</dd>
                  </div>
                ))}
              </dl>
              {a.message && <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm"><p className="text-xs text-gray-500 mb-1">{t('adoption.app.message')}</p><p className="whitespace-pre-line text-gray-800 dark:text-gray-200">{a.message}</p></div>}
              {a.applicant_phone && <a href={`tel:${a.applicant_phone}`} className="inline-flex items-center gap-2 text-sm text-brand-900 hover:underline"><Phone size={14} />{a.applicant_phone}</a>}
            </div>
          )}

          <div className="card p-5 flex flex-col h-[520px]">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('adoption.app.chat')}</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" aria-live="polite">
              {a.messages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('adoption.app.chatEmpty')}</p>}
              {a.messages.map((m: any) => (
                <div key={m.id} className={cn('flex', m.is_mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line', m.is_mine ? 'bg-brand-900 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md')}>
                    {m.body}
                    <div className={cn('text-[10px] mt-1', m.is_mine ? 'text-white/70' : 'text-gray-400')}>{new Date(m.created_at).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' })}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {chatOpen ? (
              <form onSubmit={e => { e.preventDefault(); if (msg.trim()) send.mutate() }} className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 mt-3">
                <input value={msg} onChange={e => setMsg(e.target.value)} maxLength={2000} placeholder={t('adoption.app.chatPlaceholder')} className="input flex-1" aria-label={t('adoption.app.chatPlaceholder')} />
                <button type="submit" disabled={!msg.trim() || send.isPending} className="btn-primary px-4 flex items-center gap-2"><Send size={16} /><span className="hidden sm:inline">{t('adoption.app.send')}</span></button>
              </form>
            ) : <p className="text-sm text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800 mt-3">{t('adoption.app.chatClosed')}</p>}
          </div>
        </div>

        {/* Δεξιά στήλη: ενέργειες */}
        <div className="space-y-4">
          {!lister && a.status === 'approved' && <div className="card p-4 bg-green-50 dark:bg-green-900/20 text-sm text-green-800 dark:text-green-200">{t('adoption.app.approvedApplicant')}</div>}
          {a.status === 'rejected' && a.decision_reason === 'listing_adopted' && <div className="card p-4 text-sm text-gray-600">{t('adoption.app.closedAdopted')}</div>}
          {a.status === 'rejected' && a.decision_reason === 'listing_withdrawn' && <div className="card p-4 text-sm text-gray-600">{t('adoption.app.closedWithdrawn')}</div>}

          {lister && open && (
            <div className="card p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {a.status === 'pending' && <button type="button" onClick={() => patch.mutate({ status: 'reviewing' })} className="btn-secondary text-sm">{t('adoption.app.markReviewing')}</button>}
                {a.status !== 'approved' && <button type="button" onClick={() => window.confirm(t('adoption.app.confirmApprove')) && patch.mutate({ status: 'approved' })} className="btn-primary text-sm">{t('adoption.app.approve')}</button>}
                <button type="button" onClick={() => window.confirm(t('adoption.app.confirmReject')) && patch.mutate({ status: 'rejected' })} className="btn-ghost text-sm text-red-600">{t('adoption.app.reject')}</button>
              </div>
            </div>
          )}

          {lister && a.status === 'approved' && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('adoption.app.completeTitle')}</h3>
              <p className="text-sm text-gray-500">{t('adoption.app.completeIntro')}</p>
              {a.completion.acks.map((k: any) => (
                <label key={k.key} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-brand-900 shrink-0" checked={acks.includes(k.key)}
                    onChange={e => setAcks(s => e.target.checked ? [...s, k.key] : s.filter(x => x !== k.key))} />
                  <span>{k.label}</span>
                </label>
              ))}
              {a.completion.cec_required && (
                <div>
                  <label htmlFor="cec" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('adoption.app.cecDate')}</label>
                  <input id="cec" type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={cec || (a.cec_date ? String(a.cec_date).slice(0, 10) : '')} onChange={e => setCec(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">{t('adoption.app.cecHint')}</p>
                </div>
              )}
              <button type="button" onClick={() => complete.mutate()} disabled={!allAcks || complete.isPending} className="btn-primary w-full">{t('adoption.app.complete')}</button>
            </div>
          )}

          {!lister && a.status === 'completed' && (
            <div className="card p-5 space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white">{t('adoption.app.completed')}</p>
              {a.pet_created_id
                ? <Link to={`/my-pets/${a.pet_created_id}`} className="btn-primary w-full text-center block">{t('adoption.app.viewPet')}</Link>
                : <button type="button" onClick={() => addPet.mutate()} disabled={addPet.isPending} className="btn-primary w-full flex items-center justify-center gap-2"><PawPrint size={16} />{t('adoption.app.addToPets')}</button>}
            </div>
          )}

          {a.contract_available && (
            <div className="card p-5 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FileSignature size={16} className="text-indigo-600" />{t('adoption.app.contract')}</h3>
              <p className="text-sm text-gray-500">{t('adoption.app.contractHint')}</p>
              <button type="button" onClick={() => setShowContract(true)} className="btn-secondary w-full text-sm">{t('adoption.app.showContract')}</button>
            </div>
          )}

          {lister && (
            <div className="card p-5 space-y-2">
              <label htmlFor="note" className="font-semibold text-gray-900 dark:text-white block">{t('adoption.app.note')}</label>
              <textarea id="note" className="input resize-none" rows={3} maxLength={2000} placeholder={t('adoption.app.notePlaceholder')}
                value={note ?? a.lister_note ?? ''} onChange={e => setNote(e.target.value)} />
              <button type="button" onClick={() => patch.mutate({ lister_note: note ?? '' })} disabled={note === null} className="btn-secondary text-sm">{t('adoption.app.saveNote')}</button>
            </div>
          )}

          {!lister && open && (
            <button type="button" onClick={() => window.confirm(t('adoption.app.confirmWithdraw')) && withdraw.mutate()} className="btn-ghost w-full text-sm text-red-600">{t('adoption.app.withdraw')}</button>
          )}

          {(a.status === 'approved' || a.status === 'completed') && rules?.guide?.after?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('adoption.app.nextSteps')}</h3>
              <ul className="space-y-2">{rules.guide.after.map((i: any, k: number) => <li key={k} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2"><span className="text-brand-900">•</span>{i.text}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">{t('adoption.apps.submitted', { date: fmtDateShort(a.created_at, lang) })}</p>
        </div>
      </div>

      {showContract && (
        <Modal title={t('adoption.app.contract')} onClose={() => setShowContract(false)} wide>
          {!contract ? <div className="skeleton h-64" /> : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{contract.title}</h2>
              {contract.sections.map((s: any) => (
                <div key={s.heading}>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{s.heading}</h3>
                  {s.body.map((b: string, i: number) => <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{b}</p>)}
                </div>
              ))}
              <div className="flex justify-end"><button type="button" onClick={printContract} className="btn-primary flex items-center gap-2"><Printer size={16} />{t('adoption.app.printContract')}</button></div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
