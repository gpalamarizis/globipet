/**
 * Viva.com (Viva Wallet) Smart Checkout integration helper.
 *
 * Flow:
 * 1. Get OAuth2 access token (client credentials)
 * 2. Create a payment order -> returns orderCode
 * 3. Redirect customer to Smart Checkout with orderCode
 * 4. Verify payment via webhook or transaction API
 *
 * Environment variables needed:
 *   VIVA_CLIENT_ID         - Smart Checkout OAuth client id
 *   VIVA_CLIENT_SECRET     - Smart Checkout OAuth client secret
 *   VIVA_SOURCE_CODE       - Payment source code (from Viva dashboard)
 *   VIVA_ENV               - 'demo' or 'production' (default: 'demo')
 *   VIVA_MERCHANT_ID       - Merchant ID (for webhook verification)
 *   VIVA_API_KEY           - API Key (for webhook verification)
 *   FRONTEND_URL           - Frontend URL (e.g. https://globipet.com)
 */

type VivaEnv = 'demo' | 'production'

function getEnv(): VivaEnv {
  return (process.env.VIVA_ENV as VivaEnv) || 'demo'
}

function getBaseUrls() {
  const env = getEnv()
  if (env === 'production') {
    return {
      accounts: 'https://accounts.vivapayments.com',
      api: 'https://api.vivapayments.com',
      checkout: 'https://www.vivapayments.com/web/checkout',
      legacy: 'https://www.vivapayments.com',
    }
  }
  // Demo / sandbox
  return {
    accounts: 'https://demo-accounts.vivapayments.com',
    api: 'https://demo-api.vivapayments.com',
    checkout: 'https://demo.vivapayments.com/web/checkout',
    legacy: 'https://demo.vivapayments.com',
  }
}

// Cache the token in memory (valid ~1 hour)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get an OAuth2 access token using client credentials.
 */
