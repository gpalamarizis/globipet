/**
 * Κείμενα της σελίδας «Cookies και συγκαταθέσεις» (/cookies).
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ
 *   Τα κλειδιά cookieBanner.* ζητούνταν από το component αλλά δεν υπήρχαν
 *   πουθενά στο i18n — ο επισκέπτης έβλεπε «cookieBanner.title» αντί για
 *   κείμενο. Ίδιο μοτίβο με την πολιτική απορρήτου (lib/legal.ts).
 *
 * Ε13 — ΑΠΟΦΑΣΗ ΙΔΙΟΚΤΗΤΗ
 *   Δεν χρησιμοποιούμε cookies ή εργαλεία στατιστικών/διαφήμισης. Οι
 *   κατηγορίες «Στατιστικά» και «Marketing» (διαφήμιση) αφαιρέθηκαν, και μαζί
 *   το cookie banner: για τα απαραίτητα δεν απαιτείται συγκατάθεση, οπότε δεν
 *   υπάρχει τίποτα να αποδεχτεί ή να απορρίψει ο επισκέπτης. Η σελίδα μένει
 *   προσβάσιμη από τον σύνδεσμο «Cookies» στο footer.
 *   Τα «Λειτουργικά» (γλώσσα, θέμα) δεν ήταν ποτέ υπό όρους — αποθηκεύονταν
 *   πάντα — και η πολιτική απορρήτου (§11) τα κατατάσσει στα απαραίτητα·
 *   περιγράφονται πλέον εκεί.
 *   Μένει ένας διακόπτης: «Ενημερωτικά email» = η συγκατάθεση `marketing`
 *   του backend, που διαβάζει η μαζική αποστολή email του admin (admin.ts).
 *
 * ΓΛΩΣΣΕΣ
 *   Ελληνικά, αγγλικά, ισπανικά, γαλλικά και κινεζικά (απλοποιημένα) —
 *   όλες οι γλώσσες της εφαρμογής. Η γλώσσα κόβεται στα 2 πρώτα γράμματα
 *   (π.χ. «zh-CN» → zh, «fr-FR» → fr). Άγνωστη γλώσσα → αγγλικά.
 */

export type CookieTexts = {
  subtitle: string
  noTracking: string
  alwaysOn: string
  saveChoices: string
  loginForNewsletter: string
  login: string
  categories: Record<'necessary' | 'newsletter', { title: string; desc: string }>
}

const el: CookieTexts = {
  subtitle: 'Τι αποθηκεύουμε στη συσκευή σου και ποια email δέχεσαι.',
  noTracking:
    'Δεν χρησιμοποιούμε cookies ή εργαλεία στατιστικών και διαφήμισης. Αν ' +
    'προστεθούν ποτέ, θα ζητήσουμε πρώτα τη συγκατάθεσή σου.',
  alwaysOn: 'Πάντα ενεργά',
  saveChoices: 'Αποθήκευση επιλογών',
  loginForNewsletter: 'Συνδέσου για να επιλέξεις αν θέλεις να λαμβάνεις ενημερωτικά email.',
  login: 'Σύνδεση',
  categories: {
    necessary: {
      title: 'Απαραίτητα',
      desc: 'Σύνδεση, καλάθι, ασφάλεια, η γλώσσα και το θέμα που διάλεξες. Χωρίς ' +
            'αυτά ο ιστότοπος δεν λειτουργεί, γι’ αυτό δεν απενεργοποιούνται.',
    },
    newsletter: {
      title: 'Ενημερωτικά email',
      desc: 'Νέα και προσφορές του GlobiPet στο email σου. Τα email για τις ' +
            'κρατήσεις, τις παραγγελίες και την ασφάλεια του λογαριασμού σου ' +
            'έρχονται πάντα.',
    },
  },
}

