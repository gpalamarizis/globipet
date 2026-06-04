import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import Constants from 'expo-constants'

let isConfigured = false

/**
 * Initialize Google Sign-In. Call this once when the app starts.
 *
 * IMPORTANT: webClientId is REQUIRED even on Android!
 * The native SDK uses the Web Client ID to request an ID token
 * that the backend can verify.
 *
 * The Android Client ID with package name + SHA-1 is what
 * authorizes the app to use the Web Client ID.
 */
export function configureGoogleSignIn() {
  if (isConfigured) return

  const webClientId = Constants.expoConfig?.extra?.googleWebClientId
  const iosClientId = Constants.expoConfig?.extra?.googleIosClientId

  if (!webClientId) {
    console.warn('Google Sign-In: webClientId not configured in app.json')
    return
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: false,
    scopes: ['openid', 'profile', 'email'],
  })

  isConfigured = true
}

export interface GoogleSignInResult {
  idToken: string
  accessToken: string | null
  user: {
    id: string
    email: string
    name: string
    photo: string | null
    givenName: string | null
    familyName: string | null
  }
}

/**
 * Trigger the Google Sign-In flow.
 * Returns the user info + tokens, or null if cancelled.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult | null> {
  try {
    configureGoogleSignIn()

    // Check if Play Services available (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

    // Trigger sign-in
    const result = await GoogleSignin.signIn()

    // Handle response (new API in v13+ wraps in {type, data})
    const data: any = (result as any).data || result
    const idToken = data.idToken
    const user = data.user

    if (!idToken || !user) {
      throw new Error('No ID token received from Google')
    }

    // Get access token
    let accessToken: string | null = null
    try {
      const tokens = await GoogleSignin.getTokens()
      accessToken = tokens.accessToken
    } catch {
      // Access token is optional
    }

    return {
      idToken,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        photo: user.photo,
        givenName: user.givenName,
        familyName: user.familyName,
      },
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return null  // User cancelled
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Η σύνδεση είναι σε εξέλιξη')
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Το Google Play Services δεν είναι διαθέσιμο')
    }
    throw error
  }
}

/**
 * Sign out from Google (revokes the local session)
 */
export async function signOutGoogle() {
  try {
    configureGoogleSignIn()
    await GoogleSignin.signOut()
  } catch (err) {
    console.warn('Google sign-out error:', err)
  }
}
