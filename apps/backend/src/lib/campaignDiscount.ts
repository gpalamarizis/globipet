import prisma from './prisma.js'

/**
 * Έκπτωση καμπάνιας — ΕΝΑΣ υπολογισμός για προεπισκόπηση, παραγγελίες και
 * κρατήσεις.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ
 *   Οι καμπάνιες έδειχναν «−15%» σε banner, αλλά η πληρωμή χρέωνε πάντα
 *   την πλήρη τιμή: ούτε το ταμείο ούτε οι κρατήσεις εφάρμοζαν έκπτωση.
 *   Τώρα ο server την υπολογίζει μόνος του, από τιμές της βάσης.
 *
 * ΚΑΝΟΝΕΣ
 *   · Μία έκπτωση ανά γραμμή — η μεγαλύτερη σε ευρώ. Δεν σωρεύονται.
 *   · Ο πάροχος εκπτώνει μόνο τα δικά του. Οι καμπάνιες της πλατφόρμας δεν
 *     ισχύουν εδώ (μόνο για την τιμή συνδρομής).
 *   · Στοχευμένη καμπάνια (με κοινό) μόνο για τους πελάτες του κοινού.
 *   · Ελάχιστο ποσό: η καμπάνια ισχύει μόνο αν η γραμμή το φτάνει.
 *   · Το ποσό που μένει δεν πέφτει κάτω από MIN_CHARGE: το Viva δεν δέχεται
 *     χρέωση κάτω από 30 λεπτά, και μια «δωρεάν» κράτηση δεν πληρώνεται ποτέ
 *     — άρα δεν επιβεβαιώνεται ποτέ.
 */
export const MIN_CHARGE = 0.3

export type AppliedCampaign = { id: string; title: string; type: string; value: number }
export type DiscountResult = { discount: number; final: number; campaign: AppliedCampaign | null }

const round2 = (n: number) => Math.round(n * 100) / 100

export async function bestDiscount(
  email: string,
  type: 'product' | 'service' | 'service_package',
  id: string,
  line: number,
  qty = 1,
): Promise<DiscountResult> {
  const lineR = round2(line)
  if (!id || !(lineR > MIN_CHARGE)) return { discount: 0, final: lineR, campaign: null }

  const allType = type === 'product' ? 'all_products' : 'all_services'
  const found = await prisma.$queryRaw<any[]>`
    SELECT c.id, c.title, c.discount_type, c.discount_value
      FROM campaigns c
      JOIN campaign_targets t ON t.campaign_id = c.id
     WHERE c.is_active
       AND now() BETWEEN c.starts_at AND c.ends_at
       AND c.discount_type IS NOT NULL
       -- Απόφαση ιδιοκτήτη: καμπάνια της πλατφόρμας ισχύει ΜΟΝΟ για την τιμή
       -- συνδρομής — ποτέ για προϊόντα/υπηρεσίες/κρατήσεις παρόχων (η έκπτωση
       -- θα έβγαινε από τα χρήματα του παρόχου χωρίς τη συγκατάθεσή του).
       AND c.owner_type <> 'platform'
       AND ((${type} = 'product' AND EXISTS (
                  SELECT 1 FROM products p WHERE p.id = ${id} AND p.provider_email = c.owner_email))
            OR (${type} = 'service' AND EXISTS (
                  SELECT 1 FROM services s WHERE s.id = ${id} AND s.provider_email = c.owner_email))
            OR (${type} = 'service_package' AND EXISTS (
                  SELECT 1 FROM service_packages sp JOIN services s ON s.id = sp.service_id
                   WHERE sp.id = ${id} AND s.provider_email = c.owner_email)))
       AND (t.target_type = ${allType}
            OR (t.target_type = ${type} AND t.target_id = ${id}))
       AND (c.min_order IS NULL OR c.min_order <= ${lineR})
       AND (NOT EXISTS (SELECT 1 FROM campaign_audience a WHERE a.campaign_id = c.id)
            OR EXISTS (SELECT 1 FROM campaign_audience a
                        WHERE a.campaign_id = c.id AND a.customer_email = ${email}))`

  // Η μεγαλύτερη έκπτωση σε ευρώ κερδίζει — όχι το μεγαλύτερο ποσοστό,
  // γιατί 10% σε 200 € είναι περισσότερα από 5 € σταθερά.
  // Έκπτωση «ποσό» ανά τεμάχιο, όχι πάνω από την τιμή του τεμαχίου.
  let best: any = null, bestOff = 0
  const units = Math.max(1, qty)
  const unitPrice = lineR / units
  for (const c of found) {
    const off = c.discount_type === 'percent'
      ? lineR * (Number(c.discount_value) / 100)
      : Math.min(Number(c.discount_value), unitPrice) * units
    if (off > bestOff) { bestOff = off; best = c }
  }
  if (!best) return { discount: 0, final: lineR, campaign: null }

  const discount = round2(Math.min(bestOff, lineR - MIN_CHARGE))
  return {
    discount,
    final: round2(lineR - discount),
    campaign: { id: best.id, title: best.title, type: best.discount_type, value: Number(best.discount_value) },
  }
}

/**
 * Η βασική τιμή μιας κράτησης — ίδιος κανόνας με το POST /bookings:
 * με πακέτα, το άθροισμα των πακέτων· χωρίς, η τιμή της υπηρεσίας.
 * Χρησιμοποιείται από την προεπισκόπηση (quote).
 */
export async function bookingBasePrice(
  serviceId: string,
  requested: Array<{ package_id: string; quantity?: number }>,
): Promise<number | null> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return null
  const ids = requested.map(p => p.package_id).filter(Boolean)
  if (!ids.length) return round2(service.price)
  // Μόνο ενεργά πακέτα — ίδιο φίλτρο με το POST /bookings.
  const found = await prisma.servicePackage.findMany({ where: { id: { in: ids }, service_id: serviceId, is_active: true } })
  const byId = new Map(found.map(p => [p.id, p]))
  let total = 0
  for (const r of requested) {
    const pkg = byId.get(r.package_id)
    if (!pkg) continue
    total += pkg.price * Math.min(Math.max(parseInt(String(r.quantity)) || 1, 1), 20)
  }
  return round2(total)
}

/** +1 εξαργύρωση — καλείται ΜΟΝΟ όταν η πληρωμή επιβεβαιωθεί. */
export async function countRedemptions(campaignIds: Array<string | null | undefined>) {
  const unique = [...new Set(campaignIds.filter((x): x is string => !!x))]
  for (const id of unique) {
    await prisma.$executeRaw`UPDATE campaigns SET redemptions = redemptions + 1 WHERE id = ${id}`.catch(() => {})
  }
}
