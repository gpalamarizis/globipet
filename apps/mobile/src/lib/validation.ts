/**
 * Έλεγχοι φόρμας που πρέπει να συμφωνούν ΑΚΡΙΒΩΣ με τον server.
 *
 * EMAIL
 *   Ίδιο regex με το z.string().email() του zod 3.25 που χρησιμοποιεί το
 *   backend (apps/backend/src/lib/validate.ts). Έτσι η φόρμα δεν λέει ποτέ
 *   «εντάξει» για κάτι που ο server θα απορρίψει με 400, ούτε το ανάποδο.
 *   Το trim/lowercase γίνεται και στον server· εδώ μόνο trim.
 */
const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i

export function isValidEmail(value: string): boolean {
  const v = (value || '').trim()
  return v.length > 0 && v.length <= 255 && EMAIL_RE.test(v)
}
