import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getVivaTransaction, isVivaDefinitiveRejection } from '../lib/viva.js'
import Stripe from 'stripe'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getRequestLang, normLang, type Lang } from '../lib/i18n.js'
import { vivaPaymentsOf, VIVA_KINDS, type VivaKind, type VivaPayment, type PayStatus } from '../lib/paymentHistory.js'
import { AI_SUB_ACTIVATED_ACTION } from '../lib/stripeSubscriptions.js'

/**
 * Κοινή επιστροφή από τη Viva.
 *
 * ΓΙΑΤΙ
 *   Η Viva στέλνει τον πελάτη μετά την πληρωμή στη Success/Failure URL που
 *   ορίζεται ΜΙΑ φορά στην πηγή πληρωμής (Sales → Online payments →
 *   Websites/Apps). Μία διεύθυνση για όλα: παραγγελίες, κρατήσεις,
 *   τηλεϊατρική, εκδηλώσεις. Ορίζουμε λοιπόν και τις δύο σε
 *   https://globipet.com/payment/return και από εδώ βρίσκουμε σε ποια σελίδα
 *   επιβεβαίωσης ανήκει η πληρωμή.
 *
 * GET /payments/return?t=<transactionId>&s=<orderCode>
 *   → { path } π.χ. "/bookings/<id>/confirmation"
 *
 *   · Με `t`: ρωτάμε τη Viva για τη συναλλαγή και διαβάζουμε το merchantTrns
 *     (το δικό μας αναγνωριστικό). Δουλεύει και αφού το webhook έχει ήδη
 *     γράψει το transaction id στη θέση του orderCode.
 *   · Χωρίς `t` (π.χ. ο πελάτης πάτησε «Ακύρωση»): ψάχνουμε το `s` στα
 *     αποθηκευμένα orderCode — η πληρωμή δεν έγινε, άρα είναι ακόμη εκεί.
 *   · Δεν επιστρέφει τίποτα άλλο από τη διαδρομή· η σελίδα επιβεβαίωσης κάνει
 *     τον δικό της έλεγχο δικαιωμάτων και πληρωμής.
 */
const TXN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE_RE = /^\d{6,20}$/

async function pathForMerchantTrns(m: string): Promise<string | null> {
  const ev = /^ev:([^:]+):/.exec(m)
  const regId = ev ? ev[1] : m
  const reg = await prisma.eventRegistration.findUnique({ where: { id: regId }, select: { event_id: true } })
  if (reg) return `/events/${reg.event_id}/confirmation`
  if (ev) return null
  if (await prisma.order.findUnique({ where: { id: m }, select: { id: true } })) return `/orders/${m}/confirmation`
  if (await prisma.booking.findUnique({ where: { id: m }, select: { id: true } })) return `/bookings/${m}/confirmation`
  if (await prisma.telehealthConsultation.findUnique({ where: { id: m }, select: { id: true } })) return `/telehealth/${m}/confirmation`
  return null
}

async function pathForOrderCode(code: string): Promise<string | null> {
  const o = await prisma.order.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (o) return `/orders/${o.id}/confirmation`
  const b = await prisma.booking.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (b) return `/bookings/${b.id}/confirmation`
  const c = await prisma.telehealthConsultation.findFirst({ where: { payment_ref: code }, select: { id: true } })
  if (c) return `/telehealth/${c.id}/confirmation`
  const r = await prisma.eventRegistration.findFirst({ where: { viva_order_code: code }, select: { event_id: true } })
  if (r) return `/events/${r.event_id}/confirmation`
  return null
}

const routes: FastifyPluginAsync = async (app) => {
  app.get('/return', async (req: any, reply) => {
    const t = typeof req.query?.t === 'string' ? req.query.t : ''
    const s = typeof req.query?.s === 'string' ? req.query.s : ''
    if (t && !TXN_RE.test(t)) return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
    if (s && !CODE_RE.test(s)) return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })

    if (t) {
      try {
        const tx = await getVivaTransaction(t)
        const m = String(tx?.merchantTrns ?? '')
        const p = m ? await pathForMerchantTrns(m) : null
        if (p) return { path: p }
      } catch (e: any) {
        // Προσωρινό σφάλμα Viva: ο browser ξαναδοκιμάζει. Οριστική άρνηση:
        // συνεχίζουμε με το orderCode.
        if (!isVivaDefinitiveRejection(e)) {
          if (!s) return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
      }
    }
    if (s) {
      const p = await pathForOrderCode(s)
      if (p) return { path: p }
    }
    return reply.code(404).send({ message: 'Δεν βρέθηκε' })
  })

  registerE18Routes(app)
}

