import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', name: 'English',  flag: '🇬🇧' },
  { code: 'es', name: 'Español',  flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文',      flag: '🇨🇳' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (translations: { name?: Record<string, string>; description?: Record<string, string> }) => void
  initialName?: Record<string, string>
  initialDescription?: Record<string, string>
  // Default Greek values to display alongside
  defaultName?: string
  defaultDescription?: string
  // Which fields to show
  fields?: ('name' | 'description')[]
  title?: string
}

export default function TranslationEditor({
  open,
  onClose,
  onSave,
  initialName,
  initialDescription,
  defaultName,
  defaultDescription,
  fields = ['name', 'description'],
  title = 'Επεξεργασία μεταφράσεων',
}: Props) {
  const [activeLang, setActiveLang] = useState<string>('en')
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({})
  const [descTranslations, setDescTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setNameTranslations({ el: defaultName || '', ...(initialName || {}) })
      setDescTranslations({ el: defaultDescription || '', ...(initialDescription || {}) })
    }
  }, [open, initialName, initialDescription, defaultName, defaultDescription])

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSave = () => {
    const result: any = {}
    if (fields.includes('name')) {
      // Don't include the Greek (default) in translations
      const { el: _, ...rest } = nameTranslations
      result.name = rest
    }
    if (fields.includes('description')) {
      const { el: _, ...rest } = descTranslations
      result.description = rest
    }
    onSave(result)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            {/* Language tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
              {LANGUAGES.filter(l => l.code !== 'el').map(lang => {
                const hasTranslation = (
                  (!fields.includes('name') || !!nameTranslations[lang.code]?.trim()) &&
                  (!fields.includes('description') || !!descTranslations[lang.code]?.trim())
                )
                return (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLang(lang.code)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeLang === lang.code
                        ? 'border-brand-900 text-brand-900 dark:text-brand-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {hasTranslation && <Check size={12} className="text-green-500" />}
                  </button>
                )
              })}
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Greek (default - readonly) */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🇬🇷</span>
                  <span className="text-sm font-medium text-gray-500">Ελληνικά (default)</span>
                </div>
                {fields.includes('name') && (
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 mb-1 block">Όνομα</label>
                    <input type="text" className="input bg-white dark:bg-gray-900" value={defaultName || ''} readOnly />
                  </div>
                )}
                {fields.includes('description') && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Περιγραφή</label>
                    <textarea className="input bg-white dark:bg-gray-900 resize-none" rows={3} value={defaultDescription || ''} readOnly />
                  </div>
                )}
              </div>

              {/* Selected language editor */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{LANGUAGES.find(l => l.code === activeLang)?.flag}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {LANGUAGES.find(l => l.code === activeLang)?.name}
                  </span>
                </div>
                {fields.includes('name') && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Όνομα</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={`Μετάφραση στα ${LANGUAGES.find(l => l.code === activeLang)?.name}`}
                      value={nameTranslations[activeLang] || ''}
                      onChange={(e) => setNameTranslations({ ...nameTranslations, [activeLang]: e.target.value })}
                    />
                  </div>
                )}
                {fields.includes('description') && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Περιγραφή</label>
                    <textarea
                      className="input resize-none"
                      rows={5}
                      placeholder={`Μετάφραση στα ${LANGUAGES.find(l => l.code === activeLang)?.name}`}
                      value={descTranslations[activeLang] || ''}
                      onChange={(e) => setDescTranslations({ ...descTranslations, [activeLang]: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500">
                💡 Αφήστε άδειο για να χρησιμοποιηθεί η ελληνική έκδοση
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Ακύρωση</button>
                <button onClick={handleSave} className="btn-primary">Αποθήκευση μεταφράσεων</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
