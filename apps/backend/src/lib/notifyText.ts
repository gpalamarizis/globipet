/**
 * Κείμενα ειδοποιήσεων στη γλώσσα του παραλήπτη.
 *
 * ΓΙΑΤΙ ΜΕΤΑΦΡΑΖΟΥΜΕ ΤΗ ΣΤΙΓΜΗ ΤΗΣ ΔΗΜΙΟΥΡΓΙΑΣ
 *   Ο πίνακας notifications κρατά απλό κείμενο, όχι κλειδί. Η εναλλακτική —
 *   αποθήκευση κλειδιού και παραμέτρων, μετάφραση στην ανάγνωση — θα ήταν
 *   πιο σωστή θεωρητικά, αλλά απαιτεί migration, αλλαγή στο σχήμα και
 *   αλλαγή σε κάθε σημείο που διαβάζει ειδοποιήσεις, σε web και mobile.
 *
 *   Μεταφράζοντας εδώ, η ειδοποίηση γράφεται στη γλώσσα που είχε ο χρήστης
 *   εκείνη τη στιγμή. Αν αλλάξει γλώσσα αργότερα, οι παλιές ειδοποιήσεις
 *   μένουν στην παλιά — όπως ακριβώς συμβαίνει και με τα email, και όπως
 *   κάνουν οι περισσότερες πλατφόρμες.
 */
import prisma from './prisma.js'

type Lang = 'el' | 'en' | 'es' | 'fr' | 'zh'
const LANGS: Lang[] = ['el', 'en', 'es', 'fr', 'zh']

/**
 * Γλώσσα από αποθηκευμένη τιμή, χωρίς ερώτημα.
 *
 * Χρησιμεύει όταν η γλώσσα έχει ήδη διαβαστεί μαζικά — π.χ. ειδοποίηση
 * προς πολλούς παραλήπτες, όπου ένα ερώτημα ανά χρήστη θα ήταν σπατάλη.
 */
export function langOf(value: string | null | undefined): Lang {
  const l = (value || 'el').slice(0, 2) as Lang
  return LANGS.includes(l) ? l : 'el'
}