export default routes

// ═══════════════════════════════════════════════════════════════════════════
// Ε18 — Πληρωμές & αποδεικτικά
//
//   GET  /payments/history         (σύνδεση) ιστορικό πληρωμών/επιστροφών
//   POST /payments/receipt-link    (σύνδεση) { kind, id } → { url, path, expires_in }
//   GET  /payments/receipt?t=…     (δημόσιο με υπογεγραμμένο token) σελίδα HTML
//   POST /payments/billing-portal  (σύνδεση) → { data: { url } } (Stripe Customer Portal)
//
// Viva: lib/paymentHistory.ts (μόνο ανάγνωση της βάσης). Stripe: τιμολόγια
// συνδρομών (AI / GlobiPet Plus / τροφής) — σύνδεσμοι του ίδιου του Stripe.
// ═══════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
/** Κάθε κλήση στο Stripe από εδώ: σύντομο όριο, καμία επανάληψη (όπως ai-subscriptions.ts). */
const STRIPE_OPTS = { timeout: 4500, maxNetworkRetries: 0 }
const FRONTEND = () => process.env.FRONTEND_URL || 'https://globipet.com'
const round2 = (n: number) => Math.round(n * 100) / 100

interface HistoryItem {
  id: string
  kind: VivaKind | 'subscription'
  ref: string
  description: string | null
  amount: number
  currency: 'EUR'
  status: PayStatus
  refunded_amount: number | null
  date: string
  receipt: boolean
  invoice_url: string | null
  invoice_pdf: string | null
}

const vivaItem = (p: VivaPayment): HistoryItem => ({
  id: `${p.kind}:${p.id}`, kind: p.kind, ref: p.ref, description: p.description,
  amount: p.amount, currency: 'EUR', status: p.status, refunded_amount: p.refunded_amount,
  date: p.date.toISOString(), receipt: true, invoice_url: null, invoice_pdf: null,
})

/** Όριο χρόνου σε promise που δεν δέχεται δικό του timeout. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

/**
 * Πελάτες Stripe ΔΕΜΕΝΟΙ με τον λογαριασμό (userId) — ΠΟΤΕ αναζήτηση με email.
 *
 * ΓΙΑΤΙ ΟΧΙ EMAIL: οι πελάτες του Stripe ΔΕΝ σβήνονται στη διαγραφή
 * λογαριασμού (lib/cron eraseUserAccount ακυρώνει μόνο τις συνδρομές). Νέος
 * λογαριασμός με το ίδιο email θα έβλεπε με customers.list({ email }) τα
 * τιμολόγια και το Customer Portal (κάρτα, διεύθυνση) του παλιού κατόχου.
 *
 * ΠΗΓΕΣ (παράλληλα):
 *   (α) stripe.subscriptions.search με metadata user_id — ΟΛΕΣ οι καταστάσεις
 *       (η αναζήτηση δεν φιλτράρει κατάσταση: και ακυρωμένες, για το ιστορικό
 *       τιμολογίων). Το user_id το γράφουν στη συνδρομή και οι συνδρομές AI /
 *       Plus (lib/stripeSubscriptions createAiCheckoutSession) και οι συνδρομές
 *       τροφής (routes/subscriptions — subscription_data.metadata).
 *       Η αναζήτηση του Stripe ενημερώνεται με καθυστέρηση (~1′) — γι' αυτό και:
 *   (β) productSubscription.stripe_customer_id του χρήστη (γράφεται από το
 *       webhook· cascade με τον χρήστη)·
 *   (γ) metadata.stripe_customer_id των καταγραφών ενεργοποίησης AI
 *       (AI_SUB_ACTIVATED_ACTION, resource 'user', resource_id = userId —
 *       routes/webhooks activateAiSubscription).
 * Ένας πελάτης μπορεί να έχει και τιμολόγια εκτός GlobiPet συνδρομών· είναι
 * όμως δικός του πελάτης, οπότε εμφανίζονται.
 *
 * `live`: έχει συνδρομή που ζει ακόμη (Stripe: όχι canceled/incomplete_expired·
 * τροφής: active/payment_failed). `at`: unix δευτ. της νεότερης αναφοράς.
 * Ταξινόμηση: νεότερος πρώτος. `searched: false` → η (α) δεν έγινε/απέτυχε
 * (η λίστα μπορεί να είναι ελλιπής). Σφάλμα βάσης → πετιέται.
 */
