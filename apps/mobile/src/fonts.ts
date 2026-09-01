import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Text, TextInput, Platform } from 'react-native'

/**
 * Γραμματοσειρά Inter.
 *
 * ΓΙΑΤΙ INTER
 *   Το Instagram χρησιμοποιεί δική του γραμματοσειρά που δεν διατίθεται.
 *   Το Inter είναι το κοντινότερο ελεύθερο: ίδια καθαρότητα, σχεδιασμένο
 *   για οθόνες, και με πλήρη υποστήριξη ελληνικών — κρίσιμο εδώ.
 *
 *   Οι προεπιλεγμένες γραμματοσειρές του συστήματος διαφέρουν ανάμεσα σε
 *   Android και iOS. Με το Inter η εφαρμογή φαίνεται ίδια παντού.
 *
 * ΠΩΣ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ
 *   Καλείς το useAppFonts() μία φορά στο root layout. Μετά, κάθε <Text>
 *   παίρνει αυτόματα Inter — δεν χρειάζεται να αλλάξεις τις οθόνες.
 */

/**
 * Επιβάλλει την Inter ως προεπιλογή σε κάθε Text και TextInput.
 *
 * Χωρίς αυτό θα έπρεπε να προστεθεί fontFamily σε κάθε στυλ της
 * εφαρμογής — εκατοντάδες σημεία.
 */
function applyDefaultFont() {
  const T = Text as any
  const I = TextInput as any

  T.defaultProps = T.defaultProps || {}
  I.defaultProps = I.defaultProps || {}

  // Το βάρος επιλέγεται από το ίδιο το στυλ κάθε στοιχείου· εδώ ορίζεται
  // μόνο η οικογένεια, ώστε να μη χαθούν τα υπάρχοντα fontWeight.
  const base = { fontFamily: 'Inter_400Regular' }

  T.defaultProps.style = [base, T.defaultProps.style]
  I.defaultProps.style = [base, I.defaultProps.style]

  // Το allowFontScaling αφήνεται ενεργό: οι χρήστες με προβλήματα όρασης
  // μεγαλώνουν τα γράμματα από τις ρυθμίσεις του τηλεφώνου.
}

/**
 * Αντιστοίχιση βάρους σε αρχείο.
 *
 * Το React Native στο Android ΔΕΝ συνδυάζει fontFamily με fontWeight —
 * χρειάζεται ξεχωριστό αρχείο ανά βάρος. Γι' αυτό φορτώνονται τέσσερα.
 */
export const fontFamily = {
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
} as const

/** Βοηθητικό: από αριθμητικό βάρος στο σωστό αρχείο. */
export function fontFor(weight?: string | number) {
  const w = String(weight ?? '400')
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return fontFamily.bold
  if (w === '600') return fontFamily.semibold
  if (w === '500') return fontFamily.medium
  return fontFamily.regular
}

SplashScreen.preventAutoHideAsync().catch(() => {})

/**
 * Φορτώνει τις γραμματοσειρές. Επιστρέφει true όταν είναι έτοιμες.
 *
 * Το splash μένει ορατό όσο φορτώνουν, ώστε ο χρήστης να μη δει το
 * κείμενο να αλλάζει γραμματοσειρά μπροστά του.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular:  require('../assets/fonts/Inter-Regular.ttf'),
    Inter_500Medium:   require('../assets/fonts/Inter-Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    Inter_700Bold:     require('../assets/fonts/Inter-Bold.ttf'),
  })

  useEffect(() => {
    if (loaded || error) {
      // Ακόμα κι αν αποτύχει η φόρτωση, η εφαρμογή συνεχίζει με τη
      // γραμματοσειρά του συστήματος. Δεν μένει κολλημένη στο splash.
      if (loaded) applyDefaultFont()
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [loaded, error])

  return loaded || !!error
}

export default useAppFonts