/** Η γλώσσα του παραλήπτη. Άγνωστος χρήστης → ελληνικά. */
export async function langOfUser(email: string): Promise<Lang> {
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

type Row = Record<Lang, string>
const p = (lang: Lang, r: Row) => r[lang] ?? r.el

// ─── Τίτλοι ──────────────────────────────────────────────────────────
const TITLES: Record<string, Row> = {
  new_booking: {
    el: 'Νέα κράτηση', en: 'New booking', es: 'Nueva reserva',
    fr: 'Nouvelle réservation', zh: '新预约',
  },
  booking_paid: {
    el: 'Πληρωμή κράτησης', en: 'Booking paid', es: 'Reserva pagada',
    fr: 'Réservation payée', zh: '预约已付款',
  },
  new_order: {
    el: 'Νέα παραγγελία προϊόντος', en: 'New product order', es: 'Nuevo pedido de producto',
    fr: 'Nouvelle commande de produit', zh: '新产品订单',
  },
  subscription_new_order: {
    el: 'Νέα παράδοση συνδρομής', en: 'New subscription delivery', es: 'Nueva entrega de suscripción',
    fr: 'Nouvelle livraison d\u2019abonnement', zh: '新的订阅配送',
  },
  subscription_delivery: {
    el: 'Η μηνιαία παράδοση τροφής προγραμματίστηκε', en: 'Your monthly food delivery is scheduled',
    es: 'Tu entrega mensual de comida está programada', fr: 'Votre livraison mensuelle est programmée',
    zh: '您的月度食品配送已安排',
  },
  subscription_payment_failed: {
    el: 'Αποτυχία πληρωμής συνδρομής', en: 'Subscription payment failed',
    es: 'Fallo en el pago de la suscripción', fr: 'Échec du paiement de l\u2019abonnement',
    zh: '订阅付款失败',
  },
  verification_approved: {
    el: 'Ο λογαριασμός σου επαληθεύτηκε', en: 'Your account has been verified',
    es: 'Tu cuenta ha sido verificada', fr: 'Votre compte a été vérifié', zh: '您的账号已通过认证',
  },
  verification_rejected: {
    el: 'Η αίτηση επαλήθευσης απορρίφθηκε', en: 'Your verification request was rejected',
    es: 'Tu solicitud de verificación fue rechazada', fr: 'Votre demande de vérification a été refusée',
    zh: '您的认证申请被拒绝',
  },
  incoming_call: {
    el: '🔔 Ασθενής σε περιμένει!', en: '🔔 A patient is waiting for you',
    es: '🔔 Un paciente te está esperando', fr: '🔔 Un patient vous attend', zh: '🔔 有患者在等您',
  },
  community: {
    el: 'Νέα κοινότητα κοντά σου!', en: 'A new community near you',
    es: 'Una nueva comunidad cerca de ti', fr: 'Une nouvelle communauté près de vous', zh: '您附近有新社区',
  },
  staff_changed: {
    el: 'Αλλαγή γιατρού στο ραντεβού σου', en: 'Your appointment has a new practitioner',
    es: 'Cambio de profesional en tu cita', fr: 'Changement de praticien pour votre rendez-vous',
    zh: '您的预约已更换接诊人员',
  },
  ai_trial_expired: {
    el: 'Η δωρεάν δοκιμή AI έληξε', en: 'Your free AI trial has ended',
    es: 'Tu prueba gratuita de IA ha terminado', fr: 'Votre essai IA gratuit est terminé',
    zh: '您的 AI 免费试用已结束',
  },
}

// ─── Μηνύματα ────────────────────────────────────────────────────────
const PAYOUT: Row = {
  el: 'αμοιβή', en: 'payout', es: 'pago', fr: 'rémunération', zh: '收入',
}
const PAID: Row = {
  el: 'πλήρωσε', en: 'paid', es: 'ha pagado', fr: 'a payé', zh: '已支付',
}

export function notifyTitle(key: string, lang: Lang): string {
  const row = TITLES[key]
  return row ? p(lang, row) : key
}

/** Βοηθητικά για τα μηνύματα που συνθέτονται από δεδομένα. */
export const notifyMsg = {
  /** «Όνομα · 2026-10-20 14:00 · αμοιβή 25.00€» */
  bookingLine: (lang: Lang, who: string, date: string, time: string, payout: string) =>
    `${who} · ${date} ${time} · ${p(lang, PAYOUT)} ${payout}€`,

  /** «Όνομα πλήρωσε 25.00€ · 2026-10-20 14:00» */
  bookingPaid: (lang: Lang, who: string, amount: string, date: string, time: string) =>
    `${who} ${p(lang, PAID)} ${amount}€ · ${date} ${time}`,

  /** «Προϊόν Α, Προϊόν Β — αμοιβή 12.00€» */
  orderLine: (lang: Lang, items: string, payout: string) =>
    `${items} — ${p(lang, PAYOUT)} ${payout}€`,

  /** «Προϊόν ×1 — αμοιβή 12.00€» */
  subscriptionOrderLine: (lang: Lang, product: string, payout: string) =>
    `${product} ×1 — ${p(lang, PAYOUT)} ${payout}€`,

  subscriptionDelivery: (lang: Lang, product: string) => p(lang, {
    el: `Η πληρωμή της συνδρομής σου για "${product}" έγινε επιτυχώς. Η παράδοση ετοιμάζεται.`,
    en: `Your subscription payment for "${product}" went through. Your delivery is being prepared.`,
    es: `El pago de tu suscripción a "${product}" se ha completado. Tu entrega se está preparando.`,
    fr: `Le paiement de votre abonnement à « ${product} » a abouti. Votre livraison est en préparation.`,
    zh: `您的“${product}”订阅付款已成功，配送正在准备中。`,
  }),

  subscriptionFailed: (lang: Lang, product: string) => p(lang, {
    el: `Η χρέωση για τη συνδρομή "${product}" απέτυχε. Ενημέρωσε τα στοιχεία πληρωμής σου.`,
    en: `The charge for your "${product}" subscription failed. Please update your payment details.`,
    es: `El cobro de la suscripción "${product}" ha fallado. Actualiza tus datos de pago.`,
    fr: `Le prélèvement pour l\u2019abonnement « ${product} » a échoué. Mettez à jour vos informations de paiement.`,
    zh: `“${product}”订阅扣款失败，请更新您的付款信息。`,
  }),

  verificationApproved: (lang: Lang) => p(lang, {
    el: 'Οι υπηρεσίες σου εμφανίζονται πλέον με σήμα επαλήθευσης.',
    en: 'Your services now appear with a verified badge.',
    es: 'Tus servicios ahora aparecen con el sello de verificación.',
    fr: 'Vos services affichent désormais le badge vérifié.',
    zh: '您的服务现已显示认证标识。',
  }),

  verificationRejected: (lang: Lang) => p(lang, {
    el: 'Επικοινώνησε μαζί μας για λεπτομέρειες.',
    en: 'Please contact us for details.',
    es: 'Ponte en contacto con nosotros para más detalles.',
    fr: 'Contactez-nous pour plus de détails.',
    zh: '请联系我们了解详情。',
  }),

  incomingCall: (lang: Lang, who: string, date: string, time: string) => p(lang, {
    el: `${who} πλήρωσε και σε περιμένει για τηλεϊατρική · ${date} ${time}`,
    en: `${who} has paid and is waiting for a telehealth session · ${date} ${time}`,
    es: `${who} ha pagado y espera una sesión de telemedicina · ${date} ${time}`,
    fr: `${who} a payé et attend une séance de télémédecine · ${date} ${time}`,
    zh: `${who} 已付款并等待远程问诊 · ${date} ${time}`,
  }),

  communityCreated: (lang: Lang, name: string) => p(lang, {
    el: `Η κοινότητα "${name}" δημιουργήθηκε κοντά σου. Γίνε μέλος!`,
    en: `The community "${name}" was created near you. Join in.`,
    es: `La comunidad "${name}" se ha creado cerca de ti. ¡Únete!`,
    fr: `La communauté « ${name} » a été créée près de chez vous. Rejoignez-la.`,
    zh: `社区“${name}”已在您附近创建，欢迎加入。`,
  }),

  /** Αλλαγή γιατρού. Χωρίς νέο μέλος, το ραντεβού μένει χωρίς συγκεκριμένο άτομο. */
  staffChanged: (lang: Lang, name: string | null, date: string, time: string) => name
    ? p(lang, {
        el: `Το ραντεβού σου στις ${date} ${time} θα το εξυπηρετήσει ο/η ${name}.`,
        en: `Your appointment on ${date} at ${time} will be handled by ${name}.`,
        es: `Tu cita del ${date} a las ${time} la atenderá ${name}.`,
        fr: `Votre rendez-vous du ${date} à ${time} sera assuré par ${name}.`,
        zh: `您 ${date} ${time} 的预约将由 ${name} 接诊。`,
      })
    : p(lang, {
        el: `Το ραντεβού σου στις ${date} ${time} δεν έχει πλέον συγκεκριμένο γιατρό.`,
        en: `Your appointment on ${date} at ${time} no longer has a specific practitioner.`,
        es: `Tu cita del ${date} a las ${time} ya no tiene un profesional asignado.`,
        fr: `Votre rendez-vous du ${date} à ${time} n'a plus de praticien attitré.`,
        zh: `您 ${date} ${time} 的预约已无指定接诊人员。`,
      }),

  aiTrialExpired: (lang: Lang) => p(lang, {
    el: 'Οι 30 δωρεάν ημέρες σου στο GlobiPet AI ολοκληρώθηκαν. Επίλεξε ένα πλάνο για να συνεχίσεις να έχεις πρόσβαση στις υπηρεσίες AI.',
    en: 'Your 30 free days of GlobiPet AI have ended. Choose a plan to keep using the AI features.',
    es: 'Tus 30 días gratuitos de GlobiPet AI han terminado. Elige un plan para seguir usando las funciones de IA.',
    fr: 'Vos 30 jours gratuits de GlobiPet AI sont terminés. Choisissez une formule pour continuer à utiliser les fonctions IA.',
    zh: '您的 GlobiPet AI 30 天免费期已结束。请选择方案以继续使用 AI 功能。',
  }),
}
