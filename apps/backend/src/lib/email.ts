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

// ─── Γλώσσα παραλήπτη ────────────────────────────────────────────────
//
// ΓΙΑΤΙ ΕΔΩ ΚΑΙ ΟΧΙ ΣΤΑ ΣΗΜΕΙΑ ΚΛΗΣΗΣ
//   Τα email στέλνονται από δέκα διαφορετικά σημεία (webhooks, cron,
//   routes). Αν η γλώσσα περνούσε ως παράμετρος, θα έπρεπε να αλλάξουν
//   και τα δέκα — και το πρώτο που θα ξεχνιόταν θα έστελνε ελληνικά σε
//   Γάλλο χρήστη, σιωπηλά. Εδώ η αναζήτηση γίνεται μία φορά, σωστά.
//
//   Το κόστος είναι ένα ερώτημα ανά email. Η αποστολή είναι ήδη
//   ασύγχρονη και best-effort, οπότε δεν επηρεάζει καμία ροή.

import prisma from './prisma.js'

type Lang = 'el' | 'en' | 'es' | 'fr' | 'zh'
const LANGS: Lang[] = ['el', 'en', 'es', 'fr', 'zh']

/** Η γλώσσα του παραλήπτη. Άγνωστος χρήστης ή κενό πεδίο → ελληνικά. */
async function langOf(email: string): Promise<Lang> {
  try {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { preferred_language: true },
    })
    const l = (u?.preferred_language || 'el').slice(0, 2) as Lang
    return LANGS.includes(l) ? l : 'el'
  } catch {
    return 'el'
  }
}

/** Επιλογή κειμένου ανά γλώσσα, με πτώση στα ελληνικά. */
const pick = <T,>(lang: Lang, table: Record<Lang, T>): T => table[lang] ?? table.el

// Σταθερά κομμάτια που επαναλαμβάνονται σε πολλά email.
const T = {
  hi:        { el: 'Γεια σου', en: 'Hi', es: 'Hola', fr: 'Bonjour', zh: '你好' },
  total:     { el: 'Σύνολο', en: 'Total', es: 'Total', fr: 'Total', zh: '合计' },
  at:        { el: 'στις', en: 'at', es: 'a las', fr: 'à', zh: '于' },
  yourPay:   { el: 'Η αμοιβή σου', en: 'Your payout', es: 'Tu pago', fr: 'Votre rémunération', zh: '您的收入' },
  afterFee:  { el: '(μετά την προμήθεια πλατφόρμας)', en: '(after the platform fee)',
               es: '(después de la comisión de la plataforma)', fr: '(après la commission de la plateforme)',
               zh: '（扣除平台佣金后）' },
  tagline:   { el: 'Best care for the best human\'s friends', en: 'Best care for the best human\'s friends',
               es: 'Best care for the best human\'s friends', fr: 'Best care for the best human\'s friends',
               zh: 'Best care for the best human\'s friends' },
} as const


function wrapper(title: string, bodyHtml: string, lang: Lang = 'el'): string {
  return `<!DOCTYPE html><html lang="${lang}"><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
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
          <p style="margin:0;font-size:12px;color:#9CA3AF;">GlobiPet · ${pick(lang, T.tagline)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`
}

