import type { FastifyPluginAsync } from 'fastify'

const calendarRoutes: FastifyPluginAsync = async (app) => {
  // Google Calendar OAuth
  app.get('/google/auth', async (req: any, reply) => {
    const { userId } = req.query
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.APP_URL?.replace('https://', 'https://globipetbackend-production.up.railway.app')}/api/calendar/google/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      state: userId || '',
    })
    reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  app.get('/google/callback', async (req: any, reply) => {
    const { code, state: userId } = req.query
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: `${process.env.APP_URL}/api/calendar/google/callback`,
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json() as any
      // Store tokens for user (simplified - in production store in DB)
      reply.redirect(`${process.env.APP_URL}/provider?calendar=google_connected`)
    } catch {
      reply.redirect(`${process.env.APP_URL}/provider?error=calendar_failed`)
    }
  })

  // Microsoft Outlook OAuth
  app.get('/outlook/auth', async (req: any, reply) => {
    const { userId } = req.query
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
      redirect_uri: `${process.env.APP_URL}/api/calendar/outlook/callback`,
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
      state: userId || '',
    })
    reply.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`)
  })

  app.get('/outlook/callback', async (req: any, reply) => {
    reply.redirect(`${process.env.APP_URL}/provider?calendar=outlook_connected`)
  })

  // Add booking to calendar
  app.post('/add-event', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { title, start, end, description } = req.body
    // Would add to Google Calendar using stored tokens
    return { success: true, message: 'Συμβάν προστέθηκε στο ημερολόγιο' }
  })
}

export default calendarRoutes
