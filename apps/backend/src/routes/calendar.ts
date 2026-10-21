import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import prisma from '../lib/prisma.js'
import { encryptField, decryptField } from '../lib/crypto.js'

/**
 * Google Calendar and Microsoft Outlook integration.
 *
 * WHAT WAS HERE BEFORE
 *   The OAuth dance ran, the token response was parsed, and then discarded —
 *   a comment read "in production store in DB". The callback redirected with
 *   ?calendar=google_connected regardless, so the provider saw success and no
 *   booking ever reached their calendar. /add-event returned
 *   { success: true } without doing anything.
 *
 *   The router was also imported in index.ts but never registered, so every
 *   path here answered 404 anyway.
 *
 * SECURITY
 *   The old flow put the user id into the OAuth `state` parameter and trusted
 *   whatever came back. Anyone could construct a callback URL and attach
 *   their own calendar to another account. State is now a random value issued
 *   at the start, stored server-side, consumed once, and expired after ten
 *   minutes.
 *
 *   Tokens grant access to a person's entire calendar, so they are encrypted
 *   at rest with the same helper used for phone numbers.
 */

type Provider = 'google' | 'outlook'

const PROVIDERS: Record<Provider, {
  authUrl: string
  tokenUrl: string
  scope: string
  clientId: () => string | undefined
  clientSecret: () => string | undefined
}> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'Calendars.ReadWrite offline_access',
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
  },
}

/**
 * The backend's own public URL, which is where the OAuth provider redirects.
 * APP_URL points at the frontend, so it cannot be reused here — the previous
 * code tried to patch one into the other with a string replace and produced
 * a malformed address.
 */
function apiBase() {
  return process.env.PUBLIC_API_URL
    || 'https://globipetbackend-production.up.railway.app/api'
}
function frontendUrl() {
  return process.env.FRONTEND_URL || process.env.APP_URL || 'https://globipet.com'
}
const redirectUri = (p: Provider) => `${apiBase()}/calendar/${p}/callback`

/**
 * Ε12 — ΤΟ STATE ΔΕΝΕΤΑΙ ΜΕ ΤΟΝ BROWSER (υπογεγραμμένο httpOnly cookie).
 *
 *   Πριν, το state ζούσε μόνο στη βάση. Όποιος ξεκινούσε τη ροή από τον δικό
 *   του λογαριασμό μπορούσε να στείλει το URL της Google/Microsoft σε ένα
 *   θύμα: το θύμα ενέκρινε, και το ΗΜΕΡΟΛΟΓΙΟ ΤΟΥ θύματος συνδεόταν στον
 *   λογαριασμό του επιτιθέμενου (όλες οι μελλοντικές κρατήσεις του, με
 *   ονόματα πελατών, γράφονταν εκεί και αντίστροφα).
 *
 *   Τώρα το /connect επιστρέφει ένα URL ΤΟΥ ΔΙΚΟΥ ΜΑΣ server (/start). Ο
 *   browser που το ανοίγει (popup στο web, εξωτερικός browser στο κινητό)
 *   παίρνει το state σε υπογεγραμμένο, httpOnly cookie, και μόνο μετά
 *   πηγαίνει στον πάροχο. Στην επιστροφή το cookie ΠΡΕΠΕΙ να ταιριάζει.
 *   Το cookie μπαίνει με πλήρη πλοήγηση (όχι από XHR), γιατί το API είναι
 *   σε άλλο site από το web — cookie από XHR θα ήταν third-party και θα
 *   το έκοβε ο browser. Οι clients δεν αλλάζουν: ανοίγουν ό,τι URL πάρουν.
 *
 *   Ίδιο μοτίβο με το gp_oauth_state του routes/auth.ts.
 *
 *   ΟΡΙΟ ΤΗΣ ΛΥΣΗΣ: ο σύνδεσμος /start είναι μίας χρήσης (startedStates),
 *   αλλά ένας σύνδεσμος που ο επιτιθέμενος ΔΕΝ άνοιξε ο ίδιος και έστειλε στο
 *   θύμα παραμένει χρήσιμος για 10′. Πλήρες δέσιμο με τη συνεδρία θέλει βήμα
 *   ολοκλήρωσης από τον συνδεδεμένο client (POST με JWT) — αλλαγή στο
 *   ProviderDashboard του web και στο (provider)/calendar του κινητού.
 */
const startedStates = new Map<string, number>()
const CAL_STATE_COOKIE = 'gp_cal_state'
const CAL_STATE_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
  signed: true,
}

