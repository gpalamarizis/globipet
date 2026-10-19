import { QueryClient } from '@tanstack/react-query'

/**
 * Ο ένας QueryClient της εφαρμογής.
 *
 * Ζει σε δικό του module (όχι μέσα στο app/_layout.tsx) ώστε να τον φτάνει
 * και το store της σύνδεσης: σε αποσύνδεση και σε σύνδεση άλλου χρήστη η
 * cache καθαρίζεται (queryClient.clear()). Αλλιώς ο επόμενος χρήστης στην
 * ίδια συσκευή έβλεπε —και μπορούσε να αποθηκεύσει πάνω τους— στοιχεία του
 * προηγούμενου: ['me'], ['my-next-booking'], ['wishlist'], ειδοποιήσεις,
 * παραγγελίες κ.λπ., που με staleTime 5′ δεν ξαναζητούνταν.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } }
})
