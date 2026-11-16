/**
 * Υιοθεσία — νομικός οδηγός, ετικέτες ελέγχου και συμφωνητικό, σε 5 γλώσσες.
 *
 * ΓΙΑΤΙ ΣΤΟΝ SERVER ΚΑΙ ΟΧΙ ΣΤΟ i18n ΤΟΥ WEB/MOBILE
 *   Το ίδιο κείμενο το διαβάζουν το web, το κινητό ΚΑΙ ο AI βοηθός. Αν ζούσε
 *   σε τρία σημεία, μια αλλαγή νόμου θα διορθωνόταν στο ένα και θα έμενε
 *   λάθος στα άλλα δύο. Εδώ αλλάζει μία φορά και φτάνει παντού.
 *
 * ΠΗΓΕΣ (έλεγχος 16/11/2026)
 *   GR  Ν. 4830/2021 (άρθ. 7, 8, 10), Ν. 5270/2026 (άρθ. 36–37), ΥΑ 23726/2026
 *       (ΦΕΚ Β' 2525/05.05.2026), pet.gov.gr, gov.gr «Υιοθεσία αδέσποτων».
 *   ES  Ley 7/2023 (BOE-A-2023-7936) — cesión ≥ 8 semanas, adopción solo vía
 *       centros/entidades registradas con contrato, cesión gratuita con contrato,
 *       prohibida la venta online.
 *   GB  Animal Welfare Act 2006, Lucy's Law (2020), Microchipping of Cats and
 *       Dogs (England) Regulations 2023, Dangerous Dogs Act 1991 / XL Bully,
 *       Animal Welfare (Licensing …) (Scotland) Regulations 2021.
 *   FR  Code rural L214-8, L212-10 · Loi 2021-1539 · Décret 2022-1354 (CEC, 7 j).
 *   CN  《动物防疫法》(2021) · 地方《养犬管理条例》 · 《民法典》1245–1251.
 *   EU  Κανονισμός (ΕΕ) 2026/1818 (ΕΕ L 10.8.2026) — σταδιακή εφαρμογή.
 *
 * ΠΡΟΣΟΧΗ: ενημερωτικό υλικό, όχι νομική συμβουλή — το λέει κάθε οθόνη.
 */

export type Lang = 'el' | 'en' | 'es' | 'fr' | 'zh'
export type L = Record<Lang, string>
export const pick = (row: L, lang: Lang): string => row[lang] ?? row.en ?? row.el

export const GUIDE_UPDATED = '2026-11-16'

export type GuideItem = { ref?: string; text: L }
export type CountryGuide = {
  name: L
  laws: GuideItem[]
  adopter: GuideItem[]
  giver: GuideItem[]
  after: GuideItem[]
  links: { label: L; url: string }[]
}

/** Χώρες με πλήρη οδηγό. Οι υπόλοιπες παίρνουν τον γενικό (OTHER). */
export const GUIDE_COUNTRIES = ['GR', 'ES', 'GB', 'FR', 'CN'] as const
export type GuideCountry = typeof GUIDE_COUNTRIES[number] | 'OTHER'

const EU_REG: GuideItem = {
  ref: 'Regulation (EU) 2026/1818',
  text: {
    el: 'Νέος Κανονισμός ΕΕ για την ευζωία και την ιχνηλασιμότητα σκύλων και γατών: υποχρεωτικό μικροτσίπ και καταχώριση σε εθνική βάση, επαληθεύσιμα στοιχεία ταυτοποίησης σε κάθε διαδικτυακή αγγελία. Εφαρμόζεται σταδιακά (ταυτοποίηση και επαλήθευση αγγελιών περίπου 3 χρόνια μετά την έναρξη ισχύος).',
    en: 'New EU Regulation on the welfare and traceability of dogs and cats: mandatory microchip and registration in a national database, verifiable identification in every online advert. It applies in stages (identification and advert verification roughly 3 years after entry into force).',
    es: 'Nuevo Reglamento UE sobre bienestar y trazabilidad de perros y gatos: microchip y registro obligatorios en una base nacional, identificación verificable en todo anuncio en línea. Se aplica de forma escalonada (identificación y verificación de anuncios unos 3 años después de su entrada en vigor).',
    fr: 'Nouveau règlement UE sur le bien-être et la traçabilité des chiens et des chats : puce et enregistrement obligatoires dans une base nationale, identification vérifiable dans toute annonce en ligne. Application progressive (identification et vérification des annonces environ 3 ans après l’entrée en vigueur).',
    zh: '欧盟关于犬猫福利与可追溯性的新条例：强制植入芯片并在国家数据库登记，所有网络广告须附可核验的身份信息。分阶段实施（身份登记与广告核验约在生效三年后适用）。',
  },
}

