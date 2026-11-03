/**
 * Προεπισκοπήσεις και SEO για σελίδες με :id (πάροχοι, προϊόντα, εκδηλώσεις, ράτσες).
 *
 * Όταν κάποιος μοιράζεται τον σύνδεσμο ενός παρόχου στο LinkedIn, Facebook,
 * WhatsApp ή Viber, το crawler τους δεν τρέχει JavaScript: έβλεπε το γενικό
 * index.html χωρίς όνομα, περιγραφή ή φωτογραφία. Εδώ, ΜΟΝΟ για crawlers και
 * bots προεπισκόπησης, παίρνουμε τα στοιχεία από το API και τα γράφουμε στο
 * HTML (τίτλος, περιγραφή, Open Graph, canonical, κείμενο στο #root).
 *
 * Οι κανονικοί επισκέπτες περνούν αμέσως (context.next()) — καμία καθυστέρηση,
 * καμία κλήση στο API. Το περιεχόμενο είναι το ίδιο με αυτό που βλέπει ο
 * χρήστης στη σελίδα, απλώς έτοιμο χωρίς JavaScript.
 *
 * Τρέχει μόνο στις διαδρομές του public/_routes.json, όχι σε κάθε αρχείο.
 * Σε οποιοδήποτε σφάλμα (API κάτω, 404, timeout) επιστρέφεται η σελίδα όπως ήταν.
 */

const SITE = 'https://globipet.com'
const DEFAULT_API = 'https://globipetbackend-production.up.railway.app/api'
const DEFAULT_IMAGE = SITE + '/og-image.jpg'

const BOT = /bot\b|crawler|spider|facebookexternalhit|facebookcatalog|meta-externalagent|LinkedInBot|Twitterbot|Slackbot|WhatsApp|TelegramBot|Discordbot|Pinterest|Viber|SkypeUriPreview|Embedly|redditbot|Applebot|bingbot|BingPreview|Googlebot|Google-InspectionTool|Storebot-Google|DuckDuckBot|YandexBot|Baiduspider|ia_archiver|Mastodon|Iframely/i

const ROUTES = {
  services: {
    api: (id) => `/services/${id}`,
    map: (d) => ({
      title: [d.provider_name, d.title].filter(Boolean).join(' — '),
      description: [d.description, d.city].filter(Boolean).join(' · '),
      image: d.image_url,
      type: 'business.business',
    }),
  },
  marketplace: {
    api: (id) => `/products/${id}`,
    map: (d) => ({
      title: [d.name, d.brand].filter(Boolean).join(' — '),
      description: [d.description, typeof d.price === 'number' ? `€${d.price.toFixed(2)}` : ''].filter(Boolean).join(' · '),
      image: d.image_url || (Array.isArray(d.images) ? d.images[0] : null),
      type: 'product',
    }),
  },
  events: {
    api: (id) => `/events/${id}`,
    map: (d) => ({
      title: d.title,
      description: [d.date, [d.location, d.city].filter(Boolean).join(', '), d.description].filter(Boolean).join(' · '),
      image: d.image_url,
      type: 'website',
    }),
  },
  breeds: {
    api: (id) => `/breeds/${id}`,
    map: (d) => ({
      title: d.name,
      description: d.description,
      image: d.image_url,
      type: 'article',
    }),
  },
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t
}

export async function onRequest(context) {
  const { request, env, next } = context
  if (request.method !== 'GET') return next()

  const url = new URL(request.url)
  const m = url.pathname.match(/^\/(services|marketplace|events|breeds)\/([A-Za-z0-9_-]{1,64})\/?$/)
  if (!m || !BOT.test(request.headers.get('user-agent') || '')) return next()

  const res = await next()
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res

  const route = ROUTES[m[1]]
  let data
  try {
    const api = (env && env.API_URL) || DEFAULT_API
    const r = await fetch(api + route.api(m[2]), {
      headers: { 'Accept': 'application/json', 'Accept-Language': 'el' },
      signal: AbortSignal.timeout(3000),
    })
    // Ανύπαρκτο id: η σελίδα μένει ως έχει, αλλά δεν ευρετηριάζεται (αλλιώς η
    // Google θα έβλεπε χιλιάδες «σελίδες» με το ίδιο γενικό περιεχόμενο).
    if (r.status === 404) {
      return new HTMLRewriter()
        .on('head', { element(el) { el.append('<meta name="robots" content="noindex" />', { html: true }) } })
        .transform(res)
    }
    if (!r.ok) return res
    data = await r.json()
  } catch {
    return res
  }
  if (!data || typeof data !== 'object') return res

  const v = route.map(data)
  if (!v.title) return res
  const title = clip(v.title, 90) + ' | GlobiPet'
  const description = clip(v.description || v.title, 200)
  const image = typeof v.image === 'string' && /^https:\/\//.test(v.image) ? v.image : DEFAULT_IMAGE
  const canonical = SITE + `/${m[1]}/${m[2]}`

  const head = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
  ].join('')
  const body = `<main style="max-width:720px;margin:48px auto;padding:0 20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0F2A3F;line-height:1.55">`
    + `<p style="font-weight:700;color:#E65100;margin:0 0 8px"><a href="/" style="color:inherit;text-decoration:none">GlobiPet</a></p>`
    + `<h1 style="font-size:28px;line-height:1.2;margin:0 0 12px">${esc(clip(v.title, 140))}</h1>`
    + `<p style="margin:0 0 20px">${esc(clip(v.description || '', 600))}</p>`
    + `<p><a href="/${m[1]}">← ${m[1] === 'services' ? 'Όλες οι υπηρεσίες' : m[1] === 'marketplace' ? 'Κατάστημα' : m[1] === 'events' ? 'Όλες οι εκδηλώσεις' : 'Όλες οι ράτσες'}</a></p>`
    + `</main>`

  const set = (value) => ({ element(el) { el.setAttribute('content', value) } })
  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title) } })
    .on('meta[name="description"]', set(description))
    .on('meta[property="og:type"]', set(v.type))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(description))
    .on('meta[property="og:image"]', set(image))
    .on('meta[property="og:image:alt"]', set(clip(v.title, 140)))
    .on('meta[name="twitter:title"]', set(title))
    .on('meta[name="twitter:description"]', set(description))
    .on('meta[name="twitter:image"]', set(image))
    // Φωτογραφία παρόχου/προϊόντος: άγνωστες διαστάσεις — όχι 1200×630 της προεπιλογής.
    .on('meta[property="og:image:width"]', { element(el) { if (image !== DEFAULT_IMAGE) el.remove() } })
    .on('meta[property="og:image:height"]', { element(el) { if (image !== DEFAULT_IMAGE) el.remove() } })
    .on('head', { element(el) { el.append(head, { html: true }) } })
    .on('div#root', { element(el) { el.setInnerContent(body, { html: true }) } })
    .transform(res)
}
