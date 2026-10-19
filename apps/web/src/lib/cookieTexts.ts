/**
 * Κείμενα του cookie banner.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ
 *   Τα 17 κλειδιά cookieBanner.* ζητούνταν από το component αλλά δεν
 *   υπήρχαν πουθενά στο i18n — ο επισκέπτης έβλεπε «cookieBanner.title»
 *   αντί για κείμενο. Ίδιο μοτίβο με την πολιτική απορρήτου.
 *
 *   Μπαίνουν εδώ αντί στο i18n.ts, που είναι τεράστιο και επικίνδυνο να
 *   τροποποιηθεί χωρίς πλήρη εικόνα.
 *
 * ΝΟΜΙΚΗ ΒΑΣΗ
 *   Τα απαραίτητα cookies δεν απαιτούν συγκατάθεση. Για κάθε άλλη
 *   κατηγορία η συγκατάθεση πρέπει να είναι ρητή, ισότιμη και ανακλητή —
 *   γι' αυτό η «Απόρριψη όλων» έχει την ίδια βαρύτητα με την «Αποδοχή».
 *
 * ΓΛΩΣΣΕΣ
 *   Ελληνικά, αγγλικά, ισπανικά, γαλλικά και κινεζικά (απλοποιημένα) —
 *   όλες οι γλώσσες της εφαρμογής. Η γλώσσα κόβεται στα 2 πρώτα γράμματα
 *   (π.χ. «zh-CN» → zh, «fr-FR» → fr). Άγνωστη γλώσσα → αγγλικά.
 */

export type CookieTexts = {
  title: string
  description: string
  learnMore: string
  alwaysOn: string
  managePrefs: string
  hidePrefs: string
  acceptAll: string
  rejectAll: string
  saveChoices: string
  categories: Record<'necessary' | 'analytics' | 'marketing' | 'functional',
                     { title: string; desc: string }>
}

const el: CookieTexts = {
  title: 'Χρησιμοποιούμε cookies',
  description:
    'Κάποια είναι απαραίτητα για να λειτουργεί ο ιστότοπος. Για τα υπόλοιπα ' +
    'ζητάμε τη συγκατάθεσή σου και μπορείς να την αλλάξεις όποτε θέλεις.',
  learnMore: 'Δες την πολιτική απορρήτου',
  alwaysOn: 'Πάντα ενεργά',
  managePrefs: 'Διαχείριση προτιμήσεων',
  hidePrefs: 'Απόκρυψη',
  acceptAll: 'Αποδοχή όλων',
  rejectAll: 'Απόρριψη όλων',
  saveChoices: 'Αποθήκευση επιλογών',
  categories: {
    necessary: {
      title: 'Απαραίτητα',
      desc: 'Σύνδεση, καλάθι, ασφάλεια και βασικές προτιμήσεις. Χωρίς αυτά ο ' +
            'ιστότοπος δεν λειτουργεί, γι’ αυτό δεν απενεργοποιούνται.',
    },
    analytics: {
      title: 'Στατιστικά',
      desc: 'Μας δείχνουν ποιες σελίδες χρησιμοποιούνται και πού δυσκολεύεστε, ' +
            'ώστε να βελτιώνουμε την πλατφόρμα. Τα δεδομένα είναι συγκεντρωτικά.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Χρησιμοποιούνται για να βλέπεις σχετικές προσφορές εντός και εκτός ' +
            'της πλατφόρμας. Χωρίς αυτά, οι διαφημίσεις παραμένουν αλλά είναι τυχαίες.',
    },
    functional: {
      title: 'Λειτουργικά',
      desc: 'Θυμούνται επιλογές όπως γλώσσα, θέμα και πρόσφατες αναζητήσεις, ' +
            'ώστε να μην τις ξαναδηλώνεις κάθε φορά.',
    },
  },
}

const en: CookieTexts = {
  title: 'We use cookies',
  description:
    'Some are essential for the site to work. For the rest we ask for your ' +
    'consent, and you can change it whenever you like.',
  learnMore: 'Read the privacy policy',
  alwaysOn: 'Always on',
  managePrefs: 'Manage preferences',
  hidePrefs: 'Hide',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  saveChoices: 'Save choices',
  categories: {
    necessary: {
      title: 'Essential',
      desc: 'Sign-in, cart, security and basic preferences. The site cannot work ' +
            'without them, so they cannot be turned off.',
    },
    analytics: {
      title: 'Analytics',
      desc: 'They show us which pages get used and where people struggle, so we ' +
            'can improve the platform. The data is aggregated.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Used to show you relevant offers on and off the platform. Without ' +
            'them you still see ads, but they are untargeted.',
    },
    functional: {
      title: 'Functional',
      desc: 'They remember choices such as language, theme and recent searches, ' +
            'so you do not have to set them again.',
    },
  },
}

