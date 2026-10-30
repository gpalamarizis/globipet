import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'

/**
 * «Σύνδεση με Apple» — μόνο iOS (App Store Guideline 4.8: απαιτείται όταν
 * η εφαρμογή προσφέρει Google/Facebook). Στο Android δεν εμφανίζεται.
 *
 * Επιστρέφει null αν ο χρήστης ακύρωσε. Το όνομα η Apple το δίνει ΜΟΝΟ την
 * πρώτη φορά· ο server το κρατά τότε (POST /auth/apple/mobile).
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try { return await AppleAuthentication.isAvailableAsync() } catch { return false }
}

export async function signInWithApple(): Promise<{ identityToken: string; fullName: string | null } | null> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!cred.identityToken) throw new Error('Apple: χωρίς identityToken')
    const n = cred.fullName
    const fullName = [n?.givenName, n?.familyName].filter(Boolean).join(' ').trim() || null
    return { identityToken: cred.identityToken, fullName }
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null
    throw e
  }
}
