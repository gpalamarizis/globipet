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
  event_cancelled: {
    el: 'Η εκδήλωση ακυρώθηκε', en: 'Event cancelled', es: 'Evento cancelado',
    fr: 'Événement annulé', zh: '活动已取消',
  },
  event_cancel_incomplete: {
    el: 'Εκκρεμούν επιστροφές χρημάτων', en: 'Refunds still pending', es: 'Reembolsos pendientes',
    fr: 'Remboursements en attente', zh: '退款尚未完成',
  },
  event_registration_confirmed: {
    el: 'Η συμμετοχή σου επιβεβαιώθηκε', en: 'Your registration is confirmed', es: 'Tu inscripción está confirmada',
    fr: 'Votre inscription est confirmée', zh: '您的报名已确认',
  },
  event_refund_completed: {
    el: 'Τα χρήματα επιστράφηκαν', en: 'Your refund is complete', es: 'Tu reembolso se ha completado',
    fr: 'Votre remboursement est effectué', zh: '退款已完成',
  },
  telehealth_cancelled: {
    el: 'Η συνεδρία τηλεϊατρικής ακυρώθηκε', en: 'Telehealth session cancelled', es: 'Sesión de telemedicina cancelada',
    fr: 'Séance de télémédecine annulée', zh: '远程问诊已取消',
  },
  /** Μήνυμα παρόχου προς πελάτη (customers.ts POST /message) — ανοίγει το /inbox. */
  provider_message: {
    el: 'Νέο μήνυμα από πάροχο', en: 'New message from a provider', es: 'Nuevo mensaje de un proveedor',
    fr: 'Nouveau message d\u2019un prestataire', zh: '服务商发来新消息',
  },
  /** Ακύρωση κράτησης/συνεδρίας που είχε μείνει «σε εξέλιξη»: η επιστροφή ολοκληρώθηκε. */
  cancel_refund_completed: {
    el: 'Η επιστροφή χρημάτων ολοκληρώθηκε', en: 'Your refund is complete', es: 'Tu reembolso se ha completado',
    fr: 'Votre remboursement est effectué', zh: '退款已完成',
  },
  /** Πρόσκληση μέλους προσωπικού (staff.ts): προς τον γιατρό· ανοίγει το /profile. */
  staff_invitation: {
    el: 'Πρόσκληση στο προσωπικό', en: 'Staff invitation', es: 'Invitación al equipo',
    fr: 'Invitation à rejoindre l\u2019équipe', zh: '员工邀请',
  },
  /** Προς τον πάροχο: το μέλος αποδέχθηκε· ανοίγει το /provider/staff. */
  staff_invitation_accepted: {
    el: 'Η πρόσκληση έγινε δεκτή', en: 'Invitation accepted', es: 'Invitación aceptada',
    fr: 'Invitation acceptée', zh: '邀请已接受',
  },
  /** Προς τον πάροχο: το μέλος απέρριψε. */
  staff_invitation_declined: {
    el: 'Η πρόσκληση απορρίφθηκε', en: 'Invitation declined', es: 'Invitación rechazada',
    fr: 'Invitation refusée', zh: '邀请已被拒绝',
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

  /**
   * Προς τον διοργανωτή: η ακύρωση ολοκληρώθηκε με εκκρεμείς επιστροφές
   * (αποτυχημένες ή σε εξέλιξη). Ο σύνδεσμος ανοίγει την εκδήλωση, όπου
   * υπάρχει η «Ολοκλήρωση επιστροφών».
   */
  eventCancelIncomplete: (lang: Lang, title: string, count: number) => p(lang, {
    el: `Η εκδήλωση "${title}" ακυρώθηκε, αλλά ${count === 1 ? '1 επιστροφή χρημάτων δεν ολοκληρώθηκε' : `${count} επιστροφές χρημάτων δεν ολοκληρώθηκαν`}. Άνοιξε την εκδήλωση για να τις ολοκληρώσεις.`,
    en: `The event "${title}" was cancelled, but ${count === 1 ? '1 refund was' : `${count} refunds were`} not completed. Open the event to complete ${count === 1 ? 'it' : 'them'}.`,
    es: `El evento "${title}" se ha cancelado, pero ${count === 1 ? '1 reembolso no se ha completado' : `${count} reembolsos no se han completado`}. Abre el evento para completar${count === 1 ? 'lo' : 'los'}.`,
    fr: `L’événement « ${title} » a été annulé, mais ${count === 1 ? '1 remboursement n’a pas abouti' : `${count} remboursements n’ont pas abouti`}. Ouvrez l’événement pour ${count === 1 ? 'le' : 'les'} finaliser.`,
    zh: `活动“${title}”已取消，但有 ${count} 笔退款尚未完成。请打开该活动完成退款。`,
  }),

  /** Η πληρωμή της δήλωσης επιβεβαιώθηκε και η θέση κρατήθηκε. */
  eventRegistrationConfirmed: (lang: Lang, title: string, amount: string) => p(lang, {
    el: `Η πληρωμή σου (${amount}€) επιβεβαιώθηκε και η θέση σου στην εκδήλωση "${title}" είναι κλεισμένη.`,
    en: `Your payment (${amount}€) has been confirmed and your place at the event "${title}" is booked.`,
    es: `Tu pago (${amount}€) se ha confirmado y tu plaza en el evento "${title}" está reservada.`,
    fr: `Votre paiement (${amount}€) a été confirmé et votre place à l’événement « ${title} » est réservée.`,
    zh: `您的付款（${amount}€）已确认，您在活动“${title}”中的名额已预订。`,
  }),

  /**
   * Ακύρωση εκδήλωσης από τον διοργανωτή.
   *   refunded — επιστράφηκαν τα χρήματα · delayed — η επιστροφή απέτυχε, εκκρεμεί
   *   plain    — δωρεάν συμμετοχή ή πληρωμή που δεν είχε ολοκληρωθεί
   */
  eventCancelled: (lang: Lang, title: string, kind: 'refunded' | 'delayed' | 'plain', amount: string) =>
    kind === 'refunded' ? p(lang, {
        el: `Η εκδήλωση "${title}" ακυρώθηκε από τον διοργανωτή. Τα χρήματα (${amount}€) επιστράφηκαν στον τρόπο πληρωμής σου.`,
        en: `The event "${title}" was cancelled by the organizer. Your payment (${amount}€) has been refunded to your payment method.`,
        es: `El evento "${title}" ha sido cancelado por el organizador. Tu pago (${amount}€) se ha reembolsado a tu método de pago.`,
        fr: `L’événement « ${title} » a été annulé par l’organisateur. Votre paiement (${amount}€) a été remboursé sur votre moyen de paiement.`,
        zh: `活动“${title}”已被组织者取消。您支付的 ${amount}€ 已退回原支付方式。`,
      })
    : kind === 'delayed' ? p(lang, {
        el: `Η εκδήλωση "${title}" ακυρώθηκε από τον διοργανωτή. Η επιστροφή των χρημάτων σου (${amount}€) καθυστερεί — θα ολοκληρωθεί σύντομα.`,
        en: `The event "${title}" was cancelled by the organizer. Your refund (${amount}€) is delayed and will be completed shortly.`,
        es: `El evento "${title}" ha sido cancelado por el organizador. Tu reembolso (${amount}€) se está retrasando y se completará en breve.`,
        fr: `L’événement « ${title} » a été annulé par l’organisateur. Votre remboursement (${amount}€) est retardé et sera effectué prochainement.`,
        zh: `活动“${title}”已被组织者取消。您的退款（${amount}€）有所延迟，将很快完成。`,
      })
    : p(lang, {
        el: `Η εκδήλωση "${title}" ακυρώθηκε από τον διοργανωτή.`,
        en: `The event "${title}" was cancelled by the organizer.`,
        es: `El evento "${title}" ha sido cancelado por el organizador.`,
        fr: `L’événement « ${title} » a été annulé par l’organisateur.`,
        zh: `活动“${title}”已被组织者取消。`,
      }),

  /** Η επιστροφή χρημάτων μιας συμμετοχής σε εκδήλωση ολοκληρώθηκε. */
  eventRefundCompleted: (lang: Lang, title: string, amount: string) => p(lang, {
    el: `Τα χρήματα της συμμετοχής σου στην εκδήλωση "${title}" (${amount}€) επιστράφηκαν στον τρόπο πληρωμής σου.`,
    en: `Your payment for the event "${title}" (${amount}€) has been refunded to your payment method.`,
    es: `El pago de tu inscripción en el evento "${title}" (${amount}€) se ha reembolsado a tu método de pago.`,
    fr: `Le paiement de votre inscription à l’événement « ${title} » (${amount}€) a été remboursé sur votre moyen de paiement.`,
    zh: `您报名活动“${title}”支付的 ${amount}€ 已退回原支付方式。`,
  }),

  /** Ακύρωση συνεδρίας τηλεϊατρικής· με ποσό > 0, και η επιστροφή στον πελάτη. */
  telehealthCancelled: (lang: Lang, date: string, time: string, refund: string | null) => p(lang, refund
    ? {
        el: `Η συνεδρία τηλεϊατρικής στις ${date} ${time} ακυρώθηκε. Επιστρέφονται ${refund}€ στον τρόπο πληρωμής σου.`,
        en: `The telehealth session on ${date} at ${time} was cancelled. ${refund}€ is being refunded to your payment method.`,
        es: `La sesión de telemedicina del ${date} a las ${time} se ha cancelado. Se te reembolsan ${refund}€ en tu método de pago.`,
        fr: `La séance de télémédecine du ${date} à ${time} a été annulée. ${refund}€ vous sont remboursés sur votre moyen de paiement.`,
        zh: `${date} ${time} 的远程问诊已取消。${refund}€ 将退回您的原支付方式。`,
      }
    : {
        el: `Η συνεδρία τηλεϊατρικής στις ${date} ${time} ακυρώθηκε.`,
        en: `The telehealth session on ${date} at ${time} was cancelled.`,
        es: `La sesión de telemedicina del ${date} a las ${time} se ha cancelado.`,
        fr: `La séance de télémédecine du ${date} à ${time} a été annulée.`,
        zh: `${date} ${time} 的远程问诊已取消。`,
      }),

  /**
   * Μήνυμα παρόχου: «Όνομα: θέμα» ή, χωρίς θέμα, η αρχή του κειμένου.
   * Το κείμενο είναι του παρόχου, όχι μεταφρασμένο· μόνο το πλαίσιο αλλάζει.
   */
  providerMessage: (lang: Lang, who: string, subject: string | null, body: string) => {
    const s = (subject || '').trim()
    const b = body.replace(/\s+/g, ' ').trim()
    const preview = s || (b.length > 120 ? `${b.slice(0, 117)}…` : b)
    return preview ? `${who}: ${preview}` : p(lang, {
      el: `${who} σου έστειλε μήνυμα.`, en: `${who} sent you a message.`, es: `${who} te ha enviado un mensaje.`,
      fr: `${who} vous a envoyé un message.`, zh: `${who} 给您发送了一条消息。`,
    })
  },

  /** Η ακύρωση κράτησης που ήταν σε εξέλιξη ολοκληρώθηκε· ποσό που επιστράφηκε. */
  bookingRefundCompleted: (lang: Lang, who: string, date: string, time: string, amount: string) => p(lang, {
    el: `Η ακύρωση της κράτησής σου (${who} · ${date} ${time}) ολοκληρώθηκε. Επιστράφηκαν ${amount}€ στον τρόπο πληρωμής σου.`,
    en: `The cancellation of your booking (${who} · ${date} ${time}) is complete. ${amount}€ has been refunded to your payment method.`,
    es: `La cancelación de tu reserva (${who} · ${date} ${time}) se ha completado. Se han reembolsado ${amount}€ en tu método de pago.`,
    fr: `L’annulation de votre réservation (${who} · ${date} ${time}) est terminée. ${amount}€ ont été remboursés sur votre moyen de paiement.`,
    zh: `您的预约（${who} · ${date} ${time}）已取消完成。${amount}€ 已退回原支付方式。`,
  }),

  /** Η ακύρωση συνεδρίας τηλεϊατρικής που ήταν σε εξέλιξη ολοκληρώθηκε. */
  telehealthRefundCompleted: (lang: Lang, date: string, time: string, amount: string) => p(lang, {
    el: `Η ακύρωση της συνεδρίας τηλεϊατρικής στις ${date} ${time} ολοκληρώθηκε. Επιστράφηκαν ${amount}€ στον τρόπο πληρωμής σου.`,
    en: `The cancellation of the telehealth session on ${date} at ${time} is complete. ${amount}€ has been refunded to your payment method.`,
    es: `La cancelación de la sesión de telemedicina del ${date} a las ${time} se ha completado. Se han reembolsado ${amount}€ en tu método de pago.`,
    fr: `L’annulation de la séance de télémédecine du ${date} à ${time} est terminée. ${amount}€ ont été remboursés sur votre moyen de paiement.`,
    zh: `${date} ${time} 的远程问诊已取消完成。${amount}€ 已退回原支付方式。`,
  }),

  /** Πρόσκληση: «Η Κλινική Χ σε πρόσθεσε στο προσωπικό της ως Όνομα.» */
  staffInvitation: (lang: Lang, business: string, name: string) => p(lang, {
    el: `Η επιχείρηση "${business}" σε πρόσθεσε στο προσωπικό της ως "${name}". Άνοιξε το προφίλ σου για να αποδεχθείς ή να απορρίψεις την πρόσκληση.`,
    en: `"${business}" added you to its staff as "${name}". Open your profile to accept or decline the invitation.`,
    es: `"${business}" te ha añadido a su equipo como "${name}". Abre tu perfil para aceptar o rechazar la invitación.`,
    fr: `« ${business} » vous a ajouté à son équipe en tant que « ${name} ». Ouvrez votre profil pour accepter ou refuser l\u2019invitation.`,
    zh: `“${business}”已将您添加为其员工“${name}”。请打开您的个人资料接受或拒绝邀请。`,
  }),

  /** Προς τον πάροχο: «Ο/Η Όνομα αποδέχθηκε / απέρριψε την πρόσκληση.» */
  staffInvitationAnswered: (lang: Lang, name: string, accepted: boolean) => p(lang, accepted
    ? {
        el: `Ο/Η ${name} αποδέχθηκε την πρόσκληση και ο λογαριασμός του/της συνδέθηκε με το προσωπικό σου.`,
        en: `${name} accepted the invitation and their account is now linked to your staff.`,
        es: `${name} ha aceptado la invitación y su cuenta ya está vinculada a tu equipo.`,
        fr: `${name} a accepté l\u2019invitation et son compte est désormais lié à votre équipe.`,
        zh: `${name} 已接受邀请，其账户已与您的员工关联。`,
      }
    : {
        el: `Ο/Η ${name} απέρριψε την πρόσκληση. Το email αφαιρέθηκε από το μέλος του προσωπικού.`,
        en: `${name} declined the invitation. The email has been removed from the staff member.`,
        es: `${name} ha rechazado la invitación. Se ha quitado el email del miembro del equipo.`,
        fr: `${name} a refusé l\u2019invitation. L\u2019e-mail a été retiré du membre de l\u2019équipe.`,
        zh: `${name} 已拒绝邀请。该邮箱已从员工信息中移除。`,
      }),
}