interface BoundCustomer { id: string; at: number; live: boolean }
const USER_ID_RE = /^[A-Za-z0-9_-]+$/
const CUSTOMER_RE = /^cus_[A-Za-z0-9]+$/
const stripeIdOf = (v: unknown): string | null =>
  typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as any).id === 'string' ? (v as any).id : null
const unixOf = (d: Date) => Math.floor(d.getTime() / 1000)

async function boundStripeCustomersOf(userId: string): Promise<{ customers: BoundCustomer[]; searched: boolean }> {
  const search: Promise<Stripe.Subscription[] | null> = process.env.STRIPE_SECRET_KEY && USER_ID_RE.test(userId)
    ? stripe.subscriptions.search({ query: `metadata['user_id']:'${userId}'`, limit: 100 }, STRIPE_OPTS)
      .then(r => r.data, (err: any) => {
        console.error('[payments] Stripe subscription search error:', err?.message ?? err)
        return null
      })
    : Promise.resolve(null)
  const [found, food, activations] = await Promise.all([
    search,
    prisma.productSubscription.findMany({
      where: { user_id: userId, stripe_customer_id: { not: null } },
      select: { stripe_customer_id: true, status: true, created_at: true }, orderBy: { created_at: 'desc' }, take: 50,
    }),
    prisma.auditLog.findMany({
      where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId },
      select: { metadata: true, created_at: true }, orderBy: { created_at: 'desc' }, take: 50,
    }),
  ])

  const by = new Map<string, BoundCustomer>()
  const add = (id: string | null | undefined, at: number, live: boolean) => {
    if (!id || !CUSTOMER_RE.test(id)) return
    const c = by.get(id)
    if (!c) by.set(id, { id, at, live })
    else { c.at = Math.max(c.at, at); c.live = c.live || live }
  }
  for (const sub of found ?? []) {
    if (sub.metadata?.user_id !== userId) continue // η αναζήτηση ήδη το εγγυάται· διπλός έλεγχος
    add(stripeIdOf(sub.customer), sub.created, sub.status !== 'canceled' && sub.status !== 'incomplete_expired')
  }
  for (const f of food) add(f.stripe_customer_id, unixOf(f.created_at), f.status === 'active' || f.status === 'payment_failed')
  for (const a of activations) {
    const c = (a.metadata as any)?.stripe_customer_id
    add(typeof c === 'string' ? c : null, unixOf(a.created_at), false)
  }
  return {
    customers: [...by.values()].sort((x, y) => y.at - x.at),
    searched: found !== null,
  }
}

/**
 * Πληρωμένα τιμολόγια Stripe (ποσό > 0, EUR). Επιστροφή: από τη χρέωση του
 * τιμολογίου (expand data.charge → charge.amount_refunded) — η κατάσταση
 * του τιμολογίου μένει 'paid' και μετά από επιστροφή. Τιμολόγιο χωρίς χρέωση
 * (π.χ. εξοφλημένο από πιστωτικό υπόλοιπο) → refunded_amount null.
 * Πελάτες: ΜΟΝΟ όσοι είναι δεμένοι με τον λογαριασμό (boundStripeCustomersOf).
 * Χωρίς STRIPE_SECRET_KEY → { ok: true, items: [] }· σφάλμα → { ok: false }·
 * αναζήτηση συνδρομών που απέτυχε → ok: false με ό,τι βρέθηκε από τη βάση.
 */
