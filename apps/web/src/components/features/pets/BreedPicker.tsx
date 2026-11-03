import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { localName } from '@/lib/localName'

/**
 * Πεδίο «Ράτσα» με προτάσεις από τον κατάλογο (/breeds), με φωτογραφία.
 *
 * Το πεδίο μένει ελεύθερο κείμενο (ημίαιμα, σπάνιες ράτσες, πουλιά…): οι
 * προτάσεις απλώς βοηθούν στην επιλογή και στη σωστή γραφή. Για είδη χωρίς
 * κατάλογο (ό,τι δεν είναι σκύλος ή γάτα) δεν γίνεται καμία αναζήτηση.
 */
export default function BreedPicker({ species, value, onChange, placeholder }: {
  species: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const hasCatalog = species === 'dog' || species === 'cat'

  // Ένα αίτημα όταν σταματήσει η πληκτρολόγηση.
  useEffect(() => {
    const h = setTimeout(() => setQ(value.trim()), 250)
    return () => clearTimeout(h)
  }, [value])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const { data } = useQuery({
    queryKey: ['breed-picker', species, q],
    queryFn: () => api.get('/breeds', { params: { species, q: q || undefined, limit: 8 } }).then(r => r.data?.data ?? []),
    enabled: open && hasCatalog,
    staleTime: 5 * 60_000,
  })
  const items: any[] = Array.isArray(data) ? data : []
  const mixed = t('cmpAddPet.breedMixed')

  return (
    <div ref={box} className="relative">
      <input
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Tab') setOpen(false) }}
      />
      {open && hasCatalog && (
        <div className="absolute left-0 top-full mt-1 z-30 w-[min(18rem,calc(100vw-3rem))] max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <p className="px-3 pt-2 pb-1 text-[11px] text-gray-400">{t('cmpAddPet.breedHint')}</p>
          {items.map(b => {
            const label = localName(b, i18n.language)
            return (
              <button key={b.id} type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(label); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-orange-50 dark:hover:bg-gray-800">
                {b.image_url
                  ? <img src={b.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0" />
                  : <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      {b.species === 'cat' ? '🐱' : '🐶'}
                    </span>}
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 dark:text-white truncate">{label}</span>
                  {label !== b.name && <span className="block text-[11px] text-gray-400 truncate">{b.name}</span>}
                </span>
              </button>
            )
          })}
          <button type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(mixed); setOpen(false) }}
            className="w-full px-3 py-2 text-left text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-gray-800">
            {mixed}
          </button>
        </div>
      )}
    </div>
  )
}