async function sendEmail(opts: { to: string; subject: string; html: string; lang?: Lang }): Promise<void> {
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
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: `Επιβεβαίωση παραγγελίας #${opts.orderId.slice(0, 8)}`, h: 'Η παραγγελία σου επιβεβαιώθηκε! 🎉', p: 'ευχαριστούμε για την παραγγελία σου.' },
    en: { subj: `Order confirmation #${opts.orderId.slice(0, 8)}`, h: 'Your order is confirmed 🎉', p: 'thank you for your order.' },
    es: { subj: `Confirmación de pedido #${opts.orderId.slice(0, 8)}`, h: '¡Tu pedido está confirmado! 🎉', p: 'gracias por tu pedido.' },
    fr: { subj: `Confirmation de commande #${opts.orderId.slice(0, 8)}`, h: 'Votre commande est confirmée 🎉', p: 'merci pour votre commande.' },
    zh: { subj: `订单确认 #${opts.orderId.slice(0, 8)}`, h: '您的订单已确认 🎉', p: '感谢您的订单。' },
  })
  const rows = opts.items.map(i => `<tr><td style="padding:6px 0;color:#374151;font-size:14px;">${i.name} ×${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">${money(i.price * i.quantity)}</td></tr>`).join('')
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p}</p>
      <table width="100%" style="margin:16px 0;border-top:1px solid #F0F0F0;padding-top:12px;">${rows}</table>
      <table width="100%" style="border-top:2px solid #111827;padding-top:8px;"><tr><td style="font-weight:800;color:#111827;">${pick(lang, T.total)}</td><td style="text-align:right;font-weight:800;color:${BRAND_ORANGE};font-size:16px;">${money(opts.total)}</td></tr></table>
    `, lang)
  })
}

export async function sendProviderNewOrderEmail(to: string, opts: { providerName: string; orderId: string; productName: string; quantity: number; payoutAmount: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: `Νέα παραγγελία: ${opts.productName}`, h: 'Έχεις νέα παραγγελία 📦', p: 'ένας πελάτης μόλις παρήγγειλε:' },
    en: { subj: `New order: ${opts.productName}`, h: 'You have a new order 📦', p: 'a customer has just ordered:' },
    es: { subj: `Nuevo pedido: ${opts.productName}`, h: 'Tienes un nuevo pedido 📦', p: 'un cliente acaba de pedir:' },
    fr: { subj: `Nouvelle commande : ${opts.productName}`, h: 'Vous avez une nouvelle commande 📦', p: 'un client vient de commander :' },
    zh: { subj: `新订单：${opts.productName}`, h: '您有新订单 📦', p: '一位客户刚刚下单：' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.providerName}, ${t.p}</p>
      <p style="font-size:15px;color:#111827;font-weight:600;margin:12px 0;">${opts.productName} ×${opts.quantity}</p>
      <p style="font-size:14px;color:#6B7280;">${pick(lang, T.yourPay)}: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> ${pick(lang, T.afterFee)}</p>
    `, lang)
  })
}

// ─── Bookings (services) ────────────────────────────────────────────

export async function sendBookingConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string; price: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: `Επιβεβαίωση κράτησης με ${opts.providerName}`, h: 'Η κράτησή σου επιβεβαιώθηκε ✅', p: 'η κράτησή σου με', p2: 'καταχωρήθηκε.', cost: 'Κόστος' },
    en: { subj: `Booking confirmed with ${opts.providerName}`, h: 'Your booking is confirmed ✅', p: 'your booking with', p2: 'has been registered.', cost: 'Cost' },
    es: { subj: `Reserva confirmada con ${opts.providerName}`, h: 'Tu reserva está confirmada ✅', p: 'tu reserva con', p2: 'ha sido registrada.', cost: 'Coste' },
    fr: { subj: `Réservation confirmée avec ${opts.providerName}`, h: 'Votre réservation est confirmée ✅', p: 'votre réservation avec', p2: 'a bien été enregistrée.', cost: 'Coût' },
    zh: { subj: `预约已确认：${opts.providerName}`, h: '您的预约已确认 ✅', p: '您与', p2: '的预约已登记。', cost: '费用' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p} <strong>${opts.providerName}</strong> ${t.p2}</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} ${pick(lang, T.at)} ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">${t.cost}: <strong>${money(opts.price)}</strong></p>
    `, lang)
  })
}

export async function sendProviderNewBookingEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: `Νέα κράτηση από ${opts.customerName}`, h: 'Έχεις νέα κράτηση 📅', p: 'έκλεισε ραντεβού μαζί σου.' },
    en: { subj: `New booking from ${opts.customerName}`, h: 'You have a new booking 📅', p: 'has booked an appointment with you.' },
    es: { subj: `Nueva reserva de ${opts.customerName}`, h: 'Tienes una nueva reserva 📅', p: 'ha reservado una cita contigo.' },
    fr: { subj: `Nouvelle réservation de ${opts.customerName}`, h: 'Vous avez une nouvelle réservation 📅', p: 'a pris rendez-vous avec vous.' },
    zh: { subj: `来自 ${opts.customerName} 的新预约`, h: '您有新预约 📅', p: '已与您预约。' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.providerName}, <strong>${opts.customerName}</strong> ${t.p}</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} ${pick(lang, T.at)} ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">${pick(lang, T.yourPay)}: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> ${pick(lang, T.afterFee)}</p>
    `, lang)
  })
}

// ─── Telehealth ──────────────────────────────────────────────────────

