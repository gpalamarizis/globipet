import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Stethoscope, Eye, Microscope, AlertTriangle, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import { api, uploadFile } from '@/lib/api'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

type AnalysisType = 'skin' | 'eye'

interface AnalysisResult {
  severity: 'low' | 'medium' | 'high'
  findings: string[]
  recommendation: string
  urgency: string
  conditions: string[]
  disclaimer: string
}

const analysisTypes = [
  {
    id: 'skin' as AnalysisType,
    icon: Microscope,
    title: 'Ανάλυση Δέρματος',
    description: 'Ανίχνευση δερματικών παθήσεων, εξανθημάτων, τριχόπτωσης',
    color: 'orange',
    examples: ['Εξάνθημα / Ερεθισμός', 'Τριχόπτωση', 'Τραύμα / Πληγή', 'Παράσιτα', 'Αλλεργία'],
  },
  {
    id: 'eye' as AnalysisType,
    icon: Eye,
    title: 'Ανάλυση Ματιών',
    description: 'Ανίχνευση οφθαλμολογικών προβλημάτων και παθήσεων',
    color: 'blue',
    examples: ['Ερυθρότητα / Φλεγμονή', 'Έκκριση', 'Θολερότητα', 'Οίδημα βλεφάρου', 'Κερατίτιδα'],
  },
]

export default function AiPetHealth() {
  const [step, setStep] = useState<'select' | 'upload' | 'analyzing' | 'result'>('select')
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectType = (type: AnalysisType) => {
    setAnalysisType(type)
    setStep('upload')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const objectUrl = URL.createObjectURL(file)
    setImageUrl(objectUrl)
  }

  const handleAnalyze = async () => {
    if (!imageFile || !analysisType) return
    setStep('analyzing')
    try {
      setUploading(true)
      const uploadedUrl = await uploadFile(imageFile, 'ai-health')
      setUploading(false)

      const { data } = await api.post('/ai/pet-health', {
        image_url: uploadedUrl,
        analysis_type: analysisType,
      })
      setResult(data)
      setStep('result')
    } catch (err: any) {
      toast.error('Σφάλμα κατά την ανάλυση')
      setStep('upload')
      setUploading(false)
    }
  }

  const handleReset = () => {
    setStep('select')
    setAnalysisType(null)
    setImageUrl(null)
    setImageFile(null)
    setResult(null)
  }

  const severityConfig = {
    low: { color: 'green', label: 'Χαμηλή ανησυχία', icon: CheckCircle },
    medium: { color: 'orange', label: 'Μέτρια ανησυχία', icon: AlertTriangle },
    high: { color: 'red', label: 'Υψηλή ανησυχία', icon: AlertTriangle },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Pet Health Assistant</h1>
          <p className="text-gray-500 dark:text-gray-400">Ανάλυση φωτογραφιών με τεχνητή νοημοσύνη για έγκαιρη διάγνωση</p>
        </div>

        <AnimatePresence mode="wait">

          {/* Step 1: Select type */}
          {step === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {analysisTypes.map(type => (
                  <button key={type.id} onClick={() => handleSelectType(type.id)}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-left border-2 border-transparent hover:border-orange-400 transition-all shadow-sm hover:shadow-md group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${type.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                      <type.icon size={24} className={type.color === 'orange' ? 'text-orange-500' : 'text-blue-500'} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{type.description}</p>
                    <div className="space-y-1">
                      {type.examples.map(ex => (
                        <div key={ex} className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          {ex}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-orange-500 text-sm font-medium group-hover:gap-2 transition-all">
                      Επιλογή <ChevronRight size={16} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                <strong>⚠️ Σημαντικό:</strong> Το AI assistant παρέχει ενδεικτική ανάλυση και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο. Σε περίπτωση αμφιβολίας, επικοινωνήστε με εξειδικευμένο κτηνίατρο.
              </div>
            </motion.div>
          )}

          {/* Step 2: Upload */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm mb-4">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={handleReset} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X size={18} className="text-gray-400" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {analysisType === 'skin' ? '🔬 Ανάλυση Δέρματος' : '👁️ Ανάλυση Ματιών'}
                    </h2>
                    <p className="text-sm text-gray-400">Ανεβάστε φωτογραφία για ανάλυση</p>
                  </div>
                </div>

                {!imageUrl ? (
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-400 transition-colors">
                    <Camera size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium mb-1">Κλικ για επιλογή φωτογραφίας</p>
                    <p className="text-gray-400 text-sm">JPG, PNG έως 5MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img src={imageUrl} alt="preview" className="w-full max-h-80 object-contain rounded-xl bg-gray-100 dark:bg-gray-800" />
                    <button onClick={() => { setImageUrl(null); setImageFile(null) }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">
                      <X size={16} />
                    </button>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                {imageUrl && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-500">
                      <strong className="text-gray-700 dark:text-gray-300">Συμβουλές για καλύτερα αποτελέσματα:</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {analysisType === 'skin'
                          ? ['Φωτογραφίστε κοντά στην πάσχουσα περιοχή', 'Καλός φωτισμός χωρίς φλας', 'Η περιοχή να είναι καθαρή']
                          : ['Κρατήστε το μάτι ανοιχτό', 'Φυσικό φως χωρίς λάμψη', 'Φωτογραφίστε και τα δύο μάτια αν υπάρχει σύγκριση']
                        }
                      </ul>
                    </div>
                    <button onClick={handleAnalyze}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <Stethoscope size={18} />
                      Εκκίνηση Ανάλυσης AI
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Analyzing */}
          {step === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Stethoscope size={36} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ανάλυση σε εξέλιξη...</h2>
              <p className="text-gray-400 mb-6">{uploading ? 'Μεταφόρτωση φωτογραφίας...' : 'Το AI αναλύει την εικόνα...'}</p>
              <div className="flex justify-center gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {(() => {
                const sev = severityConfig[result.severity]
                return (
                  <div className="space-y-4">
                    {/* Severity banner */}
                    <div className={`rounded-2xl p-5 flex items-center gap-4 ${
                      result.severity === 'low' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                      result.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <sev.icon size={32} className={
                        result.severity === 'low' ? 'text-green-500' :
                        result.severity === 'medium' ? 'text-orange-500' : 'text-red-500'
                      } />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{sev.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.urgency}</p>
                      </div>
                    </div>

                    {/* Findings */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Ευρήματα</h3>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Possible conditions */}
                    {result.conditions.length > 0 && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📋 Πιθανές Παθήσεις</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.conditions.map((c, i) => (
                            <span key={i} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-sm">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Σύσταση</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{result.recommendation}</p>
                    </div>

                    {/* CTA */}
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white">
                      <h3 className="font-semibold mb-1">Θέλετε επαγγελματική γνώμη;</h3>
                      <p className="text-sm text-orange-100 mb-3">Συνδεθείτε με εξειδικευμένο κτηνίατρο τώρα</p>
                      <Link to="/telehealth" className="block w-full py-2.5 bg-white text-orange-600 rounded-xl font-medium text-center text-sm hover:bg-orange-50 transition-colors">
                        Τηλεϊατρική Συνεδρία →
                      </Link>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-gray-400 text-center px-4">{result.disclaimer}</div>

                    <button onClick={handleReset} className="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Νέα Ανάλυση
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
