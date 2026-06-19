import { useState, useRef } from 'react'
import { Camera, Upload, X, FlaskConical, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { api, uploadFile } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type SampleType = 'stool' | 'urine'
type Species = 'dog' | 'cat'

interface AnalysisResult {
  sample_type: SampleType
  severity: 'normal' | 'mild' | 'moderate' | 'severe'
  color: string
  consistency?: string
  findings: string[]
  likely_causes: string[]
  context_factors: string[]
  comparison_sources: string[]
  recommendation: string
  vet_urgency: 'routine' | 'within_48h' | 'today' | 'emergency'
  vet_urgency_el: string
  home_care: string[]
  warning_signs: string[]
  disclaimer: string
}

const SEVERITY_CONFIG = {
  normal:   { label: 'Φυσιολογικό',  color: 'text-green-700 bg-green-50 border-green-200',  icon: CheckCircle,    iconColor: 'text-green-500' },
  mild:     { label: 'Ήπιο',          color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Info,          iconColor: 'text-yellow-500' },
  moderate: { label: 'Μέτριο',        color: 'text-orange-700 bg-orange-50 border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-500' },
  severe:   { label: 'Σοβαρό',        color: 'text-red-700 bg-red-50 border-red-200',         icon: AlertTriangle, iconColor: 'text-red-500' },
}

const URGENCY_CONFIG = {
  routine:    { color: 'bg-green-100 text-green-800' },
  within_48h: { color: 'bg-yellow-100 text-yellow-800' },
  today:      { color: 'bg-orange-100 text-orange-800' },
  emergency:  { color: 'bg-red-100 text-red-800' },
}

function renderItem(item: any): string {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') return Object.values(item).filter(v => typeof v === 'string').join(' — ')
  return String(item)
}

export default function AiStoolUrine() {
  const [sampleType, setSampleType] = useState<SampleType>('stool')
  const [species, setSpecies] = useState<Species>('dog')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // History form fields
  const [form, setForm] = useState({
    breed: '',
    age_years: '',
    weight_kg: '',
    is_sterilized: '' as '' | 'true' | 'false',
    ate_from_street: false,
    recent_medications: '',
    diet_change: '',
    last_normal_stool: '',
    symptoms: '',
    additional_notes: '',
  })

  // Load user's pets to pre-fill data
  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'stool-urine')
      setImageUrl(url)
    } catch {
      toast.error('Σφάλμα κατά το ανέβασμα της εικόνας')
    } finally {
      setUploading(false)
    }
  }

  const handlePetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pet = pets.find((p: any) => p.id === e.target.value)
    if (!pet) return
    setSpecies(pet.species === 'cat' ? 'cat' : 'dog')
    setForm(f => ({
      ...f,
      breed: pet.breed || '',
      age_years: pet.age != null ? String(pet.age) : '',
      weight_kg: pet.weight != null ? String(pet.weight) : '',
    }))
  }

  const handleAnalyze = async () => {
    if (!imageUrl) return toast.error('Ανέβασε πρώτα μια φωτογραφία')
    setAnalyzing(true)
    setResult(null)
    try {
      const payload = {
        image_url: imageUrl,
        sample_type: sampleType,
        species,
        breed: form.breed || undefined,
        age_years: form.age_years ? Number(form.age_years) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        is_sterilized: form.is_sterilized === '' ? undefined : form.is_sterilized === 'true',
        ate_from_street: form.ate_from_street || undefined,
        recent_medications: form.recent_medications || undefined,
        diet_change: form.diet_change || undefined,
        last_normal_stool: form.last_normal_stool || undefined,
        symptoms: form.symptoms || undefined,
        additional_notes: form.additional_notes || undefined,
      }
      const res = await api.post('/ai/stool-urine', payload)
      setResult(res.data)
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα ανάλυσης')
    } finally {
      setAnalyzing(false)
    }
  }

  const sev = result ? SEVERITY_CONFIG[result.severity] : null
  const urg = result ? URGENCY_CONFIG[result.vet_urgency] : null

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <FlaskConical size={20} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">AI Ανάλυση Ούρων & Περιττωμάτων</h1>
          <p className="text-sm text-gray-500">Ανέβασε φωτογραφία για κτηνιατρική αξιολόγηση με AI</p>
        </div>
      </div>

      {/* Sample type + Species selector */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Τύπος Δείγματος</p>
          <div className="flex gap-2">
            {([['stool','💩','Περιττώματα'],['urine','💧','Ούρα']] as const).map(([v, em, lb]) => (
              <button key={v} onClick={() => setSampleType(v)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', sampleType === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Είδος</p>
          <div className="flex gap-2">
            {([['dog','🐶','Σκύλος'],['cat','🐱','Γάτα']] as const).map(([v, em, lb]) => (
              <button key={v} onClick={() => setSpecies(v)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', species === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Photo upload */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Φωτογραφία</p>
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="sample" className="w-full max-h-64 object-contain rounded-xl bg-gray-50 dark:bg-gray-800" />
            <button onClick={() => { setImageUrl(null); setResult(null) }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center hover:bg-red-50">
              <X size={14} className="text-gray-600" />
            </button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()}
            className="h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal-400 transition-colors">
            {uploading
              ? <Loader2 size={24} className="text-teal-500 animate-spin" />
              : <>
                  <div className="flex gap-3">
                    <Camera size={20} className="text-gray-400" />
                    <Upload size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Κάνε κλικ για φωτογραφία ή ανέβασμα</p>
                  <p className="text-xs text-gray-400">Τράβηξε από κοντά, με καλό φωτισμό</p>
                </>}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* History form */}
      <div className="card mb-4 overflow-hidden">
        <button onClick={() => setShowHistory(h => !h)}
          className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Ιστορικό Ζώου</p>
            <p className="text-xs text-gray-500 mt-0.5">Προαιρετικό αλλά βελτιώνει σημαντικά την ανάλυση</p>
          </div>
          {showHistory ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showHistory && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">

            {/* Pre-fill from pets */}
            {pets.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Συμπλήρωση από υπάρχον κατοικίδιο</label>
                <select onChange={handlePetSelect} defaultValue=""
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">— Επίλεξε κατοικίδιο —</option>
                  {pets.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ράτσα</label>
                <input value={form.breed} onChange={e => setForm(f => ({...f, breed: e.target.value}))}
                  placeholder="π.χ. Labrador" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ηλικία (έτη)</label>
                <input type="number" min="0" max="25" value={form.age_years} onChange={e => setForm(f => ({...f, age_years: e.target.value}))}
                  placeholder="π.χ. 4" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Βάρος (kg)</label>
                <input type="number" min="0" value={form.weight_kg} onChange={e => setForm(f => ({...f, weight_kg: e.target.value}))}
                  placeholder="π.χ. 12" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Στείρωση</label>
                <select value={form.is_sterilized} onChange={e => setForm(f => ({...f, is_sterilized: e.target.value as any}))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">Άγνωστο</option>
                  <option value="true">Ναι, στειρωμένο</option>
                  <option value="false">Όχι</option>
                </select>
              </div>
            </div>

            {/* Boolean: ate from street */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.ate_from_street} onChange={e => setForm(f => ({...f, ate_from_street: e.target.checked}))}
                className="w-4 h-4 rounded accent-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Έφαγε κάτι από τον δρόμο ή άγνωστη τροφή πρόσφατα</span>
            </label>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατα φάρμακα / αντιπαρασιτικά</label>
              <input value={form.recent_medications} onChange={e => setForm(f => ({...f, recent_medications: e.target.value}))}
                placeholder="π.χ. Nexgard πριν 3 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατη αλλαγή διατροφής</label>
              <input value={form.diet_change} onChange={e => setForm(f => ({...f, diet_change: e.target.value}))}
                placeholder="π.χ. άλλαξα σε Royal Canin πριν 5 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πότε ήταν τα τελευταία φυσιολογικά περιττώματα;</label>
              <input value={form.last_normal_stool} onChange={e => setForm(f => ({...f, last_normal_stool: e.target.value}))}
                placeholder="π.χ. χθες το πρωί" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Άλλα συμπτώματα που παρατήρησες</label>
              <textarea value={form.symptoms} onChange={e => setForm(f => ({...f, symptoms: e.target.value}))}
                placeholder="π.χ. λήθαργος, εμετός, αρνείται φαγητό, πολυδιψία..." rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Επιπλέον πληροφορίες</label>
              <textarea value={form.additional_notes} onChange={e => setForm(f => ({...f, additional_notes: e.target.value}))}
                placeholder="π.χ. πρόσφατα ταξίδι, επαφή με άλλα ζώα, stress..." rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={handleAnalyze} disabled={!imageUrl || analyzing}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 mb-8 disabled:opacity-50">
        {analyzing
          ? <><Loader2 size={18} className="animate-spin" /> Ανάλυση σε εξέλιξη...</>
          : <><FlaskConical size={18} /> Ανάλυση με AI</>}
      </button>

      {/* Result */}
      {result && sev && urg && (
        <div className="space-y-4">
          {/* Severity badge */}
          <div className={cn('card p-5 border flex items-start gap-4', sev.color)}>
            <sev.icon size={22} className={cn('shrink-0 mt-0.5', sev.iconColor)} />
            <div>
              <p className="font-bold text-lg">{sev.label}</p>
              <p className="text-sm mt-1">{result.recommendation}</p>
            </div>
          </div>

          {/* Urgency + summary */}
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Επείγον</p>
              <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-bold', urg.color)}>{result.vet_urgency_el}</span>
            </div>
            {result.color && (
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Χρώμα</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.color}</p>
              </div>
            )}
            {result.consistency && (
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Σύσταση</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.consistency}</p>
              </div>
            )}
          </div>

          {/* Findings */}
          {result.findings?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🔍 Ευρήματα</p>
              <ul className="space-y-1.5">
                {result.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-teal-500 mt-0.5 shrink-0">•</span>{renderItem(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Likely causes */}
          {result.likely_causes?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💡 Πιθανές Αιτίες</p>
              <ul className="space-y-1.5">
                {result.likely_causes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Context factors */}
          {result.context_factors?.length > 0 && (
            <div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">📋 Επίδραση Ιστορικού</p>
              <ul className="space-y-1.5">
                {result.context_factors.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Home care */}
          {result.home_care?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🏠 Τι Κάνεις στο Σπίτι</p>
              <ul className="space-y-1.5">
                {result.home_care.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>{renderItem(h)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning signs */}
          {result.warning_signs?.length > 0 && (
            <div className="card p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Πήγαινε Αμέσως σε Κτηνίατρο Αν...</p>
              <ul className="space-y-1.5">
                {result.warning_signs.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          {result.comparison_sources?.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Πηγές Αναφοράς</p>
              <ul className="space-y-1">
                {result.comparison_sources.map((s, i) => (
                  <li key={i} className="text-xs text-gray-400">{renderItem(s)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center px-4 pb-4">{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}