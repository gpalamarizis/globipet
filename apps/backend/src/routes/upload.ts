import type { FastifyPluginAsync } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomBytes } from 'crypto'

/**
 * Allowed MIME types and their expected magic bytes (file signatures).
 * A client-provided MIME type is untrusted — we ALSO verify the actual file
 * signature to prevent MIME spoofing attacks (e.g. .exe renamed to .jpg).
 */
const ALLOWED_TYPES: Record<string, { ext: string; magic: number[][] }> = {
  'image/jpeg': { ext: 'jpg', magic: [[0xFF, 0xD8, 0xFF]] },
  'image/png':  { ext: 'png', magic: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]] },
  'image/webp': { ext: 'webp', magic: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF, WEBP checked after
  'image/gif':  { ext: 'gif', magic: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
  'application/pdf': { ext: 'pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  // Βίντεο για banner καμπανιών.
  // MP4: το 'ftyp' βρίσκεται στα bytes 4-7, όχι στην αρχή — τα πρώτα
  // τέσσερα είναι το μήκος του box. Ελέγχεται χωριστά παρακάτω.
  'video/mp4':  { ext: 'mp4',  magic: [[0x66, 0x74, 0x79, 0x70]] },
  'video/webm': { ext: 'webm', magic: [[0x1A, 0x45, 0xDF, 0xA3]] },
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
// Τα βίντεο είναι εγγενώς μεγαλύτερα: 10 δευτερόλεπτα από κινητό είναι
// 8-15MB. Με όριο 5MB κανένα δεν θα περνούσε.
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25 MB
const isVideo = (mime: string) => mime.startsWith('video/')
const ALLOWED_FOLDERS = ['uploads', 'pets', 'services', 'products', 'avatars', 'medical', 'reviews', 'community', 'ai-uploads', 'campaigns']

function verifyMagicBytes(mime: string, body: Buffer): boolean {
  const spec = ALLOWED_TYPES[mime]
  if (!spec) return false
  // Το MP4 έχει το 'ftyp' στο offset 4, όχι στο 0.
  const offset = mime === 'video/mp4' ? 4 : 0
  return spec.magic.some(sig => sig.every((byte, i) => body[offset + i] === byte))
}

function sanitizeFolder(folder: string): string {
  if (!folder || typeof folder !== 'string') return 'uploads'
  return ALLOWED_FOLDERS.includes(folder) ? folder : 'uploads'
}

const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.code(400).send({ message: 'Δεν βρέθηκε αρχείο' })
      // Ο τύπος διαβάζεται ΕΔΩ, όχι παρακάτω: το όριο μεγέθους διαφέρει
      // για βίντεο και πρέπει να είναι γνωστό πριν διαβαστεί η ροή.
      const mime = data.mimetype

      // Read into buffer with size guard
      const chunks: Buffer[] = []
      let total = 0
      for await (const chunk of data.file) {
        total += chunk.length
        if (total > (isVideo(mime) ? MAX_VIDEO_SIZE : MAX_FILE_SIZE)) {
          return reply.code(413).send({ message: `Το αρχείο είναι πολύ μεγάλο (${isVideo(mime) ? "25MB για βίντεο" : "5MB"})` })
        }
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)

      // 1) MIME whitelist check

      if (!ALLOWED_TYPES[mime]) {
        return reply.code(400).send({ message: 'Μη επιτρεπόμενος τύπος αρχείου' })
      }

      // 2) Magic byte verification (defense against MIME spoofing)
      if (!verifyMagicBytes(mime, body)) {
        return reply.code(400).send({ message: 'Το αρχείο δεν αντιστοιχεί στον δηλωμένο τύπο' })
      }

      // 3) Additional WEBP verification (magic bytes only cover RIFF, we need WEBP marker at byte 8-11)
      if (mime === 'image/webp' && body.slice(8, 12).toString('ascii') !== 'WEBP') {
        return reply.code(400).send({ message: 'Το αρχείο δεν είναι έγκυρο WebP' })
      }

      const accountId = process.env.CF_R2_ACCOUNT_ID
      const bucketName = process.env.CF_R2_BUCKET_NAME
      const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
      const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY
      const publicUrl = process.env.CF_R2_PUBLIC_URL

      if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
        const base64 = body.toString('base64')
        const dataUrl = `data:${mime};base64,${base64}`
        return { url: dataUrl, key: `base64-${Date.now()}` }
      }

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      })

      // 4) Sanitize folder (prevent path traversal)
      const folder = sanitizeFolder((req.query as any).folder)

      // 5) Generate safe filename — use enforced extension from whitelist, NOT client filename
      const ext = ALLOWED_TYPES[mime].ext
      const randomId = randomBytes(16).toString('hex')
      const key = `${folder}/${Date.now()}-${randomId}.${ext}`

      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: mime,
      }))

      const url = publicUrl ? `${publicUrl}/${key}` : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`
      return { url, key }

    } catch (err: any) {
      console.error('Upload error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά το upload' })
    }
  })
}

export default uploadRoutes
