import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, RotateCcw, Eye, Layout, Home, Scale, Video, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SECTIONS = [
  {
    id: 'home',
    label: 'Αρχική Σελίδα',
    icon: Home,
    preview: 'globipet.com',
    fields: [
      { key: 'tagline',            label: 'Tagline (badge πάνω από τίτλο)', type: 'text', placeholder: '#1 Pet Super-App' },
      { key: 'hero_title_1',       label: 'Τίτλος — γραμμή 1 (πορτοκαλί)', type: 'text', placeholder: 'Η καλύτερη' },
      { key: 'hero_title_2',       label: 'Τίτλος — γραμμή 2 (πορτοκαλί)', type: 'text', placeholder: 'καλύτερους φίλους' },
      { key: 'hero_subtitle',      label: 'Υπότιτλος', type: 'text', placeholder: 'Το all-in-one pet super-app...' },
      { key: 'hero_cta',           label: 'Κουμπί CTA', type: 'text', placeholder: 'Ξεκινήστε Τώρα' },
      { key: 'stat_users',         label: 'Στατιστικό — Χρήστες', type: 'text', placeholder: '50K+' },
      { key: 'stat_users_label',   label: 'Ετικέτα Χρηστών', type: 'text', placeholder: 'Χρήστες' },
      { key: 'stat_providers',     label: 'Στατιστικό — Πάροχοι', type: 'text', placeholder: '2K+' },
      { key: 'stat_providers_label', label: 'Ετικέτα Παρόχων', type: 'text', placeholder: 'Πάροχοι' },
      { key: 'stat_pets',          label: 'Στατιστικό — Κατοικίδια', type: 'text', placeholder: '120K+' },
      { key: 'stat_pets_label',    label: 'Ετικέτα Κατοικιδίων', type: 'text', placeholder: 'Κατοικίδια' },
      { key: 'stat_rating',        label: 'Στατιστικό — Βαθμολογία', type: 'text', placeholder: '4.9★' },
      { key: 'stat_rating_label',  label: 'Ετικέτα Βαθμολογίας', type: 'text', placeholder: 'Βαθμολογία' },
      { key: 'services_title',     label: 'Τίτλος Ενότητας Υπηρεσιών', type: 'text', placeholder: 'Υπηρεσίες' },
      { key: 'services_subtitle',  label: 'Υπότιτλος Ενότητας Υπηρεσιών', type: 'text', placeholder: 'Βρες τον καλύτερο πάροχο κοντά σου' },
      { key: 'marquee_text',       label: 'Κυλιόμενο Κείμενο (marquee)', type: 'text', placeholder: 'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο' },
    ],
  },
  {
    id: 'general',
    label: 'Γενικές Ρυθμίσεις',
    icon: Info,
    preview: 'Όλες οι σελίδες',
    fields: [
      { key: 'site_name',      label: 'Όνομα Site', type: 'text', placeholder: 'GlobiPet' },
      { key: 'tagline',        label: 'Tagline', type: 'text', placeholder: '#1 Pet Super-App' },
      { key: 'footer_slogan',  label: 'Footer Slogan', type: 'text', placeholder: 'Best care for the best human\'s friends' },
      { key: 'contact_email',  label: 'Email Επικοινωνίας', type: 'text', placeholder: 'info@globipet.com' },
    ],
  },
  {
    id: 'telehealth',
    label: 'Τηλεϊατρική',
    icon: Video,
    preview: 'globipet.com/telehealth',
    fields: [
      { key: 'page_title',    label: 'Τίτλος Σελίδας', type: 'text', placeholder: 'Τηλεϊατρική' },
      { key: 'page_subtitle', label: 'Υπότιτλος Σελίδας', type: 'textarea', placeholder: 'Βιντεοκλήση με εξειδικευμένο κτηνίατρο' },
    ],
  },
  {
    id: 'legal',
    label: 'Νομική Υποστήριξη',
    icon: Scale,
    preview: 'globipet.com/legal',
    fields: [
      { key: 'page_title',    label: 'Τίτλος Σελίδας', type: 'text', placeholder: 'Νομική Υποστήριξη Κατοικιδίων' },
      { key: 'page_subtitle', label: 'Υπότιτλος Σελίδας', type: 'textarea', placeholder: 'AI νομικός σύμβουλος...' },
    ],
  },
]