export async function sendTelehealthConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: 'Η τηλεϊατρική συνεδρία σου επιβεβαιώθηκε', h: 'Η πληρωμή έγινε δεκτή ✅', p: 'η συνεδρία τηλεϊατρικής με', p2: 'είναι έτοιμη.', note: 'Μπες στην εφαρμογή στην ώρα του ραντεβού για να ξεκινήσεις τη βιντεοκλήση.' },
    en: { subj: 'Your telehealth session is confirmed', h: 'Payment accepted ✅', p: 'your telehealth session with', p2: 'is ready.', note: 'Open the app at the appointment time to start the video call.' },
    es: { subj: 'Tu sesión de telemedicina está confirmada', h: 'Pago aceptado ✅', p: 'tu sesión de telemedicina con', p2: 'está lista.', note: 'Abre la app a la hora de la cita para iniciar la videollamada.' },
    fr: { subj: 'Votre séance de télémédecine est confirmée', h: 'Paiement accepté ✅', p: 'votre séance de télémédecine avec', p2: 'est prête.', note: 'Ouvrez l\'application à l\'heure du rendez-vous pour démarrer la visio.' },
    zh: { subj: '您的远程问诊已确认', h: '付款已接受 ✅', p: '您与', p2: '的远程问诊已准备就绪。', note: '请在预约时间打开应用开始视频通话。' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p} <strong>${opts.providerName}</strong> ${t.p2}</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} ${pick(lang, T.at)} ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">${t.note}</p>
    `, lang)
  })
}

export async function sendProviderNewTelehealthEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: `Νέα συνεδρία τηλεϊατρικής από ${opts.customerName}`, h: 'Έχεις νέα συνεδρία τηλεϊατρικής 🩺', p: 'πλήρωσε και έκλεισε συνεδρία.' },
    en: { subj: `New telehealth session from ${opts.customerName}`, h: 'You have a new telehealth session 🩺', p: 'has paid and booked a session.' },
    es: { subj: `Nueva sesión de telemedicina de ${opts.customerName}`, h: 'Tienes una nueva sesión de telemedicina 🩺', p: 'ha pagado y reservado una sesión.' },
    fr: { subj: `Nouvelle séance de télémédecine de ${opts.customerName}`, h: 'Vous avez une nouvelle séance de télémédecine 🩺', p: 'a payé et réservé une séance.' },
    zh: { subj: `来自 ${opts.customerName} 的新远程问诊`, h: '您有新的远程问诊 🩺', p: '已付款并预约了问诊。' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.providerName}, <strong>${opts.customerName}</strong> ${t.p}</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} ${pick(lang, T.at)} ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">${pick(lang, T.yourPay)}: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> ${pick(lang, T.afterFee)}</p>
    `, lang)
  })
}

// ─── Subscriptions ───────────────────────────────────────────────────

