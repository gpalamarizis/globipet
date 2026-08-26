import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'
import { getLegalDoc, LEGAL_UPDATED } from '@/lib/legal'

/**
 * Πολιτική Απορρήτου.
 *
 * Το κείμενο ζει στο src/lib/legal.ts και όχι στο i18n, γιατί τα νομικά
 * κείμενα είναι μακροσκελή, αλλάζουν σπάνια, και δεν μεταφράζονται με την
 * ίδια διαδικασία με τα labels της διεπαφής.
 *
 * ΔΕΝ ΣΥΝΙΣΤΑ ΝΟΜΙΚΗ ΣΥΜΒΟΥΛΗ. Συντάχθηκε με βάση τις πραγματικές ροές
 * δεδομένων και απαιτεί έλεγχο από νομικό σύμβουλο.
 */
export default function PrivacyPolicyPage() {
  const { i18n } = useTranslation()
  const doc = getLegalDoc('privacy', i18n.language)
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString(i18n.language || 'el')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Shield size={22} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">
              {doc.title}
            </h1>
            <p className="text-sm text-gray-500">
              {i18n.language?.startsWith('el') ? 'Τελευταία ενημέρωση' : 'Last updated'}: {updated}
            </p>
          </div>
        </div>

        <div className="card p-6 md:p-8">
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            {doc.intro}
          </p>

          {/* Πίνακας περιεχομένων — τα κείμενα είναι μεγάλα */}
          <nav className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {doc.sections.map((s, i) => (
                <li key={i}>
                  <a href={`#s${i}`}
                     className="text-brand-900 dark:text-yellow-400 hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-8 space-y-8">
            {doc.sections.map((s, i) => (
              <section key={i} id={`s${i}`} className="scroll-mt-24">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {s.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