export default function AdminContentPage() {
  const qc = useQueryClient()
  const [activeSection, setActiveSection] = useState('home')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const { data: allContent, isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => api.get('/settings/content').then(r => r.data?.data ?? {}),
  })

  const section = SECTIONS.find(s => s.id === activeSection)!
  const savedContent = allContent?.[activeSection] || {}

  useEffect(() => {
    setDraft(savedContent)
    setHasChanges(false)
  }, [activeSection, allContent])

  const setField = (key: string, val: string) => {
    setDraft(d => ({ ...d, [key]: val }))
    setHasChanges(true)
  }

  const save = useMutation({
    mutationFn: () => api.patch(`/settings/content/${activeSection}`, draft),
    onSuccess: () => {
      toast.success('Αποθηκεύτηκε!')
      setHasChanges(false)
      qc.invalidateQueries({ queryKey: ['admin-content'] })
      qc.invalidateQueries({ queryKey: ['content-home'] })
    },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  })

  const reset = () => {
    setDraft(savedContent)
    setHasChanges(false)
    toast('Επαναφορά αλλαγών', { icon: '↩️' })
  }

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Layout size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Περιεχόμενο Σελίδων</h1>
            <p className="text-sm text-gray-500">Άλλαξε κείμενα και στατιστικά χωρίς κώδικα</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
              <RotateCcw size={14} /> Αναίρεση
            </button>
          )}
          <a href={section.preview.startsWith('globipet') ? `https://${section.preview}` : '#'}
            target="_blank" rel="noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <Eye size={14} /> Προεπισκόπηση
          </a>
          <button onClick={() => save.mutate()} disabled={!hasChanges || save.isPending}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
            <Save size={14} /> {save.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Section tabs */}
        <div className="w-52 shrink-0">
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all',
                  activeSection === s.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <s.icon size={16} />
                <div className="min-w-0">
                  <p className="truncate">{s.label}</p>
                  <p className={cn('text-[10px] truncate', activeSection === s.id ? 'text-purple-200' : 'text-gray-400')}>{s.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1">
          {isLoading ? (
            <div className="card p-8 text-center text-gray-400">Φόρτωση...</div>
          ) : (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <section.icon size={18} className="text-purple-600" />
                <h2 className="font-bold text-gray-900 dark:text-white">{section.label}</h2>
                {hasChanges && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Μη αποθηκευμένες αλλαγές
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                      {field.label}
                    </label>
                    <div className="relative">
                      {field.type === 'textarea' ? (
                        <textarea
                          value={draft[field.key] ?? savedContent[field.key] ?? ''}
                          onChange={e => setField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="input w-full resize-none text-sm"
                        />
                      ) : (
                        <input
                          type="text"
                          value={draft[field.key] ?? savedContent[field.key] ?? ''}
                          onChange={e => setField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="input w-full text-sm pr-8"
                        />
                      )}
                      {(draft[field.key] !== savedContent[field.key]) && draft[field.key] !== undefined && (
                        <Pencil size={12} className="absolute right-2.5 top-3 text-amber-500" />
                      )}
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-gray-400 mt-1">Προεπιλογή: {field.placeholder}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Live preview for home */}
              {activeSection === 'home' && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Προεπισκόπηση Hero</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-semibold mb-3">
                      ⚡ {draft.tagline || '#1 Pet Super-App'}
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                      <span className="text-orange-600">{draft.hero_title_1 || 'Η καλύτερη'}</span>
                      {' '}φροντίδα για τους{' '}
                      <span className="text-orange-600">{draft.hero_title_2 || 'καλύτερους φίλους'}</span> σου
                    </h1>
                    <p className="text-sm text-gray-500 mb-4">{draft.hero_subtitle || 'Το all-in-one pet super-app...'}</p>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                        [draft.stat_users || '50K+', draft.stat_users_label || 'Χρήστες'],
                        [draft.stat_providers || '2K+', draft.stat_providers_label || 'Πάροχοι'],
                        [draft.stat_pets || '120K+', draft.stat_pets_label || 'Κατοικίδια'],
                        [draft.stat_rating || '4.9★', draft.stat_rating_label || 'Βαθμολογία'],
                      ].map(([val, label]) => (
                        <div key={label} className="bg-white dark:bg-gray-700 rounded-xl p-2 text-center">
                          <p className="text-sm font-black text-orange-600">{val}</p>
                          <p className="text-[10px] text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}