async function stripeInvoicesOf(userId: string): Promise<{ ok: boolean; items: HistoryItem[] }> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: true, items: [] }
  try {
    const { customers: bound, searched } = await boundStripeCustomersOf(userId)
    const customers = bound.slice(0, 10).map(c => c.id)
    const lists = await Promise.all(customers.map(c =>
      stripe.invoices.list({ customer: c, status: 'paid', limit: 100, expand: ['data.charge'] }, STRIPE_OPTS)))
    const invoices = new Map<string, Stripe.Invoice>()
    for (const l of lists) for (const inv of l.data) invoices.set(inv.id, inv)

    // Όνομα συνδρομής από τη βάση: metadata της συνδρομής τη στιγμή του
    // τιμολογίου (ai_plan_id → πλάνο AI / Plus, product_id → προϊόν τροφής).
    const planIds = new Set<string>(), productIds = new Set<string>()
    for (const inv of invoices.values()) {
      const md = inv.subscription_details?.metadata ?? {}
      if (md.ai_plan_id) planIds.add(String(md.ai_plan_id))
      if (md.product_id) productIds.add(String(md.product_id))
    }
    const [plans, products] = await Promise.all([
      planIds.size ? prisma.aiSubscriptionPlan.findMany({ where: { id: { in: [...planIds] } }, select: { id: true, name: true } }) : [],
      productIds.size ? prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { id: true, name: true } }) : [],
    ])
    const planName = new Map(plans.map(p => [p.id, p.name]))
    const productName = new Map(products.map(p => [p.id, p.name]))

    const items: HistoryItem[] = []
    for (const inv of invoices.values()) {
      if (String(inv.currency).toLowerCase() !== 'eur' || !(inv.amount_paid > 0)) continue
      const amount = round2(inv.amount_paid / 100)
      const charge = inv.charge && typeof inv.charge === 'object' ? inv.charge : null
      const refunded = charge ? Math.min(amount, round2((charge.amount_refunded ?? 0) / 100)) : null
      const status: PayStatus = refunded === null || refunded <= 0 ? 'paid'
        : refunded >= amount - 0.005 ? 'refunded' : 'partially_refunded'
      const md = inv.subscription_details?.metadata ?? {}
      const description = (md.ai_plan_id && planName.get(String(md.ai_plan_id)))
        || (md.product_id && productName.get(String(md.product_id)))
        || inv.lines?.data?.[0]?.description || null
      const paidAt = inv.status_transitions?.paid_at ?? inv.created
      items.push({
        id: `invoice:${inv.id}`, kind: 'subscription', ref: inv.number || inv.id, description,
        amount, currency: 'EUR', status, refunded_amount: refunded,
        date: new Date(paidAt * 1000).toISOString(), receipt: false,
        invoice_url: inv.hosted_invoice_url ?? null, invoice_pdf: inv.invoice_pdf ?? null,
      })
    }
    return { ok: searched, items }
  } catch (err: any) {
    console.error('[payments] Stripe invoices error:', err?.message ?? err)
    return { ok: false, items: [] }
  }
}

/**
 * Cache 60″ ανά χρήστη για το μέρος του Stripe του GET /history (άνοιγμα /
 * ανανέωση της σελίδας δεν ξαναρωτά το Stripe κάθε φορά). Αποτυχία → 15″
 * (να ξαναδοκιμάζει σύντομα, χωρίς να «σφυροκοπά» ένα Stripe που δεν απαντά).
 * Όριο μεγέθους όπως το periodEndCache (lib/stripeSubscriptions): γεμάτο →
 * φεύγει το παλαιότερο. Μνήμη της διεργασίας (ανά instance).
 */
const INVOICES_TTL_MS = 60 * 1000
const INVOICES_FAIL_TTL_MS = 15 * 1000
const INVOICES_CACHE_MAX = 1000
const invoicesCache = new Map<string, { until: number; value: { ok: boolean; items: HistoryItem[] } }>()

async function cachedStripeInvoicesOf(userId: string): Promise<{ ok: boolean; items: HistoryItem[] }> {
  const hit = invoicesCache.get(userId)
  if (hit && hit.until > Date.now()) return hit.value
  const value = await stripeInvoicesOf(userId)
  invoicesCache.delete(userId)
  if (invoicesCache.size >= INVOICES_CACHE_MAX) invoicesCache.delete(invoicesCache.keys().next().value as string)
  invoicesCache.set(userId, { until: Date.now() + (value.ok ? INVOICES_TTL_MS : INVOICES_FAIL_TTL_MS), value })
  return value
}

