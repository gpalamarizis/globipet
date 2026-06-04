import type { FastifyPluginAsync } from 'fastify'
import { pipeline } from 'stream/promises'

const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.code(400).send({ message: 'Δεν βρέθηκε αρχείο' })

      const folder = req.query.folder || 'uploads'
      const ext = data.filename.split('.').pop()
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // Use Cloudflare R2 if configured, else return placeholder
      const CF_R2_ACCOUNT_ID = process.env.CF_R2_ACCOUNT_ID
      const CF_R2_ACCESS_KEY_ID = process.env.CF_R2_ACCESS_KEY_ID
      const CF_R2_SECRET_ACCESS_KEY = process.env.CF_R2_SECRET_ACCESS_KEY
      const CF_R2_BUCKET_NAME = process.env.CF_R2_BUCKET_NAME
      const CF_R2_PUBLIC_URL = process.env.CF_R2_PUBLIC_URL

      if (CF_R2_ACCOUNT_ID && CF_R2_ACCESS_KEY_ID && CF_R2_BUCKET_NAME) {
        const chunks: Buffer[] = []
        for await (const chunk of data.file) chunks.push(chunk)
        const body = Buffer.concat(chunks)

        const endpoint = `https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        const url = `${endpoint}/${CF_R2_BUCKET_NAME}/${key}`

        // Simple R2 upload via fetch with auth
        const date = new Date().toUTCString()
        const resp = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': data.mimetype,
            'Content-Length': body.length.toString(),
            'Date': date,
          },
          body,
        })

        const publicUrl = CF_R2_PUBLIC_URL ? `${CF_R2_PUBLIC_URL}/${key}` : url
        return { url: publicUrl, key }
      } else {
        // No R2 configured — return placeholder URL
        const chunks: Buffer[] = []
        for await (const chunk of data.file) chunks.push(chunk)
        return { url: `https://api.dicebear.com/7.x/initials/svg?seed=${Date.now()}`, key }
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά το upload' })
    }
  })
}

export default uploadRoutes
