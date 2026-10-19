import { Dimensions, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bottomSystemSpace, TAB_BAR_CONTENT } from '../../app/(tabs)/_layout'
import { space } from '@/theme'

/**
 * Σωστά περιθώρια για οθόνη μέσα σε καρτέλα.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ ΠΟΥ ΛΥΝΕΙ
 *   Οι καρτέλες είχαν σταθερό paddingBottom: 100. Η μπάρα όμως είναι
 *   68 συν το περιθώριο του συστήματος, που σε συσκευή με ορατή μπάρα
 *   πλοήγησης φτάνει τα 116. Το τελευταίο στοιχείο κάθε λίστας κοβόταν
 *   πάντα — ορατό στους «Κορυφαίους παρόχους» της αρχικής.
 *
 *   Αντίστοιχα πάνω: σταθερό paddingTop δεν ξέρει πόσο ψηλή είναι η
 *   μπάρα κατάστασης, που διαφέρει ανά συσκευή.
 *
 * ΓΙΑΤΙ ΥΠΟΛΟΓΙΖΕΤΑΙ ΚΑΙ ΔΕΝ ΓΡΑΦΕΤΑΙ ΣΤΑΘΕΡΑ
 *   Αν αύριο αλλάξει το ύψος της μπάρας, αλλάζει μόνο το TAB_BAR_CONTENT
 *   και όλες οι οθόνες διορθώνονται μαζί.
 */
export function useTabSpace() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const bottom = bottomSystemSpace(insets.bottom, windowHeight, Dimensions.get('screen').height)

  return {
    /** Καθαρό ύψος μπάρας συν αναπνοή, για contentContainerStyle. */
    paddingBottom: TAB_BAR_CONTENT + bottom + space.xl,
    /** Ύψος μπάρας κατάστασης συν αναπνοή, για κεφαλίδα ως την κορυφή. */
    paddingTop: insets.top + space.lg,
    tabBarHeight: TAB_BAR_CONTENT + bottom,
    insetTop: insets.top,
  }
}