// ─── Υπογεγραμμένος σύνδεσμος αποδεικτικού (μοτίβο passport.ts pdf-link) ───
/*
 * Το αποδεικτικό ανοίγει σε νέα καρτέλα / στον browser του κινητού, χωρίς
 * κεφαλίδα Authorization. Ο client ζητά (με τη σύνδεσή του) σύνδεσμο που
 * ισχύει 5 λεπτά για ΜΙΑ πληρωμή και ΕΝΑΝ χρήστη. Το token ΔΕΝ είναι JWT
 * (δεν γίνεται δεκτό ως σύνδεση αλλού): HMAC-SHA256 με το JWT_SECRET και δικό
 * του πρόθεμα σκοπού. Περιέχει id χρήστη (όχι email — το URL γράφεται σε
 * logs) και τη γλώσσα του αιτήματος που έφτιαξε τον σύνδεσμο.
 */
const RECEIPT_TTL_MS = 5 * 60 * 1000
const receiptSecret = () => process.env.JWT_SECRET || 'dev-secret-min-32-chars-here!!'
const receiptSig = (payload: string) =>
  createHmac('sha256', receiptSecret()).update(`payment-receipt|${payload}`).digest('base64url')
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

function signReceiptToken(kind: VivaKind, id: string, userId: string, lang: Lang): string {
  const payload = Buffer.from(JSON.stringify({ k: kind, i: id, u: userId, l: lang, x: Date.now() + RECEIPT_TTL_MS })).toString('base64url')
  return `${payload}.${receiptSig(payload)}`
}
function verifyReceiptToken(token: string): { kind: VivaKind; id: string; userId: string; lang: Lang } | null {
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return null
  const want = Buffer.from(receiptSig(payload))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!(VIVA_KINDS as readonly string[]).includes(d?.k) || typeof d?.i !== 'string' || !ID_RE.test(d.i)) return null
    if (typeof d?.u !== 'string' || !d.u || !(Number(d?.x) > Date.now())) return null
    return { kind: d.k, id: d.i, userId: d.u, lang: normLang(d.l) }
  } catch { return null }
}

// ─── Σελίδα αποδεικτικού ───────────────────────────────────────────────────
// Ετικέτες του εγγράφου (όχι μηνύματα API): μικρό λεξικό, 5 γλώσσες.
const RECEIPT_TEXT: Record<Lang, {
  title: string; number: string; date: string; kind: string; description: string; beneficiary: string
  amount: string; method: string; methodValue: string; txn: string; status: string; refunded: string
  kinds: Record<VivaKind, string>; statuses: Record<PayStatus, string>; note: string; printHint: string
}> = {
  el: {
    title: 'Αποδεικτικό πληρωμής', number: 'Αριθμός', date: 'Ημερομηνία', kind: 'Είδος', description: 'Περιγραφή',
    beneficiary: 'Δικαιούχος', amount: 'Ποσό', method: 'Τρόπος πληρωμής', methodValue: 'Κάρτα μέσω Viva Wallet',
    txn: 'Αναφορά συναλλαγής', status: 'Κατάσταση', refunded: 'Ποσό επιστροφής',
    kinds: { order: 'Παραγγελία καταστήματος', booking: 'Κράτηση υπηρεσίας', telehealth: 'Τηλεϊατρική', event: 'Εκδήλωση' },
    statuses: { paid: 'Πληρώθηκε', refunded: 'Επιστράφηκε', partially_refunded: 'Επιστράφηκε μερικώς' },
    note: 'Το παρόν δεν αποτελεί φορολογικό παραστατικό.',
    printHint: 'Για αποθήκευση ως PDF, επίλεξε «Εκτύπωση» στο πρόγραμμα περιήγησης και μετά «Αποθήκευση ως PDF».',
  },
  en: {
    title: 'Payment receipt', number: 'Number', date: 'Date', kind: 'Type', description: 'Description',
    beneficiary: 'Payee', amount: 'Amount', method: 'Payment method', methodValue: 'Card via Viva Wallet',
    txn: 'Transaction reference', status: 'Status', refunded: 'Amount refunded',
    kinds: { order: 'Shop order', booking: 'Service booking', telehealth: 'Telehealth', event: 'Event' },
    statuses: { paid: 'Paid', refunded: 'Refunded', partially_refunded: 'Partially refunded' },
    note: 'This document is not a tax invoice or receipt.',
    printHint: 'To save as PDF, choose “Print” in your browser and then “Save as PDF”.',
  },
  es: {
    title: 'Justificante de pago', number: 'Número', date: 'Fecha', kind: 'Tipo', description: 'Descripción',
    beneficiary: 'Beneficiario', amount: 'Importe', method: 'Método de pago', methodValue: 'Tarjeta a través de Viva Wallet',
    txn: 'Referencia de la transacción', status: 'Estado', refunded: 'Importe reembolsado',
    kinds: { order: 'Pedido de la tienda', booking: 'Reserva de servicio', telehealth: 'Telemedicina', event: 'Evento' },
    statuses: { paid: 'Pagado', refunded: 'Reembolsado', partially_refunded: 'Reembolsado parcialmente' },
    note: 'Este documento no constituye una factura ni un comprobante fiscal.',
    printHint: 'Para guardarlo como PDF, elige «Imprimir» en el navegador y después «Guardar como PDF».',
  },
  fr: {
    title: 'Justificatif de paiement', number: 'Numéro', date: 'Date', kind: 'Type', description: 'Description',
    beneficiary: 'Bénéficiaire', amount: 'Montant', method: 'Moyen de paiement', methodValue: 'Carte via Viva Wallet',
    txn: 'Référence de la transaction', status: 'Statut', refunded: 'Montant remboursé',
    kinds: { order: 'Commande boutique', booking: 'Réservation de service', telehealth: 'Téléconsultation', event: 'Événement' },
    statuses: { paid: 'Payé', refunded: 'Remboursé', partially_refunded: 'Partiellement remboursé' },
    note: 'Le présent document ne constitue pas une facture ni un justificatif fiscal.',
    printHint: 'Pour l’enregistrer en PDF, choisissez « Imprimer » dans le navigateur, puis « Enregistrer au format PDF ».',
  },
  zh: {
    title: '付款凭证', number: '编号', date: '日期', kind: '类型', description: '说明',
    beneficiary: '收款方', amount: '金额', method: '付款方式', methodValue: '通过 Viva Wallet 刷卡支付',
    txn: '交易参考号', status: '状态', refunded: '退款金额',
    kinds: { order: '商店订单', booking: '服务预约', telehealth: '远程医疗', event: '活动' },
    statuses: { paid: '已付款', refunded: '已退款', partially_refunded: '部分退款' },
    note: '本文件不构成税务发票或收据。',
    printHint: '如需保存为 PDF，请在浏览器中选择“打印”，然后选择“另存为 PDF”。',
  },
}
const LOCALE: Record<Lang, string> = { el: 'el-GR', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }

