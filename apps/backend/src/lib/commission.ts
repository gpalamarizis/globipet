import prisma from './prisma.js'

const SETTING_KEY = 'commission_rates'

export type CommissionCategory =
  | 'food' | 'toys' | 'accessories'
  | 'veterinary' | 'grooming' | 'training' | 'hosting'
  | 'walking' | 'pet_taxi' | 'photography' | 'pharmacy' | 'telehealth'
  | 'services_default'

export const DEFAULT_COMMISSION_RATES: Record<CommissionCategory, number> = {
  food: 10,
  toys: 12,
  accessories: 12,
  services_default: 15,
  veterinary: 15,
  grooming: 15,
  training: 15,
  hosting: 15,
  walking: 15,
  pet_taxi: 15,
  photography: 15,
  pharmacy: 10,
  telehealth: 18,
}

let cache: { rates: Record<string, number>; expires: number } | null = null

/** Reads commission rates from AppSetting (JSON blob), merged over defaults. Cached 30s in-process. */
export async function getCommissionRates(): Promise<Record<CommissionCategory, number>> {
  if (cache && cache.expires > Date.now()) return cache.rates as any
  const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
  let stored: Record<string, number> = {}
  if (setting) {
    try { stored = JSON.parse(setting.value) } catch { stored = {} }
  }
  const merged = { ...DEFAULT_COMMISSION_RATES, ...stored }
  cache = { rates: merged, expires: Date.now() + 30_000 }
  return merged
}

export async function setCommissionRates(partial: Partial<Record<CommissionCategory, number>>) {
  const current = await getCommissionRates()
  const merged = { ...current, ...partial }
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(merged) },
    create: { key: SETTING_KEY, value: JSON.stringify(merged) },
  })
  cache = null
  return merged
}

/** Maps a product category or service_type string to a commission category key. */
export function resolveCommissionCategory(input: string | null | undefined): CommissionCategory {
  if (!input) return 'services_default'
  const key = input.toLowerCase()
  if (key === 'pet_sitting' || key === 'boarding') return 'hosting'
  if ((DEFAULT_COMMISSION_RATES as any)[key] !== undefined) return key as CommissionCategory
  return 'services_default'
}

export interface CommissionResult {
  rate: number
  platformFee: number
  providerPayout: number
}

/** Computes platform fee / provider payout split for a given amount and category. Rounds to 2 decimals. */
export async function calculateCommission(amount: number, category: string | null | undefined): Promise<CommissionResult> {
  const rates = await getCommissionRates()
  const resolved = resolveCommissionCategory(category)
  const rate = rates[resolved] ?? DEFAULT_COMMISSION_RATES.services_default
  const platformFee = Math.round(amount * (rate / 100) * 100) / 100
  const providerPayout = Math.round((amount - platformFee) * 100) / 100
  return { rate, platformFee, providerPayout }
}