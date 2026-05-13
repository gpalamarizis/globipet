import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

const authRoutes: FastifyPluginAsync = async (app) => {

  // Register
  app.post('/register', async (req, reply) => {
    const { full_name, email, password, role, preferred_language } = req.body as any
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.code(409).send({ message: 'Email ήδη χρησιμοποιείται' })
    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        password_hash,
        role: role || 'user',
        preferred_language: preferred_language || 'el',
      }
    })
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    return { user: userSafe, token }
  })

  // Login
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    return { user: userSafe, token }
  })

  // Me
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = (req.user as any)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const { password_hash: _, ...userSafe } = user as any
    return userSafe
  })

  // Update me (PATCH /auth/me or PATCH /users/me - whichever your frontend uses)
  // The web store calls PATCH /users/me, but we'll also add PATCH /auth/me for safety
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = (req.user as any)
    const allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language']
    const updateData: any = {}
    for (const key of allowedFields) {
      if ((req.body as any)[key] !== undefined) updateData[key] = (req.body as any)[key]
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'No fields to update' })
    }
    const user = await prisma.user.update({ where: { id }, data: updateData })
    const { password_hash: _, ...userSafe } = user as any
    return userSafe
  })

  // Refresh
  app.post('/refresh', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { id, email, role } = req.user as any
    const token = app.jwt.sign({ id, email, role }, { expiresIn: '7d' })
    return { token }
  })

  // ─── GOOGLE OAUTH ───────────────────────────────────────────────

  app.get('/google', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })
    reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  app.get('/google/callback', async (req: any, reply) => {
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    try {
      const { code, state } = req.query
      if (!code) return reply.redirect(`${APP_URL}/login?error=no_code`)

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) return reply.redirect(`${APP_URL}/login?error=token_failed`)

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const googleUser = await userRes.json() as any

      // Try to read preferred language from Google profile (locale field)
      const googleLocale = (googleUser.locale || '').toLowerCase().split('-')[0]
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(googleLocale) ? googleLocale : 'el'

      let user = await prisma.user.findUnique({ where: { email: googleUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            full_name: googleUser.name,
            profile_photo: googleUser.picture,
            role: 'user',
            preferred_language: preferredLang,
          }
        })
      } else if (!user.profile_photo && googleUser.picture) {
        user = await prisma.user.update({ where: { id: user.id }, data: { profile_photo: googleUser.picture } })
      }

      const { password_hash: _, ...userSafe } = user as any
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
      reply.redirect(`${APP_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userSafe))}`)
    } catch (err: any) {
      console.error('Google OAuth error:', err)
      reply.redirect(`${APP_URL}/login?error=google_failed`)
    }
  })

  // ─── FACEBOOK OAUTH ─────────────────────────────────────────────

  app.get('/facebook', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || '',
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL || '',
      scope: 'email,public_profile',
      response_type: 'code',
    })
    reply.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`)
  })

  app.get('/facebook/callback', async (req: any, reply) => {
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    try {
      const { code } = req.query
      if (!code) return reply.redirect(`${APP_URL}/login?error=no_code`)

      const tokenRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL || '')}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`
      )
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) return reply.redirect(`${APP_URL}/login?error=fb_token_failed`)

      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture,locale&access_token=${tokens.access_token}`
      )
      const fbUser = await userRes.json() as any

      if (!fbUser.email) return reply.redirect(`${APP_URL}/login?error=fb_no_email`)

      // Try to read preferred language from Facebook profile (locale field, e.g. "el_GR")
      const fbLocale = (fbUser.locale || '').toLowerCase().split('_')[0]
      const supportedLangs = ['el', 'en', 'es', 'fr', 'zh']
      const preferredLang = supportedLangs.includes(fbLocale) ? fbLocale : 'el'

      let user = await prisma.user.findUnique({ where: { email: fbUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: fbUser.email,
            full_name: fbUser.name,
            profile_photo: fbUser.picture?.data?.url,
            role: 'user',
            preferred_language: preferredLang,
          }
        })
      }

      const { password_hash: _, ...userSafe } = user as any
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
      reply.redirect(`${APP_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userSafe))}`)
    } catch (err: any) {
      console.error('Facebook OAuth error:', err)
      reply.redirect(`${APP_URL}/login?error=facebook_failed`)
    }
  })

  // Forgot password
  app.post('/forgot-password', async (req: any, reply) => {
    const { email } = req.body as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: expires }
    })

    const RESEND_KEY = process.env.RESEND_API_KEY
    const APP_URL = process.env.APP_URL || 'https://globipet.com'
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    // Localized email subjects/content based on user's preferred language
    const lang = user.preferred_language || 'el'
    const emailContent: Record<string, { subject: string; title: string; body: string; cta: string; expiry: string }> = {
      el: {
        subject: 'Επαναφορά κωδικού GlobiPet',
        title: 'Επαναφορά κωδικού',
        body: 'Κάντε κλικ στον παρακάτω σύνδεσμο για να αλλάξετε τον κωδικό σας:',
        cta: 'Αλλαγή κωδικού',
        expiry: 'Ο σύνδεσμος λήγει σε 1 ώρα. Αν δεν ζητήσατε αλλαγή κωδικού, αγνοήστε αυτό το email.',
      },
      en: {
        subject: 'GlobiPet Password Reset',
        title: 'Password Reset',
        body: 'Click the link below to reset your password:',
        cta: 'Reset Password',
        expiry: 'This link expires in 1 hour. If you did not request a password reset, please ignore this email.',
      },
      es: {
        subject: 'Restablecer contraseña GlobiPet',
        title: 'Restablecer contraseña',
        body: 'Haz clic en el siguiente enlace para restablecer tu contraseña:',
        cta: 'Restablecer contraseña',
        expiry: 'Este enlace expira en 1 hora. Si no solicitaste el cambio, ignora este email.',
      },
      fr: {
        subject: 'Réinitialisation du mot de passe GlobiPet',
        title: 'Réinitialiser le mot de passe',
        body: 'Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:',
        cta: 'Réinitialiser',
        expiry: 'Ce lien expire dans 1 heure. Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
      },
      zh: {
        subject: 'GlobiPet 密码重置',
        title: '重置密码',
        body: '点击下方链接重置您的密码:',
        cta: '重置密码',
        expiry: '此链接1小时后过期。如果您未请求重置密码,请忽略此邮件。',
      },
    }
    const c = emailContent[lang] || emailContent.el

    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'GlobiPet <noreply@globipet.com>',
          to: email,
          subject: c.subject,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <img src="${APP_URL}/logo.png" alt="GlobiPet" style="height:50px;margin-bottom:20px"/>
              <h2>${c.title}</h2>
              <p>${c.body}</p>
              <a href="${resetUrl}" style="display:inline-block;background:#E65100;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">${c.cta}</a>
              <p style="color:#666;font-size:14px">${c.expiry}</p>
            </div>
          `
        })
      })
    }

    return { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }
  })

  // Reset password
  app.post('/reset-password', async (req: any, reply) => {
    const { token, password } = req.body as any
    const user = await prisma.user.findFirst({
      where: { reset_token: token, reset_token_expires: { gt: new Date() } }
    })
    if (!user) return reply.code(400).send({ message: 'Μη έγκυρος ή ληγμένος σύνδεσμος' })

    const bcrypt = await import('bcryptjs')
    const password_hash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash, reset_token: null, reset_token_expires: null }
    })
    return { message: 'Ο κωδικός άλλαξε επιτυχώς' }
  })

}

export default authRoutes