// Κάθε τιμή περνά από escape πριν μπει στο HTML (όπως passport.ts).
const esc = (v: unknown) => v == null ? '' : String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** dd/mm/yyyy σε ώρα Ελλάδας (Europe/Athens). */
function athensDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')}`
}
const money = (n: number, lang: Lang) =>
  new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: 'EUR' }).format(n)

function receiptHtml(p: VivaPayment, lang: Lang): string {
  const T = RECEIPT_TEXT[lang]
  const row = (label: string, val: unknown) =>
    val == null || val === '' ? '' : `<tr><th>${esc(label)}</th><td>${esc(val)}</td></tr>`
  const refundRow = p.status !== 'paid' && p.refunded_amount != null && p.refunded_amount > 0
    ? row(T.refunded, money(p.refunded_amount, lang)) : ''
  return `<!DOCTYPE html><html lang="${esc(lang)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(T.title)} ${esc(p.ref)} · GlobiPet</title>
<style>
  body{font-family:Arial,"Noto Sans","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;color:#111;padding:24px;max-width:720px;margin:0 auto;background:#fff}
  .brand{font-size:22px;font-weight:bold;color:#E65100}
  .site{font-size:12px;color:#666}
  h1{font-size:20px;margin:20px 0 4px;border-bottom:3px solid #E65100;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid #eee}
  th{width:40%;color:#555;font-weight:normal}
  td{font-weight:bold;word-break:break-word}
  .note{margin-top:28px;font-size:12px;color:#444;border-top:1px solid #ddd;padding-top:10px}
  .hint{margin-top:12px;font-size:12px;color:#888}
  @media print{body{padding:0} .hint{display:none} @page{margin:1.5cm}}
</style></head><body>
<div class="brand">GlobiPet</div>
<div class="site">globipet.com</div>
<h1>${esc(T.title)}</h1>
<table>
${row(T.number, p.ref)}
${row(T.date, athensDate(p.date))}
${row(T.kind, T.kinds[p.kind])}
${row(T.description, p.description)}
${row(T.beneficiary, p.beneficiary)}
${row(T.amount, money(p.amount, lang))}
${row(T.method, T.methodValue)}
${row(T.txn, p.transaction)}
${row(T.status, T.statuses[p.status])}
${refundRow}
</table>
<div class="note">${esc(T.note)}</div>
<div class="hint">${esc(T.printHint)}</div>
</body></html>`
}

