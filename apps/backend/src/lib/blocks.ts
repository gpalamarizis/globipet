import prisma from './prisma.js'

/**
 * Αποκλεισμένοι συντάκτες για τον θεατή (App Store 1.2 — περιεχόμενο χρηστών).
 *
 * Επιστρέφει τα email που ο θεατής έχει αποκλείσει. Τα δημόσια endpoints
 * (posts, σχόλια, forum, μηνύματα κοινοτήτων) αφαιρούν το περιεχόμενό τους.
 *
 * Ανθεκτικό: αν ο πίνακας user_blocks δεν υπάρχει ακόμη (το migration δεν
 * έχει τρέξει) ή η βάση αστοχήσει, επιστρέφει κενό — το feed δεν σπάει ποτέ
 * εξαιτίας του αποκλεισμού.
 */
export async function blockedEmailsFor(viewer: string | null | undefined): Promise<string[]> {
  if (!viewer) return []
  try {
    const rows = await (prisma as any).userBlock.findMany({
      where: { blocker_email: viewer },
      select: { blocked_email: true },
      take: 1000,
    })
    return rows.map((r: any) => r.blocked_email)
  } catch {
    return []
  }
}

/** Φίλτρο σε λίστα γραμμών με author_email — πριν αφαιρεθεί το email από το publicRow. */
export function withoutBlocked<T extends { author_email?: string | null }>(rows: T[], blocked: string[]): T[] {
  if (!blocked.length) return rows
  const set = new Set(blocked.map(e => e.toLowerCase()))
  return rows.filter(r => !r.author_email || !set.has(r.author_email.toLowerCase()))
}
