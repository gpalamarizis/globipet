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
  const sourceCode = process.env.VIVA_SOURCE_CODE
  if (sourceCode) params.set('sourceCode', sourceCode)

  const qs = params.toString()
  const url = `${legacy}/api/transactions/${encodeURIComponent(transactionId)}${qs ? '?' + qs : ''}`
  const auth = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` },
  })

  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }

  if (!res.ok) {
    throw new Error(`Viva refund error: ${res.status} ${text}`)
  }
  // Το Viva σηματοδοτεί σφάλμα και με 200 όταν ο ErrorCode δεν είναι μηδέν.
  if (body && typeof body.ErrorCode === 'number' && body.ErrorCode !== 0) {
    throw new Error(`Viva refund refused: ${body.ErrorCode} ${body.ErrorText ?? ''}`)
  }

  return { transactionId: body?.TransactionId ?? null, raw: body }
}

/**
 * Retrieve a transaction by its ID to verify payment.
 */
export async function getVivaTransaction(transactionId: string): Promise<any> {
  const token = await getVivaAccessToken()
  const { api } = getBaseUrls()

  const res = await fetch(`${api}/checkout/v2/transactions/${transactionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva transaction error: ${res.status} ${text}`)
  }

  return res.json()
}