/**
 * Viva.com (Viva Wallet) Smart Checkout integration helper.
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
    }
  }
  return {
    accounts: 'https://demo-accounts.vivapayments.com',
    api: 'https://demo-api.vivapayments.com',
    checkout: 'https://demo.vivapayments.com/web/checkout',
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getVivaAccessToken(): Promise<string> {
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
  amount: number
  customerEmail: string
  customerName?: string
  customerPhone?: string
  orderId: string
  description?: string
}

export async function createVivaPaymentOrder(params: CreatePaymentOrderParams): Promise<{ orderCode: string; checkoutUrl: string }> {
  const token = await getVivaAccessToken()
  const { api, checkout } = getBaseUrls()
  const sourceCode = process.env.VIVA_SOURCE_CODE
  const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'

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
    paymentTimeout: 1800,
    preauth: false,
    allowRecurring: false,
    maxInstallments: 12,
    merchantTrns: params.orderId,
    sourceCode: sourceCode,
    tags: ['globipet'],
    successUrl: `${frontendUrl}/orders/${params.orderId}/confirmation`,
    failureUrl: `${frontendUrl}/orders/${params.orderId}/confirmation`,
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

  // Parse as text first to preserve precision of large integers
  const text = await res.text()
  // Extract orderCode as string to avoid JavaScript number precision loss
  const match = text.match(/"orderCode"\s*:\s*(\d+)/)
  if (!match) {
    throw new Error('Viva: orderCode not found in response')
  }
  const orderCode = match[1]

  return {
    orderCode,
    checkoutUrl: `${checkout}?ref=${orderCode}`,
  }
}

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
