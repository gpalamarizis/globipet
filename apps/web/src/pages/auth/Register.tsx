import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Sparkles, Search, X, Euro } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type Role = 'user' | 'service_provider' | 'both'

const CATEGORY_OPTIONS = [
  { value: 'grooming',    emoji: '✂️', label: 'Grooming',         desc: 'Κούρεμα, μπάνιο, περιποίηση' },
  { value: 'veterinary',  emoji: '🩺', label: 'Κτηνίατρος',        desc: 'Ατομικό κτηνιατρείο' },
  { value: 'clinic',      emoji: '🏥', label: 'Κτηνιατρική κλινική', desc: 'Πλήρης κλινική' },
  { value: 'walking',     emoji: '🚶', label: 'Dog walking',       desc: 'Βόλτες σκύλων' },
  { value: 'sitting',     emoji: '🏡', label: 'Pet sitting',       desc: 'Φύλαξη στο σπίτι' },
  { value: 'boarding',    emoji: '🏨', label: 'Boarding',          desc: 'Διανυκτέρευση' },
  { value: 'daycare',     emoji: '☀️', label: 'Daycare',           desc: 'Ημερήσια φροντίδα' },
  { value: 'training',    emoji: '🎓', label: 'Εκπαίδευση',         desc: 'Εκπαιδευτής' },
  { value: 'transport',   emoji: '🚐', label: 'Μεταφορά',           desc: '' },
  { value: 'photography', emoji: '📷', label: 'Φωτογράφιση',         desc: '' },
  { value: 'other',       emoji: '✨', label: 'Άλλο',              desc: '' },
]

const GROUP_LABELS: Record<string, string> = {
  bathing: '🛁 Μπάνιο', haircut: '✂️ Κούρεμα', addon: '✨ Extras',
  consultation: '🩺 Επισκέψεις', vaccination: '💉 Εμβολιασμοί',
  surgery: '🏥 Χειρουργικές', dental: '🦷 Οδοντιατρικά',
  diagnostics: '🔬 Διαγνωστικά', specialty: '👨‍⚕️ Ειδικότητες',
  oncology: '🎗️ Ογκολογία', service: '🐕 Υπηρεσίες', other: '📋 Άλλα',
}

