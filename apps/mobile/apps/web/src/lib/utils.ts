import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createPageUrl(pageName: string): string {
  return '/' + pageName.toLowerCase().replace(/ /g, '-')
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('el-GR', options ?? {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Μόλις τώρα'
  if (minutes < 60) return `${minutes}λ`
  if (hours < 24) return `${hours}ω`
  if (days < 7) return `${days}μ`
  return formatDate(date, { day: 'numeric', month: 'short' })
}

export function truncate(str: string, length = 100): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export const speciesEmoji: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰',
  fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾',
}

export const speciesLabel: Record<string, string> = {
  dog: 'Σκύλος', cat: 'Γάτα', bird: 'Πτηνό', rabbit: 'Κουνέλι',
  fish: 'Ψάρι', reptile: 'Ερπετό', horse: 'Άλογο', other: 'Άλλο',
}
