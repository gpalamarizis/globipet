/**
 * Τιμή που ΧΡΕΩΝΕΤΑΙ για ένα προϊόν — ΕΝΑΣ κανόνας για καλάθι, παραγγελία,
 * λίστα επιθυμιών, συνδρομή τροφής και προεπισκόπηση καμπανιών.
 *
 * Η λίστα και η σελίδα προϊόντος δείχνουν την τιμή έκπτωσης· άρα αυτή
 * χρεώνεται. Η sale_price ισχύει μόνο αν είναι αριθμός > 0 και μικρότερη
 * από την price — αλλιώς (κενή, 0, άκυρη ή μεγαλύτερη) χρεώνεται η price.
 * Το schema δεν έχει ημερομηνία λήξης έκπτωσης.
 *
 * Ίδιος κανόνας στο web (web/src/lib/price.ts) και στο κινητό
 * (mobile/src/lib/price.ts) — αν αλλάξει εδώ, αλλάζει και εκεί.
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
