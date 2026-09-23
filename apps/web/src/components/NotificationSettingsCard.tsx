import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Share } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  isPushSupported, isStandalone, getPermissionState,
  hasActiveSubscription, subscribeToPush, unsubscribeFromPush,
} from '@/lib/push'

/**
 * Ρύθμιση ειδοποιήσεων push για ΑΥΤΟΝ τον browser.
 *
 * ΓΙΑΤΙ ΚΟΥΜΠΙ ΚΑΙ ΟΧΙ ΑΥΤΟΜΑΤΑ
 *   Η άδεια ζητιέται μόνο μετά από πάτημα. Αν ζητηθεί με το που φορτώνει η
 *   σελίδα, ο Chrome μπλοκάρει ΜΟΝΙΜΑ τον ιστότοπο και δεν ξαναρωτάει ποτέ
 *   κανέναν χρήστη — ζημιά που δεν αναιρείται.
 *
 * ΠΕΝΤΕ ΚΑΤΑΣΤΑΣΕΙΣ, ΟΧΙ ΔΥΟ
 *   Ενεργό, ανενεργό, ο χρήστης έχει αρνηθεί, ο browser δεν υποστηρίζει, και
 *   iPhone που χρειάζεται πρώτα εγκατάσταση στην αρχική οθόνη. Οι τρεις
 *   τελευταίες θέλουν διαφορετικό μήνυμα η καθεμία: ένα σκέτο «δεν
 *   υποστηρίζεται» αφήνει τον χρήστη χωρίς να ξέρει τι να κάνει.
 */

type State = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

export default function NotificationSettingsCard() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void refresh() }, [])

  async function refresh() {
    if (!isPushSupported()) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      setState(isIOS && !isStandalone() ? 'ios-install' : 'unsupported')
      return
    }
    if (getPermissionState() === 'denied') { setState('denied'); return }
    setState((await hasActiveSubscription()) ? 'on' : 'off')
  }

  async function enable() {
    setBusy(true)
    const result = await subscribeToPush()
    setBusy(false)
    if (result.ok) {
      setState('on')
      toast.success('Οι ειδοποιήσεις ενεργοποιήθηκαν')
      return
    }
    if (result.reason === 'denied') {
      setState('denied')
      toast.error('Δεν δόθηκε άδεια για ειδοποιήσεις')
    } else if (result.reason === 'ios-needs-install') {
      setState('ios-install')
    } else {
      toast.error('Κάτι πήγε στραβά. Δοκιμάστε ξανά.')
    }
  }

  async function disable() {
    setBusy(true)
    const ok = await unsubscribeFromPush()
    setBusy(false)
    if (ok) { setState('off'); toast.success('Οι ειδοποιήσεις απενεργοποιήθηκαν') }
    else toast.error('Κάτι πήγε στραβά. Δοκιμάστε ξανά.')
  }

  if (state === 'loading' || state === 'unsupported') return null

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
          {state === 'on'
            ? <BellRing size={18} className="text-brand-900 dark:text-brand-400" />
            : <Bell size={18} className="text-gray-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Ειδοποιήσεις</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {state === 'on'
              ? 'Λαμβάνετε ειδοποιήσεις σε αυτή τη συσκευή για κρατήσεις, παραγγελίες και μηνύματα.'
              : 'Ενημερωθείτε για κρατήσεις, παραγγελίες και μηνύματα ακόμα κι όταν η σελίδα είναι κλειστή.'}
          </p>

          {state === 'denied' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              Έχετε αποκλείσει τις ειδοποιήσεις για τη GlobiPet. Για να τις επαναφέρετε, πατήστε
              το εικονίδιο δίπλα στη διεύθυνση του ιστότοπου και επιτρέψτε τις ειδοποιήσεις.
            </p>
          )}

          {state === 'ios-install' && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="mb-2">
                Στο iPhone οι ειδοποιήσεις απαιτούν να προσθέσετε πρώτα τη GlobiPet στην αρχική οθόνη:
              </p>
              <p className="flex items-center gap-1.5">
                <Share size={14} className="shrink-0" />
                Κοινή χρήση → Προσθήκη στην αρχική οθόνη
              </p>
            </div>
          )}

          {(state === 'on' || state === 'off') && (
            <button
              onClick={state === 'on' ? disable : enable}
              disabled={busy}
              className={state === 'on'
                ? 'btn-secondary mt-3 px-4 py-2 text-sm flex items-center gap-1.5'
                : 'btn-primary mt-3 px-4 py-2 text-sm flex items-center gap-1.5'}>
              {state === 'on' ? <BellOff size={14} /> : <Bell size={14} />}
              {busy ? 'Παρακαλώ περιμένετε…' : state === 'on' ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