export async function sendSubscriptionStartedEmail(to: string, opts: { customerName: string; productName: string; monthlyPrice: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: 'Η συνδρομή σου ξεκίνησε 🎉', h: 'Καλώς ήρθες στη συνδρομή!', p: 'η μηνιαία συνδρομή σου για', p2: 'ενεργοποιήθηκε.', m: 'Μηνιαία χρέωση' },
    en: { subj: 'Your subscription has started 🎉', h: 'Welcome to your subscription', p: 'your monthly subscription for', p2: 'is now active.', m: 'Monthly charge' },
    es: { subj: 'Tu suscripción ha comenzado 🎉', h: '¡Bienvenido a tu suscripción!', p: 'tu suscripción mensual para', p2: 'ya está activa.', m: 'Cargo mensual' },
    fr: { subj: 'Votre abonnement a démarré 🎉', h: 'Bienvenue dans votre abonnement', p: 'votre abonnement mensuel pour', p2: 'est désormais actif.', m: 'Prélèvement mensuel' },
    zh: { subj: '您的订阅已开始 🎉', h: '欢迎订阅', p: '您的', p2: '月度订阅已生效。', m: '每月扣费' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p} <strong>${opts.productName}</strong> ${t.p2}</p>
      <p style="font-size:14px;color:#6B7280;">${t.m}: <strong>${money(opts.monthlyPrice)}</strong></p>
    `, lang)
  })
}

export async function sendSubscriptionRenewedEmail(to: string, opts: { customerName: string; productName: string; deliveryNumber: number }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: 'Η μηνιαία παράδοση προγραμματίστηκε', h: 'Νέα παράδοση ετοιμάζεται 📦', p: 'η πληρωμή για', p2: `(παράδοση #${opts.deliveryNumber}) ολοκληρώθηκε επιτυχώς.` },
    en: { subj: 'Your monthly delivery is scheduled', h: 'A new delivery is on its way 📦', p: 'the payment for', p2: `(delivery #${opts.deliveryNumber}) went through successfully.` },
    es: { subj: 'Tu entrega mensual está programada', h: 'Nueva entrega en preparación 📦', p: 'el pago de', p2: `(entrega #${opts.deliveryNumber}) se completó correctamente.` },
    fr: { subj: 'Votre livraison mensuelle est programmée', h: 'Une nouvelle livraison se prépare 📦', p: 'le paiement de', p2: `(livraison #${opts.deliveryNumber}) a été effectué avec succès.` },
    zh: { subj: '您的月度配送已安排', h: '新的配送正在准备 📦', p: '', p2: `（第 ${opts.deliveryNumber} 次配送）的付款已成功完成。` },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p} <strong>${opts.productName}</strong> ${t.p2}</p>
    `, lang)
  })
}

export async function sendSubscriptionFailedEmail(to: string, opts: { customerName: string; productName: string }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: 'Πρόβλημα με την πληρωμή της συνδρομής σου', h: 'Χρειάζεται ενημέρωση στοιχείων πληρωμής ⚠️', p: 'η χρέωση για τη συνδρομή', p2: 'απέτυχε.', note: 'Μπες στο προφίλ σου στο GlobiPet για να ενημερώσεις τα στοιχεία της κάρτας σου.' },
    en: { subj: 'There is a problem with your subscription payment', h: 'Your payment details need updating ⚠️', p: 'the charge for your subscription', p2: 'failed.', note: 'Open your GlobiPet profile to update your card details.' },
    es: { subj: 'Hay un problema con el pago de tu suscripción', h: 'Hay que actualizar los datos de pago ⚠️', p: 'el cobro de la suscripción', p2: 'ha fallado.', note: 'Entra en tu perfil de GlobiPet para actualizar los datos de tu tarjeta.' },
    fr: { subj: 'Problème avec le paiement de votre abonnement', h: 'Vos informations de paiement doivent être mises à jour ⚠️', p: 'le prélèvement pour l\'abonnement', p2: 'a échoué.', note: 'Connectez-vous à votre profil GlobiPet pour mettre à jour votre carte.' },
    zh: { subj: '您的订阅付款出现问题', h: '需要更新付款信息 ⚠️', p: '', p2: '订阅的扣款失败。', note: '请登录 GlobiPet 个人资料更新您的银行卡信息。' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p} <strong>${opts.productName}</strong> ${t.p2}</p>
      <p style="font-size:14px;color:#6B7280;">${t.note}</p>
    `, lang)
  })
}

export async function sendAiTrialStartedEmail(to: string, opts: { customerName: string }) {
  const lang = await langOf(to)
  const t = pick(lang, {
    el: { subj: 'Το δωρεάν trial AI ξεκίνησε 🚀', h: '30 μέρες δωρεάν AI λειτουργίες', p: 'το δωρεάν 30ήμερο trial των AI λειτουργιών (Υγεία, Emotion, Ούρα/Περιττώματα) ενεργοποιήθηκε.' },
    en: { subj: 'Your free AI trial has started 🚀', h: '30 days of AI features, free', p: 'your free 30-day trial of the AI features (Health, Emotion, Stool/Urine) is now active.' },
    es: { subj: 'Tu prueba gratuita de IA ha comenzado 🚀', h: '30 días de funciones de IA, gratis', p: 'tu prueba gratuita de 30 días de las funciones de IA (Salud, Emoción, Heces/Orina) ya está activa.' },
    fr: { subj: 'Votre essai IA gratuit a démarré 🚀', h: '30 jours de fonctions IA, offerts', p: 'votre essai gratuit de 30 jours des fonctions IA (Santé, Émotion, Selles/Urine) est désormais actif.' },
    zh: { subj: '您的 AI 免费试用已开始 🚀', h: '30 天免费 AI 功能', p: '您的 30 天 AI 功能免费试用（健康、情绪、粪便/尿液）已生效。' },
  })
  await sendEmail({
    to, subject: t.subj, lang,
    html: wrapper(t.h, `
      <p style="color:#6B7280;font-size:14px;">${pick(lang, T.hi)} ${opts.customerName}, ${t.p}</p>
    `, lang)
  })
}