export const GUIDES: Record<GuideCountry, CountryGuide> = {
  // ─────────────────────────────────────────────────────────── ΕΛΛΑΔΑ
  GR: {
    name: { el: 'Ελλάδα', en: 'Greece', es: 'Grecia', fr: 'Grèce', zh: '希腊' },
    laws: [
      { ref: 'Ν. 4830/2021', text: {
        el: 'Το βασικό πλαίσιο για τα ζώα συντροφιάς. Το άρθρο 7 ρυθμίζει την υιοθεσία αδέσποτων και την Πανελλαδική Πλατφόρμα Υιοθεσίας στο ΕΜΖΣ. Απαγορεύεται η καταβολή αντιτίμου για υιοθεσία· επιτρέπονται μόνο αποδεδειγμένα έξοδα μεταφοράς, σίτισης και κτηνιατρικής φροντίδας.',
        en: 'The main framework for companion animals. Article 7 governs the adoption of strays and the national Adoption Platform in the EMZS registry. Charging a price for an adoption is prohibited; only documented transport, feeding and veterinary costs may be recovered.',
        es: 'El marco principal para animales de compañía. El artículo 7 regula la adopción de animales abandonados y la Plataforma Nacional de Adopción del registro EMZS. Está prohibido cobrar un precio por la adopción; solo se pueden repercutir gastos acreditados de transporte, alimentación y veterinario.',
        fr: 'Le cadre principal pour les animaux de compagnie. L’article 7 régit l’adoption des animaux errants et la plateforme nationale d’adoption du registre EMZS. Il est interdit de faire payer une adoption ; seuls les frais justifiés de transport, de nourriture et vétérinaires peuvent être demandés.',
        zh: '伴侣动物的基本法律框架。第7条规范流浪动物领养及国家伴侣动物登记系统（EMZS）中的全国领养平台。禁止为领养收取对价，仅可收取有凭证的运输、饲养和兽医费用。',
      } },
      { ref: 'Ν. 5270/2026 · ΥΑ 23726/2026', text: {
        el: 'Η λειτουργία του Εθνικού Μητρώου Ζώων Συντροφιάς (ΕΜΖΣ, pet.gov.gr) πέρασε στο Υπουργείο Εσωτερικών και ιδρύθηκε Ειδική Γραμματεία για την Προστασία των Ζώων Συντροφιάς. Η ΥΑ 23726/2026 ορίζει τους όρους λειτουργίας του μητρώου.',
        en: 'The National Companion Animal Registry (EMZS, pet.gov.gr) moved to the Ministry of the Interior and a Special Secretariat for the Protection of Companion Animals was created. Ministerial Decision 23726/2026 sets the registry’s operating terms.',
        es: 'El Registro Nacional de Animales de Compañía (EMZS, pet.gov.gr) pasó al Ministerio del Interior y se creó una Secretaría Especial para la Protección de los Animales de Compañía. La Decisión Ministerial 23726/2026 fija sus condiciones de funcionamiento.',
        fr: 'Le registre national des animaux de compagnie (EMZS, pet.gov.gr) relève désormais du ministère de l’Intérieur, et un Secrétariat spécial pour la protection des animaux de compagnie a été créé. L’arrêté 23726/2026 fixe les conditions de fonctionnement du registre.',
        zh: '国家伴侣动物登记系统（EMZS，pet.gov.gr）已移交内政部管理，并设立了伴侣动物保护特别秘书处。第23726/2026号部长决定规定了登记系统的运行条件。',
      } },
      EU_REG,
    ],
    adopter: [
      { ref: 'Ν. 4830/2021 άρθ. 7 §2', text: {
        el: 'Υιοθετεί ενήλικος. Η υιοθεσία από καταφύγιο ή ανάδοχο γίνεται με έγγραφο συμφωνητικό με το πρόσωπο που είναι καταχωρισμένο στο ΕΜΖΣ για το ζώο.',
        en: 'The adopter must be an adult. Adoption from a shelter or foster carer is made by written agreement with the person registered in the EMZS for the animal.',
        es: 'El adoptante debe ser mayor de edad. La adopción desde un refugio o casa de acogida se formaliza con un contrato escrito con la persona registrada en el EMZS para el animal.',
        fr: 'L’adoptant doit être majeur. L’adoption auprès d’un refuge ou d’une famille d’accueil se fait par contrat écrit avec la personne enregistrée dans l’EMZS pour l’animal.',
        zh: '领养人须为成年人。从收容所或寄养人处领养须与在EMZS中登记为该动物负责人的人签订书面协议。',
      } },
      { ref: 'Ν. 4830/2021 άρθ. 7 §3', text: {
        el: 'Κάτοικοι εξωτερικού υιοθετούν με συμφωνητικό και παραλαβή αυτοπροσώπως ή μέσω εξουσιοδοτημένου προσώπου· η μεταφορά γίνεται με πιστοποιητικό υγείας μέσω TRACES.',
        en: 'Residents abroad adopt by signing an agreement and collecting the animal in person or through an authorised representative; transport requires a health certificate issued via TRACES.',
        es: 'Los residentes en el extranjero adoptan firmando un contrato y recogiendo al animal en persona o mediante un representante autorizado; el traslado exige certificado sanitario vía TRACES.',
        fr: 'Les résidents à l’étranger adoptent en signant un contrat et en récupérant l’animal en personne ou par un mandataire ; le transport exige un certificat sanitaire via TRACES.',
        zh: '境外居民须签署协议并亲自或委托授权代表接收动物；运输须持有通过TRACES系统签发的健康证明。',
      } },
      { text: {
        el: 'Δεν πληρώνεις «τιμή» υιοθεσίας. Μπορεί να σου ζητηθούν μόνο τα αποδεδειγμένα έξοδα (μεταφορά, σίτιση, κτηνίατρος), που πρέπει να αναγράφονται.',
        en: 'You never pay a “price” for an adoption. You may only be asked for documented costs (transport, feeding, vet), which must be stated.',
        es: 'Nunca pagas un «precio» por adoptar. Solo pueden pedirte gastos acreditados (transporte, alimentación, veterinario), que deben indicarse.',
        fr: 'Vous ne payez jamais de « prix » d’adoption. Seuls des frais justifiés (transport, nourriture, vétérinaire), indiqués à l’avance, peuvent être demandés.',
        zh: '领养无需支付“价格”。只能向你收取已列明的有凭证费用（运输、饲养、兽医）。',
      } },
      { text: {
        el: 'Ως ιδιοκτήτης έχεις υποχρέωση σήμανσης (μικροτσίπ), καταχώρισης στο ΕΜΖΣ, εμβολιασμού κατά της λύσσας για σκύλους και στείρωσης όπου προβλέπεται από τον νόμο.',
        en: 'As the owner you must keep the animal microchipped and registered in the EMZS, vaccinate dogs against rabies and have the animal neutered where the law requires.',
        es: 'Como propietario debes mantener el microchip y el registro en el EMZS, vacunar a los perros contra la rabia y esterilizar cuando la ley lo exija.',
        fr: 'En tant que propriétaire, vous devez maintenir la puce et l’enregistrement EMZS, vacciner les chiens contre la rage et faire stériliser l’animal lorsque la loi l’exige.',
        zh: '作为主人，你须保持芯片标识和EMZS登记，为犬只接种狂犬病疫苗，并在法律要求时进行绝育。',
      } },
    ],
    giver: [
      { ref: 'Ν. 4830/2021 άρθ. 7 §1', text: {
        el: 'Κάθε ζώο προς υιοθεσία αναρτάται με όνομα, φωτογραφία, περιγραφή, αριθμό μικροτσίπ, ηλικία και φύλο. Στη GlobiPet ο αριθμός μικροτσίπ είναι υποχρεωτικός για σκύλους και γάτες.',
        en: 'Every animal offered for adoption is listed with name, photo, description, microchip number, age and sex. On GlobiPet the microchip number is mandatory for dogs and cats.',
        es: 'Cada animal en adopción se publica con nombre, foto, descripción, número de microchip, edad y sexo. En GlobiPet el microchip es obligatorio para perros y gatos.',
        fr: 'Chaque animal à l’adoption est publié avec nom, photo, description, numéro de puce, âge et sexe. Sur GlobiPet, le numéro de puce est obligatoire pour les chiens et les chats.',
        zh: '每只待领养动物须公布名字、照片、描述、芯片号、年龄和性别。在GlobiPet上，犬猫必须填写芯片号。',
      } },
      { ref: 'Ν. 4830/2021 άρθ. 8', text: {
        el: 'Εμπορία ζώων επιτρέπεται μόνο σε αδειοδοτημένες επιχειρήσεις. Ως ιδιώτης δίνεις το ζώο σου μόνο δωρεάν, με μεταβίβαση στο ΕΜΖΣ μέσω κτηνιάτρου.',
        en: 'Trading animals is allowed only for licensed businesses. As a private person you may only give your animal away free of charge, with the transfer recorded in the EMZS by a vet.',
        es: 'Solo las empresas autorizadas pueden comerciar con animales. Como particular solo puedes ceder tu animal gratis, con la transmisión registrada en el EMZS por un veterinario.',
        fr: 'Seules les entreprises agréées peuvent faire commerce d’animaux. En tant que particulier, vous ne pouvez céder votre animal que gratuitement, avec transfert enregistré dans l’EMZS par un vétérinaire.',
        zh: '只有持证企业可以买卖动物。个人只能免费转让自己的动物，并由兽医在EMZS中登记转移。',
      } },
      { ref: 'Ν. 4830/2021 άρθ. 7, 10', text: {
        el: 'Βρήκες αδέσποτο; Ενημέρωσε τον δήμο. Μπορείς να το υιοθετήσεις ο ίδιος και να το σημάνεις στο όνομά σου. Για να το δώσεις σε τρίτους, γίνε ανάδοχος ή συνεργάσου με τον δήμο ή φιλοζωικό σωματείο.',
        en: 'Found a stray? Inform the municipality. You may adopt it yourself and microchip it in your name. To place it with someone else, become a registered foster carer or work with the municipality or a welfare association.',
        es: '¿Has encontrado un animal abandonado? Avisa al ayuntamiento. Puedes adoptarlo tú y registrarlo a tu nombre. Para darlo a terceros, hazte casa de acogida registrada o colabora con el municipio o una asociación.',
        fr: 'Vous avez trouvé un animal errant ? Prévenez la mairie. Vous pouvez l’adopter vous-même et l’identifier à votre nom. Pour le confier à un tiers, devenez famille d’accueil déclarée ou passez par la mairie ou une association.',
        zh: '捡到流浪动物？请通知市政当局。你可以自己领养并以你的名义植入芯片。若要转交他人，请登记为寄养人，或与市政当局、动保协会合作。',
      } },
      { text: {
        el: 'Η εγκατάλειψη ζώου απαγορεύεται και τιμωρείται με υψηλά πρόστιμα.',
        en: 'Abandoning an animal is prohibited and heavily fined.',
        es: 'El abandono de animales está prohibido y se sanciona con multas elevadas.',
        fr: 'L’abandon d’un animal est interdit et lourdement sanctionné.',
        zh: '遗弃动物被禁止，并将处以高额罚款。',
      } },
    ],
    after: [
      { text: {
        el: 'Ενημέρωσε άμεσα το ΕΜΖΣ με τα στοιχεία σου μέσω κτηνιάτρου (ή, για ασήμαντο ζώο, σήμανση στο όνομά σου).',
        en: 'Update the EMZS with your details promptly through a vet (or microchip the animal in your name if it is not yet chipped).',
        es: 'Actualiza cuanto antes el EMZS con tus datos a través de un veterinario (o identifícalo a tu nombre si no tiene microchip).',
        fr: 'Mettez rapidement à jour l’EMZS avec vos coordonnées via un vétérinaire (ou faites identifier l’animal à votre nom s’il n’est pas pucé).',
        zh: '尽快通过兽医在EMZS更新你的信息（若动物未植入芯片，以你的名义植入）。',
      } },
      { text: {
        el: 'Κράτα το συμφωνητικό και το βιβλιάριο υγείας. Προγραμμάτισε έλεγχο σε κτηνίατρο και, αν δεν έχει γίνει, στείρωση.',
        en: 'Keep the agreement and the health booklet. Book a vet check and, if not yet done, neutering.',
        es: 'Guarda el contrato y la cartilla sanitaria. Pide cita veterinaria y, si falta, la esterilización.',
        fr: 'Conservez le contrat et le carnet de santé. Prévoyez une visite vétérinaire et, si besoin, la stérilisation.',
        zh: '保存协议和健康手册。预约兽医检查，若尚未绝育请安排绝育。',
      } },
    ],
    links: [
      { label: { el: 'ΕΜΖΣ — pet.gov.gr', en: 'EMZS registry — pet.gov.gr', es: 'Registro EMZS — pet.gov.gr', fr: 'Registre EMZS — pet.gov.gr', zh: 'EMZS 登记系统 — pet.gov.gr' }, url: 'https://pet.gov.gr' },
      { label: { el: 'gov.gr — Υιοθεσία αδέσποτων', en: 'gov.gr — Adopting strays', es: 'gov.gr — Adopción de animales abandonados', fr: 'gov.gr — Adopter un animal errant', zh: 'gov.gr — 流浪动物领养' }, url: 'https://www.gov.gr/org/ypes/zoa-suntrophias/uiothesia-adespoton-zoon-suntrophias' },
    ],
  },

  // ─────────────────────────────────────────────────────────── ΙΣΠΑΝΙΑ
  ES: {
    name: { el: 'Ισπανία', en: 'Spain', es: 'España', fr: 'Espagne', zh: '西班牙' },
    laws: [
      { ref: 'Ley 7/2023', text: {
        el: 'Νόμος για την προστασία των δικαιωμάτων και της ευζωίας των ζώων (σε ισχύ από 29/09/2023). Υιοθεσία μόνο από δημόσια κέντρα ή εγγεγραμμένους φορείς προστασίας, με έγγραφη σύμβαση. Απαγορεύεται η πώληση ζώων μέσω διαδικτύου.',
        en: 'Law on the protection of animal rights and welfare (in force since 29/09/2023). Adoption only through public animal protection centres or registered entities, with a written contract. Selling animals online is prohibited.',
        es: 'Ley de protección de los derechos y el bienestar de los animales (vigente desde el 29/09/2023). Adopción solo a través de centros públicos o entidades de protección registradas, con contrato escrito. Prohibida la venta de animales por internet.',
        fr: 'Loi sur la protection des droits et du bien-être des animaux (en vigueur depuis le 29/09/2023). Adoption uniquement via des centres publics ou des entités de protection enregistrées, avec contrat écrit. Vente d’animaux en ligne interdite.',
        zh: '《动物权利与福利保护法》（2023年9月29日起施行）。仅可通过公共动物保护中心或已登记的保护机构领养，并须签订书面合同。禁止网上销售动物。',
      } },
      { ref: 'Ley 7/2023 art. 58', text: {
        el: 'Δεν επιτρέπεται η παραχώρηση σκύλων, γατών και κουναβιών κάτω των 8 εβδομάδων, ούτε δωρεάν.',
        en: 'Dogs, cats and ferrets under 8 weeks may not be handed over, not even free of charge.',
        es: 'No se permite la cesión de perros, gatos y hurones de menos de ocho semanas, ni siquiera gratuita.',
        fr: 'Aucune cession de chiens, chats et furets de moins de 8 semaines, même gratuite.',
        zh: '不得转让未满8周龄的犬、猫和雪貂，即使是免费转让。',
      } },
      { ref: 'CC.AA.', text: {
        el: 'Ισχύουν επιπλέον οι νόμοι της αυτόνομης κοινότητας και οι δημοτικοί κανονισμοί (μητρώα, επικίνδυνοι σκύλοι, ασφάλιση).',
        en: 'Regional (autonomous community) laws and municipal by-laws also apply (registries, potentially dangerous dogs, insurance).',
        es: 'También se aplican las leyes autonómicas y las ordenanzas municipales (registros, perros potencialmente peligrosos, seguro).',
        fr: 'Les lois des communautés autonomes et les arrêtés municipaux s’appliquent aussi (registres, chiens dangereux, assurance).',
        zh: '同时适用各自治区法律和市政条例（登记、潜在危险犬、保险等）。',
      } },
      EU_REG,
    ],
    adopter: [
      { text: {
        el: 'Υιοθετείς από δημόσιο κέντρο ή εγγεγραμμένο φορέα, με σύμβαση υιοθεσίας. Το ζώο παραδίδεται σημασμένο· αν είναι μικρό για στείρωση, υπογράφεις δέσμευση στείρωσης.',
        en: 'You adopt from a public centre or registered entity, with an adoption contract. The animal is handed over identified; if too young to neuter, you sign a neutering commitment.',
        es: 'Adoptas en un centro público o entidad registrada, con contrato de adopción. El animal se entrega identificado; si es demasiado joven para esterilizar, firmas un compromiso de esterilización.',
        fr: 'Vous adoptez auprès d’un centre public ou d’une entité enregistrée, avec un contrat. L’animal est remis identifié ; s’il est trop jeune pour être stérilisé, vous signez un engagement de stérilisation.',
        zh: '通过公共中心或登记机构领养并签订领养合同。动物交付时须已标识；若年龄太小无法绝育，你须签署绝育承诺。',
      } },
      { text: {
        el: 'Ο νόμος προβλέπει ασφάλιση αστικής ευθύνης για τους κατόχους σκύλων· έλεγξε τι ισχύει σήμερα στην κοινότητά σου.',
        en: 'The law provides for civil liability insurance for dog keepers; check what currently applies in your region.',
        es: 'La ley prevé un seguro de responsabilidad civil para los titulares de perros; comprueba lo que se aplica hoy en tu comunidad.',
        fr: 'La loi prévoit une assurance responsabilité civile pour les détenteurs de chiens ; vérifiez ce qui s’applique aujourd’hui dans votre région.',
        zh: '法律规定犬主须投保民事责任险；请核实你所在地区的现行要求。',
      } },
    ],
    giver: [
      { text: {
        el: 'Ιδιώτες: μόνο δωρεάν παραχώρηση (cesión gratuita), με έγγραφη σύμβαση που αναφέρει ότι γίνεται χωρίς αντάλλαγμα. Πώληση μόνο από εγγεγραμμένους εκτροφείς — όχι στη GlobiPet.',
        en: 'Private persons: free hand-over only (cesión gratuita), with a written contract stating that no payment is involved. Sales only by registered breeders — not on GlobiPet.',
        es: 'Particulares: solo cesión gratuita, con contrato escrito que deje constancia de su carácter gratuito. La venta, solo por criadores registrados — no en GlobiPet.',
        fr: 'Particuliers : cession gratuite uniquement, avec contrat écrit mentionnant la gratuité. La vente est réservée aux éleveurs enregistrés — pas sur GlobiPet.',
        zh: '个人：只能免费转让（cesión gratuita），并签订注明无偿的书面合同。仅登记繁育者可销售——GlobiPet不允许销售。',
      } },
      { text: {
        el: 'Το ζώο πρέπει να είναι σημασμένο και καταχωρισμένο πριν την παραχώρηση. Η αναπαραγωγή επιτρέπεται μόνο σε εγγεγραμμένους στο Registro de Criadores.',
        en: 'The animal must be identified and registered before the hand-over. Breeding is allowed only for those enrolled in the Breeders’ Register.',
        es: 'El animal debe estar identificado y registrado antes de la cesión. La cría solo está permitida a inscritos en el Registro de Criadores.',
        fr: 'L’animal doit être identifié et enregistré avant la cession. L’élevage est réservé aux inscrits au registre des éleveurs.',
        zh: '转让前动物必须已标识并登记。只有在繁育者登记册上登记的人才可以繁育。',
      } },
    ],
    after: [
      { text: {
        el: 'Ενημέρωσε το μητρώο ζώων της κοινότητάς σου (μέσω κτηνιάτρου) και κράτα τη σύμβαση.',
        en: 'Update your region’s animal registry (through a vet) and keep the contract.',
        es: 'Actualiza el registro autonómico de animales (a través del veterinario) y guarda el contrato.',
        fr: 'Mettez à jour le registre régional (via le vétérinaire) et conservez le contrat.',
        zh: '通过兽医更新所在自治区的动物登记，并保存合同。',
      } },
    ],
    links: [
      { label: { el: 'BOE — Ley 7/2023', en: 'BOE — Ley 7/2023', es: 'BOE — Ley 7/2023', fr: 'BOE — Ley 7/2023', zh: 'BOE — 第7/2023号法律' }, url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-7936' },
    ],
  },

  // ─────────────────────────────────────────────────────────── ΗΝ. ΒΑΣΙΛΕΙΟ
  GB: {
    name: { el: 'Ηνωμένο Βασίλειο', en: 'United Kingdom', es: 'Reino Unido', fr: 'Royaume-Uni', zh: '英国' },
    laws: [
      { ref: 'Animal Welfare Act 2006', text: {
        el: 'Υποχρέωση φροντίδας (duty of care) για κάθε κάτοχο ζώου (στη Σκωτία: Animal Health and Welfare (Scotland) Act 2006).',
        en: 'A duty of care for every animal keeper (in Scotland: Animal Health and Welfare (Scotland) Act 2006).',
        es: 'Deber de cuidado para todo poseedor de animales (en Escocia: Animal Health and Welfare (Scotland) Act 2006).',
        fr: 'Obligation de soins pour tout détenteur d’animal (en Écosse : Animal Health and Welfare (Scotland) Act 2006).',
        zh: '所有动物饲养者负有照料义务（苏格兰适用《2006年动物健康与福利（苏格兰）法》）。',
      } },
      { ref: "Lucy's Law (2020)", text: {
        el: 'Κουτάβια και γατάκια κάτω των 6 μηνών πωλούνται μόνο από αυτόν που τα γέννησε ή από φορέα επανένταξης. Απαγορεύονται οι τρίτοι μεταπωλητές.',
        en: 'Puppies and kittens under 6 months may only be sold by the breeder or a rehoming centre. Third-party sellers are banned.',
        es: 'Cachorros y gatitos menores de 6 meses solo pueden venderlos su criador o un centro de reubicación. Prohibidos los intermediarios.',
        fr: 'Chiots et chatons de moins de 6 mois : vente uniquement par l’éleveur ou un centre de relogement. Revendeurs tiers interdits.',
        zh: '6个月以下的幼犬幼猫只能由繁育者或安置中心出售，禁止第三方转卖。',
      } },
      { ref: 'Microchipping of Cats and Dogs (England) Regulations 2023', text: {
        el: 'Σκύλοι με μικροτσίπ έως τις 8 εβδομάδες και γάτες (Αγγλία) έως τις 20 εβδομάδες, καταχωρισμένα σε εγκεκριμένη βάση. Τα στοιχεία κατόχου ενημερώνονται σε κάθε αλλαγή.',
        en: 'Dogs microchipped by 8 weeks and cats (England) by 20 weeks, registered on an approved database. Keeper details must be updated on every change.',
        es: 'Perros con microchip antes de las 8 semanas y gatos (Inglaterra) antes de las 20, registrados en una base aprobada. Los datos del poseedor se actualizan en cada cambio.',
        fr: 'Chiens pucés avant 8 semaines et chats (Angleterre) avant 20 semaines, enregistrés dans une base agréée. Les coordonnées du détenteur sont mises à jour à chaque changement.',
        zh: '犬只须在8周龄前、猫（英格兰）须在20周龄前植入芯片并在认可数据库登记；每次更换饲养人须更新信息。',
      } },
      { ref: 'Dangerous Dogs Act 1991', text: {
        el: 'Απαγορεύεται η πώληση, δωρεά ή επανένταξη απαγορευμένων τύπων (Pit Bull Terrier, Japanese Tosa, Dogo Argentino, Fila Brasileiro, XL Bully). Η GlobiPet μπλοκάρει αυτές τις αγγελίες.',
        en: 'Selling, giving away or rehoming banned types (Pit Bull Terrier, Japanese Tosa, Dogo Argentino, Fila Brasileiro, XL Bully) is illegal. GlobiPet blocks such listings.',
        es: 'Es ilegal vender, regalar o reubicar tipos prohibidos (Pit Bull Terrier, Tosa japonés, Dogo argentino, Fila brasileño, XL Bully). GlobiPet bloquea esos anuncios.',
        fr: 'Il est illégal de vendre, donner ou replacer les types interdits (Pit Bull Terrier, Tosa japonais, Dogue argentin, Fila Brasileiro, XL Bully). GlobiPet bloque ces annonces.',
        zh: '出售、赠送或重新安置禁养犬种（比特犬、日本土佐犬、阿根廷杜高犬、巴西獒、XL Bully）属违法行为。GlobiPet会拦截此类信息。',
      } },
    ],
    adopter: [
      { text: {
        el: 'Τα φιλοζωικά ορίζουν δικά τους κριτήρια (επίσκεψη στο σπίτι, συμφωνητικό, εισφορά επανένταξης). Προτίμησε μέλη του ADCH.',
        en: 'Rescues set their own criteria (home check, agreement, rehoming fee). Prefer members of the ADCH.',
        es: 'Las protectoras fijan sus criterios (visita al hogar, acuerdo, aportación). Prefiere miembros de la ADCH.',
        fr: 'Les refuges fixent leurs critères (visite à domicile, contrat, participation aux frais). Privilégiez les membres de l’ADCH.',
        zh: '救助机构自行设定标准（家访、协议、安置费）。优先选择ADCH成员机构。',
      } },
      { text: {
        el: 'Ποτέ κουτάβι/γατάκι κάτω των 8 εβδομάδων. Βεβαιώσου ότι το μικροτσίπ μεταφέρθηκε στο όνομά σου.',
        en: 'Never a puppy or kitten under 8 weeks. Make sure the microchip is transferred to your name.',
        es: 'Nunca un cachorro o gatito menor de 8 semanas. Asegúrate de que el microchip pase a tu nombre.',
        fr: 'Jamais de chiot ou chaton de moins de 8 semaines. Vérifiez que la puce est transférée à votre nom.',
        zh: '切勿领养未满8周龄的幼犬幼猫。确保芯片已转到你的名下。',
      } },
    ],
    giver: [
      { text: {
        el: 'Ιδιώτες μπορούν να δώσουν ενήλικο ζώο τους. Στη GlobiPet οι ιδιώτες δεν χρεώνουν τίποτα. Ζώο κάτω των 6 μηνών μόνο αν το γέννησε δικό σου ζώο.',
        en: 'Private persons may rehome their adult pet. On GlobiPet private persons charge nothing. Animals under 6 months only if your own pet gave birth to them.',
        es: 'Los particulares pueden reubicar a su mascota adulta. En GlobiPet los particulares no cobran nada. Menores de 6 meses, solo si los parió tu propia mascota.',
        fr: 'Les particuliers peuvent replacer leur animal adulte. Sur GlobiPet, ils ne demandent rien. Moins de 6 mois : uniquement s’il est né de votre propre animal.',
        zh: '个人可为自己的成年宠物找新家。在GlobiPet上个人不得收费。6个月以下的动物仅限你自己的宠物所生。',
      } },
      { text: {
        el: 'Στη Σκωτία, τα κέντρα και η επανένταξη ζώων ως δραστηριότητα απαιτούν άδεια (Licensing … (Scotland) Regulations 2021).',
        en: 'In Scotland, rehoming centres and rehoming activities need a licence (Licensing … (Scotland) Regulations 2021).',
        es: 'En Escocia, los centros y las actividades de reubicación requieren licencia (Licensing … (Scotland) Regulations 2021).',
        fr: 'En Écosse, les centres et activités de relogement nécessitent une licence (Licensing … (Scotland) Regulations 2021).',
        zh: '在苏格兰，安置中心及安置活动须持牌（《2021年涉及动物活动许可（苏格兰）条例》）。',
      } },
    ],
    after: [
      { text: {
        el: 'Ενημέρωσε τη βάση του μικροτσίπ με τα στοιχεία σου. Ο σκύλος σε δημόσιο χώρο φορά ταυτότητα με όνομα και διεύθυνση (Control of Dogs Order 1992).',
        en: 'Update the microchip database with your details. In public, a dog must wear a tag with your name and address (Control of Dogs Order 1992).',
        es: 'Actualiza la base del microchip con tus datos. En la vía pública, el perro debe llevar una placa con nombre y dirección (Control of Dogs Order 1992).',
        fr: 'Mettez à jour la base de la puce. En public, le chien doit porter une médaille avec nom et adresse (Control of Dogs Order 1992).',
        zh: '在芯片数据库更新你的信息。犬只在公共场所须佩戴写有主人姓名和地址的名牌（《1992年犬只管理令》）。',
      } },
    ],
    links: [
      { label: { el: 'GOV.UK — Get your pet safely', en: 'GOV.UK — Get your pet safely', es: 'GOV.UK — Get your pet safely', fr: 'GOV.UK — Get your pet safely', zh: 'GOV.UK — 安全获得宠物' }, url: 'https://getyourpetsafely.campaign.gov.uk/' },
      { label: { el: 'GOV.UK — XL Bully', en: 'GOV.UK — XL Bully ban', es: 'GOV.UK — XL Bully', fr: 'GOV.UK — XL Bully', zh: 'GOV.UK — XL Bully 禁令' }, url: 'https://www.gov.uk/guidance/ban-on-xl-bully-dogs' },
    ],
  },

  // ─────────────────────────────────────────────────────────── ΓΑΛΛΙΑ
  FR: {
    name: { el: 'Γαλλία', en: 'France', es: 'Francia', fr: 'France', zh: '法国' },
    laws: [
      { ref: 'Code rural L214-8, L212-10', text: {
        el: 'Κάθε παραχώρηση (πώληση ή δωρεάν) σκύλου ή γάτας απαιτεί προηγούμενη σήμανση και καταχώριση στο I-CAD, βεβαίωση παραχώρησης και κτηνιατρικό πιστοποιητικό μικρότερο των 3 μηνών.',
        en: 'Every transfer (sale or free) of a dog or cat requires prior identification and I-CAD registration, a transfer certificate and a vet certificate less than 3 months old.',
        es: 'Toda cesión (venta o gratuita) de perro o gato exige identificación previa y registro en I-CAD, certificado de cesión y certificado veterinario de menos de 3 meses.',
        fr: 'Toute cession (vente ou don) d’un chien ou d’un chat exige identification préalable et enregistrement I-CAD, attestation de cession et certificat vétérinaire de moins de 3 mois.',
        zh: '每次转让（出售或免费）犬猫前须完成标识并在I-CAD登记，提供转让证明和三个月内的兽医证明。',
      } },
      { ref: 'Loi 2021-1539 · Décret 2022-1354', text: {
        el: 'Ο νέος κηδεμόνας υπογράφει «certificat d’engagement et de connaissance». Η παράδοση γίνεται τουλάχιστον 7 ημέρες μετά. Από 1/1/2024 απαγορεύεται η πώληση σκύλων και γατών σε pet shops.',
        en: 'The new keeper signs a “certificat d’engagement et de connaissance”. Hand-over may only happen at least 7 days later. Since 1/1/2024 pet shops may not sell dogs and cats.',
        es: 'El nuevo dueño firma un «certificat d’engagement et de connaissance». La entrega solo puede hacerse 7 días después como mínimo. Desde el 1/1/2024 las tiendas no pueden vender perros ni gatos.',
        fr: 'Le nouveau détenteur signe un certificat d’engagement et de connaissance. La cession ne peut intervenir qu’au moins 7 jours après. Depuis le 1/1/2024, les animaleries ne vendent plus de chiens ni de chats.',
        zh: '新主人须签署“承诺与知情证明”（CEC），至少7天后才能交付。自2024年1月1日起宠物店禁止出售犬猫。',
      } },
      EU_REG,
    ],
    adopter: [
      { text: {
        el: 'Υπογράφεις το certificat d’engagement και περιμένεις 7 ημέρες. Ανήλικος μόνο με συναίνεση γονέων.',
        en: 'You sign the certificat d’engagement and wait 7 days. Minors only with parental consent.',
        es: 'Firmas el certificat d’engagement y esperas 7 días. Menores solo con consentimiento de los padres.',
        fr: 'Vous signez le certificat d’engagement et attendez 7 jours. Mineurs : uniquement avec l’accord des parents.',
        zh: '签署承诺证明后等待7天。未成年人须经父母同意。',
      } },
      { text: {
        el: 'Παραλαμβάνεις βεβαίωση παραχώρησης, κτηνιατρικό πιστοποιητικό και μεταβίβαση της σήμανσης στο I-CAD.',
        en: 'You receive the transfer certificate, the vet certificate and the transfer of identification in I-CAD.',
        es: 'Recibes el certificado de cesión, el certificado veterinario y la transmisión de la identificación en I-CAD.',
        fr: 'Vous recevez l’attestation de cession, le certificat vétérinaire et le transfert de l’identification dans I-CAD.',
        zh: '你将收到转让证明、兽医证明以及I-CAD中的身份转移。',
      } },
    ],
    giver: [
      { text: {
        el: 'Ιδιώτες στο διαδίκτυο: μόνο δωρεάν. Η αγγελία αναφέρει ηλικία, αριθμό σήμανσης και ότι είναι δωρεάν — η GlobiPet τα εμφανίζει αυτόματα.',
        en: 'Private persons online: free only. The advert shows age, identification number and that it is free — GlobiPet displays these automatically.',
        es: 'Particulares en internet: solo gratis. El anuncio indica edad, número de identificación y gratuidad — GlobiPet lo muestra automáticamente.',
        fr: 'Particuliers en ligne : uniquement à titre gratuit. L’annonce indique l’âge, le numéro d’identification et la gratuité — GlobiPet les affiche automatiquement.',
        zh: '个人网上转让只能免费。广告须注明年龄、标识号码及免费性质——GlobiPet会自动显示。',
      } },
      { text: {
        el: 'Παραχώρηση ή κατοχή ασήμαντου σκύλου/γάτας τιμωρείται με πρόστιμο έως 750 €. Ο παραχωρών ελέγχει ότι πέρασαν 7 ημέρες από το certificat.',
        en: 'Transferring or keeping an unidentified dog/cat is fined up to €750. The person giving the animal checks that 7 days have passed since the certificat.',
        es: 'Ceder o tener un perro/gato sin identificar se multa con hasta 750 €. Quien cede comprueba que han pasado 7 días desde el certificat.',
        fr: 'Céder ou détenir un chien/chat non identifié : amende jusqu’à 750 €. Le cédant vérifie que 7 jours se sont écoulés depuis le certificat.',
        zh: '转让或饲养未标识的犬猫最高罚款750欧元。转让方须核实签署证明已满7天。',
      } },
    ],
    after: [
      { text: {
        el: 'Βεβαιώσου ότι η αλλαγή κατόχου καταχωρίστηκε στο I-CAD και κλείσε ραντεβού σε κτηνίατρο.',
        en: 'Make sure the change of keeper is recorded in I-CAD and book a vet appointment.',
        es: 'Comprueba que el cambio de titular consta en I-CAD y pide cita veterinaria.',
        fr: 'Vérifiez que le changement de détenteur est enregistré dans I-CAD et prenez rendez-vous chez le vétérinaire.',
        zh: '确认I-CAD已登记饲养人变更，并预约兽医。',
      } },
    ],
    links: [
      { label: { el: 'Service-Public — Σκύλος ή γάτα', en: 'Service-Public — Dogs and cats', es: 'Service-Public — Perros y gatos', fr: 'Service-Public — Avoir un chien ou un chat', zh: 'Service-Public — 养犬养猫规定' }, url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F34877' },
      { label: { el: 'I-CAD', en: 'I-CAD', es: 'I-CAD', fr: 'I-CAD', zh: 'I-CAD' }, url: 'https://www.i-cad.fr' },
    ],
  },

  // ─────────────────────────────────────────────────────────── ΚΙΝΑ
  CN: {
    name: { el: 'Κίνα', en: 'China', es: 'China', fr: 'Chine', zh: '中国' },
    laws: [
      { ref: '《动物防疫法》(2021)', text: {
        el: 'Νόμος για την πρόληψη επιζωοτιών: οι σκύλοι εμβολιάζονται κατά της λύσσας, καταχωρίζονται κατά τους τοπικούς κανόνες και κυκλοφορούν με λουρί και ταυτότητα. Η διαχείριση σκύλων ανήκει στις τοπικές αρχές.',
        en: 'Animal Epidemic Prevention Law: dogs must be vaccinated against rabies, registered under local rules, and walked on a leash with an ID tag. Dog management is a local-government responsibility.',
        es: 'Ley de prevención de epizootias: los perros se vacunan contra la rabia, se registran según la normativa local y salen con correa y placa. La gestión canina corresponde a los gobiernos locales.',
        fr: 'Loi sur la prévention des épizooties : chiens vaccinés contre la rage, enregistrés selon les règles locales, tenus en laisse avec médaille. La gestion des chiens relève des autorités locales.',
        zh: '《动物防疫法》规定：犬只须接种狂犬病疫苗，按当地规定登记，出户须拴绳并佩戴犬牌。养犬管理由地方政府负责。',
      } },
      { ref: '养犬管理条例', text: {
        el: 'Κάθε πόλη έχει δικό της κανονισμό (π.χ. Πεκίνο, Σαγκάη, Τσονγκτσίνγκ, Τσενγκτού): ζώνες αυστηρής διαχείρισης, όριο σκύλων ανά νοικοκυριό, κατάλογοι απαγορευμένων φυλών, καταχώριση και υιοθεσία από χώρους φιλοξενίας.',
        en: 'Each city has its own regulation (e.g. Beijing, Shanghai, Chongqing, Chengdu): strict management zones, per-household dog limits, banned breed lists, registration, and adoption from holding centres.',
        es: 'Cada ciudad tiene su reglamento (p. ej. Pekín, Shanghái, Chongqing, Chengdu): zonas de gestión estricta, límite de perros por hogar, listas de razas prohibidas, registro y adopción desde centros de acogida.',
        fr: 'Chaque ville a son règlement (ex. Pékin, Shanghai, Chongqing, Chengdu) : zones de gestion stricte, nombre de chiens par foyer, listes de races interdites, enregistrement et adoption depuis les fourrières.',
        zh: '各城市有各自的养犬管理条例（如北京、上海、重庆、成都）：重点管理区、每户限养数量、禁养犬种目录、登记及从收容场所领养等规定。',
      } },
      { ref: '《民法典》第1245–1251条', text: {
        el: 'Αστικός Κώδικας: ευθύνη για ζημιά από ζώο· για εγκαταλελειμμένο ζώο ευθύνεται ο αρχικός ιδιοκτήτης.',
        en: 'Civil Code: liability for harm caused by animals; for an abandoned animal the original owner remains liable.',
        es: 'Código Civil: responsabilidad por daños causados por animales; por un animal abandonado responde el dueño original.',
        fr: 'Code civil : responsabilité pour les dommages causés par un animal ; pour un animal abandonné, l’ancien propriétaire reste responsable.',
        zh: '《民法典》：饲养动物致人损害的责任；遗弃、逃逸的动物致害，由原饲养人或管理人承担责任。',
      } },
    ],
    adopter: [
      { text: {
        el: 'Έλεγξε τον κανονισμό της πόλης σου: αν είσαι σε ζώνη αυστηρής διαχείρισης, πόσοι σκύλοι επιτρέπονται και αν η φυλή ή το μέγεθος απαγορεύεται.',
        en: 'Check your city’s regulation: whether you live in a strict management zone, how many dogs are allowed and whether the breed or size is banned.',
        es: 'Revisa el reglamento de tu ciudad: si vives en zona de gestión estricta, cuántos perros se permiten y si la raza o el tamaño están prohibidos.',
        fr: 'Vérifiez le règlement de votre ville : zone de gestion stricte, nombre de chiens autorisés, race ou taille interdite.',
        zh: '查看所在城市的条例：是否位于重点管理区、限养几只、该犬种或体型是否禁养。',
      } },
      { text: {
        el: 'Ο σκύλος χρειάζεται πιστοποιητικό αντιλυσσικού εμβολίου και καταχώριση εντός της προθεσμίας της πόλης (π.χ. αστυνομία ή γραφείο διαχείρισης σκύλων).',
        en: 'A dog needs a rabies vaccination certificate and registration within your city’s deadline (e.g. police station or dog management office).',
        es: 'El perro necesita certificado de vacuna antirrábica y registro dentro del plazo de tu ciudad (p. ej. comisaría u oficina canina).',
        fr: 'Le chien doit avoir un certificat de vaccination antirabique et être enregistré dans le délai fixé par la ville (commissariat, bureau de gestion canine).',
        zh: '犬只须持有狂犬病免疫证明，并在当地规定期限内办理养犬登记（如公安机关或犬只管理部门）。',
      } },
    ],
    giver: [
      { text: {
        el: 'Ο σκύλος πρέπει να είναι εμβολιασμένος κατά της λύσσας πριν την παράδοση· η GlobiPet το ζητά για αγγελίες σκύλων. Ιδιώτες: μόνο δωρεάν.',
        en: 'A dog must be vaccinated against rabies before hand-over; GlobiPet requires it for dog listings. Private persons: free only.',
        es: 'El perro debe estar vacunado contra la rabia antes de la entrega; GlobiPet lo exige en anuncios de perros. Particulares: solo gratis.',
        fr: 'Le chien doit être vacciné contre la rage avant la remise ; GlobiPet l’exige pour les annonces de chiens. Particuliers : gratuit uniquement.',
        zh: '犬只交付前须已接种狂犬病疫苗；GlobiPet要求犬只信息必须满足此条件。个人：只能免费。',
      } },
      { text: {
        el: 'Μην εγκαταλείπεις ποτέ ζώο: οι τοπικοί κανονισμοί το απαγορεύουν και ο Αστικός Κώδικας σε κρατά υπεύθυνο.',
        en: 'Never abandon an animal: local regulations prohibit it and the Civil Code keeps you liable.',
        es: 'Nunca abandones un animal: los reglamentos locales lo prohíben y el Código Civil te mantiene responsable.',
        fr: 'N’abandonnez jamais un animal : les règlements locaux l’interdisent et le Code civil vous tient responsable.',
        zh: '切勿遗弃动物：地方条例明令禁止，且依《民法典》你仍须承担责任。',
      } },
    ],
    after: [
      { text: {
        el: 'Κάνε (ή μετέφερε) την καταχώριση του σκύλου στο όνομά σου και ετήσιο αντιλυσσικό εμβόλιο.',
        en: 'Register (or transfer) the dog’s registration to your name and vaccinate against rabies every year.',
        es: 'Registra (o transfiere) el perro a tu nombre y vacúnalo contra la rabia cada año.',
        fr: 'Enregistrez (ou transférez) le chien à votre nom et faites le rappel antirabique chaque année.',
        zh: '以你的名义办理（或变更）养犬登记，每年接种狂犬病疫苗。',
      } },
    ],
    links: [
      { label: { el: 'Εθνική βάση νομοθεσίας ΛΔΚ', en: 'PRC national law database', es: 'Base nacional de leyes de la RPC', fr: 'Base nationale des lois de la RPC', zh: '国家法律法规数据库' }, url: 'https://flk.npc.gov.cn' },
    ],
  },

  // ─────────────────────────────────────────────────────────── ΑΛΛΗ ΧΩΡΑ
  OTHER: {
    name: { el: 'Άλλη χώρα', en: 'Other country', es: 'Otro país', fr: 'Autre pays', zh: '其他国家' },
    laws: [EU_REG],
    adopter: [
      { text: {
        el: 'Οι κανόνες διαφέρουν ανά χώρα. Ρώτησε τον AI βοηθό ή έναν κτηνίατρο για όσα ισχύουν στη δική σου.',
        en: 'Rules differ by country. Ask the AI assistant or a vet what applies where you live.',
        es: 'Las normas varían según el país. Pregunta al asistente de IA o a un veterinario qué se aplica donde vives.',
        fr: 'Les règles varient selon le pays. Demandez à l’assistant IA ou à un vétérinaire ce qui s’applique chez vous.',
        zh: '各国规定不同。请咨询AI助手或兽医了解你所在地的要求。',
      } },
    ],
    giver: [
      { text: {
        el: 'Στη GlobiPet οι ιδιώτες δίνουν ζώα μόνο δωρεάν, από 8 εβδομάδων και πάνω.',
        en: 'On GlobiPet private persons only give animals away free of charge, from 8 weeks of age.',
        es: 'En GlobiPet los particulares solo ceden animales gratis y a partir de 8 semanas.',
        fr: 'Sur GlobiPet, les particuliers ne cèdent des animaux que gratuitement, à partir de 8 semaines.',
        zh: '在GlobiPet上，个人只能免费转让8周龄以上的动物。',
      } },
    ],
    after: [
      { text: {
        el: 'Ενημέρωσε το μητρώο σήμανσης με τα στοιχεία σου και επισκέψου κτηνίατρο.',
        en: 'Update the identification registry with your details and visit a vet.',
        es: 'Actualiza el registro de identificación con tus datos y visita al veterinario.',
        fr: 'Mettez à jour le registre d’identification et consultez un vétérinaire.',
        zh: '在标识登记系统更新你的信息并带它看兽医。',
      } },
    ],
    links: [],
  },
}

/** Ο οδηγός μιας χώρας στη γλώσσα του αιτήματος — το σχήμα που στέλνει το API. */
export function guideFor(country: string, lang: Lang) {
  const key = (GUIDE_COUNTRIES as readonly string[]).includes(country) ? country as GuideCountry : 'OTHER'
  const g = GUIDES[key]
  const items = (xs: GuideItem[]) => xs.map(i => ({ ref: i.ref ?? null, text: pick(i.text, lang) }))
  return {
    country: key,
    name: pick(g.name, lang),
    laws: items(g.laws),
    adopter: items(g.adopter),
    giver: items(g.giver),
    after: items(g.after),
    links: g.links.map(l => ({ label: pick(l.label, lang), url: l.url })),
    updated_at: GUIDE_UPDATED,
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Επιβεβαιώσεις ολοκλήρωσης (ο καταχωρίζων τις τσεκάρει πριν «Ολοκλήρωση»)
// ═══════════════════════════════════════════════════════════════════════
export type AckKey = 'contract_signed' | 'registry_updated' | 'health_docs' | 'costs_only' | 'cec_7_days' | 'rabies_certificate'

const REGISTRY: Record<GuideCountry, L> = {
  GR: { el: 'το ΕΜΖΣ (pet.gov.gr)', en: 'the EMZS registry (pet.gov.gr)', es: 'el registro EMZS (pet.gov.gr)', fr: 'le registre EMZS (pet.gov.gr)', zh: 'EMZS登记系统（pet.gov.gr）' },
  ES: { el: 'το μητρώο ζώων της αυτόνομης κοινότητας', en: 'the regional animal registry', es: 'el registro autonómico de animales', fr: 'le registre régional des animaux', zh: '自治区动物登记' },
  GB: { el: 'τη βάση δεδομένων του μικροτσίπ', en: 'the microchip database', es: 'la base de datos del microchip', fr: 'la base de données de la puce', zh: '芯片数据库' },
  FR: { el: 'το I-CAD', en: 'I-CAD', es: 'I-CAD', fr: 'l’I-CAD', zh: 'I-CAD' },
  CN: { el: 'την καταχώριση σκύλου της πόλης', en: 'the city dog registration', es: 'el registro canino municipal', fr: 'l’enregistrement canin de la ville', zh: '当地养犬登记' },
  OTHER: { el: 'το μητρώο σήμανσης', en: 'the identification registry', es: 'el registro de identificación', fr: 'le registre d’identification', zh: '标识登记系统' },
}

export function ackLabel(key: AckKey, country: string, lang: Lang): string {
  const c = ((GUIDE_COUNTRIES as readonly string[]).includes(country) ? country : 'OTHER') as GuideCountry
  const reg = pick(REGISTRY[c], lang)
  const rows: Record<AckKey, L> = {
    contract_signed: {
      el: 'Υπογράφηκε έγγραφο συμφωνητικό υιοθεσίας/παραχώρησης και από τις δύο πλευρές',
      en: 'A written adoption/transfer agreement has been signed by both parties',
      es: 'Ambas partes han firmado un contrato escrito de adopción/cesión',
      fr: 'Un contrat écrit d’adoption/de cession a été signé par les deux parties',
      zh: '双方已签署书面领养/转让协议',
    },
    registry_updated: {
      el: `Η αλλαγή κατόχου καταχωρίστηκε (ή θα καταχωριστεί άμεσα) στο ${reg}`,
      en: `The change of keeper has been (or will promptly be) recorded in ${reg}`,
      es: `El cambio de titular se ha registrado (o se registrará enseguida) en ${reg}`,
      fr: `Le changement de détenteur a été (ou sera rapidement) enregistré dans ${reg}`,
      zh: `饲养人变更已（或将立即）在${reg}登记`,
    },
    health_docs: {
      el: c === 'FR' ? 'Παραδόθηκαν βεβαίωση παραχώρησης και κτηνιατρικό πιστοποιητικό (< 3 μηνών)' : 'Παραδόθηκαν βιβλιάριο υγείας/διαβατήριο και ιστορικό εμβολίων',
      en: c === 'FR' ? 'The transfer certificate and a vet certificate (< 3 months) were handed over' : 'The health booklet/passport and vaccination history were handed over',
      es: c === 'FR' ? 'Se entregaron el certificado de cesión y un certificado veterinario (< 3 meses)' : 'Se entregaron la cartilla/pasaporte y el historial de vacunas',
      fr: c === 'FR' ? 'L’attestation de cession et un certificat vétérinaire (< 3 mois) ont été remis' : 'Le carnet de santé/passeport et l’historique vaccinal ont été remis',
      zh: c === 'FR' ? '已交付转让证明和三个月内的兽医证明' : '已交付健康手册/护照及疫苗记录',
    },
    costs_only: {
      el: 'Δεν καταβλήθηκε αντίτιμο — μόνο αποδεδειγμένα έξοδα μεταφοράς, σίτισης, κτηνιάτρου (Ν. 4830/2021 άρθ. 7)',
      en: 'No price was paid — only documented transport, feeding and vet costs (Law 4830/2021 art. 7)',
      es: 'No se pagó precio alguno — solo gastos acreditados de transporte, alimentación y veterinario (Ley 4830/2021 art. 7)',
      fr: 'Aucun prix payé — seulement des frais justifiés de transport, nourriture et vétérinaire (loi 4830/2021 art. 7)',
      zh: '未支付对价——仅限有凭证的运输、饲养和兽医费用（第4830/2021号法律第7条）',
    },
    cec_7_days: {
      el: 'Ο νέος κηδεμόνας υπέγραψε certificat d’engagement et de connaissance πριν από τουλάχιστον 7 ημέρες',
      en: 'The new keeper signed the certificat d’engagement et de connaissance at least 7 days ago',
      es: 'El nuevo dueño firmó el certificat d’engagement et de connaissance hace al menos 7 días',
      fr: 'Le nouveau détenteur a signé le certificat d’engagement et de connaissance il y a au moins 7 jours',
      zh: '新主人至少在7天前已签署承诺与知情证明（CEC）',
    },
    rabies_certificate: {
      el: 'Παραδόθηκε πιστοποιητικό αντιλυσσικού εμβολίου του σκύλου',
      en: 'The dog’s rabies vaccination certificate was handed over',
      es: 'Se entregó el certificado de vacunación antirrábica del perro',
      fr: 'Le certificat de vaccination antirabique du chien a été remis',
      zh: '已交付犬只狂犬病免疫证明',
    },
  }
  return pick(rows[key], lang)
}

// ═══════════════════════════════════════════════════════════════════════
//  Συμφωνητικό υιοθεσίας — υπόδειγμα με τα στοιχεία της αίτησης
// ═══════════════════════════════════════════════════════════════════════
type ContractInput = {
  country: string
  listerName: string
  listerType: 'organisation' | 'individual'
  adopterName: string
  animal: { name: string; species: string; breed: string | null; sex: string; birth: string; microchip: string | null; color: string | null; sterilized: boolean }
  fee: number
  currency: string
  feeBreakdown: string | null
  dateIso: string
}

const SPECIES: Record<string, L> = {
  dog: { el: 'Σκύλος', en: 'Dog', es: 'Perro', fr: 'Chien', zh: '犬' },
  cat: { el: 'Γάτα', en: 'Cat', es: 'Gato', fr: 'Chat', zh: '猫' },
  rabbit: { el: 'Κουνέλι', en: 'Rabbit', es: 'Conejo', fr: 'Lapin', zh: '兔' },
  ferret: { el: 'Κουνάβι', en: 'Ferret', es: 'Hurón', fr: 'Furet', zh: '雪貂' },
  bird: { el: 'Πτηνό', en: 'Bird', es: 'Ave', fr: 'Oiseau', zh: '鸟' },
  rodent: { el: 'Τρωκτικό', en: 'Rodent', es: 'Roedor', fr: 'Rongeur', zh: '啮齿动物' },
  reptile: { el: 'Ερπετό', en: 'Reptile', es: 'Reptil', fr: 'Reptile', zh: '爬行动物' },
  other: { el: 'Άλλο', en: 'Other', es: 'Otro', fr: 'Autre', zh: '其他' },
}
const SEX: Record<string, L> = {
  male: { el: 'Αρσενικό', en: 'Male', es: 'Macho', fr: 'Mâle', zh: '雄性' },
  female: { el: 'Θηλυκό', en: 'Female', es: 'Hembra', fr: 'Femelle', zh: '雌性' },
  unknown: { el: 'Άγνωστο', en: 'Unknown', es: 'Desconocido', fr: 'Inconnu', zh: '未知' },
}

export function buildContract(input: ContractInput, lang: Lang) {
  const c = ((GUIDE_COUNTRIES as readonly string[]).includes(input.country) ? input.country : 'OTHER') as GuideCountry
  const a = input.animal
  const yes: L = { el: 'Ναι', en: 'Yes', es: 'Sí', fr: 'Oui', zh: '是' }
  const no: L = { el: 'Όχι', en: 'No', es: 'No', fr: 'Non', zh: '否' }
  const dash = '—'
  const T = (row: L) => pick(row, lang)

  const title = T({
    el: input.listerType === 'organisation' ? 'Συμφωνητικό υιοθεσίας ζώου συντροφιάς' : 'Συμφωνητικό δωρεάν παραχώρησης ζώου συντροφιάς',
    en: input.listerType === 'organisation' ? 'Companion animal adoption agreement' : 'Companion animal free transfer agreement',
    es: input.listerType === 'organisation' ? 'Contrato de adopción de animal de compañía' : 'Contrato de cesión gratuita de animal de compañía',
    fr: input.listerType === 'organisation' ? 'Contrat d’adoption d’un animal de compagnie' : 'Contrat de cession gratuite d’un animal de compagnie',
    zh: input.listerType === 'organisation' ? '伴侣动物领养协议' : '伴侣动物免费转让协议',
  })

  const legalRef: Record<GuideCountry, string> = {
    GR: 'Ν. 4830/2021 (άρθ. 7)',
    ES: 'Ley 7/2023',
    GB: 'Animal Welfare Act 2006 · Microchipping of Cats and Dogs (England) Regulations 2023',
    FR: 'Code rural L214-8 · Loi 2021-1539',
    CN: '《动物防疫法》· 当地养犬管理条例',
    OTHER: '—',
  }

  const feeText = input.fee > 0
    ? `${input.fee.toFixed(2)} ${input.currency}${input.feeBreakdown ? ` (${input.feeBreakdown})` : ''}`
    : T({ el: 'Χωρίς αντάλλαγμα', en: 'Free of charge', es: 'Gratuita', fr: 'À titre gratuit', zh: '无偿' })

  const sections = [
    {
      heading: T({ el: '1. Συμβαλλόμενοι', en: '1. Parties', es: '1. Partes', fr: '1. Parties', zh: '1. 协议双方' }),
      body: [
        `${T({ el: 'Παραχωρών', en: 'Transferor', es: 'Cedente', fr: 'Cédant', zh: '转让方' })}: ${input.listerName}`,
        `${T({ el: 'Νέος κηδεμόνας', en: 'New keeper', es: 'Adoptante', fr: 'Adoptant', zh: '领养方' })}: ${input.adopterName}`,
      ],
    },
    {
      heading: T({ el: '2. Το ζώο', en: '2. The animal', es: '2. El animal', fr: '2. L’animal', zh: '2. 动物信息' }),
      body: [
        `${T({ el: 'Όνομα', en: 'Name', es: 'Nombre', fr: 'Nom', zh: '名字' })}: ${a.name}`,
        `${T({ el: 'Είδος', en: 'Species', es: 'Especie', fr: 'Espèce', zh: '种类' })}: ${T(SPECIES[a.species] ?? SPECIES.other)}${a.breed ? ` · ${a.breed}` : ''}`,
        `${T({ el: 'Φύλο', en: 'Sex', es: 'Sexo', fr: 'Sexe', zh: '性别' })}: ${T(SEX[a.sex] ?? SEX.unknown)}`,
        `${T({ el: 'Εκτιμώμενη γέννηση', en: 'Estimated birth', es: 'Nacimiento estimado', fr: 'Naissance estimée', zh: '估计出生日期' })}: ${a.birth}`,
        `${T({ el: 'Μικροτσίπ', en: 'Microchip', es: 'Microchip', fr: 'Puce', zh: '芯片号' })}: ${a.microchip || dash}`,
        `${T({ el: 'Χρώμα', en: 'Colour', es: 'Color', fr: 'Couleur', zh: '毛色' })}: ${a.color || dash}`,
        `${T({ el: 'Στειρωμένο', en: 'Neutered', es: 'Esterilizado', fr: 'Stérilisé', zh: '已绝育' })}: ${T(a.sterilized ? yes : no)}`,
      ],
    },
    {
      heading: T({ el: '3. Οικονομικοί όροι', en: '3. Financial terms', es: '3. Condiciones económicas', fr: '3. Conditions financières', zh: '3. 费用条款' }),
      body: [
        feeText,
        T({
          el: 'Η GlobiPet δεν μεσολαβεί σε πληρωμή και δεν εισπράττει τίποτα από την υιοθεσία.',
          en: 'GlobiPet does not handle any payment and receives nothing from the adoption.',
          es: 'GlobiPet no gestiona ningún pago ni recibe nada por la adopción.',
          fr: 'GlobiPet ne gère aucun paiement et ne perçoit rien sur l’adoption.',
          zh: 'GlobiPet不经手任何款项，也不从领养中收取任何费用。',
        }),
      ],
    },
    {
      heading: T({ el: '4. Υποχρεώσεις του νέου κηδεμόνα', en: '4. Obligations of the new keeper', es: '4. Obligaciones del adoptante', fr: '4. Obligations de l’adoptant', zh: '4. 领养方义务' }),
      body: [
        T({ el: 'Να παρέχει τροφή, νερό, στέγη, κτηνιατρική φροντίδα και άσκηση σύμφωνα με τις ανάγκες του ζώου.', en: 'To provide food, water, shelter, veterinary care and exercise suited to the animal’s needs.', es: 'Proporcionar alimento, agua, refugio, atención veterinaria y ejercicio según sus necesidades.', fr: 'Fournir nourriture, eau, abri, soins vétérinaires et exercice adaptés aux besoins de l’animal.', zh: '根据动物需要提供食物、饮水、住所、兽医护理和运动。' }),
        T({ el: `Να καταχωρίσει την αλλαγή κατόχου στο ${pick(REGISTRY[c], 'el')} χωρίς καθυστέρηση.`, en: `To record the change of keeper in ${pick(REGISTRY[c], 'en')} without delay.`, es: `Registrar sin demora el cambio de titular en ${pick(REGISTRY[c], 'es')}.`, fr: `Enregistrer sans délai le changement de détenteur dans ${pick(REGISTRY[c], 'fr')}.`, zh: `及时在${pick(REGISTRY[c], 'zh')}办理饲养人变更。` }),
        ...(a.sterilized ? [] : [T({ el: 'Να στειρώσει το ζώο όταν το επιτρέψει η ηλικία και η υγεία του, όπου το προβλέπει ο νόμος.', en: 'To have the animal neutered once age and health allow, where the law requires.', es: 'Esterilizar al animal cuando su edad y salud lo permitan, si la ley lo exige.', fr: 'Faire stériliser l’animal dès que son âge et sa santé le permettent, lorsque la loi l’exige.', zh: '在年龄和健康状况允许且法律要求时为动物绝育。' })]),
        T({ el: 'Να μην πωλήσει, εγκαταλείψει ή δώσει το ζώο για αναπαραγωγή. Αν δεν μπορεί πια να το κρατήσει, να ενημερώσει πρώτα τον παραχωρούντα.', en: 'Not to sell, abandon or use the animal for breeding. If they can no longer keep it, to inform the transferor first.', es: 'No vender, abandonar ni destinar el animal a la cría. Si no puede quedárselo, avisar primero al cedente.', fr: 'Ne pas vendre, abandonner ni faire reproduire l’animal. S’il ne peut plus le garder, prévenir d’abord le cédant.', zh: '不得出售、遗弃或用于繁殖。若无法继续饲养，应先通知转让方。' }),
      ],
    },
    {
      heading: T({ el: '5. Νομικό πλαίσιο', en: '5. Legal framework', es: '5. Marco legal', fr: '5. Cadre légal', zh: '5. 法律依据' }),
      body: [legalRef[c], T({ el: 'Υπόδειγμα της GlobiPet — δεν αποτελεί νομική συμβουλή· προσαρμόστε το όπου χρειάζεται.', en: 'GlobiPet template — not legal advice; adapt it where needed.', es: 'Plantilla de GlobiPet — no es asesoramiento jurídico; adáptela si es necesario.', fr: 'Modèle GlobiPet — ne constitue pas un conseil juridique ; adaptez-le si besoin.', zh: 'GlobiPet范本——不构成法律意见，请按需调整。' })],
    },
  ]

  const signatures = [
    T({ el: 'Ο παραχωρών', en: 'Transferor', es: 'El cedente', fr: 'Le cédant', zh: '转让方' }),
    T({ el: 'Ο νέος κηδεμόνας', en: 'New keeper', es: 'El adoptante', fr: 'L’adoptant', zh: '领养方' }),
  ]

  return {
    title,
    place_date_label: T({ el: 'Τόπος / Ημερομηνία', en: 'Place / Date', es: 'Lugar / Fecha', fr: 'Lieu / Date', zh: '地点 / 日期' }),
    date: input.dateIso,
    sections,
    signatures,
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Γνωσιακή βάση για τον AI βοηθό (αγγλικά — το μοντέλο απαντά στη γλώσσα του χρήστη)
// ═══════════════════════════════════════════════════════════════════════
export function aiKnowledge(): string {
  const out: string[] = []
  for (const code of [...GUIDE_COUNTRIES, 'OTHER'] as GuideCountry[]) {
    const g = GUIDES[code]
    const line = (i: GuideItem) => `- ${i.ref ? `[${i.ref}] ` : ''}${i.text.en}`
    out.push(`### ${code} — ${g.name.en}`)
    out.push('Laws:', ...g.laws.map(line))
    out.push('Adopters:', ...g.adopter.map(line))
    out.push('People giving an animal / organisations:', ...g.giver.map(line))
    out.push('After adoption:', ...g.after.map(line))
    if (g.links.length) out.push('Official links:', ...g.links.map(l => `- ${l.label.en}: ${l.url}`))
    out.push('')
  }
  return out.join('\n')
}
