/**
 * Transactional email via Resend (https://resend.com), called through raw fetch
 * (no SDK dependency, matches the existing viva.ts pattern).
 *
 * Required env vars:
 *   RESEND_API_KEY    - from Resend dashboard
 *   RESEND_FROM_EMAIL  - e.g. "GlobiPet <orders@globipet.com>" (domain must be verified in Resend)
 *
 * IMPORTANT: every call here is wrapped so a failure NEVER throws — email is best-effort
 * and must never break the order/booking/payment flow that triggered it.
 */

const BRAND_ORANGE = '#E65100'

function wrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #F0F0F0;">
        <tr><td style="background:${BRAND_ORANGE};padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:800;">🐾 globipet</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #F0F0F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">GlobiPet · Best care for the best human's friends</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping email to', opts.to)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[email] Resend error:', res.status, text)
    }
  } catch (err: any) {
    console.error('[email] send failed:', err.message)
  }
}

const money = (n: number) => `€${n.toFixed(2)}`

// ─── Orders (marketplace products) ─────────────────────────────────

export async function sendOrderConfirmedEmail(to: string, opts: { orderId: string; customerName: string; items: { name: string; price: number; quantity: number }[]; total: number }) {
  const rows = opts.items.map(i => `<tr><td style="padding:6px 0;color:#374151;font-size:14px;">${i.name} ×${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">${money(i.price * i.quantity)}</td></tr>`).join('')
  await sendEmail({
    to, subject: `Επιβεβαίωση παραγγελίας #${opts.orderId.slice(0, 8)}`,
    html: wrapper('Η παραγγελία σου επιβεβαιώθηκε! 🎉', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, ευχαριστούμε για την παραγγελία σου.</p>
      <table width="100%" style="margin:16px 0;border-top:1px solid #F0F0F0;padding-top:12px;">${rows}</table>
      <table width="100%" style="border-top:2px solid #111827;padding-top:8px;"><tr><td style="font-weight:800;color:#111827;">Σύνολο</td><td style="text-align:right;font-weight:800;color:${BRAND_ORANGE};font-size:16px;">${money(opts.total)}</td></tr></table>
    `)
  })
}

export async function sendProviderNewOrderEmail(to: string, opts: { providerName: string; orderId: string; productName: string; quantity: number; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα παραγγελία: ${opts.productName}`,
    html: wrapper('Έχεις νέα παραγγελία 📦', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ένας πελάτης μόλις παρήγγειλε:</p>
      <p style="font-size:15px;color:#111827;font-weight:600;margin:12px 0;">${opts.productName} ×${opts.quantity}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Bookings (services) ────────────────────────────────────────────

export async function sendBookingConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string; price: number }) {
  await sendEmail({
    to, subject: `Επιβεβαίωση κράτησης με ${opts.providerName}`,
    html: wrapper('Η κράτησή σου επιβεβαιώθηκε ✅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η κράτησή σου με <strong>${opts.providerName}</strong> καταχωρήθηκε.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Κόστος: <strong>${money(opts.price)}</strong></p>
    `)
  })
}

export async function sendProviderNewBookingEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα κράτηση από ${opts.customerName}`,
    html: wrapper('Έχεις νέα κράτηση 📅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ο/η <strong>${opts.customerName}</strong> έκλεισε ραντεβού μαζί σου.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Telehealth ──────────────────────────────────────────────────────

export async function sendTelehealthConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string }) {
  await sendEmail({
    to, subject: `Η τηλεϊατρική συνεδρία σου επιβεβαιώθηκε`,
    html: wrapper('Η πληρωμή έγινε δεκτή ✅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η συνεδρία τηλεϊατρικής με <strong>${opts.providerName}</strong> είναι έτοιμη.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Μπες στην εφαρμογή στην ώρα του ραντεβού για να ξεκινήσεις την βιντεοκλήση.</p>
    `)
  })
}

export async function sendProviderNewTelehealthEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα συνεδρία τηλεϊατρικής από ${opts.customerName}`,
    html: wrapper('Έχεις νέα συνεδρία τηλεϊατρικής 🩺', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ο/η <strong>${opts.customerName}</strong> πλήρωσε και έκλεισε συνεδρία.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Subscriptions ───────────────────────────────────────────────────

export async function sendSubscriptionStartedEmail(to: string, opts: { customerName: string; productName: string; monthlyPrice: number }) {
  await sendEmail({
    to, subject: `Η συνδρομή σου ξεκίνησε 🎉`,
    html: wrapper('Καλώς ήρθες στη συνδρομή!', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η μηνιαία συνδρομή σου για <strong>${opts.productName}</strong> ενεργοποιήθηκε.</p>
      <p style="font-size:14px;color:#6B7280;">Μηνιαία χρέωση: <strong>${money(opts.monthlyPrice)}</strong></p>
    `)
  })
}

export async function sendSubscriptionRenewedEmail(to: string, opts: { customerName: string; productName: string; deliveryNumber: number }) {
  await sendEmail({
    to, subject: `Η μηνιαία παράδοση προγραμματίστηκε`,
    html: wrapper('Νέα παράδοση ετοιμάζεται 📦', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η πληρωμή για <strong>${opts.productName}</strong> (παράδοση #${opts.deliveryNumber}) ολοκληρώθηκε επιτυχώς.</p>
    `)
  })
}

export async function sendSubscriptionFailedEmail(to: string, opts: { customerName: string; productName: string }) {
  await sendEmail({
    to, subject: `Πρόβλημα με την πληρωμή της συνδρομής σου`,
    html: wrapper('Χρειάζεται ενημέρωση στοιχείων πληρωμής ⚠️', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η χρέωση για τη συνδρομή <strong>${opts.productName}</strong> απέτυχε.</p>
      <p style="font-size:14px;color:#6B7280;">Μπες στο προφίλ σου στο GlobiPet για να ενημερώσεις τα στοιχεία της κάρτας σου.</p>
    `)
  })
}

export async function sendAiTrialStartedEmail(to: string, opts: { customerName: string }) {
  await sendEmail({
    to, subject: `Το δωρεάν trial AI ξεκίνησε 🚀`,
    html: wrapper('15 μέρες δωρεάν AI λειτουργίες', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, το δωρεάν 15ήμερο trial των AI λειτουργιών (Υγεία, Emotion, Ούρα/Περιττώματα) ενεργοποιήθηκε.</p>
    `)
  })
}