const es: CookieTexts = {
  title: 'Usamos cookies',
  description:
    'Algunas son imprescindibles para que el sitio funcione. Para las demás te ' +
    'pedimos tu consentimiento, y puedes cambiarlo cuando quieras.',
  learnMore: 'Consulta la política de privacidad',
  alwaysOn: 'Siempre activas',
  managePrefs: 'Gestionar preferencias',
  hidePrefs: 'Ocultar',
  acceptAll: 'Aceptar todas',
  rejectAll: 'Rechazar todas',
  saveChoices: 'Guardar selección',
  categories: {
    necessary: {
      title: 'Imprescindibles',
      desc: 'Inicio de sesión, carrito, seguridad y preferencias básicas. Sin ellas ' +
            'el sitio no funciona, por eso no se pueden desactivar.',
    },
    analytics: {
      title: 'Analíticas',
      desc: 'Nos muestran qué páginas se usan y dónde tienes dificultades, para ' +
            'poder mejorar la plataforma. Los datos son agregados.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Se usan para mostrarte ofertas relevantes dentro y fuera de la ' +
            'plataforma. Sin ellas seguirás viendo anuncios, pero no personalizados.',
    },
    functional: {
      title: 'Funcionales',
      desc: 'Recuerdan opciones como el idioma, el tema y las búsquedas recientes, ' +
            'para que no tengas que configurarlas cada vez.',
    },
  },
}

const fr: CookieTexts = {
  title: 'Nous utilisons des cookies',
  description:
    'Certains sont indispensables au fonctionnement du site. Pour les autres, ' +
    'nous demandons votre consentement, que vous pouvez modifier à tout moment.',
  learnMore: 'Consulter la politique de confidentialité',
  alwaysOn: 'Toujours actifs',
  managePrefs: 'Gérer les préférences',
  hidePrefs: 'Masquer',
  acceptAll: 'Tout accepter',
  rejectAll: 'Tout refuser',
  saveChoices: 'Enregistrer mes choix',
  categories: {
    necessary: {
      title: 'Indispensables',
      desc: 'Connexion, panier, sécurité et préférences de base. Le site ne peut ' +
            'pas fonctionner sans eux, ils ne peuvent donc pas être désactivés.',
    },
    analytics: {
      title: 'Statistiques',
      desc: 'Ils nous indiquent quelles pages sont utilisées et où vous rencontrez ' +
            'des difficultés, afin d’améliorer la plateforme. Les données sont agrégées.',
    },
    marketing: {
      title: 'Marketing',
      desc: 'Utilisés pour vous montrer des offres pertinentes sur la plateforme et ' +
            'en dehors. Sans eux, vous voyez toujours des publicités, mais non ciblées.',
    },
    functional: {
      title: 'Fonctionnels',
      desc: 'Ils mémorisent des choix comme la langue, le thème et les recherches ' +
            'récentes, pour que vous n’ayez pas à les redéfinir à chaque fois.',
    },
  },
}

const zh: CookieTexts = {
  title: '我们使用 Cookie',
  description:
    '部分 Cookie 是网站正常运行所必需的。其余 Cookie 需征得您的同意，' +
    '您可以随时更改您的选择。',
  learnMore: '查看隐私政策',
  alwaysOn: '始终启用',
  managePrefs: '管理偏好设置',
  hidePrefs: '收起',
  acceptAll: '全部接受',
  rejectAll: '全部拒绝',
  saveChoices: '保存选择',
  categories: {
    necessary: {
      title: '必要',
      desc: '用于登录、购物车、安全和基本偏好设置。没有它们网站无法运行，' +
            '因此无法关闭。',
    },
    analytics: {
      title: '统计分析',
      desc: '帮助我们了解哪些页面被使用、用户在哪里遇到困难，以便改进平台。' +
            '数据均为汇总数据。',
    },
    marketing: {
      title: '营销',
      desc: '用于在平台内外向您展示相关优惠。没有它们您仍会看到广告，' +
            '但不会是个性化广告。',
    },
    functional: {
      title: '功能',
      desc: '记住您的语言、主题和最近搜索等选择，' +
            '这样您就不必每次重新设置。',
    },
  },
}

const SETS: Record<string, CookieTexts> = { el, en, es, fr, zh }

/** Τα κείμενα στη γλώσσα του χρήστη. Άγνωστη γλώσσα → αγγλικά, ποτέ κενό. */
export function getCookieTexts(lang?: string): CookieTexts {
  const code = String(lang || 'el').slice(0, 2).toLowerCase()
  return SETS[code] || SETS.en
}