const SIZE_LABELS: Record<string, string> = {
  small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο'
}

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [showPass, setShowPass] = useState(false)

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [category, setCategory] = useState<string>('')

  const [serviceTitle, setServiceTitle] = useState('')
  const [serviceDesc, setServiceDesc] = useState('')
  const [serviceCity, setServiceCity] = useState('')
  const [serviceLocation, setServiceLocation] = useState('')
  const [homeVisits, setHomeVisits] = useState(false)
  const [emergencyAvail, setEmergencyAvail] = useState(false)
  const [yearsExp, setYearsExp] = useState(0)

  // Map<template_id, { price, duration_minutes }>
  const [selectedMap, setSelectedMap] = useState<Map<string, { price: string; duration_minutes: number }>>(new Map())
  const [presetSearch, setPresetSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')

  const isProvider = role === 'service_provider' || role === 'both'
  const maxStep = isProvider ? 3 : 0

  const { data: templates = [], isLoading: presetsLoading } = useQuery({
    queryKey: ['catalog-preset-register', category],
    queryFn: () => category ? api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []) : Promise.resolve([]),
    enabled: !!category && step >= 3,
  })

  const filtered = useMemo(() => templates.filter((t: any) => {
    if (filterGroup !== 'all' && t.group !== filterGroup) return false
    if (presetSearch && !t.name.toLowerCase().includes(presetSearch.toLowerCase())) return false
    return true
  }), [templates, presetSearch, filterGroup])

  const groups = useMemo(() => Array.from(new Set<string>(templates.map((t: any) => t.group as string))), [templates])

  const toggleTemplate = (tpl: any) => {
    setSelectedMap(prev => {
      const next = new Map(prev)
      if (next.has(tpl.id)) next.delete(tpl.id)
      else next.set(tpl.id, { price: '', duration_minutes: tpl.duration_minutes })
      return next
    })
  }

  const updatePrice = (templateId: string, price: string) => {
    setSelectedMap(prev => {
      const next = new Map(prev)
      const cur = next.get(templateId)
      if (cur) next.set(templateId, { ...cur, price })
      return next
    })
  }

  const missingPrices = Array.from(selectedMap.values()).filter(v => !v.price || parseFloat(v.price) <= 0).length

  const handleNext = async () => {
    if (step === 0) {
      if (!fullName || !email || !password) return toast.error('Συμπλήρωσε όλα τα πεδία')
      if (password !== confirmPassword) return toast.error(t('authExtraLogin.passwordMismatch'))
      if (!isProvider) {
        try { await register({ full_name: fullName, email, password, role }); navigate('/') }
        catch (err: any) { toast.error(err?.response?.data?.message || err.message) }
        return
      }
      try { await register({ full_name: fullName, email, password, role }); setStep(1) }
      catch (err: any) { toast.error(err?.response?.data?.message || err.message) }
      return
    }

    if (step === 1) {
      if (!category) return toast.error('Επέλεξε κατηγορία')
      setStep(2); return
    }

    if (step === 2) {
      if (!serviceTitle) return toast.error('Δώσε ένα όνομα στην υπηρεσία')
      setStep(3); return
    }

    if (step === 3) {
      const packages = Array.from(selectedMap.entries())
        .filter(([, v]) => v.price !== '' && parseFloat(v.price) > 0)
        .map(([template_id, v]) => ({
          template_id, price: parseFloat(v.price), duration_minutes: v.duration_minutes
        }))

      if (selectedMap.size > 0 && missingPrices > 0) {
        return toast.error(`${missingPrices} πακέτα δεν έχουν τιμή`)
      }

      try {
        await api.post('/packages/setup', {
          category, title: serviceTitle, description: serviceDesc,
          city: serviceCity, location: serviceLocation,
          home_visits: homeVisits, emergency_available: emergencyAvail,
          years_experience: yearsExp,
          packages_with_prices: packages,
        })
        toast.success('🎉 Έτοιμοι!')
        navigate('/provider/packages')
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Σφάλμα')
      }
    }
  }

  const skipPackages = async () => {
    try {
      await api.post('/packages/setup', {
        category, title: serviceTitle, description: serviceDesc,
        city: serviceCity, location: serviceLocation,
        home_visits: homeVisits, emergency_available: emergencyAvail,
        years_experience: yearsExp,
        packages_with_prices: [],
      })
      toast.success('Υπηρεσία δημιουργήθηκε. Πρόσθεσε πακέτα όποτε θες.')
      navigate('/provider/packages')
    } catch (err: any) { toast.error(err?.response?.data?.message) }
  }

  const handleBack = () => { if (step > 0) setStep((step - 1) as any) }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 relative">
      <div className="absolute top-4 right-4 z-10"><LanguageSwitcher variant="full" /></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={cn('w-full', step === 0 ? 'max-w-sm' : 'max-w-2xl')}>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🐾</span>
            <span className="font-display font-bold text-2xl text-gradient">GlobiPet</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {step === 0 && t('authExtraLogin.welcomeRegisterTitle')}
            {step === 1 && 'Τι παρέχετε;'}
            {step === 2 && 'Στοιχεία υπηρεσίας'}
            {step === 3 && 'Πακέτα & τιμές'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 3 && 'Επιλέξτε υπηρεσίες και ορίστε τις δικές σας τιμές'}
          </p>
        </div>

        {isProvider && step > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  step >= n ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400')}>
                  {step > n ? <Check size={14}/> : n}
                </div>
                {n < 3 && <div className={cn('w-12 h-0.5 mx-1', step > n ? 'bg-brand-900' : 'bg-gray-200')}/>}
              </div>
            ))}
          </div>
        )}

        <div className="card p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="space-y-2 mb-5">
                  <button onClick={() => window.location.href = `${API}/auth/google`}
                    className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {t('authExtraLogin.registerGoogle')}
                  </button>
                </div>

                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"/></div>
                  <div className="relative text-center text-xs text-gray-400"><span className="bg-white dark:bg-gray-900 px-3">{t('authExtraLogin.orWithEmail')}</span></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.fullName')}</label>
                    <input type="text" className="input" value={fullName} onChange={e => setFullName(e.target.value)} required/>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.email')}</label>
                    <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required/>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.password')}</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} className="input pr-10" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.confirmPassword')}</label>
                    <input type={showPass ? 'text' : 'password'} className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required/>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.iAm')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'user', label: t('authExtraLogin.rolePetOwner'), emoji: '🐾' },
                        { value: 'service_provider', label: t('authExtraLogin.roleProvider'), emoji: '💼' },
                        { value: 'both', label: t('authExtraLogin.roleBoth'), emoji: '🌟' },
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setRole(opt.value as Role)}
                          className={cn('p-2 rounded-xl border text-xs font-medium',
                            role === opt.value ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900' : 'border-gray-200 dark:border-gray-700 text-gray-600')}>
                          <div className="text-lg mb-1">{opt.emoji}</div>{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleNext} disabled={isLoading} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                    {isLoading ? t('authExtraLogin.registering') : isProvider ? <>Συνέχεια <ArrowRight size={16}/></> : t('auth.register')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setCategory(opt.value)}
                    className={cn('p-4 rounded-xl border-2 text-left transition-all',
                      category === opt.value ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
                    <div className="text-3xl mb-2">{opt.emoji}</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                  <input type="text" className="input" value={serviceTitle} onChange={e => setServiceTitle(e.target.value)} required/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Περιγραφή</label>
                  <textarea rows={3} className="input" value={serviceDesc} onChange={e => setServiceDesc(e.target.value)}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Πόλη</label>
                    <input type="text" className="input" value={serviceCity} onChange={e => setServiceCity(e.target.value)}/>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Έτη εμπειρίας</label>
                    <input type="number" className="input" value={yearsExp} onChange={e => setYearsExp(parseInt(e.target.value) || 0)}/>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Διεύθυνση</label>
                  <input type="text" className="input" value={serviceLocation} onChange={e => setServiceLocation(e.target.value)}/>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homeVisits} onChange={e => setHomeVisits(e.target.checked)}/> Κατ' οίκον</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emergencyAvail} onChange={e => setEmergencyAvail(e.target.checked)}/> Έκτακτα</label>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0"/>
                  <span>Επιλέξτε υπηρεσίες και ορίστε τις δικές σας τιμές.</span>
                </div>

                {presetsLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full"/>)}</div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 flex-1 input">
                        <Search size={14} className="text-gray-400 shrink-0"/>
                        <input value={presetSearch} onChange={e => setPresetSearch(e.target.value)} placeholder="Αναζήτηση..."
                          className="flex-1 bg-transparent text-sm outline-none"/>
                      </div>
                      <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input text-sm">
                        <option value="all">Όλα</option>
                        {groups.map(g => <option key={g} value={g}>{GROUP_LABELS[g] || g}</option>)}
                      </select>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2 -mx-2 px-2">
                      {filtered.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Δεν βρέθηκαν</div>
                      ) : filtered.map((tpl: any) => {
                        const selected = selectedMap.get(tpl.id)
                        const isSelected = !!selected
                        return (
                          <div key={tpl.id}
                            className={cn('rounded-xl border-2 transition-all',
                              isSelected ? 'border-brand-900 bg-brand-50/50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700')}>
                            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleTemplate(tpl)}>
                              <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                                isSelected ? 'bg-brand-900 border-brand-900' : 'border-gray-300')}>
                                {isSelected && <Check size={12} className="text-white"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{tpl.name}</p>
                                  {tpl.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[tpl.size]}</span>}
                                  {tpl.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{GROUP_LABELS[tpl.group] || tpl.group} · {tpl.duration_minutes}΄</p>
                              </div>
                            </div>
                            {isSelected && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
                                className="border-t border-brand-200 dark:border-brand-800 px-3 py-2.5 bg-white dark:bg-gray-900 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Η τιμή σας:</label>
                                  <div className="relative flex-1 max-w-[160px]">
                                    <Euro size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="number" step="0.01" min="0" autoFocus
                                      value={selected.price} onChange={e => updatePrice(tpl.id, e.target.value)}
                                      placeholder="0.00" className="input pl-7 py-1.5 text-sm"
                                      onClick={e => e.stopPropagation()}/>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {selectedMap.size > 0 && (
                      <div className="card p-3 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedMap.size} επιλεγμένα</span>
                          {missingPrices > 0 && <span className="text-xs text-amber-600">⚠️ {missingPrices} χωρίς τιμή</span>}
                        </div>
                      </div>
                    )}

                    <button type="button" onClick={skipPackages} className="text-xs text-gray-500 hover:text-gray-700 underline">
                      Παράλειψη — θα τα προσθέσω αργότερα
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {step > 0 && (
            <div className="flex gap-2 mt-6">
              <button onClick={handleBack} className="btn-secondary flex items-center gap-1"><ArrowLeft size={15}/> Πίσω</button>
              <button onClick={handleNext} disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {step === maxStep
                  ? <>✓ Ολοκλήρωση {selectedMap.size > 0 && `(${selectedMap.size - missingPrices})`}</>
                  : <>Συνέχεια <ArrowRight size={15}/></>}
              </button>
            </div>
          )}
        </div>

        {step === 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('authExtraLogin.hasAccount')} <Link to="/login" className="text-brand-900 font-medium hover:underline">{t('auth.login')}</Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
