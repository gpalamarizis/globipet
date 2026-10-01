import { randomBytes } from 'crypto'
import type { FastifyReply } from 'fastify'

/**
 * Απάντηση σε σφάλμα συστήματος, χωρίς να διαρρεύσει τίποτα.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ
 *   Δώδεκα endpoints επέστρεφαν στον χρήστη το μήνυμα του ίδιου του
 *   σφάλματος. Ένα αποτυχημένο ερώτημα Prisma γράφει μέσα στο μήνυμα το
 *   όνομα του πίνακα, της στήλης και του περιορισμού που παραβιάστηκε· μια
 *   αποτυχία προς τρίτη υπηρεσία γράφει τη διεύθυνση και την απάντησή της.
 *   Ο επιτιθέμενος χαρτογραφεί τη βάση στέλνοντας λάθος δεδομένα και
 *   διαβάζοντας τι του απαντάς.
 *
 * Η ΛΥΣΗ ΔΕΝ ΕΙΝΑΙ ΣΙΩΠΗ
 *   Ένα σκέτο «κάτι πήγε στραβά» κάνει την υποστήριξη αδύνατη. Κάθε σφάλμα
 *   παίρνει σύντομο κωδικό αναφοράς: ο χρήστης τον βλέπει, το πλήρες
 *   σφάλμα γράφεται στα logs με τον ΙΔΙΟ κωδικό. Ο χρήστης λέει «πήρα
 *   σφάλμα a3f91c» και βρίσκεις ακριβώς τι συνέβη.
 *
 * ΣΤΗΝ ΑΝΑΠΤΥΞΗ
 *   Εκεί το μήνυμα επιστρέφεται αυτούσιο — δεν υπάρχει λόγος να ψάχνεις
 *   logs όσο γράφεις κώδικα.
 */
export function serverError(
  reply: FastifyReply,
  err: unknown,
  context: string,
  userMessage = 'Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.',
) {
  const ref = randomBytes(3).toString('hex')
  const detail = err instanceof Error ? err.stack || err.message : String(err)
  console.error(`[${context}] ref=${ref}`, detail)

  if (process.env.NODE_ENV === 'development') {
    return reply.code(500).send({ message: `${userMessage} [${ref}] ${detail}`, ref })
  }
  return reply.code(500).send({ message: `${userMessage} (κωδικός ${ref})`, ref })
}
