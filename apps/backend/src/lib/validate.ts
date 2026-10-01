import { z, type ZodTypeAny } from 'zod'
import type { FastifyReply } from 'fastify'

/**
 * Επικύρωση σώματος αιτήματος με σχήμα.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ
 *   Οι δύο κρίσιμες ευπάθειες που βρέθηκαν στον έλεγχο είχαν την ΙΔΙΑ
 *   αιτία: δεδομένα του χρήστη έφταναν σε πεδίο της βάσης χωρίς κανείς να
 *   έχει δηλώσει τι επιτρέπεται. Ο ρόλος διαχειριστή και το pet_id ξένου
 *   ζώου πέρασαν και τα δύο από εκεί.
 *
 *   Το Prisma πιάνει λάθος ΤΥΠΟΥΣ, όχι λάθος ΛΟΓΙΚΗ. Δέχεται χαρά ένα
 *   όνομα δέκα μεγαβάιτ, ένα email χωρίς παπάκι, ή μια διεύθυνση
 *   ιστοσελίδας που ξεκινά με javascript:.
 *
 * ΤΙ ΕΠΙΣΤΡΕΦΕΙ
 *   Σε αποτυχία, 400 με το ΟΝΟΜΑ του πεδίου και τον λόγο — ώστε η φόρμα να
 *   δείξει το σφάλμα στο σωστό σημείο αντί για γενικό «κάτι πήγε στραβά».
 *   Τα άγνωστα πεδία αφαιρούνται σιωπηλά: ό,τι δεν δηλώνεται, δεν περνάει.
 */
export function parseBody<T extends ZodTypeAny>(
  schema: T,
  body: unknown,
  reply: FastifyReply,
): z.infer<T> | null {
  const result = schema.safeParse(body ?? {})
  if (result.success) return result.data

  const first = result.error.issues[0]
  const field = first?.path?.join('.') || 'σώμα'
  reply.code(400).send({
    message: first?.message || 'Μη έγκυρα δεδομένα',
    field,
    errors: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
  })
  return null
}

/** Κείμενο με όρια, καθαρισμένο από κενά στις άκρες. */
export const text = (min: number, max: number, label: string) =>
  z.string({ required_error: `Το πεδίο ${label} είναι υποχρεωτικό` })
    .trim()
    .min(min, `Το πεδίο ${label} είναι υποχρεωτικό`)
    .max(max, `Το πεδίο ${label} ξεπερνά τους ${max} χαρακτήρες`)

export const email = z.string({ required_error: 'Το email είναι υποχρεωτικό' })
  .trim().toLowerCase()
  .email('Μη έγκυρη διεύθυνση email')
  .max(255, 'Η διεύθυνση email είναι υπερβολικά μεγάλη')

/**
 * Διεύθυνση ιστοσελίδας — ΜΟΝΟ http και https.
 * Χωρίς αυτόν τον περιορισμό, ένα `javascript:` στο προφίλ ενός παρόχου
 * γίνεται εκτελέσιμος σύνδεσμος για όποιον τον επισκεφθεί.
 */
export const httpUrl = z.string().trim().max(500)
  .refine(v => v === '' || /^https?:\/\//i.test(v), 'Η διεύθυνση πρέπει να ξεκινά με http:// ή https://')

export const phone = z.string().trim().max(30, 'Το τηλέφωνο είναι υπερβολικά μεγάλο')

export const language = z.enum(['el', 'en', 'es', 'fr', 'zh'], {
  errorMap: () => ({ message: 'Μη υποστηριζόμενη γλώσσα' }),
})
