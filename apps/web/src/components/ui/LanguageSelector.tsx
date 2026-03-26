import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const languages = [
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = languages.find(l => l.code === i18n.language) || languages[0]

  const change = (code: string) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:block text-gray-600 dark:text-gray-400 font-medium">{current.code.toUpperCase()}</span>
        <ChevronDown size={13} className="text-gray-400" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-44 card shadow-modal z-50 py-1 overflow-hidden"
            >
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => change(lang.code)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                    i18n.language === lang.code
                      ? 'text-brand-900 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-900/10'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && <span className="ml-auto text-brand-900">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
