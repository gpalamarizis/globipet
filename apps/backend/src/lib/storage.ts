import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHmac, randomBytes } from 'crypto'

/**
 * Αποθήκευση αρχείων στο Cloudflare R2.
 *
 * ─── Δύο buckets ───────────────────────────────────────────────────
 *   CF_R2_BUCKET_NAME          δημόσιο (φωτογραφίες, προϊόντα, καμπάνιες)
 *   CF_R2_PRIVATE_BUCKET_NAME  ιδιωτικό, χωρίς public access — ιατρικά
 *                              αρχεία και εικόνες ανάλυσης AI
 *
 *   Ίδιο account και ίδια κλειδιά. Χωρίς το ιδιωτικό bucket τα ανεβάσματα
 *   στους ιδιωτικούς φακέλους απορρίπτονται (503) — ΔΕΝ πάνε στο δημόσιο.
 *
 * ─── Αναφορά ιδιωτικού αρχείου ─────────────────────────────────────
 *   `r2priv://<folder>/<owner>/<ts>-<random>.<ext>`
 *   Δεν είναι URL που ανοίγει· ο πελάτης ζητά προσωρινό σύνδεσμο από το
 *   GET /api/upload/private-url και ο server AI τον λύνει με resolveForAi.
 *
 * ─── <owner> ───────────────────────────────────────────────────────
 *   HMAC-SHA256(email) με το UPLOAD_OWNER_SALT, πρώτοι 16 hex. Μπαίνει και
 *   στα ΝΕΑ δημόσια κλειδιά, ώστε η διαγραφή λογαριασμού να βρίσκει τα
 *   αρχεία του χρήστη με απλό prefix. Το salt υπάρχει επειδή τα δημόσια
 *   URL φαίνονται σε όλους: με σκέτο sha256 όποιος ξέρει ένα email θα
 *   μπορούσε να ελέγξει αν μια φωτογραφία ανήκει σε αυτόν.
 *   Χωρίς UPLOAD_OWNER_SALT χρησιμοποιείται σταθερή τιμή. Αν οριστεί
 *   αργότερα, τα αρχεία που ανέβηκαν πριν εξακολουθούν να αναγνωρίζονται
 *   (ownerHashes δίνει και τις δύο μορφές).
 *
 * ─── Παλιά αρχεία ──────────────────────────────────────────────────
 *   Όσα ανέβηκαν πριν από αυτή την αλλαγή έχουν κλειδί
 *   `<folder>/<ts>-<random>.<ext>` στο δημόσιο bucket, χωρίς καμία
 *   καταγραφή ιδιοκτήτη. Δεν μπορούν να βρεθούν ανά χρήστη, άρα ούτε να
 *   σβηστούν αυτόματα στη διαγραφή λογαριασμού. Τα URL τους είναι τυχαία
 *   (128 bit) αλλά μένουν δημόσια για όποιον τα έχει.
 */

export const PRIVATE_SCHEME = 'r2priv://'
/** Φάκελοι με δεδομένα υγείας → ιδιωτικό bucket. */
export const PRIVATE_FOLDERS = ['medical', 'ai-health', 'stool-urine'] as const
/**
 * Δημόσιοι φάκελοι με ΠΡΟΣΩΠΙΚΟ περιεχόμενο που σβήνεται με τον λογαριασμό.
 * Εκτός: products, services, campaigns, communities, community, reviews —
 * ανήκουν σε επιχείρηση ή σε περιεχόμενο που διατηρείται ανωνυμοποιημένο
 * (lib/cron.ts ANONYMIZE_MAP)· αν σβηστούν, σπάνε εικόνες άλλων χρηστών.
 */
export const PERSONAL_PUBLIC_FOLDERS = ['avatars', 'profiles', 'posts', 'pets', 'uploads', 'ai-uploads']
/** Διάρκεια προσωρινού συνδέσμου: 10 λεπτά. */
export const PRIVATE_URL_TTL = 600

/** 503 όταν ζητείται ιδιωτικός φάκελος χωρίς ιδιωτικό bucket (ίδιο κείμενο με το GET /upload/private-url). */
export const PRIVATE_STORAGE_UNAVAILABLE_MSG = 'Η ιδιωτική αποθήκευση δεν είναι διαθέσιμη'

const DEFAULT_SALT = 'globipet-upload-owner'

/**
 * Εικόνα που έστειλε ο χρήστης (post, κοινότητα, μήνυμα κοινότητας): δεκτή
 * ΜΟΝΟ αν είναι https από το δικό μας δημόσιο R2 — εκεί ανεβάζει το
 * /api/upload. Αλλιώς μια εξωτερική διεύθυνση γινόταν pixel παρακολούθησης
 * (IP/ώρα) για όποιον βλέπει το feed, ή javascript:/data: σε <img>.
 *
 *   CF_R2_PUBLIC_URL ορισμένο → μόνο ο host του.
 *   Αλλιώς → <CF_R2_ACCOUNT_ID>.r2.cloudflarestorage.com/<CF_R2_BUCKET_NAME>/…,
 *   δηλαδή ό,τι επιστρέφει το putObject χωρίς δημόσιο URL.
 *   Κενό/null = καμία εικόνα (επιτρέπεται).
 *
 * Τοπικό ισοδύναμο του isAllowedPhotoUrl (routes/users.ts), που δεν είναι export.
 */
