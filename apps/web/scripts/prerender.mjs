/**
 * Prerender των δημόσιων σελίδων — τρέχει αμέσως μετά το `vite build`.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ
 *   Το site είναι SPA: κάθε διεύθυνση σερβίρει το ίδιο index.html με άδειο
 *   <div id="root">. Οι μηχανές αναζήτησης και τα crawlers των social (LinkedIn,
 *   Facebook, WhatsApp, Viber) έβλεπαν για ΚΑΘΕ σελίδα τον ίδιο τίτλο, την ίδια
 *   περιγραφή και καθόλου κείμενο — και την εικόνα ως σχετική διαδρομή
 *   (/logo.png), που δεν τη λύνουν.
 *
 * Η ΛΥΣΗ
 *   Για κάθε δημόσια σελίδα του src/seo/pages.json γράφεται δικό της HTML
 *   (dist/services.html κ.λπ. — το Cloudflare Pages τα σερβίρει στο /services
 *   χωρίς ανακατεύθυνση) με:
 *     • δικό της <title>, description, canonical, Open Graph και Twitter card,
 *       με απόλυτα URL·
 *     • JSON-LD (Organization + WebSite)·
 *     • πραγματικό κείμενο μέσα στο #root (τίτλος, εισαγωγή, σύνδεσμοι), ώστε
 *       το περιεχόμενο να διαβάζεται χωρίς JavaScript.
 *   Το React (createRoot, όχι hydrate) αντικαθιστά το περιεχόμενο του #root
 *   μόλις φορτώσει, άρα για τον χρήστη η εφαρμογή είναι ίδια με πριν.
 *
 *   Οι σελίδες με :id (πάροχοι, προϊόντα, εκδηλώσεις, ράτσες) καλύπτονται από
 *   τις Pages Functions στο functions/ — παίρνουν τα στοιχεία από το API τη
 *   στιγμή του αιτήματος.
 *
 *   Το ίδιο script ξαναγράφει το dist/sitemap.xml από το pages.json, ώστε ο
 *   κατάλογος σελίδων να υπάρχει σε ένα μόνο σημείο.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function prerender(dist = path.join(root, 'dist')) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'src/seo/pages.json'), 'utf8'))
  const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
  const START = '<!--seo:start-->', END = '<!--seo:end-->', BODY = '<!--seo:body-->'
  for (const m of [START, END, BODY]) {
    if (template.split(m).length !== 2) throw new Error(`prerender: το dist/index.html πρέπει να έχει ακριβώς ένα ${m}`)
  }

  const urlOf = (p) => cfg.site + (p === '/' ? '/' : p)

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': cfg.site + '/#organization',
        name: cfg.name,
        url: cfg.site + '/',
        logo: cfg.site + '/icon-512.png',
        sameAs: ['https://www.instagram.com/globipet/', 'https://www.linkedin.com/company/145281409/'],
      },
      {
        '@type': 'WebSite',
        '@id': cfg.site + '/#website',
        name: cfg.name,
        url: cfg.site + '/',
        inLanguage: 'el',
        publisher: { '@id': cfg.site + '/#organization' },
      },
    ],
  }).replace(/</g, '\\u003c')

  function head(p) {
    const url = urlOf(p.path)
    return [
      START,
      `<meta name="description" content="${esc(p.description)}" />`,
      p.noindex ? '<meta name="robots" content="noindex, follow" />' : '',
      `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:site_name" content="${esc(cfg.name)}" />`,
      '<meta property="og:locale" content="el_GR" />',
      '<meta property="og:type" content="website" />',
      `<meta property="og:title" content="${esc(p.title)}" />`,
      `<meta property="og:description" content="${esc(p.description)}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta property="og:image" content="${esc(cfg.image)}" />`,
      `<meta property="og:image:width" content="${cfg.imageWidth}" />`,
      `<meta property="og:image:height" content="${cfg.imageHeight}" />`,
      `<meta property="og:image:alt" content="${esc(p.h1)}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${esc(p.title)}" />`,
      `<meta name="twitter:description" content="${esc(p.description)}" />`,
      `<meta name="twitter:image" content="${esc(cfg.image)}" />`,
      `<title>${esc(p.title)}</title>`,
      `<script type="application/ld+json">${jsonLd}</script>`,
      END,
    ].filter(Boolean).join('\n    ')
  }

  // Απλό, αναγνώσιμο χωρίς CSS. Φαίνεται μόνο για τα κλάσματα του δευτερολέπτου
  // πριν φορτώσει το React — και πάντα από τα crawlers.
  function body(p) {
    const links = cfg.nav
      .filter(([href]) => href !== p.path)
      .map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`)
      .join('')
    return `<main style="max-width:720px;margin:48px auto;padding:0 20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0F2A3F;line-height:1.55">`
      + `<p style="font-weight:700;color:#E65100;margin:0 0 8px"><a href="/" style="color:inherit;text-decoration:none">GlobiPet</a></p>`
      + `<h1 style="font-size:28px;line-height:1.2;margin:0 0 12px">${esc(p.h1)}</h1>`
      + `<p style="margin:0 0 20px">${esc(p.intro)}</p>`
      + `<nav aria-label="GlobiPet"><ul style="padding-left:20px;margin:0">${links}</ul></nav>`
      + `</main>`
  }

  function render(p) {
    const [before, rest] = template.split(START)
    const after = rest.split(END)[1]
    return (before + head(p) + after).replace(BODY, body(p))
  }

  const seen = new Set()
  let written = 0
  for (const p of cfg.pages) {
    if (seen.has(p.path)) throw new Error('prerender: διπλή σελίδα ' + p.path)
    seen.add(p.path)
    if (!/^\/[a-z0-9-]*$/.test(p.path)) throw new Error('prerender: μη έγκυρη διαδρομή ' + p.path)
    for (const k of ['title', 'description', 'h1', 'intro']) {
      if (!p[k]) throw new Error(`prerender: λείπει το ${k} στο ${p.path}`)
    }
    // /services → dist/services.html (το Pages το σερβίρει στο /services χωρίς
    // ανακατεύθυνση με κάθετο στο τέλος). Η αρχική ΔΕΝ γράφεται στο index.html:
    // αυτό είναι και η σελίδα-εφεδρεία του SPA για κάθε άλλη διεύθυνση (/profile,
    // /services/:id…), που δεν πρέπει να δηλώνει canonical την αρχική ούτε να
    // δείχνει το κείμενό της. Η αρχική γράφεται στο index-home.html και το
    // _redirects σερβίρει εκείνο στο / (rewrite 200, χωρίς αλλαγή URL).
    const file = p.path === '/' ? 'index-home.html' : p.path.slice(1) + '.html'
    fs.writeFileSync(path.join(dist, file), render(p))
    written++
  }

  // Εφεδρεία SPA: ίδιος τίτλος/περιγραφή με την αρχική, αλλά χωρίς canonical και
  // og:url — αλλιώς κάθε διεύθυνση θα δήλωνε στη Google ότι είναι η αρχική.
  const fallback = template
    .replace(/\n\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\n\s*<meta property="og:url"[^>]*>/, '')
    .replace(BODY, '')
  if (/rel="canonical"|og:url/.test(fallback)) throw new Error('prerender: η εφεδρεία κράτησε canonical/og:url')
  fs.writeFileSync(path.join(dist, 'index.html'), fallback)

  // / → index-home.html. Αν υπάρχει ήδη _redirects, ο κανόνας μπαίνει πρώτος.
  const redirectsFile = path.join(dist, '_redirects')
  const existing = fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8') : ''
  if (!/^\/\s+\/index-home\s+200/m.test(existing)) {
    fs.writeFileSync(redirectsFile, '/  /index-home  200\n' + existing)
  }

  const today = new Date().toISOString().slice(0, 10)
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + cfg.pages.filter(p => p.sitemap && !p.noindex).map(p =>
      `  <url><loc>${esc(urlOf(p.path))}</loc><lastmod>${today}</lastmod>`
      + `<changefreq>${p.changefreq || 'weekly'}</changefreq><priority>${p.priority || '0.5'}</priority></url>`).join('\n')
    + '\n</urlset>\n'
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap)

  console.log(`prerender: ${written} σελίδες, sitemap με ${cfg.pages.filter(p => p.sitemap && !p.noindex).length} διευθύνσεις`)
}

// Και ως αυτόνομη εντολή: node scripts/prerender.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prerender()