/** Exchange an authorisation code, or a refresh token, for an access token. */
async function requestToken(p: Provider, body: Record<string, string>) {
  const cfg = PROVIDERS[p]
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId() || '',
      client_secret: cfg.clientSecret() || '',
      ...body,
    }).toString(),
  })
  if (!res.ok) throw new Error(`${p} token error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<any>
}

/**
 * Return a usable access token, refreshing it first when it is about to
 * expire. A minute of margin covers the round trip.
 */
async function freshAccessToken(conn: any): Promise<string> {
  const expiring = !conn.expires_at || new Date(conn.expires_at).getTime() < Date.now() + 60_000
  if (!expiring) return decryptField(conn.access_token) as string

  const refresh = conn.refresh_token ? decryptField(conn.refresh_token) : null
  if (!refresh) {
    // Google only issues a refresh token on the first consent. Without one
    // the connection cannot survive expiry and has to be re-established.
    throw new Error('reauth_required')
  }

  const data = await requestToken(conn.provider as Provider, {
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })

  await prisma.calendarConnection.update({
    where: { id: conn.id },
    data: {
      access_token: encryptField(data.access_token) as string,
      expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      // A refresh response usually omits the refresh token; keep the old one.
      ...(data.refresh_token ? { refresh_token: encryptField(data.refresh_token) as string } : {}),
    },
  })
  return data.access_token
}

/**
 * Write an event to whichever calendar the user connected.
 *
 * Exported so bookings.ts can call it when a booking is created or confirmed.
 * It never throws at the caller: a calendar that is down must not stop a
 * booking from being made.
 */
export async function addBookingToCalendar(providerEmail: string, booking: {
  id: string
  title: string
  description?: string | null
  booking_date: string
  booking_time: string
  duration?: number | null
  location?: string | null
}): Promise<string | null> {
  try {
    const conn = await prisma.calendarConnection.findFirst({
      where: { user_email: providerEmail, is_active: true },
    })
    if (!conn) return null

    const token = await freshAccessToken(conn)

    // booking_date is "YYYY-MM-DD" and booking_time is "HH:MM"; the calendar
    // APIs want a full timestamp with a time zone alongside it.
    const start = new Date(`${booking.booking_date}T${booking.booking_time || '09:00'}:00`)
    if (isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + (booking.duration || 60) * 60_000)
    const tz = process.env.CALENDAR_TIMEZONE || 'Europe/Athens'

    if (conn.provider === 'google') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: booking.title,
            description: booking.description || undefined,
            location: booking.location || undefined,
            start: { dateTime: start.toISOString(), timeZone: tz },
            end: { dateTime: end.toISOString(), timeZone: tz },
            source: { title: 'GlobiPet', url: `${frontendUrl()}/provider` },
          }),
        })
      if (!res.ok) throw new Error(`google insert ${res.status}: ${await res.text()}`)
      const created = await res.json() as any
      await prisma.calendarConnection.update({
        where: { id: conn.id }, data: { last_synced_at: new Date() },
      })
      return created.id ?? null
    }

    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: booking.title,
        body: { contentType: 'text', content: booking.description || '' },
        location: { displayName: booking.location || '' },
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
      }),
    })
    if (!res.ok) throw new Error(`outlook insert ${res.status}: ${await res.text()}`)
    const created = await res.json() as any
    await prisma.calendarConnection.update({
      where: { id: conn.id }, data: { last_synced_at: new Date() },
    })
    return created.id ?? null
  } catch (err: any) {
    // Logged, not surfaced. The booking itself already succeeded.
    console.error('[calendar] add event failed:', err?.message)
    return null
  }
}

/** Remove an event when its booking is cancelled. Best effort, like the add. */
export async function removeBookingFromCalendar(providerEmail: string, eventId: string) {
  try {
    const conn = await prisma.calendarConnection.findFirst({
      where: { user_email: providerEmail, is_active: true },
    })
    if (!conn) return
    const token = await freshAccessToken(conn)
    const url = conn.provider === 'google'
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events/${eventId}`
      : `https://graph.microsoft.com/v1.0/me/events/${eventId}`
    await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  } catch (err: any) {
    console.error('[calendar] remove event failed:', err?.message)
  }
}

