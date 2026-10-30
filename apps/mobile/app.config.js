/**
 * Δυναμικό συμπλήρωμα του app.json (όλη η ρύθμιση μένει στο app.json).
 *
 * Google Sign-In στο iOS: χρειάζεται iOS OAuth client ID και το αντίστροφό
 * του ως URL scheme. Όταν συμπληρωθεί το `extra.googleIosClientId` στο
 * app.json (π.χ. "1234-abc.apps.googleusercontent.com"), εδώ προστίθεται
 * αυτόματα το `iosUrlScheme` στο plugin. Όσο είναι κενό, το plugin μένει
 * χωρίς επιλογές (το Android δουλεύει κανονικά) και η εφαρμογή iOS κρύβει
 * το κουμπί Google (src/lib/googleAuth.ts → isGoogleSignInAvailable).
 */
module.exports = ({ config }) => {
  const iosClientId = String(config.extra?.googleIosClientId || '').trim()
  if (!iosClientId) return config

  const suffix = '.apps.googleusercontent.com'
  if (!iosClientId.endsWith(suffix)) {
    throw new Error(`extra.googleIosClientId πρέπει να τελειώνει σε ${suffix}`)
  }
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`
  const name = '@react-native-google-signin/google-signin'
  const plugins = (config.plugins || []).map(p =>
    (p === name || (Array.isArray(p) && p[0] === name)) ? [name, { iosUrlScheme }] : p)
  return { ...config, plugins }
}
