import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const LANGUAGES = [
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', name: 'English',  flag: '🇬🇧' },
  { code: 'es', name: 'Español',  flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文',      flag: '🇨🇳' },
]

interface Props {
  variant?: 'compact' | 'full'
  onLanguageChange?: (lang: string) => void
}

export default function LanguageSwitcher({ variant = 'compact', onLanguageChange }: Props) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (code: string) => {
    await i18n.changeLanguage(code)
    localStorage.setItem('globipet_language', code)
    setOpen(false)
    onLanguageChange?.(code)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {variant === 'compact' ? (
          <>
            <Globe size={16} />
            <span className="hidden sm:inline">{currentLang.flag}</span>
          </>
        ) : (
          <>
            <span className="text-base">{currentLang.flag}</span>
            <span>{currentLang.name}</span>
          </>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50"
          >
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.name}</span>
                {i18n.language === lang.code && <Check size={14} className="text-brand-900" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
