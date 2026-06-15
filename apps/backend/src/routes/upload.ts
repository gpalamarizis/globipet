import type { FastifyPluginAsync } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.code(400).send({ message: 'Δεν βρέθηκε αρχείο' })

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const body = Buffer.concat(chunks)

      if (body.length > 5 * 1024 * 1024) {
        return reply.code(400).send({ message: 'Το αρχείο είναι πολύ μεγάλο (max 5MB)' })
      }

      const accountId = process.env.CF_R2_ACCOUNT_ID
      const bucketName = process.env.CF_R2_BUCKET_NAME
      const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
      const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY
      const publicUrl = process.env.CF_R2_PUBLIC_URL

      if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
        // Fallback: base64 data URL (dev only)
        const base64 = body.toString('base64')
        const dataUrl = `data:${data.mimetype};base64,${base64}`
        return { url: dataUrl, key: `base64-${Date.now()}` }
      }

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })

      const folder = (req.query as any).folder || 'uploads'
      const ext = data.filename.split('.').pop()
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: data.mimetype,
      }))

      const url = publicUrl ? `${publicUrl}/${key}` : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`
      return { url, key }

    } catch (err: any) {
      console.error('Upload error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά το upload: ' + err.message })
    }
  })
}

export default uploadRoutes
