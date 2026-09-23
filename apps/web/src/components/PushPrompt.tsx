import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import {
  isPushSupported, isStandalone, getPermissionState,
  hasActiveSubscription, subscribeToPush,
} from '@/lib/push'

/**
 * Προτροπή ενεργοποίησης ειδοποιήσεων, λίγο μετά τη σύνδεση.
 *
 * ΓΙΑΤΙ ΔΙΚΟ ΜΑΣ ΠΑΡΑΘΥΡΟ ΚΑΙ ΟΧΙ ΚΑΤΕΥΘΕΙΑΝ Η ΑΔΕΙΑ
 *   Αν καλέσουμε το Notification.requestPermission() μόνοι μας μετά το login,
 *   ο Chrome το θεωρεί κατάχρηση και ΜΠΛΟΚΑΡΕΙ ΜΟΝΙΜΑ τον ιστότοπο: δεν
 *   ξαναρωτάει ποτέ, για κανέναν χρήστη, και δεν αναιρείται με τίποτα.
 *
 *   Το δικό μας παράθυρο δεν υπόκειται σε αυτόν τον κανόνα — εμφανίζεται
 *   ελεύθερα. Το διαλογικό του browser ανοίγει ΜΟΝΟ αν ο χρήστης πατήσει
 *   «Ενεργοποίηση», δηλαδή μέσα σε πάτημα, και ο κανόνας τηρείται.
 *
 * ΠΟΤΕ ΔΕΝ ΕΜΦΑΝΙΖΕΤΑΙ
 *   Αν ο browser δεν υποστηρίζει, αν ο χρήστης έχει ήδη απαντήσει — ναι ή
 *   όχι — στον browser, αν είναι ήδη εγγεγραμμένος, ή αν έχει πατήσει «Όχι
 *   τώρα» τις τελευταίες τριάντα μέρες. Μια προτροπή που επανέρχεται σε
 *   κάθε φόρτωση δεν πείθει κανέναν· ενοχλεί.
 */

const DISMISS_KEY = 'globipet-push-prompt-dismissed'
const DISMISS_DAYS = 30

/** Καθυστέρηση ώστε να μην πέσει πάνω στη φόρτωση της σελίδας. */
const DELAY_MS = 6000

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const days = (Date.now() - Number(raw)) / 86_400_000
    return days < DISMISS_DAYS
  } catch {
    return false
  }
}

export default function PushPrompt() {
  const { isAuthenticated } = useAuthStore()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { setVisible(false); return }
    if (!isPushSupported()) return
    // 'granted' ή 'denied' σημαίνει ότι ο χρήστης έχει ήδη αποφασίσει.
    if (getPermissionState() !== 'default') return
    if (dismissedRecently()) return
    // Στο iPhone χωρίς εγκατάσταση στην αρχική οθόνη δεν υπάρχει τίποτα να
    // προσφέρουμε, οπότε δεν διακόπτουμε τον χρήστη άδικα.
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !isStandalone()) return

    let alive = true
    const timer = setTimeout(async () => {
      if (!alive) return
      if (await hasActiveSubscription()) return
      if (alive) setVisible(true)
    }, DELAY_MS)

    return () => { alive = false; clearTimeout(timer) }
  }, [isAuthenticated])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setVisible(false)
  }

  async function enable() {
    setBusy(true)
    const result = await subscribeToPush()
    setBusy(false)
    setVisible(false)
    if (result.ok) {
      toast.success('Οι ειδοποιήσεις ενεργοποιήθηκαν')
    } else if (result.reason === 'denied') {
      toast('Μπορείτε να τις ενεργοποιήσετε αργότερα από το προφίλ σας')
    } else {
      toast.error('Κάτι πήγε στραβά. Δοκιμάστε ξανά από το προφίλ σας.')
    }
    // Είτε πέτυχε είτε όχι, δεν ξαναρωτάμε σύντομα.
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed z-40 bottom-24 lg:bottom-6 right-4 lg:right-6 left-4 sm:left-auto sm:w-96">
          <div className="card p-5 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                <Bell size={18} className="text-brand-900 dark:text-brand-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Να σας ειδοποιούμε;
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Θα μαθαίνετε αμέσως για κρατήσεις, παραγγελίες και μηνύματα — ακόμα κι όταν
                  η σελίδα είναι κλειστή.
                </p>

                <div className="flex gap-2 mt-4">
                  <button onClick={enable} disabled={busy}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                    <Bell size={14} />
                    {busy ? 'Παρακαλώ περιμένετε…' : 'Ενεργοποίηση'}
                  </button>
                  <button onClick={dismiss} className="btn-ghost px-4 py-2 text-sm">
                    Όχι τώρα
                  </button>
                </div>
              </div>

              <button onClick={dismiss} aria-label="Κλείσιμο"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