const en: CookieTexts = {
  subtitle: 'What we store on your device and which emails you receive.',
  noTracking:
    'We do not use analytics or advertising cookies or tools. If we ever add ' +
    'any, we will ask for your consent first.',
  alwaysOn: 'Always on',
  saveChoices: 'Save choices',
  loginForNewsletter: 'Sign in to choose whether you want to receive newsletter emails.',
  login: 'Sign in',
  categories: {
    necessary: {
      title: 'Essential',
      desc: 'Sign-in, cart, security, and the language and theme you chose. The ' +
            'site cannot work without them, so they cannot be turned off.',
    },
    newsletter: {
      title: 'Newsletter emails',
      desc: 'GlobiPet news and offers in your inbox. Emails about your bookings, ' +
            'orders and account security are always sent.',
    },
  },
}

const es: CookieTexts = {
  subtitle: 'Qué guardamos en tu dispositivo y qué emails recibes.',
  noTracking:
    'No usamos cookies ni herramientas de analítica o publicidad. Si algún día ' +
    'las añadimos, te pediremos antes tu consentimiento.',
  alwaysOn: 'Siempre activas',
  saveChoices: 'Guardar selección',
  loginForNewsletter: 'Inicia sesión para elegir si quieres recibir emails informativos.',
  login: 'Iniciar sesión',
  categories: {
    necessary: {
      title: 'Imprescindibles',
      desc: 'Inicio de sesión, carrito, seguridad, y el idioma y el tema que ' +
            'elegiste. Sin ellas el sitio no funciona, por eso no se pueden desactivar.',
    },
    newsletter: {
      title: 'Emails informativos',
      desc: 'Novedades y ofertas de GlobiPet en tu email. Los emails sobre tus ' +
            'reservas, pedidos y la seguridad de tu cuenta se envían siempre.',
    },
  },
}

const fr: CookieTexts = {
  subtitle: 'Ce que nous enregistrons sur votre appareil et les emails que vous recevez.',
  noTracking:
    'Nous n’utilisons ni cookies ni outils de statistiques ou de publicité. ' +
    'Si nous en ajoutons un jour, nous vous demanderons d’abord votre consentement.',
  alwaysOn: 'Toujours actifs',
  saveChoices: 'Enregistrer mes choix',
  loginForNewsletter: 'Connectez-vous pour choisir si vous souhaitez recevoir la newsletter par email.',
  login: 'Se connecter',
  categories: {
    necessary: {
      title: 'Indispensables',
      desc: 'Connexion, panier, sécurité, ainsi que la langue et le thème choisis. ' +
            'Le site ne peut pas fonctionner sans eux, ils ne peuvent donc pas être désactivés.',
    },
    newsletter: {
      title: 'Newsletter par email',
      desc: 'Les nouveautés et offres de GlobiPet dans votre boîte mail. Les emails ' +
            'concernant vos réservations, vos commandes et la sécurité de votre ' +
            'compte sont toujours envoyés.',
    },
  },
}

const zh: CookieTexts = {
  subtitle: '我们在您设备上存储的内容，以及您接收的邮件。',
  noTracking: '我们不使用任何统计分析或广告类 Cookie 或工具。如将来添加，会先征得您的同意。',
  alwaysOn: '始终启用',
  saveChoices: '保存选择',
  loginForNewsletter: '登录后可选择是否接收资讯邮件。',
  login: '登录',
  categories: {
    necessary: {
      title: '必要',
      desc: '用于登录、购物车、安全，以及您选择的语言和主题。没有它们网站无法运行，' +
            '因此无法关闭。',
    },
    newsletter: {
      title: '资讯邮件',
      desc: '通过邮件接收 GlobiPet 的新闻和优惠。有关预订、订单和账号安全的邮件始终会发送。',
    },
  },
}

const SETS: Record<string, CookieTexts> = { el, en, es, fr, zh }

/** Τα κείμενα στη γλώσσα του χρήστη. Άγνωστη γλώσσα → αγγλικά, ποτέ κενό. */
export function getCookieTexts(lang?: string): CookieTexts {
  const code = String(lang || 'el').slice(0, 2).toLowerCase()
  return SETS[code] || SETS.en
}
