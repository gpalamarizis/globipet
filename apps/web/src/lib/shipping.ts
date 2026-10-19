/**
 * Τιμές αποστολής — ΙΔΙΕΣ με το SHIPPING_METHODS του backend
 * (apps/backend/src/routes/orders.ts), που είναι και αυτό που χρεώνει.
 * Δωρεάν μεταφορικά για υποσύνολο ΑΝΩ των FREE_SHIPPING_OVER (όχι ίσο).
 */
export const FREE_SHIPPING_OVER = 50

export const SHIPPING_PRICES = [
  { id: 'boxnow', labelKey: 'productInfo.boxnow', price: 2.5 },
  { id: 'acs',    labelKey: 'productInfo.acs',    price: 3.99 },
  { id: 'elta',   labelKey: 'productInfo.elta',   price: 4.5 },
] as const