export function isAllowedImageUrl(v: unknown): boolean {
  if (v == null || v === '') return true
  if (typeof v !== 'string' || v.length > 1000) return false
  let u: URL
  try { u = new URL(v) } catch { return false }
  if (u.protocol !== 'https:' || u.username || u.password) return false
  const host = u.hostname.toLowerCase()
  const pub = process.env.CF_R2_PUBLIC_URL?.trim()
  if (pub) {
    try { return new URL(pub).hostname.toLowerCase() === host } catch { return false }
  }
  const acc = process.env.CF_R2_ACCOUNT_ID?.trim().toLowerCase()
  const bucket = process.env.CF_R2_BUCKET_NAME?.trim()
  return !!acc && !!bucket && host === `${acc}.r2.cloudflarestorage.com` && u.pathname.startsWith(`/${bucket}/`)
}

type R2 = {
  s3: S3Client
  accountId: string
  bucket: string
  privateBucket: string | null
  publicUrl: string | undefined
}

let cached: R2 | null | undefined
let warned = false

/** Ο client R2, ή null αν λείπουν τα στοιχεία (τότε το upload δίνει data: URI). */
export function r2(): R2 | null {
  if (cached !== undefined) return cached
  const accountId = process.env.CF_R2_ACCOUNT_ID
  const bucket = process.env.CF_R2_BUCKET_NAME
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return (cached = null)
  const privateBucket = process.env.CF_R2_PRIVATE_BUCKET_NAME?.trim() || null
  if (!privateBucket && !warned) {
    warned = true
    console.warn('[storage] Δεν έχει οριστεί CF_R2_PRIVATE_BUCKET_NAME — τα ανεβάσματα ιατρικών αρχείων και εικόνων AI υγείας απορρίπτονται (503).')
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    // Οδηγία Cloudflare για SDK ≥ 3.729: χωρίς αυτά οι presigned GET φέρουν
    // x-amz-checksum-mode=ENABLED και τα αιτήματα προαιρετικά checksums.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return (cached = { s3, accountId, bucket, privateBucket, publicUrl: process.env.CF_R2_PUBLIC_URL })
}

export function isPrivateFolder(folder: string): boolean {
  return (PRIVATE_FOLDERS as readonly string[]).includes(folder)
}

const hashWith = (salt: string, email: string) =>
  createHmac('sha256', salt).update(email.trim().toLowerCase()).digest('hex').slice(0, 16)

/** Το τμήμα <owner> του κλειδιού για ΝΕΑ αρχεία. */
export function ownerHash(email: string): string {
  return hashWith(process.env.UPLOAD_OWNER_SALT || DEFAULT_SALT, email)
}

/** Όλες οι μορφές <owner> που μπορεί να έχει ένα αρχείο του χρήστη (τρέχον + προεπιλεγμένο salt). */
export function ownerHashes(email: string): string[] {
  return [...new Set([ownerHash(email), hashWith(DEFAULT_SALT, email)])]
}

export function isPrivateRef(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PRIVATE_SCHEME)
}

const REF_RE = /^r2priv:\/\/((medical|ai-health|stool-urine)\/([0-9a-f]{16})\/[0-9]+-[0-9a-f]{32}\.(jpg|png|webp|gif|pdf|mp4|webm))$/

/** Αυστηρή ανάγνωση αναφοράς: μόνο κλειδιά που φτιάχνει ο server (καμία διαδρομή `..`). */
export function parsePrivateRef(v: unknown): { key: string; folder: string; owner: string } | null {
  if (typeof v !== 'string') return null
  const m = v.match(REF_RE)
  return m ? { key: m[1], folder: m[2], owner: m[3] } : null
}

/**
 * Ανέβασμα. Οι ιδιωτικοί φάκελοι πάνε στο ιδιωτικό bucket όταν υπάρχει.
 * Επιστρέφει το `url` που αποθηκεύει ο πελάτης: δημόσιο https ή `r2priv://`.
 */
