import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Προβολή καμπανιών στο site.
 *
 * ΠΩΣ ΔΟΥΛΕΥΕΙ
 *   Κάθε σελίδα δηλώνει το όνομά της και τη θέση που θέλει. Το component
 *   ρωτά το backend τι υπάρχει ενεργό εκείνη τη στιγμή και το αποδίδει.
 *   Αν δεν υπάρχει τίποτα, δεν αποδίδει τίποτα — καμία κενή περιοχή.
 *
 * ΜΕΤΡΗΣΕΙΣ
 *   Η προβολή μετριέται μία φορά ανά συνεδρία, όχι σε κάθε render. Χωρίς
 *   αυτό, ένα scroll θα φούσκωνε τους αριθμούς και ο πάροχος δεν θα
 *   μπορούσε να κρίνει αν η καμπάνια αποδίδει.
 *
 * ΤΙ ΔΕΝ ΕΜΦΑΝΙΖΕΤΑΙ
 *   Οι στοχευμένες καμπάνιες. Το backend τις αποκλείει από το δημόσιο
 *   endpoint — ο πελάτης τις βλέπει στα μηνύματά του.
 */

type Placement = {
  id: string
  campaign_id: string
  page: string
  slot: string
  media_type: 'image' | 'video' | 'none'
  media_url: string | null
  link_url: string | null
  headline: string | null
  subtext: string | null
  cta_label: string | null
  title: string
  discount_type: 'percent' | 'amount' | null
  discount_value: number | null
  ends_at: string
}

type Props = {
  /** home | services | marketplace | social | playdates | ... */
  page: string
  /** hero | banner | sidebar | inline | popup */
  slot?: string
  className?: string
}

/** Ποιες προβολές έχουν ήδη μετρηθεί σε αυτή τη συνεδρία. */
const counted = new Set<string>()

export default function CampaignBanner({ page, slot = 'banner', className }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const { data: items = [] } = useQuery<Placement[]>({
    queryKey: ['campaign-placements', page, slot],
    queryFn: () => api.get(`/campaigns/placements?page=${page}&slot=${slot}`)
      .then(r => r.data?.data ?? []),
    // Οι καμπάνιες αλλάζουν σπάνια· δεν χρειάζεται συνεχής ανανέωση.
    staleTime: 5 * 60_000,
    retry: false,
  })

  const visible = items.filter(i => !dismissed.has(i.id))

  // Μέτρηση προβολής, μία φορά ανά συνεδρία
  useEffect(() => {
    for (const it of visible) {
      if (counted.has(it.campaign_id)) continue
      counted.add(it.campaign_id)
      api.post(`/campaigns/${it.campaign_id}/view`).catch(() => {})
    }
  }, [visible])

  if (!visible.length) return null

  const click = (it: Placement) => {
    api.post(`/campaigns/${it.campaign_id}/click`).catch(() => {})
  }

  const discount = (it: Placement) =>
    !it.discount_type ? null
      : it.discount_type === 'percent' ? `−${it.discount_value}%` : `−${it.discount_value}€`

  const daysLeft = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)

  return (
    <div ref={ref} className={cn('space-y-3', className)}>
      <AnimatePresence>
        {visible.map(it => (
          <CampaignCard key={it.id} item={it} slot={slot}
            discount={discount(it)} daysLeft={daysLeft(it.ends_at)}
            onClick={() => click(it)}
            onDismiss={() => setDismissed(d => new Set(d).add(it.id))} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════

function CampaignCard({ item, slot, discount, daysLeft, onClick, onDismiss }: any) {
  const it: Placement = item

  const inner = (
    <>
      {/* Μέσο */}
      {it.media_type === 'video' && it.media_url && (
        it.media_url.includes('youtube') || it.media_url.includes('vimeo') ? (
          <iframe src={it.media_url}
            className={cn('w-full', slot === 'sidebar' ? 'aspect-[9/16]' : 'aspect-video')}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen title={it.headline || it.title} />
        ) : (
          <video src={it.media_url} className="w-full object-cover"
            autoPlay muted loop playsInline />
        )
      )}

      {it.media_type === 'image' && it.media_url && (
        <img src={it.media_url} alt={it.headline || it.title}
          className="w-full object-cover" loading="lazy" />
      )}

      {/* Κείμενο */}
      <div className={cn('p-4', slot === 'hero' && 'p-6 sm:p-8')}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {discount && (
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-brand-900 text-white mb-2">
                {discount}
              </span>
            )}

            <h3 className={cn('font-display font-bold text-gray-900 dark:text-white',
              slot === 'hero' ? 'text-2xl sm:text-3xl' : 'text-lg')}>
              {it.headline || it.title}
            </h3>

            {it.subtext && (
              <p className={cn('text-gray-600 dark:text-gray-300 mt-1',
                slot === 'hero' ? 'text-base' : 'text-sm')}>
                {it.subtext}
              </p>
            )}

            {daysLeft > 0 && daysLeft <= 7 && (
              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 mt-2">
                <Clock size={11} />
                {daysLeft === 1 ? 'Τελευταία μέρα' : `${daysLeft} μέρες ακόμα`}
              </p>
            )}

            {it.cta_label && it.link_url && (
              <span className={cn(
                'inline-flex items-center gap-1.5 mt-3 font-medium text-brand-900 dark:text-yellow-400',
                slot === 'hero' ? 'text-base' : 'text-sm')}>
                {it.cta_label} <ArrowRight size={15} />
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )

  const shell = cn(
    'relative block rounded-2xl overflow-hidden border bg-white dark:bg-gray-900',
    'border-gray-200 dark:border-gray-800',
    it.link_url && 'hover:border-brand-400 hover:shadow-md transition-all',
    slot === 'hero' && 'border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-gray-900',
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}>

      <div className="relative">
        {it.link_url ? (
          <Link to={it.link_url} onClick={onClick} className={shell}>{inner}</Link>
        ) : (
          <div className={shell}>{inner}</div>
        )}

        {/* Κλείσιμο — μόνο στα ενοχλητικά. Το hero και το banner μένουν. */}
        {(slot === 'popup' || slot === 'sidebar') && (
          <button onClick={(e) => { e.preventDefault(); onDismiss() }}
            aria-label="Κλείσιμο"
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