const calendarRoutes: FastifyPluginAsync = async (app) => {

  /** Which calendars this user has connected. Tokens are never returned. */
  app.get('/connections', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.calendarConnection.findMany({
      where: { user_email: email },
      select: {
        id: true, provider: true, account_email: true, calendar_id: true,
        is_active: true, last_synced_at: true, created_at: true,
      },
    })
    return { data }
  })

  /**
   * Start the flow. Requires a session — the previous version took the user
   * id from a query parameter, which is the same as taking it from a
   * stranger.
   */
  app.get('/:provider/connect', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const provider = req.params.provider as Provider
    const cfg = PROVIDERS[provider]
    if (!cfg) return reply.code(400).send({ message: 'Άγνωστος πάροχος ημερολογίου' })
    if (!cfg.clientId() || !cfg.clientSecret()) {
      return reply.code(503).send({ message: `Το ${provider} δεν έχει ρυθμιστεί στον διακομιστή` })
    }

    const { email } = req.user as any
    const state = randomBytes(24).toString('hex')
    await prisma.oAuthState.create({
      data: { state, user_email: email, provider, expires_at: new Date(Date.now() + 10 * 60_000) },
    })

    // Ε12: όχι κατευθείαν το URL του παρόχου — ο σύνδεσμος προς το /start,
    // που δένει το state με τον browser (βλ. CAL_STATE_COOKIE).
    return { data: { url: `${apiBase()}/calendar/${provider}/start?s=${state}` } }
  })

  /**
   * Ο browser που θα ολοκληρώσει τη ροή περνά πρώτα από εδώ: παίρνει το state
   * σε cookie και ανακατευθύνεται στον πάροχο (βλ. CAL_STATE_COOKIE).
   */
  app.get('/:provider/start', async (req: any, reply) => {
    const provider = req.params.provider as Provider
    const cfg = PROVIDERS[provider]
    const state = String((req.query as any)?.s ?? '')
    const back = (status: string) => reply.redirect(`${frontendUrl()}/provider?calendar=${status}`)
    if (!cfg || !/^[a-f0-9]{48}$/.test(state)) return back('failed')
    const row = await prisma.oAuthState.findUnique({ where: { state } })
    if (!row || row.provider !== provider || row.expires_at < new Date()) return back('failed')
    // Μία χρήση ανά διεργασία: δεύτερο άνοιγμα του ίδιου συνδέσμου → αποτυχία.
    const now = Date.now()
    for (const [k, exp] of startedStates) if (exp < now) startedStates.delete(k)
    if (startedStates.has(state)) return back('failed')
    startedStates.set(state, row.expires_at.getTime())

    reply.setCookie(CAL_STATE_COOKIE, state, CAL_STATE_COOKIE_OPTS)
    const params = new URLSearchParams({
      client_id: cfg.clientId() || '',
      redirect_uri: redirectUri(provider),
      response_type: 'code',
      scope: cfg.scope,
      state,
      // Without these Google returns no refresh token and the connection
      // dies at the first expiry.
      ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {}),
    })
    return reply.redirect(`${cfg.authUrl}?${params}`)
  })

  /** Where the provider sends the browser back. No session here — the state carries the identity. */
  app.get('/:provider/callback', async (req: any, reply) => {
    const provider = req.params.provider as Provider
    const { code, state } = req.query as any
    const back = (status: string) => reply.redirect(`${frontendUrl()}/provider?calendar=${status}`)

    // Ε12: το state πρέπει να ταιριάζει με το cookie ΑΥΤΟΥ του browser.
    const raw = req.cookies?.[CAL_STATE_COOKIE]
    reply.clearCookie(CAL_STATE_COOKIE, { path: '/' })
    const unsigned = raw ? req.unsignCookie(raw) : null
    const cookieOk = !!unsigned?.valid && typeof state === 'string' && unsigned.value === state

    if (!PROVIDERS[provider] || !code || !state) return back('failed')
    if (!cookieOk) {
      console.warn('[calendar] callback state not bound to this browser — rejected')
      return back('failed')
    }

    try {
      const row = await prisma.oAuthState.findUnique({ where: { state } })
      // Consumed once, whatever happens next.
      if (row) await prisma.oAuthState.delete({ where: { state } }).catch(() => {})
      if (!row || row.provider !== provider || row.expires_at < new Date()) return back('failed')

      const data = await requestToken(provider, {
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri(provider),
      })

      await prisma.calendarConnection.upsert({
        where: { user_email_provider: { user_email: row.user_email, provider } },
        create: {
          user_email: row.user_email,
          provider,
          access_token: encryptField(data.access_token) as string,
          refresh_token: data.refresh_token ? encryptField(data.refresh_token) as string : null,
          expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        },
        update: {
          access_token: encryptField(data.access_token) as string,
          expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
          is_active: true,
          ...(data.refresh_token ? { refresh_token: encryptField(data.refresh_token) as string } : {}),
        },
      })
      return back(`${provider}_connected`)
    } catch (err: any) {
      console.error('[calendar] callback failed:', err?.message)
      return back('failed')
    }
  })

  app.delete('/:provider', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const deleted = await prisma.calendarConnection.deleteMany({
      where: { user_email: email, provider: req.params.provider },
    })
    if (deleted.count === 0) return reply.code(404).send({ message: 'Δεν βρέθηκε σύνδεση' })
    return reply.code(204).send()
  })

  /**
   * Push an existing booking to the calendar by hand — useful for bookings
   * made before the calendar was connected.
   */
  app.post('/sync-booking/:bookingId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { service: { select: { title: true, location: true, city: true } } },
    })
    if (!booking) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })
    if (booking.provider_email !== email) {
      return reply.code(403).send({ message: 'Η κράτηση δεν σου ανήκει' })
    }

    const eventId = await addBookingToCalendar(email, {
      id: booking.id,
      title: `${booking.service?.title || 'Κράτηση'} — ${booking.customer_name}`,
      description: booking.notes,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      duration: booking.duration,
      location: booking.service?.location || booking.service?.city,
    })

    if (!eventId) {
      return reply.code(502).send({ message: 'Δεν ήταν δυνατή η εγγραφή στο ημερολόγιο' })
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { calendar_event_id: eventId } })
    return { success: true, event_id: eventId }
  })
}

export default calendarRoutes
