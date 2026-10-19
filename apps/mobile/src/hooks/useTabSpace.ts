import { Dimensions, Platform, StatusBar, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bottomSystemSpace, TAB_BAR_CONTENT } from '../../app/(tabs)/_layout'
import { space } from '@/theme'

/**
 * Σωστά περιθώρια για οθόνη μέσα σε καρτέλα.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ ΠΟΥ ΛΥΝΕΙ
 *   Οι καρτέλες είχαν σταθερό paddingBottom: 100, ενώ η μπάρα είναι 68 συν
 *   το περιθώριο του συστήματος — σε συσκευή με ορατή μπάρα πλοήγησης 116.
 *   Το τελευταίο στοιχείο κάθε λίστας κρυβόταν.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΟΥΝ ΚΑΤΩΤΑΤΑ ΟΡΙΑ
 *   Στο Android το useSafeAreaInsets() επιστρέφει 0 όταν η εφαρμογή δεν
 *   είναι ρητά edge-to-edge, ΕΝΩ το σύστημα σχεδιάζει κάτω από τη μπάρα
 *   κατάστασης. Σκέτο insets.top έδινε 16 εκεί που χρειάζονταν 48, και ο
 *   τίτλος καθόταν πάνω στην ώρα.
 *
 *   Γι' αυτό κάθε τιμή περνά από Math.max με το μέγεθος που δούλευε πριν:
 *   η διόρθωση μπορεί μόνο να βελτιώσει, ποτέ να χειροτερεύσει.
 */

/** Όσο έδινε το παλιό σταθερό space.xxxl + space.lg. */
const MIN_TOP = 48
/** Όσο έδιναν οι καρτέλες πριν, ως δίχτυ ασφαλείας. */
const MIN_BOTTOM = 100

/** Ύψος μπάρας κατάστασης: insets, αλλιώς η τιμή του Android, αλλιώς το ελάχιστο. */
function statusBarTop(insetTop: number): number {
  if (insetTop > 0) return insetTop
  if (Platform.OS === 'android' && StatusBar.currentHeight) return StatusBar.currentHeight
  return MIN_TOP - space.lg
}

export function useTabSpace() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const bottom = bottomSystemSpace(insets.bottom, windowHeight, Dimensions.get('screen').height)

  return {
    /** Ύψος μπάρας συν αναπνοή, ποτέ λιγότερο από ό,τι δούλευε πριν. */
    paddingBottom: Math.max(TAB_BAR_CONTENT + bottom + space.xl, MIN_BOTTOM),
    /** Μπάρα κατάστασης συν αναπνοή, ποτέ λιγότερο από 48. */
    paddingTop: Math.max(statusBarTop(insets.top) + space.lg, MIN_TOP),
    tabBarHeight: TAB_BAR_CONTENT + bottom,
    insetTop: statusBarTop(insets.top),
  }
}