export async function getVivaAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  const clientId = process.env.VIVA_CLIENT_ID
  const clientSecret = process.env.VIVA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Viva credentials not configured (VIVA_CLIENT_ID / VIVA_CLIENT_SECRET)')
  }

  const { accounts } = getBaseUrls()
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${accounts}/connect/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva token error: ${res.status} ${text}`)
  }

  const data = await res.json() as any
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
  return data.access_token
}

interface CreatePaymentOrderParams {
  amount: number          // in EUR (e.g. 29.99)
  customerEmail: string
  customerName?: string
  customerPhone?: string
  orderId: string         // our internal order id (stored in merchantTrns)
  description?: string
  successUrl?: string     // override default /orders/:id/confirmation redirect
  failureUrl?: string
}

/**
 * Create a Viva payment order. Returns the orderCode used for checkout redirect.
 */
export async function createVivaPaymentOrder(params: CreatePaymentOrderParams): Promise<{ orderCode: string; checkoutUrl: string }> {
  const token = await getVivaAccessToken()
  const { api, checkout } = getBaseUrls()
  const sourceCode = process.env.VIVA_SOURCE_CODE
  const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'

  /**
   * The source code is what separates this application's payments from every
   * other application on the same Viva account. GlobiPet shares its Viva
   * account with Thesis, so a missing or wrong source code means the money
   * and the reporting land under the other product.
   *
   * Previously an unset VIVA_SOURCE_CODE was sent as `undefined`, which Viva
   * accepts by falling back to the account's default source. The charge still
   * went through, which is exactly what makes it dangerous: nothing failed,
   * the payment simply appeared in the wrong place. Fail loudly instead.
   */
  if (!sourceCode) {
    throw new Error(
      'VIVA_SOURCE_CODE is not set. Refusing to create a payment order — ' +
      'without it the charge is filed under the shared account default.'
    )
  }

  // A zero or negative charge is always a bug upstream, and Viva would either
  // reject it or create an order nobody can pay.
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error(`Invalid payment amount: ${params.amount}`)
  }

  // Amount must be in cents (integer)
  const amountInCents = Math.round(params.amount * 100)

  const body: any = {
    amount: amountInCents,
    customerTrns: params.description || `GlobiPet παραγγελία ${params.orderId}`,
    customer: {
      email: params.customerEmail,
      fullName: params.customerName || '',
      phone: params.customerPhone || '',
      countryCode: 'GR',
      requestLang: 'el-GR',
    },
    paymentTimeout: 1800,          // 30 minutes
    preauth: false,
    allowRecurring: false,
    maxInstallments: 12,           // allow installments
    merchantTrns: params.orderId,  // our order id - comes back in webhook
    sourceCode: sourceCode,
    tags: ['globipet'],
    successUrl: params.successUrl || `${frontendUrl}/orders/${params.orderId}/confirmation`,
    failureUrl: params.failureUrl || `${frontendUrl}/orders/${params.orderId}/confirmation`,
  }

  const res = await fetch(`${api}/checkout/v2/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva create order error: ${res.status} ${text}`)
  }

  const data = await res.json() as any
  const orderCode = String(data.orderCode)

  return {
    orderCode,
    checkoutUrl: `${checkout}?ref=${orderCode}`,
  }
}

/**
 * Επιστροφή χρημάτων για μια συναλλαγή.
 *
 * ΠΟΙΟ ENDPOINT
 *   Το Smart Checkout δεν έχει δικό του endpoint επιστροφής· χρησιμοποιείται
 *   το κλασικό `DELETE /api/transactions/{id}` με Basic auth (Merchant ID και
 *   API Key), γι' αυτό υπάρχει ήδη το `legacy` base URL παραπάνω.
 *
 * ΜΕΡΙΚΗ ΕΠΙΣΤΡΟΦΗ
 *   Χωρίς ποσό, το Viva επιστρέφει ΟΛΟΚΛΗΡΗ τη συναλλαγή. Με ποσό, επιστρέφει
 *   μόνο αυτό. Το ποσό ταξιδεύει σε ΛΕΠΤΑ, όχι σε ευρώ — 12.50 € γίνεται 1250.
 *   Λάθος εδώ σημαίνει επιστροφή εκατονταπλάσια ή εκατοστή της σωστής.
 *
 * ΤΙ ΕΠΙΣΤΡΕΦΕΙ
 *   Σε επιτυχία, το Viva δίνει νέο TransactionId — τη συναλλαγή της
 *   επιστροφής. Κρατιέται για ίχνος.
 */
export async function refundVivaTransaction(
  transactionId: string,
  amountEuros?: number,
): Promise<{ transactionId: string | null; raw: any }> {
  const merchantId = process.env.VIVA_MERCHANT_ID
  const apiKey = process.env.VIVA_API_KEY
  if (!merchantId || !apiKey) {
    throw new Error('Λείπουν τα VIVA_MERCHANT_ID / VIVA_API_KEY για επιστροφή χρημάτων')
  }
  if (!transactionId) throw new Error('Λείπει το transactionId')

  const { legacy } = getBaseUrls()
  const params = new URLSearchParams()
  if (typeof amountEuros === 'number') {
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      throw new Error('Μη έγκυρο ποσό επιστροφής')
    }
    // Σε λεπτά, στρογγυλοποιημένα — το Viva δεν δέχεται δεκαδικά.
    params.set('amount', String(Math.round(amountEuros * 100)))
  }
  // Κοινός λογαριασμός Viva με το Thesis: χωρίς source code η επιστροφή
  // γίνεται χωρίς τον διαχωρισμό της πηγής — όπως και στη δημιουργία
  // πληρωμής, αποτυγχάνει ρητά (οριστικό σφάλμα, ΚΑΜΙΑ κλήση στη Viva) αντί
  // να παραλείπεται σιωπηλά.
  const sourceCode = process.env.VIVA_SOURCE_CODE
  if (!sourceCode) {
    throw new Error('Λείπει το VIVA_SOURCE_CODE για επιστροφή χρημάτων')
  }
  params.set('sourceCode', sourceCode)

  const qs = params.toString()
  const url = `${legacy}/api/transactions/${encodeURIComponent(transactionId)}${qs ? '?' + qs : ''}`
  const auth = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')

  // Όριο 90″ — μικρότερο από το timeout (120″) της συναλλαγής του
  // lib/refundLock, ώστε το κλείδωμα να κρατιέται όσο διαρκεί η κλήση.
  // Timeout / abort / σφάλμα δικτύου (και στην ανάγνωση της απάντησης): το
  // αίτημα ίσως έφτασε και η επιστροφή ίσως έγινε → ΑΓΝΩΣΤΗ έκβαση.
  let res: Response
  let text: string
  try {
    res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(90_000),
    })
    text = await res.text()
  } catch (err: any) {
    throw new VivaRefundError(`Viva refund outcome unknown: ${err?.name ?? ''} ${err?.message ?? err}`, true)
  }
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }

  if (!res.ok) {
    // 5xx: σφάλμα στη μεριά της Viva — δεν ξέρουμε αν η επιστροφή έγινε.
    // 4xx: οριστική άρνηση, καμία επιστροφή.
    throw new VivaRefundError(`Viva refund error: ${res.status} ${text}`, res.status >= 500, res.status)
  }
  // Το Viva σηματοδοτεί σφάλμα και με 200 όταν ο ErrorCode δεν είναι μηδέν
  // (οριστική άρνηση).
  if (body && typeof body.ErrorCode === 'number' && body.ErrorCode !== 0) {
    throw new VivaRefundError(`Viva refund refused: ${body.ErrorCode} ${body.ErrorText ?? ''}`, false, res.status)
  }

  return { transactionId: body?.TransactionId ?? null, raw: body }
}

/**
 * Αποτυχία της κλήσης επιστροφής στη Viva.
 *
 *   unknownOutcome = false → ΟΡΙΣΤΙΚΗ άρνηση (HTTP 4xx ή 200 με ErrorCode ≠ 0):
 *                            καμία επιστροφή δεν έγινε.
 *   unknownOutcome = true  → ΑΓΝΩΣΤΗ έκβαση (timeout/abort, σφάλμα δικτύου,
 *                            HTTP 5xx): η επιστροφή ΙΣΩΣ έγινε. Ο καλών δεν
 *                            επαναφέρει την κατάσταση σε «πληρωμένη» και δεν
 *                            ξαναδοκιμάζει στα τυφλά — αφήνει `refunding` για
 *                            την εργασία των κολλημένων / τον διαχειριστή.
 * Σφάλματα πριν την κλήση (διαπιστευτήρια, ποσό) είναι απλό Error: οριστικά.
 */
export class VivaRefundError extends Error {
  constructor(message: string, public unknownOutcome: boolean, public status?: number) { super(message) }
}

/** Η αποτυχία επιστροφής είναι «άγνωστη έκβαση» (η επιστροφή ίσως έγινε); */
export function isRefundOutcomeUnknown(err: unknown): boolean {
  return !!(err as any)?.unknownOutcome
}

/** Σφάλμα HTTP από τη Viva, με τον κωδικό της απάντησης. */
export class VivaHttpError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

/**
 * Οριστική απάντηση της Viva ότι η συναλλαγή δεν υπάρχει / δεν είναι έγκυρη
 * (400/404) — σε αντίθεση με σφάλμα επαλήθευσης (5xx, 429, timeout, δίκτυο,
 * διαπιστευτήρια, βάση), όπου η απάντηση είναι «δεν ξέρουμε ακόμη» και η
 * επαλήθευση πρέπει να ξαναγίνει.
 */
export function isVivaDefinitiveRejection(err: unknown): boolean {
  return err instanceof VivaHttpError && (err.status === 400 || err.status === 404)
}

/**
 * Η συναλλαγή ΔΕΝ είναι πληρωμή αυτής της εφαρμογής, κατά τα πεδία που δίνει
 * η ίδια η Viva (λογαριασμός κοινός με το Thesis). Ελέγχεται ΜΟΝΟ ό,τι
 * υπάρχει στην απάντηση — αν η Viva δεν δίνει το πεδίο, καμία απόρριψη (ώστε
 * να μη σπάσουν οι πληρωμές):
 *   · sourceCode / SourceCode ≠ VIVA_SOURCE_CODE (μόνο αν ορίστηκε)
 *   · currencyCode / CurrencyCode ≠ EUR (ISO 4217: 978 ή «EUR»)
 * Επιστρέφει την αιτία (για log) ή null.
 */
export function vivaForeignTransaction(tx: any): string | null {
  const present = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== ''
  const expected = process.env.VIVA_SOURCE_CODE
  const source = tx?.sourceCode ?? tx?.SourceCode
  if (expected && present(source) && String(source).trim() !== String(expected).trim()) {
    return `source code ${String(source)} is not ${expected}`
  }
  const currency = tx?.currencyCode ?? tx?.CurrencyCode
  if (present(currency) && !['978', 'EUR'].includes(String(currency).trim().toUpperCase())) {
    return `currency ${String(currency)} is not EUR`
  }
  return null
}

/**
 * Η Viva απάντησε 404 για συναλλαγή ΠΛΗΡΩΜΗΣ που ανέφερε πρόσφατο webhook:
 * αμέσως μετά τη δημιουργία της η συναλλαγή μπορεί να μη φαίνεται ακόμη στο
 * API συναλλαγών. Τότε η επαλήθευση ξαναγίνεται (το webhook απαντά 503 και η
 * Viva ξαναστέλνει) αντί για οριστική απόρριψη — που άφηνε πληρωμένα χρήματα
 * χωρίς καταχώριση. `retryNotFound` = το webhook είναι πρόσφατο
 * (lib/externalRefund isRecentWebhook)· στο verify του πελάτη πάντα false.
 */
export function isVivaNotFoundYet(err: unknown, retryNotFound: boolean | undefined): boolean {
  return !!retryNotFound && err instanceof VivaHttpError && err.status === 404
}

/**
 * Retrieve a transaction by its ID to verify payment.
 */
export async function getVivaTransaction(transactionId: string): Promise<any> {
  const token = await getVivaAccessToken()
  const { api } = getBaseUrls()

  // Όριο 15″: η κλήση γίνεται και μέσα σε κλείδωμα επιστροφής (lib/refundLock)
  // — χωρίς όριο μια Viva που δεν απαντά κρατούσε το κλείδωμα και την ουρά.
  // Timeout = σφάλμα επαλήθευσης («δεν ξέρουμε ακόμη»), όχι οριστική άρνηση.
  const res = await fetch(`${api}/checkout/v2/transactions/${encodeURIComponent(String(transactionId))}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new VivaHttpError(`Viva transaction error: ${res.status} ${text}`, res.status)
  }

  return res.json()
}