// ─── Customer Portal του Stripe ────────────────────────────────────────────
/**
 * Ο πελάτης Stripe για το Customer Portal — ΜΟΝΟ πελάτες δεμένοι με τον
 * λογαριασμό (boundStripeCustomersOf, ποτέ με email· οι αναζητήσεις τρέχουν
 * παράλληλα). Σειρά προτίμησης:
 *   1. πελάτης ζωντανής συνδρομής (AI / Plus / τροφής — η payment_failed
 *      είναι ακριβώς η περίπτωση «άλλαξε κάρτα»), ο νεότερος·
 *   2. αλλιώς ο πιο πρόσφατος δεμένος πελάτης (τιμολόγια παλιών συνδρομών).
 * Κανένας → null (404 no_stripe_customer). Κανένας ΚΑΙ η αναζήτηση του Stripe
 * απέτυχε → πετιέται (503: δεν ξέρουμε αν υπάρχει).
 */
async function portalCustomerOf(userId: string): Promise<string | null> {
  const { customers, searched } = await boundStripeCustomersOf(userId)
  const live = customers.find(c => c.live)
  if (live) return live.id
  if (customers.length) return customers[0].id
  if (!searched) throw new Error('Stripe subscription search unavailable')
  return null
}

/** Συνολικό όριο χρόνου του POST /billing-portal (αναζήτηση + δημιουργία session). */
const PORTAL_DEADLINE_MS = 10_000

const NO_STRIPE_CUSTOMER_MESSAGE = 'Δεν υπάρχει ακόμη κάρτα ή τιμολόγιο συνδρομής για διαχείριση'
const PORTAL_UNAVAILABLE_MESSAGE = 'Η διαχείριση κάρτας και τιμολογίων δεν είναι διαθέσιμη αυτή τη στιγμή — δοκίμασε ξανά σε λίγο'
const RECEIPT_EXPIRED_MESSAGE = 'Ο σύνδεσμος έληξε. Άνοιξε ξανά το αποδεικτικό.'
const INVALID_PAYMENT_MESSAGE = 'Μη έγκυρη πληρωμή'

