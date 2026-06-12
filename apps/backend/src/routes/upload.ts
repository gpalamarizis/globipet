import type { FastifyPluginAsync } from 'fastify'

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

      const CF_R2_ACCOUNT_ID = process.env.CF_R2_ACCOUNT_ID
      const CF_R2_BUCKET_NAME = process.env.CF_R2_BUCKET_NAME
      const CF_R2_PUBLIC_URL = process.env.CF_R2_PUBLIC_URL

      if (CF_R2_ACCOUNT_ID && CF_R2_BUCKET_NAME) {
        const folder = (req.query as any).folder || 'uploads'
        const ext = data.filename.split('.').pop()
        const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const url = `https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${CF_R2_BUCKET_NAME}/${key}`
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': data.mimetype, 'Content-Length': body.length.toString() },
          body,
        })
        const publicUrl = CF_R2_PUBLIC_URL ? `${CF_R2_PUBLIC_URL}/${key}` : url
        return { url: publicUrl, key }
      }

      // Fallback: base64 data URL
      const base64 = body.toString('base64')
      const dataUrl = `data:${data.mimetype};base64,${base64}`
      return { url: dataUrl, key: `base64-${Date.now()}` }

    } catch (err: any) {
      console.error('Upload error:', err)
      return reply.code(500).send({ message: 'Σφάλμα κατά το upload: ' + err.message })
    }
  })
}

export default uploadRoutes
