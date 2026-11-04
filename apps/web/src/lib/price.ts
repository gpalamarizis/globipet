/**
 * Τιμή που χρεώνει ο server για ένα προϊόν — ίδιος κανόνας με το
 * backend/src/lib/price.ts (effectivePrice). Η sale_price ισχύει μόνο αν
 * είναι αριθμός > 0 και μικρότερη από την price· αλλιώς ισχύει η price.
 * Για καλάθι/ταμείο/λίστα επιθυμιών προτιμάται η τιμή που στέλνει ο server
 * στη γραμμή (product_price).
 */
export function isOnSale(p: { price?: unknown; sale_price?: unknown } | null | undefined): boolean {
  if (!p) return false
  const price = Number(p.price)
  const sale = p.sale_price == null ? NaN : Number(p.sale_price)
  return Number.isFinite(sale) && sale > 0 && Number.isFinite(price) && sale < price
}

export function effectivePrice(p: { price?: unknown; sale_price?: unknown } | null | undefined): number {
  if (!p) return 0
  if (isOnSale(p)) return Number(p.sale_price)
  const price = Number(p.price)
  return Number.isFinite(price) ? price : 0
}

/** Ποσοστό έκπτωσης (στρογγυλό), 0 αν δεν είναι σε έκπτωση. */
export function salePercent(p: { price?: unknown; sale_price?: unknown } | null | undefined): number {
  if (!p || !isOnSale(p)) return 0
  return Math.round((1 - Number(p.sale_price) / Number(p.price)) * 100)
}

/**
 * Τιμή «από» μιας υπηρεσίας: η βασική της τιμή αν είναι > 0, αλλιώς η
 * φθηνότερη επιλογή πακέτου (price_from από τον server). Υπηρεσίες με
 * τιμολόγηση μόνο σε πακέτα έδειχναν «από 0€» / «Δωρεάν».
 */
export function serviceFromPrice(s: { price?: unknown; price_from?: unknown } | null | undefined): number {
  const p = Number(s?.price)
  if (Number.isFinite(p) && p > 0) return p
  const f = Number(s?.price_from)
  return Number.isFinite(f) && f > 0 ? f : 0
}