function registerE18Routes(app: any) {
  const auth = [app.authenticate]

  /** Κλειδί ορίου ανά χρήστη: id από επαληθευμένο JWT, αλλιώς IP (όπως index.ts userOrIpKey). */
  const userKey = (req: any): string => {
    const h = req.headers?.authorization
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
      try {
        const p: any = app.jwt.verify(h.slice(7))
        if (p?.id) return `u:${p.id}`
      } catch { /* άκυρο τοκεν → IP */ }
    }
    return `ip:${req.ip}`
  }

  /** Το email του χρήστη από τη βάση (όχι από το JWT). */
  const emailOf = async (userId: unknown): Promise<string | null> => {
    if (typeof userId !== 'string' || !userId) return null
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    return u?.email ?? null
  }

  app.get('/history', {
    preHandler: auth,
    config: { rateLimit: { max: 20, timeWindow: '1 minute', keyGenerator: userKey } },
  }, async (req: any, reply: any) => {
    const userId = (req.user as any)?.id
    const email = await emailOf(userId)
    if (!email) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    const [viva, inv] = await Promise.all([vivaPaymentsOf(email), cachedStripeInvoicesOf(String(userId))])
    const data = [...viva.map(vivaItem), ...inv.items]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 200)
    reply.header('Cache-Control', 'no-store')
    return { data, stripe_ok: inv.ok }
  })

  app.post('/receipt-link', {
    preHandler: auth,
    config: { rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: userKey } },
  }, async (req: any, reply: any) => {
    const { kind, id } = (req.body ?? {}) as any
    if (!(VIVA_KINDS as readonly string[]).includes(kind) || typeof id !== 'string' || !ID_RE.test(id)) {
      return reply.code(400).send({ message: INVALID_PAYMENT_MESSAGE })
    }
    const userId = String((req.user as any)?.id ?? '')
    const email = await emailOf(userId)
    if (!email) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    const [p] = await vivaPaymentsOf(email, { kind, id })
    if (!p) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const path = `/payments/receipt?t=${signReceiptToken(kind, id, userId, getRequestLang(req))}`
    const base = process.env.PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api'
    // path: σχετικό με τη βάση του api του client· url: πλήρες (όπως passport pdf-link).
    return { path, url: `${base}${path}`, expires_in: RECEIPT_TTL_MS / 1000 }
  })

  // Δημόσιο (χωρίς authenticate — η πύλη ημερομηνίας γέννησης δεν εφαρμόζεται
  // εδώ, όπως στο passport pdf): η εξουσιοδότηση είναι το token, που εκδίδεται
  // μόνο από το POST /receipt-link (με authenticate, άρα και με την πύλη).
  // Η ιδιοκτησία και η πληρωμή ξαναελέγχονται εδώ από τη βάση.
  app.get('/receipt', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (req: any, reply: any) => {
    const t = (req.query as any)?.t
    const v = typeof t === 'string' && t.length <= 1000 ? verifyReceiptToken(t) : null
    const email = v ? await emailOf(v.userId) : null
    if (!v || !email) return reply.code(401).send({ message: RECEIPT_EXPIRED_MESSAGE })
    const [p] = await vivaPaymentsOf(email, { kind: v.kind, id: v.id })
    if (!p) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    reply.header('Content-Type', 'text/html; charset=utf-8')
    // Ίδιες κεφαλίδες με τον ιατρικό φάκελο (passport.ts): χωρίς cache, χωρίς
    // Referer (το URL έχει το token), χωρίς κανένα script.
    reply.header('Cache-Control', 'no-store')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('X-Robots-Tag', 'noindex')
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:")
    return reply.send(receiptHtml(p, v.lang))
  })

  app.post('/billing-portal', {
    preHandler: auth,
    config: { rateLimit: { max: 10, timeWindow: '10 minutes', keyGenerator: userKey } },
  }, async (req: any, reply: any) => {
    const userId = String((req.user as any)?.id ?? '')
    if (!(await emailOf(userId))) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[payments] billing portal: STRIPE_SECRET_KEY is not set')
      return reply.code(503).send({ message: PORTAL_UNAVAILABLE_MESSAGE, code: 'portal_unavailable' })
    }
    // Συνολικό όριο ~10″: αναζήτηση πελάτη (με όριο) και μετά το session με
    // όσο χρόνο απέμεινε. Υπέρβαση → 503 portal_unavailable.
    const started = Date.now()
    let customer: string | null
    try {
      customer = await withTimeout(portalCustomerOf(userId), PORTAL_DEADLINE_MS)
    } catch (err: any) {
      console.error('[payments] billing portal: customer lookup failed:', err?.message ?? err)
      return reply.code(503).send({ message: PORTAL_UNAVAILABLE_MESSAGE, code: 'portal_unavailable' })
    }
    if (!customer) return reply.code(404).send({ message: NO_STRIPE_CUSTOMER_MESSAGE, code: 'no_stripe_customer' })
    const remaining = PORTAL_DEADLINE_MS - (Date.now() - started)
    if (remaining < 1000) {
      console.error('[payments] billing portal: deadline reached before session create')
      return reply.code(503).send({ message: PORTAL_UNAVAILABLE_MESSAGE, code: 'portal_unavailable' })
    }
    try {
      const session = await stripe.billingPortal.sessions.create(
        { customer, return_url: `${FRONTEND()}/account/payments` },
        { ...STRIPE_OPTS, timeout: Math.min(STRIPE_OPTS.timeout, remaining) },
      )
      return { data: { url: session.url } }
    } catch (err: any) {
      // π.χ. το Customer Portal δεν έχει ρυθμιστεί στο Stripe Dashboard. Το
      // μήνυμα του Stripe ΜΟΝΟ στο log — ποτέ στον client.
      console.error('[payments] billing portal session failed:', err?.message ?? err)
      return reply.code(503).send({ message: PORTAL_UNAVAILABLE_MESSAGE, code: 'portal_unavailable' })
    }
  })
}
