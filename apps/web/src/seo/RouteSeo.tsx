import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import seo from './pages.json'

/**
 * Τίτλος και περιγραφή ανά σελίδα και κατά την πλοήγηση μέσα στην εφαρμογή.
 *
 * Το scripts/prerender.mjs γράφει τα σωστά meta στο HTML κάθε δημόσιας σελίδας
 * (αυτό βλέπουν τα crawlers). Χωρίς αυτό το component, όταν ο χρήστης πηγαίνει
 * από την αρχική στις Υπηρεσίες χωρίς ανανέωση, ο τίτλος της καρτέλας και το
 * canonical έμεναν της σελίδας όπου μπήκε. Ίδια πηγή (pages.json) και για τα δύο.
 */
const byPath = new Map(seo.pages.map(p => [p.path, p]))
const home = byPath.get('/')!

function setMeta(selector: string, attr: string, value: string | null) {
  const el = document.head.querySelector(selector)
  if (!el) return
  if (value === null) el.remove()
  else el.setAttribute(attr, value)
}

export function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = byPath.get(pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname)
    // Σελίδες με :id ή ιδιωτικές: ουδέτερος τίτλος· τα δικά τους στοιχεία τα
    // δίνει η Pages Function στα crawlers.
    document.title = page ? page.title : home.title
    setMeta('meta[name="description"]', 'content', (page ?? home).description)
    if (page) {
      const url = seo.site + (page.path === '/' ? '/' : page.path)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', url)
    } else {
      setMeta('link[rel="canonical"]', 'href', null)
    }
  }, [pathname])

  return null
}
