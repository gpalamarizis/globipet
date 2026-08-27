import { Outlet } from 'react-router-dom'
import LanguageSelector from '@/components/ui/LanguageSelector'

/**
 * Περίβλημα σελίδων παρόχου.
 *
 * ΓΙΑΤΙ ΑΦΑΙΡΕΘΗΚΕ Η ΜΠΑΡΑ ΠΛΟΗΓΗΣΗΣ
 *   Είχε πέντε κουμπιά — Επισκόπηση, Υπηρεσίες, Κρατήσεις, Marketing,
 *   Πελάτες — αλλά μόνο δύο διαδρομές υπάρχουν πραγματικά: /provider και
 *   /provider/packages. Τα υπόλοιπα έπεφταν στο catch-all /provider/*
 *   και εμφάνιζαν ξανά το ίδιο dashboard, οπότε έμοιαζαν σπασμένα.
 *
 *   Το ProviderDashboard έχει ήδη δικές του καρτέλες που δουλεύουν:
 *   Επισκόπηση, Υπηρεσίες, Προσωπικό, Κρατήσεις, Ημερολόγιο, Καμπάνιες,
 *   Πελάτες, Μεταφράσεις. Δύο επίπεδα πλοήγησης για το ίδιο πράγμα
 *   μπέρδευαν τον χρήστη.
 *
 *   Ο επιλογέας γλώσσας διατηρήθηκε — ήταν το μόνο χρήσιμο στη μπάρα.
 */
export default function ProviderLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <div className="page-container flex justify-end pt-3">
        <LanguageSelector />
      </div>

      <div className="page-container py-4"><Outlet /></div>
    </div>
  )
}