export async function putObject(c: R2, folder: string, ownerEmail: string | undefined, body: Buffer, mime: string, ext: string) {
  const name = `${Date.now()}-${randomBytes(16).toString('hex')}.${ext}`
  const key = ownerEmail ? `${folder}/${ownerHash(ownerEmail)}/${name}` : `${folder}/${name}`
  // Ιδιωτικός φάκελος χωρίς ιδιωτικό bucket ή χωρίς ιδιοκτήτη: άρνηση, ΟΧΙ
  // σιωπηλή εγγραφή στο δημόσιο bucket. (Το route απαντά 503 πριν φτάσει εδώ.)
  if (isPrivateFolder(folder) && (!c.privateBucket || !ownerEmail)) {
    throw Object.assign(new Error(PRIVATE_STORAGE_UNAVAILABLE_MSG), { statusCode: 503 })
  }
  const priv = isPrivateFolder(folder)
  await c.s3.send(new PutObjectCommand({
    Bucket: priv ? c.privateBucket! : c.bucket,
    Key: key,
    Body: body,
    ContentType: mime,
  }))
  if (priv) return { url: PRIVATE_SCHEME + key, key, private: true as const }
  const url = c.publicUrl ? `${c.publicUrl}/${key}` : `https://${c.accountId}.r2.cloudflarestorage.com/${c.bucket}/${key}`
  return { url, key, private: false as const }
}

/**
 * Προσωρινός σύνδεσμος (10') για ιδιωτική αναφορά· κάθε άλλη τιμή επιστρέφει
 * όπως είναι. ΔΕΝ ελέγχει δικαιώματα — καλείται μόνο αφού έχει γίνει ο
 * έλεγχος (GET /upload/private-url ή resolveForAi).
 * null: άκυρη αναφορά ή δεν υπάρχει ιδιωτικό bucket.
 */
export async function toDisplayUrl(url: unknown, ttl = PRIVATE_URL_TTL): Promise<unknown> {
  if (!isPrivateRef(url)) return url
  const p = parsePrivateRef(url)
  const c = r2()
  if (!p || !c?.privateBucket) return null
  return getSignedUrl(c.s3, new GetObjectCommand({ Bucket: c.privateBucket, Key: p.key }), { expiresIn: ttl })
}

/**
 * Για τα endpoints AI: `r2priv://` → προσωρινός σύνδεσμος που μπορεί να
 * κατεβάσει ο Anthropic· κάθε άλλη τιμή (https, data:) μένει ίδια.
 *
 * `requesterEmail`: ο χρήστης του αιτήματος — η αναφορά πρέπει να είναι
 * δική του, αλλιώς null (ώστε κανείς να μη ζητά ανάλυση αρχείου άλλου).
 * Το null απορρίπτεται από το imageBlockFromUrl ως μη έγκυρη εικόνα.
 */
export async function resolveForAi(url: unknown, requesterEmail: string | null | undefined): Promise<unknown> {
  if (!isPrivateRef(url)) return url
  const p = parsePrivateRef(url)
  if (!p || !requesterEmail || !ownerHashes(requesterEmail).includes(p.owner)) return null
  return toDisplayUrl(url)
}

/**
 * Διαγραφή όλων των αρχείων του χρήστη που μπορούν να εντοπιστούν:
 *   - ιδιωτικό bucket: PRIVATE_FOLDERS/<owner>/
 *   - δημόσιο bucket:  PERSONAL_PUBLIC_FOLDERS/<owner>/ (μόνο νέα κλειδιά)
 * Τα παλιά δημόσια αρχεία χωρίς <owner> ΔΕΝ βρίσκονται (βλ. αρχή αρχείου).
 *
 * Μία DeleteObject ανά αρχείο και όχι DeleteObjects: το μαζικό απαιτεί
 * checksum σώματος που οι νεότερες εκδόσεις του SDK στέλνουν με τρόπο που
 * το R2 δεν δεχόταν πάντα. Η διαγραφή λογαριασμού είναι σπάνια.
 * Δεν πετάει σφάλμα — επιστρέφει πόσα σβήστηκαν και πόσα απέτυχαν.
 */
export async function deleteUserUploads(ownerEmail: string): Promise<{ deleted: number; failed: number }> {
  const c = r2()
  let deleted = 0, failed = 0
  if (!c || !ownerEmail) return { deleted, failed }
  const targets: { bucket: string; folders: readonly string[] }[] = [
    { bucket: c.bucket, folders: [...PERSONAL_PUBLIC_FOLDERS, ...PRIVATE_FOLDERS] },
  ]
  if (c.privateBucket) targets.push({ bucket: c.privateBucket, folders: PRIVATE_FOLDERS })
  for (const { bucket, folders } of targets) {
    for (const folder of folders) {
      for (const h of ownerHashes(ownerEmail)) {
        const prefix = `${folder}/${h}/`
        let token: string | undefined
        try {
          do {
            const page = await c.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }))
            for (const o of page.Contents || []) {
              if (!o.Key) continue
              try { await c.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.Key })); deleted++ }
              catch (e: any) { failed++; console.error('[storage] delete', bucket, o.Key, e?.message) }
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined
          } while (token)
        } catch (e: any) {
          failed++
          console.error('[storage] list', bucket, prefix, e?.message)
        }
      }
    }
  }
  return { deleted, failed }
}
