/**
 * Μετάφραση μηνυμάτων API στη γλώσσα του χρήστη.
 *
 * ΓΙΑΤΙ ΚΕΝΤΡΙΚΑ ΚΑΙ ΟΧΙ ΣΕ ΚΑΘΕ ROUTE
 *   Τα μηνύματα σφάλματος εμφανίζονται σε 419 σημεία, σε 30 αρχεία. Αν η
 *   μετάφραση γινόταν στο καθένα, κάθε νέο endpoint θα ξεκινούσε ξανά
 *   ελληνικό και κανείς δεν θα το πρόσεχε. Εδώ η μετάφραση γίνεται στην
 *   ΕΞΟΔΟ, οπότε καλύπτει και ό,τι γραφτεί αύριο.
 *
 * ΠΩΣ ΔΟΥΛΕΥΕΙ
 *   Ένα hook onSend κοιτάζει το σώμα της απάντησης. Αν έχει πεδίο
 *   `message` ή `error` που ταιριάζει σε γνωστό ελληνικό κείμενο, το
 *   αντικαθιστά με τη μετάφραση για τη γλώσσα του αιτήματος.
 *
 * ΠΟΙΑ ΓΛΩΣΣΑ
 *   1. Το preferred_language του συνδεδεμένου χρήστη, αν υπάρχει στο JWT.
 *   2. Αλλιώς η κεφαλίδα Accept-Language.
 *   3. Αλλιώς ελληνικά.
 *
 * ΑΡΧΗ
 *   Ποτέ κενό. Άγνωστο μήνυμα επιστρέφεται αυτούσιο στα ελληνικά — ποτέ
 *   δεν εξαφανίζεται και ποτέ δεν γίνεται κλειδί στην οθόνη του χρήστη.
 */
import type { FastifyInstance } from 'fastify'

type Lang = 'el' | 'en' | 'es' | 'fr' | 'zh'
const LANGS: Lang[] = ['el', 'en', 'es', 'fr', 'zh']

/** Ελληνικό πρωτότυπο -> [en, es, fr, zh] */
const MESSAGES: Record<string, [string, string, string, string]> = {
  'Δεν έχετε δικαίωμα': ['You do not have permission', 'No tienes permiso', 'Vous n\'avez pas l\'autorisation', '您没有权限'],
  'Δεν βρέθηκε': ['Not found', 'No encontrado', 'Introuvable', '未找到'],
  'Μη εξουσιοδοτημένος': ['Unauthorised', 'No autorizado', 'Non autorisé', '未授权'],
  'Λείπουν υποχρεωτικά πεδία': ['Required fields are missing', 'Faltan campos obligatorios', 'Des champs obligatoires sont manquants', '缺少必填字段'],
  'Απαιτούνται δικαιώματα διαχειριστή': ['Administrator permissions are required', 'Se requieren permisos de administrador', 'Des droits d\'administrateur sont requis', '需要管理员权限'],
  'Καμία έγκυρη αλλαγή': ['No valid changes', 'Ningún cambio válido', 'Aucune modification valide', '没有有效的更改'],
  'Απαγορευμένη πρόσβαση': ['Access denied', 'Acceso denegado', 'Accès refusé', '拒绝访问'],
  'Το κατοικίδιο δεν σου ανήκει': ['This pet is not yours', 'Esta mascota no es tuya', 'Cet animal ne vous appartient pas', '该宠物不属于您'],
  'Το προϊόν δεν βρέθηκε': ['Product not found', 'Producto no encontrado', 'Produit introuvable', '未找到商品'],
  'Η υπηρεσία δεν βρέθηκε': ['Service not found', 'Servicio no encontrado', 'Service introuvable', '未找到服务'],
  'Η κράτηση δεν βρέθηκε': ['Booking not found', 'Reserva no encontrada', 'Réservation introuvable', '未找到预约'],
  'Η εκδήλωση δεν βρέθηκε': ['Event not found', 'Evento no encontrado', 'Événement introuvable', '未找到活动'],
  'Μη έγκυρη κατάσταση': ['Invalid status', 'Estado no válido', 'Statut non valide', '状态无效'],
  'Δεν είσαι καταχωρημένος ως γιατρός': ['You are not registered as a doctor', 'No estás registrado como médico', 'Vous n\'êtes pas enregistré comme médecin', '您未注册为医生'],
  'Άγνωστη οντότητα': ['Unknown entity', 'Entidad desconocida', 'Entité inconnue', '未知实体'],
  'Μη υποστηριζόμενη γλώσσα': ['Unsupported language', 'Idioma no admitido', 'Langue non prise en charge', '不支持的语言'],
  'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες': ['The password must be at least 8 characters', 'La contraseña debe tener al menos 8 caracteres', 'Le mot de passe doit contenir au moins 8 caractères', '密码至少需要 8 个字符'],
  'Λανθασμένα στοιχεία': ['Incorrect credentials', 'Datos incorrectos', 'Identifiants incorrects', '凭据不正确'],
  'Σφάλμα διακομιστή': ['Server error', 'Error del servidor', 'Erreur du serveur', '服务器错误'],
  'Αν το email υπάρχει, θα λάβετε οδηγίες.': ['If the email exists, you will receive instructions.', 'Si el email existe, recibirás instrucciones.', 'Si l\'e-mail existe, vous recevrez des instructions.', '如果该邮箱存在，您将收到说明。'],
  'Ο κωδικός άλλαξε επιτυχώς': ['Your password has been changed', 'La contraseña se ha cambiado', 'Votre mot de passe a été modifié', '密码已成功更改'],
  'Μη έγκυρη αλλαγή κατάστασης': ['Invalid status change', 'Cambio de estado no válido', 'Changement de statut non valide', '状态更改无效'],
  'Μέχρι 5000 γραμμές ανά εισαγωγή': ['Up to 5000 rows per import', 'Hasta 5000 filas por importación', 'Jusqu\'à 5000 lignes par import', '每次导入最多 5000 行'],
  'Η κράτηση δεν σου ανήκει': ['This booking is not yours', 'Esta reserva no es tuya', 'Cette réservation ne vous appartient pas', '该预约不属于您'],
  'Η καμπάνια δεν σου ανήκει': ['This campaign is not yours', 'Esta campaña no es tuya', 'Cette campagne ne vous appartient pas', '该活动不属于您'],
  'Συμπλήρωσε και τύπο και ποσό έκπτωσης, ή κανένα': ['Set both the discount type and amount, or neither', 'Indica tipo e importe del descuento, o ninguno', 'Indiquez le type et le montant de la remise, ou aucun', '请同时填写折扣类型和金额，或都不填'],
  'Ο τύπος πρέπει να είναι percent ή amount': ['The type must be percent or amount', 'El tipo debe ser percent o amount', 'Le type doit être percent ou amount', '类型必须为 percent 或 amount'],
  'Το ποσοστό δεν μπορεί να ξεπερνά το 100': ['The percentage cannot exceed 100', 'El porcentaje no puede superar 100', 'Le pourcentage ne peut dépasser 100', '百分比不能超过 100'],
  'Δεν είστε μέλος': ['You are not a member', 'No eres miembro', 'Vous n\'êtes pas membre', '您不是成员'],
  'Το περιεχόμενο είναι υποχρεωτικό': ['Content is required', 'El contenido es obligatorio', 'Le contenu est obligatoire', '内容为必填项'],
  'Το κατοικίδιο δεν βρέθηκε': ['Pet not found', 'Mascota no encontrada', 'Animal introuvable', '未找到宠物'],
  'Η ειδοποίηση δεν βρέθηκε': ['Notification not found', 'Notificación no encontrada', 'Notification introuvable', '未找到通知'],
  'Η παραγγελία δεν βρέθηκε': ['Order not found', 'Pedido no encontrado', 'Commande introuvable', '未找到订单'],
  'Χρήστης δεν βρέθηκε': ['User not found', 'Usuario no encontrado', 'Utilisateur introuvable', '未找到用户'],
  'Ο χρήστης δεν βρέθηκε': ['User not found', 'Usuario no encontrado', 'Utilisateur introuvable', '未找到用户'],
  'Μη έγκυρη τιμή': ['Invalid value', 'Valor no válido', 'Valeur non valide', '值无效'],
  'Το ονοματεπώνυμο είναι υποχρεωτικό': ['Full name is required', 'El nombre completo es obligatorio', 'Le nom complet est obligatoire', '姓名为必填项'],
  'Λείπει service_id ή product_id': ['service_id or product_id is missing', 'Falta service_id o product_id', 'service_id ou product_id manquant', '缺少 service_id 或 product_id'],
  'Η υπηρεσία δεν σου ανήκει': ['This service is not yours', 'Este servicio no es tuyo', 'Ce service ne vous appartient pas', '该服务不属于您'],
  'Κανένα επιτρεπόμενο πεδίο': ['No permitted fields', 'Ningún campo permitido', 'Aucun champ autorisé', '没有允许的字段'],
  'Το email είναι υποχρεωτικό': ['Email is required', 'El email es obligatorio', 'L\'e-mail est obligatoire', '邮箱为必填项'],
  'Καμία αλλαγή': ['No changes', 'Sin cambios', 'Aucune modification', '无更改'],
  'Email και κωδικός είναι υποχρεωτικά': ['Email and password are required', 'El email y la contraseña son obligatorios', 'L\'e-mail et le mot de passe sont obligatoires', '邮箱和密码为必填项'],
  'Το email χρησιμοποιείται ήδη': ['That email is already in use', 'Ese email ya está en uso', 'Cet e-mail est déjà utilisé', '该邮箱已被使用'],
  'Email ήδη χρησιμοποιείται': ['That email is already in use', 'Ese email ya está en uso', 'Cet e-mail est déjà utilisé', '该邮箱已被使用'],
  'Η ημερομηνία γέννησης είναι υποχρεωτική': ['Date of birth is required', 'La fecha de nacimiento es obligatoria', 'La date de naissance est obligatoire', '出生日期为必填项'],
  'Πρέπει να είσαι τουλάχιστον 15 ετών για να δημιουργήσεις λογαριασμό': ['You must be at least 15 to create an account', 'Debes tener al menos 15 años para crear una cuenta', 'Vous devez avoir au moins 15 ans pour créer un compte', '创建账号需年满 15 岁'],
  'Μη έγκυρη ημερομηνία γέννησης': ['Invalid date of birth', 'Fecha de nacimiento no válida', 'Date de naissance non valide', '出生日期无效'],
  'Λείπουν δεδομένα': ['Data is missing', 'Faltan datos', 'Données manquantes', '缺少数据'],
  'Μη έγκυρο Google token': ['Invalid Google token', 'Token de Google no válido', 'Jeton Google non valide', 'Google 令牌无效'],
  'Λείπει το access token': ['The access token is missing', 'Falta el token de acceso', 'Le jeton d\'accès est manquant', '缺少访问令牌'],
  'Μη έγκυρο Facebook token': ['Invalid Facebook token', 'Token de Facebook no válido', 'Jeton Facebook non valide', 'Facebook 令牌无效'],
  'Απαιτείται πρόσβαση στο email σας. Παρακαλώ επιτρέψτε την κοινοποίηση email και ξαναδοκιμάστε.': ['Access to your email is required. Please allow email sharing and try again.', 'Se requiere acceso a tu email. Permite compartir el email e inténtalo de nuevo.', 'L\'accès à votre e-mail est requis. Autorisez le partage et réessayez.', '需要访问您的邮箱。请允许共享邮箱后重试。'],
  'Λείπει ο κωδικός': ['The password is missing', 'Falta la contraseña', 'Le mot de passe est manquant', '缺少密码'],
  'Ο σύνδεσμος έληξε. Δοκιμάστε ξανά.': ['The link has expired. Try again.', 'El enlace ha caducado. Inténtalo de nuevo.', 'Le lien a expiré. Réessayez.', '链接已过期，请重试。'],
  'Ο λογαριασμός δεν βρέθηκε': ['Account not found', 'Cuenta no encontrada', 'Compte introuvable', '未找到账号'],
  'Λείπουν στοιχεία': ['Information is missing', 'Faltan datos', 'Informations manquantes', '信息缺失'],
  'Μη έγκυρος ή ληγμένος σύνδεσμος': ['Invalid or expired link', 'Enlace no válido o caducado', 'Lien non valide ou expiré', '链接无效或已过期'],
  'Η υπηρεσία δεν είναι διαθέσιμη': ['The service is not available', 'El servicio no está disponible', 'Le service n\'est pas disponible', '该服务不可用'],
  'Δεν μπορείς να κλείσεις τη δική σου υπηρεσία': ['You cannot book your own service', 'No puedes reservar tu propio servicio', 'Vous ne pouvez pas réserver votre propre service', '您不能预约自己的服务'],
  'Κάποια πακέτα δεν βρέθηκαν': ['Some packages were not found', 'No se encontraron algunos paquetes', 'Certains forfaits sont introuvables', '部分套餐未找到'],
  'Κάποια πακέτα δεν ανήκουν σε αυτή την υπηρεσία': ['Some packages do not belong to this service', 'Algunos paquetes no pertenecen a este servicio', 'Certains forfaits n\'appartiennent pas à ce service', '部分套餐不属于此服务'],
  'Το επιλεγμένο μέλος προσωπικού δεν είναι διαθέσιμο': ['The selected staff member is not available', 'El miembro del personal seleccionado no está disponible', 'Le membre du personnel sélectionné n\'est pas disponible', '所选员工不可用'],
  'Λείπει το αναγνωριστικό κράτησης': ['The booking id is missing', 'Falta el identificador de la reserva', 'L\'identifiant de réservation est manquant', '缺少预约标识'],
  'Η κράτηση έχει ήδη πληρωθεί': ['The booking has already been paid', 'La reserva ya está pagada', 'La réservation a déjà été payée', '该预约已付款'],
  'Η κράτηση έχει ακυρωθεί': ['The booking has been cancelled', 'La reserva ha sido cancelada', 'La réservation a été annulée', '该预约已取消'],
  'Το ποσό της κράτησης δεν είναι έγκυρο': ['The booking amount is not valid', 'El importe de la reserva no es válido', 'Le montant de la réservation n\'est pas valide', '预约金额无效'],
  'Δεν έχεις πρόσβαση σε αυτή την κράτηση': ['You do not have access to this booking', 'No tienes acceso a esta reserva', 'Vous n\'avez pas accès à cette réservation', '您无权访问该预约'],
  'Δεν έχεις πρόσβαση σε αυτή την παραγγελία': ['You do not have access to this order', 'No tienes acceso a este pedido', 'Vous n\'avez pas accès à cette commande', '您无权访问该订单'],
  'Το μέλος προσωπικού δεν ανήκει σε αυτή την υπηρεσία': ['The staff member does not belong to this service', 'El miembro del personal no pertenece a este servicio', 'Le membre du personnel n\'appartient pas à ce service', '该员工不属于此服务'],
  'Το καλάθι είναι κενό': ['Your cart is empty', 'Tu carrito está vacío', 'Votre panier est vide', '购物车是空的'],
  'Κάποια προϊόντα δεν είναι πλέον διαθέσιμα': ['Some products are no longer available', 'Algunos productos ya no están disponibles', 'Certains produits ne sont plus disponibles', '部分商品已不可用'],
  'Η παραγγελία έχει ήδη πληρωθεί': ['The order has already been paid', 'El pedido ya está pagado', 'La commande a déjà été payée', '该订单已付款'],
  'Η συνεδρία έχει πληρωθεί και δεν διαγράφεται. Χρησιμοποίησε ακύρωση.': ['The session has been paid and cannot be deleted. Use cancel instead.', 'La sesión está pagada y no se puede eliminar. Usa cancelar.', 'La séance a été payée et ne peut être supprimée. Utilisez l\'annulation.', '该问诊已付款，无法删除，请使用取消。'],
  'Μόνο πάροχοι μπορούν να αλλάξουν διαθεσιμότητα': ['Only providers can change availability', 'Solo los proveedores pueden cambiar la disponibilidad', 'Seuls les prestataires peuvent modifier la disponibilité', '只有服务商可以更改可用状态'],
  'Δεν βρέθηκε κτηνιατρική υπηρεσία για αυτόν τον πάροχο': ['No veterinary service was found for this provider', 'No se encontró servicio veterinario para este proveedor', 'Aucun service vétérinaire trouvé pour ce prestataire', '未找到该服务商的兽医服务'],
  'Η υπηρεσία τηλεϊατρικής δεν βρέθηκε': ['Telehealth service not found', 'Servicio de telemedicina no encontrado', 'Service de télémédecine introuvable', '未找到远程问诊服务'],
  'Η υπηρεσία δεν ανήκει στον συγκεκριμένο πάροχο': ['The service does not belong to that provider', 'El servicio no pertenece a ese proveedor', 'Le service n\'appartient pas à ce prestataire', '该服务不属于该服务商'],
  'Δεν μπορείς να κλείσεις ραντεβού με τον εαυτό σου': ['You cannot book an appointment with yourself', 'No puedes reservar una cita contigo mismo', 'Vous ne pouvez pas prendre rendez-vous avec vous-même', '您不能与自己预约'],
  'Δώσε διεύθυνση': ['Enter an address', 'Introduce una dirección', 'Saisissez une adresse', '请输入地址'],
  'Δεν βρέθηκαν συντεταγμένες για αυτή τη διεύθυνση': ['No coordinates were found for that address', 'No se encontraron coordenadas para esa dirección', 'Aucune coordonnée trouvée pour cette adresse', '未找到该地址的坐标'],
  'Κενό μήνυμα': ['Empty message', 'Mensaje vacío', 'Message vide', '消息为空'],
  'Το μήνυμα δεν μπορεί να είναι κενό': ['The message cannot be empty', 'El mensaje no puede estar vacío', 'Le message ne peut pas être vide', '消息不能为空'],
  'Συμπλήρωσε όνομα, email και μήνυμα': ['Fill in name, email and message', 'Rellena nombre, email y mensaje', 'Renseignez nom, e-mail et message', '请填写姓名、邮箱和消息'],
  'Μη έγκυρο email': ['Invalid email', 'Email no válido', 'E-mail non valide', '邮箱无效'],
  'Επίλεξε τουλάχιστον έναν παραλήπτη': ['Choose at least one recipient', 'Elige al menos un destinatario', 'Choisissez au moins un destinataire', '请至少选择一位收件人'],
  'Μέχρι 500 παραλήπτες ανά αποστολή': ['Up to 500 recipients per send', 'Hasta 500 destinatarios por envío', 'Jusqu\'à 500 destinataires par envoi', '每次最多 500 位收件人'],
  'Κανένας από τους παραλήπτες δεν είναι πελάτης σου': ['None of the recipients is your customer', 'Ninguno de los destinatarios es cliente tuyo', 'Aucun des destinataires n\'est votre client', '没有收件人是您的客户'],
  'Δεν υπάρχει πελάτης με αυτό το email': ['There is no customer with that email', 'No hay ningún cliente con ese email', 'Aucun client avec cet e-mail', '没有使用该邮箱的客户'],
  'Ο πελάτης δεν έχει κάνει κράτηση σε εσένα': ['That customer has not booked with you', 'Ese cliente no ha reservado contigo', 'Ce client n\'a pas réservé chez vous', '该客户未向您预约过'],
  'Η εκδήλωση δεν σου ανήκει': ['This event is not yours', 'Este evento no es tuyo', 'Cet événement ne vous appartient pas', '该活动不属于您'],
  'Η εκδήλωση έχει ολοκληρωθεί': ['The event has finished', 'El evento ha terminado', 'L\'événement est terminé', '活动已结束'],
  'Έχεις ήδη δηλώσει συμμετοχή': ['You have already joined', 'Ya te has apuntado', 'Vous participez déjà', '您已报名'],
  'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις': ['There are not enough places available', 'No hay plazas suficientes', 'Il n\'y a pas assez de places', '可用名额不足'],
  'Δεν βρέθηκε συμμετοχή': ['No participation found', 'No se encontró participación', 'Aucune participation trouvée', '未找到参与记录'],
  'Η ακύρωση με επιστροφή χρημάτων γίνεται έως 48 ώρες πριν την έναρξη. Η θέση σου παραμένει.': ['Cancellation with a refund is possible up to 48 hours before the start. Your place is kept.', 'La cancelación con reembolso es posible hasta 48 horas antes del inicio. Tu plaza se mantiene.', 'L\'annulation avec remboursement est possible jusqu\'à 48 heures avant le début. Votre place est conservée.', '开始前 48 小时内无法取消退款，您的名额将保留。'],
  'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η συμμετοχή δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.': ['The refund did not go through, so your participation was not cancelled. Please try again shortly.', 'El reembolso no se completó, así que tu participación no se canceló. Inténtalo de nuevo en un momento.', 'Le remboursement n\'a pas abouti, votre participation n\'a donc pas été annulée. Réessayez dans un instant.', '退款未完成，因此您的报名未取消。请稍后再试。'],
  'Το θέμα δεν βρέθηκε': ['Topic not found', 'Tema no encontrado', 'Sujet introuvable', '未找到主题'],
  'Κενό περιεχόμενο': ['Empty content', 'Contenido vacío', 'Contenu vide', '内容为空'],
  'Μόνο ο δημιουργός του θέματος μπορεί να το κάνει': ['Only the author of the topic can do that', 'Solo el autor del tema puede hacerlo', 'Seul l\'auteur du sujet peut le faire', '只有主题作者可以执行此操作'],
  'Όνομα και σκοπός είναι υποχρεωτικά': ['Name and purpose are required', 'El nombre y el propósito son obligatorios', 'Le nom et l\'objet sont obligatoires', '名称和用途为必填项'],
  'Ο τίτλος είναι υποχρεωτικός': ['The title is required', 'El título es obligatorio', 'Le titre est obligatoire', '标题为必填项'],
  'Απαιτούνται ημερομηνίες έναρξης και λήξης': ['Start and end dates are required', 'Se requieren fechas de inicio y fin', 'Les dates de début et de fin sont obligatoires', '需要开始和结束日期'],
  'Η λήξη πρέπει να είναι μετά την έναρξη': ['The end must be after the start', 'El fin debe ser posterior al inicio', 'La fin doit être après le début', '结束时间必须晚于开始时间'],
  'Το ποσό πρέπει να είναι θετικό': ['The amount must be positive', 'El importe debe ser positivo', 'Le montant doit être positif', '金额必须为正数'],
  'Η καμπάνια δεν βρέθηκε': ['Campaign not found', 'Campaña no encontrada', 'Campagne introuvable', '未找到活动'],
  'Η αίτηση δεν βρέθηκε': ['Application not found', 'Solicitud no encontrada', 'Demande introuvable', '未找到申请'],
  'Απαιτείται συνδρομή AI για αυτή τη λειτουργία': ['An AI subscription is required for this feature', 'Se requiere una suscripción de IA para esta función', 'Un abonnement IA est requis pour cette fonction', '此功能需要 AI 订阅'],
  'Έχετε ήδη χρησιμοποιήσει ή ενεργοποιήσει το δωρεάν trial': ['You have already used or activated the free trial', 'Ya has usado o activado la prueba gratuita', 'Vous avez déjà utilisé ou activé l\'essai gratuit', '您已使用或激活过免费试用'],
  'Το επιλεγμένο πλάνο δεν είναι διαθέσιμο': ['The selected plan is not available', 'El plan seleccionado no está disponible', 'La formule sélectionnée n\'est pas disponible', '所选方案不可用'],
  'Το πλάνο δεν είναι διαθέσιμο': ['The plan is not available', 'El plan no está disponible', 'La formule n\'est pas disponible', '该方案不可用'],
  'Απαιτείται εικόνα': ['An image is required', 'Se requiere una imagen', 'Une image est requise', '需要图片'],
  'Απαιτείται ερώτηση': ['A question is required', 'Se requiere una pregunta', 'Une question est requise', '需要提出问题'],
  'Άγνωστος τύπος συσκευής': ['Unknown device type', 'Tipo de dispositivo desconocido', 'Type d\'appareil inconnu', '未知设备类型'],
  'Ελλιπή στοιχεία συνδρομής': ['Incomplete subscription details', 'Datos de suscripción incompletos', 'Informations d\'abonnement incomplètes', '订阅信息不完整'],
  'Οι ειδοποιήσεις web δεν έχουν ρυθμιστεί': ['Web notifications are not configured', 'Las notificaciones web no están configuradas', 'Les notifications web ne sont pas configurées', '网页通知尚未配置'],
  'user_id και plan_id απαιτούνται': ['user_id and plan_id are required', 'Se requieren user_id y plan_id', 'user_id et plan_id sont requis', '需要 user_id 和 plan_id'],
  'Άγνωστος τύπος συναλλαγής': ['Unknown transaction type', 'Tipo de transacción desconocido', 'Type de transaction inconnu', '未知交易类型'],
  'Λείπει το αναγνωριστικό': ['The identifier is missing', 'Falta el identificador', 'L\'identifiant est manquant', '缺少标识符'],
  'Η συναλλαγή δεν βρέθηκε': ['Transaction not found', 'Transacción no encontrada', 'Transaction introuvable', '未找到交易'],
  'Η συναλλαγή δεν είναι πληρωμένη': ['The transaction has not been paid', 'La transacción no está pagada', 'La transaction n\'est pas payée', '该交易尚未付款'],
  'Δεν υπάρχει αναφορά πληρωμής — η επιστροφή γίνεται χειροκίνητα από το Viva': ['There is no payment reference — the refund must be issued manually from Viva', 'No hay referencia de pago — el reembolso debe hacerse manualmente desde Viva', 'Aucune référence de paiement — le remboursement doit être fait manuellement depuis Viva', '没有付款凭证 — 需在 Viva 手动退款'],
  'Το ποσό της συναλλαγής δεν είναι έγκυρο': ['The transaction amount is not valid', 'El importe de la transacción no es válido', 'Le montant de la transaction n\'est pas valide', '交易金额无效'],
  'Μη έγκυρο ποσό επιστροφής': ['Invalid refund amount', 'Importe de reembolso no válido', 'Montant de remboursement non valide', '退款金额无效'],
  'Η επιστροφή απορρίφθηκε από το Viva': ['The refund was rejected by Viva', 'Viva rechazó el reembolso', 'Le remboursement a été refusé par Viva', 'Viva 拒绝了退款'],
  'Δεν δόθηκε SQL query': ['No SQL query was provided', 'No se proporcionó ninguna consulta SQL', 'Aucune requête SQL fournie', '未提供 SQL 查询'],
  'Επιτρέπεται μία μόνο εντολή': ['Only one statement is allowed', 'Solo se permite una instrucción', 'Une seule instruction est autorisée', '只允许一条语句'],
  'Επιτρέπονται μόνο ερωτήματα SELECT': ['Only SELECT queries are allowed', 'Solo se permiten consultas SELECT', 'Seules les requêtes SELECT sont autorisées', '只允许 SELECT 查询'],
  'Το ερώτημα αναφέρεται σε προστατευμένες στήλες': ['The query refers to protected columns', 'La consulta hace referencia a columnas protegidas', 'La requête référence des colonnes protégées', '查询涉及受保护的列'],
  'Δήλωσε ρητά τις στήλες αντί για *': ['List the columns explicitly instead of using *', 'Indica las columnas explícitamente en lugar de *', 'Indiquez les colonnes explicitement au lieu de *', '请明确列出字段，不要使用 *'],
  'Λείπουν θέμα ή περιεχόμενο': ['Subject or content is missing', 'Falta el asunto o el contenido', 'Objet ou contenu manquant', '缺少主题或内容'],
  'Δώσε email παραλήπτη ή ρόλο ομάδας': ['Enter a recipient email or a group role', 'Introduce un email de destinatario o un rol de grupo', 'Saisissez un e-mail de destinataire ou un rôle de groupe', '请输入收件人邮箱或群组角色'],
  'RESEND_API_KEY δεν έχει οριστεί στο Railway': ['RESEND_API_KEY is not set on Railway', 'RESEND_API_KEY no está configurada en Railway', 'RESEND_API_KEY n\'est pas définie sur Railway', 'Railway 上未设置 RESEND_API_KEY'],
  'Δεν βρέθηκαν παραλήπτες': ['No recipients were found', 'No se encontraron destinatarios', 'Aucun destinataire trouvé', '未找到收件人'],
  'Η κατάσταση πρέπει να είναι approved ή rejected': ['The status must be approved or rejected', 'El estado debe ser approved o rejected', 'Le statut doit être approved ou rejected', '状态必须为 approved 或 rejected'],
  'name και price_monthly είναι υποχρεωτικά': ['name and price_monthly are required', 'name y price_monthly son obligatorios', 'name et price_monthly sont obligatoires', 'name 和 price_monthly 为必填项'],
  'Το πλάνο πρέπει να περιλαμβάνει τουλάχιστον μία υπηρεσία': ['The plan must include at least one service', 'El plan debe incluir al menos un servicio', 'La formule doit inclure au moins un service', '方案必须包含至少一项服务'],
  'Απενεργοποιήθηκε (υπάρχουν συνδρομητές)': ['Deactivated — there are subscribers', 'Desactivado — hay suscriptores', 'Désactivé — il y a des abonnés', '已停用 — 存在订阅者'],
  'plan_id απαιτείται': ['plan_id is required', 'plan_id es obligatorio', 'plan_id est requis', '需要 plan_id'],
  'Απαιτούνται image_url και analysis_type': ['image_url and analysis_type are required', 'Se requieren image_url y analysis_type', 'image_url et analysis_type sont requis', '需要 image_url 和 analysis_type'],
  'Απαιτούνται frames': ['frames are required', 'Se requieren frames', 'frames sont requis', '需要 frames'],
  'Απαιτούνται image_url, sample_type, species': ['image_url, sample_type and species are required', 'Se requieren image_url, sample_type y species', 'image_url, sample_type et species sont requis', '需要 image_url、sample_type 和 species'],
  'Επίλεξε τουλάχιστον ένα πακέτο για αυτή την υπηρεσία': ['Choose at least one package for this service', 'Elige al menos un paquete para este servicio', 'Choisissez au moins un forfait pour ce service', '请为该服务至少选择一个套餐'],
  'Η κράτηση δεν μπορεί να αλλάξει': ['This booking cannot be changed', 'Esta reserva no se puede modificar', 'Cette réservation ne peut pas être modifiée', '该预约无法更改'],
  'Απαιτούνται name, species και size': ['name, species and size are required', 'Se requieren name, species y size', 'name, species et size sont requis', '需要 name、species 和 size'],
  'Δεν δόθηκαν προϊόντα': ['No products were provided', 'No se proporcionaron productos', 'Aucun produit fourni', '未提供产品'],
  'Δεν δόθηκαν υπηρεσίες': ['No services were provided', 'No se proporcionaron servicios', 'Aucun service fourni', '未提供服务'],
  'Άγνωστος πάροχος ημερολογίου': ['Unknown calendar provider', 'Proveedor de calendario desconocido', 'Fournisseur d\'agenda inconnu', '未知日历提供商'],
  'Δεν βρέθηκε σύνδεση': ['No connection was found', 'No se encontró conexión', 'Aucune connexion trouvée', '未找到连接'],
  'Δεν ήταν δυνατή η εγγραφή στο ημερολόγιο': ['Could not write to the calendar', 'No se pudo escribir en el calendario', 'Impossible d\'écrire dans l\'agenda', '无法写入日历'],
  'Αναμένεται πίνακας items': ['An items array is expected', 'Se espera un array items', 'Un tableau items est attendu', '需要 items 数组'],
  'Πάρα πολλά είδη': ['Too many items', 'Demasiados artículos', 'Trop d\'articles', '项目过多'],
  'Αναμένεται πίνακας targets': ['A targets array is expected', 'Se espera un array targets', 'Un tableau targets est attendu', '需要 targets 数组'],
  'Άγνωστος τύπος στόχου': ['Unknown target type', 'Tipo de objetivo desconocido', 'Type de cible inconnu', '未知目标类型'],
  'Οι στόχοι all_* δεν δέχονται αναγνωριστικό': ['all_* targets do not take an identifier', 'Los objetivos all_* no aceptan identificador', 'Les cibles all_* n\'acceptent pas d\'identifiant', 'all_* 目标不接受标识符'],
  'Λείπει το αναγνωριστικό στόχου': ['The target identifier is missing', 'Falta el identificador del objetivo', 'L\'identifiant de la cible est manquant', '缺少目标标识符'],
  'Αναμένεται πίνακας placements': ['A placements array is expected', 'Se espera un array placements', 'Un tableau placements est attendu', '需要 placements 数组'],
  'Άγνωστη σελίδα': ['Unknown page', 'Página desconocida', 'Page inconnue', '未知页面'],
  'Άγνωστη θέση': ['Unknown slot', 'Posición desconocida', 'Emplacement inconnu', '未知位置'],
  'Διπλή θέση στην ίδια σελίδα': ['Duplicate slot on the same page', 'Posición duplicada en la misma página', 'Emplacement en double sur la même page', '同一页面位置重复'],
  'Το βίντεο απαιτεί αρχείο ή σύνδεσμο': ['The video needs a file or a link', 'El vídeo necesita un archivo o un enlace', 'La vidéo nécessite un fichier ou un lien', '视频需要文件或链接'],
  'Μη επιτρεπόμενη πηγή. Υποστηρίζονται YouTube, Vimeo, ή αρχεία που ανέβασες.': ['Source not allowed. YouTube, Vimeo and your uploaded files are supported.', 'Fuente no permitida. Se admiten YouTube, Vimeo y los archivos que hayas subido.', 'Source non autorisée. YouTube, Vimeo et vos fichiers téléversés sont acceptés.', '不支持的来源。支持 YouTube、Vimeo 和您上传的文件。'],
  'Ο σύνδεσμος πρέπει να είναι εσωτερική διαδρομή': ['The link must be an internal path', 'El enlace debe ser una ruta interna', 'Le lien doit être un chemin interne', '链接必须是内部路径'],
  'Αναμένεται πίνακας emails': ['An emails array is expected', 'Se espera un array emails', 'Un tableau emails est attendu', '需要 emails 数组'],
  'Πάρα πολλοί παραλήπτες': ['Too many recipients', 'Demasiados destinatarios', 'Trop de destinataires', '收件人过多'],
  'Λείπει το product_id': ['product_id is missing', 'Falta product_id', 'product_id est manquant', '缺少 product_id'],
  'Δεν έχεις πρόσβαση στη λίστα συμμετεχόντων': ['You do not have access to the participant list', 'No tienes acceso a la lista de participantes', 'Vous n\'avez pas accès à la liste des participants', '您无权查看参与者名单'],
  'Reference, τίτλος, περιγραφή, ημ/νία ανίχνευσης, reporter email απαιτούνται': ['Reference, title, description, detection date and reporter email are required', 'Se requieren referencia, título, descripción, fecha de detección y email del informante', 'Référence, titre, description, date de détection et e-mail du déclarant sont requis', '需要参考编号、标题、描述、发现日期和报告人邮箱'],
  'Δεν έχεις πρόσβαση στα στατιστικά καταστήματος': ['You do not have access to the shop statistics', 'No tienes acceso a las estadísticas de la tienda', 'Vous n\'avez pas accès aux statistiques de la boutique', '您无权查看商城统计'],
  'Λείπει το user_email': ['user_email is missing', 'Falta user_email', 'user_email est manquant', '缺少 user_email'],
  'Μη έγκυρος αριθμός πόντων': ['Invalid number of points', 'Número de puntos no válido', 'Nombre de points non valide', '积分数量无效'],
  'Υπερβολικά μεγάλη μεταβολή πόντων': ['The change in points is too large', 'El cambio de puntos es demasiado grande', 'La variation de points est trop importante', '积分变动过大'],
  'Μη έγκυρο token συσκευής': ['Invalid device token', 'Token de dispositivo no válido', 'Jeton d\'appareil non valide', '设备令牌无效'],
  'Λείπει το token ή το endpoint': ['The token or endpoint is missing', 'Falta el token o el endpoint', 'Le jeton ou l\'endpoint est manquant', '缺少令牌或 endpoint'],
  'Η συσκευή δεν βρέθηκε': ['Device not found', 'Dispositivo no encontrado', 'Appareil introuvable', '未找到设备'],
  'Λείπει category ή title': ['category or title is missing', 'Falta category o title', 'category ou title est manquant', '缺少 category 或 title'],
  'packages_with_prices πρέπει να είναι μη κενός πίνακας': ['packages_with_prices must be a non-empty array', 'packages_with_prices debe ser un array no vacío', 'packages_with_prices doit être un tableau non vide', 'packages_with_prices 必须为非空数组'],
  'Κανένα έγκυρο πρότυπο δεν βρέθηκε': ['No valid template was found', 'No se encontró ninguna plantilla válida', 'Aucun modèle valide trouvé', '未找到有效模板'],
  'Το όνομα είναι υποχρεωτικό': ['The name is required', 'El nombre es obligatorio', 'Le nom est obligatoire', '名称为必填项'],
  'Δεν έχετε δικαίωμα σε αυτή την υπηρεσία': ['You do not have permission for this service', 'No tienes permiso para este servicio', 'Vous n\'avez pas l\'autorisation pour ce service', '您无权操作该服务'],
  'Κατοικίδιο δεν βρέθηκε': ['Pet not found', 'Mascota no encontrada', 'Animal introuvable', '未找到宠物'],
  'Λείπει το email παρόχου': ['The provider email is missing', 'Falta el email del proveedor', 'L\'e-mail du prestataire est manquant', '缺少服务商邮箱'],
  'Η βόλτα δεν βρέθηκε': ['Walk not found', 'Paseo no encontrado', 'Promenade introuvable', '未找到活动'],
  'Η βόλτα δεν δέχεται πλέον συμμετοχές': ['The walk is no longer accepting participants', 'El paseo ya no acepta participantes', 'La promenade n\'accepte plus de participants', '该活动不再接受报名'],
  'Είσαι ήδη ο διοργανωτής': ['You are already the organiser', 'Ya eres el organizador', 'Vous êtes déjà l\'organisateur', '您已是组织者'],
  'Συμπληρώθηκε ο αριθμός συμμετεχόντων': ['The participant limit has been reached', 'Se ha alcanzado el número de participantes', 'Le nombre de participants est atteint', '参与人数已满'],
  'Δεν συμμετέχεις': ['You are not taking part', 'No participas', 'Vous ne participez pas', '您未参加'],
  'Λείπει ο παραλήπτης': ['The recipient is missing', 'Falta el destinatario', 'Le destinataire est manquant', '缺少收件人'],
  'Δεν μπορείς να προσκαλέσεις τον εαυτό σου': ['You cannot invite yourself', 'No puedes invitarte a ti mismo', 'Vous ne pouvez pas vous inviter vous-même', '不能邀请自己'],
  'Μη έγκυρο status': ['Invalid status', 'Estado no válido', 'Statut non valide', '状态无效'],
  'Το σχόλιο δεν μπορεί να είναι κενό': ['The comment cannot be empty', 'El comentario no puede estar vacío', 'Le commentaire ne peut pas être vide', '评论不能为空'],
  'Δεν έχεις δικαίωμα να τροποποιήσεις αυτό το προϊόν': ['You do not have permission to change this product', 'No tienes permiso para modificar este producto', 'Vous n\'avez pas l\'autorisation de modifier ce produit', '您无权修改该产品'],
  'Μόνο πάροχοι μπορούν να δημιουργούν προϊόντα': ['Only providers can create products', 'Solo los proveedores pueden crear productos', 'Seuls les prestataires peuvent créer des produits', '只有服务商可以创建产品'],
  'Έχεις ήδη αίτηση σε εξέλιξη': ['You already have an application in progress', 'Ya tienes una solicitud en curso', 'Vous avez déjà une demande en cours', '您已有一份申请正在处理'],
  'Η κράτηση δεν έχει πληρωθεί': ['The booking has not been paid', 'La reserva no ha sido pagada', 'La réservation n\'a pas été payée', '该预约尚未付款'],
  'Μια κριτική αφορά είτε υπηρεσία είτε προϊόν': ['A review is for either a service or a product', 'Una reseña es para un servicio o un producto', 'Un avis concerne soit un service soit un produit', '评价针对服务或产品之一'],
  'Η βαθμολογία πρέπει να είναι από 1 έως 5': ['The rating must be between 1 and 5', 'La valoración debe estar entre 1 y 5', 'La note doit être comprise entre 1 et 5', '评分必须在 1 到 5 之间'],
  'Έχεις ήδη αξιολογήσει': ['You have already reviewed this', 'Ya has valorado esto', 'Vous avez déjà donné un avis', '您已评价过'],
  'Δεν μπορείς να αξιολογήσεις το δικό σου προϊόν': ['You cannot review your own product', 'No puedes valorar tu propio producto', 'Vous ne pouvez pas évaluer votre propre produit', '不能评价自己的产品'],
  'Μπορείς να αξιολογήσεις μόνο προϊόντα που έχεις αγοράσει': ['You can only review products you have bought', 'Solo puedes valorar productos que hayas comprado', 'Vous ne pouvez évaluer que les produits que vous avez achetés', '只能评价您购买过的产品'],
  'Δεν μπορείς να αξιολογήσεις τη δική σου υπηρεσία': ['You cannot review your own service', 'No puedes valorar tu propio servicio', 'Vous ne pouvez pas évaluer votre propre service', '不能评价自己的服务'],
  'Μπορείς να αξιολογήσεις μόνο υπηρεσίες που έχεις χρησιμοποιήσει': ['You can only review services you have used', 'Solo puedes valorar servicios que hayas usado', 'Vous ne pouvez évaluer que les services que vous avez utilisés', '只能评价您使用过的服务'],
  'Μόνο πάροχοι μπορούν να δημιουργούν υπηρεσίες': ['Only providers can create services', 'Solo los proveedores pueden crear servicios', 'Seuls les prestataires peuvent créer des services', '只有服务商可以创建服务'],
  'Η υπηρεσία έχει κρατήσεις και δεν διαγράφεται. Απενεργοποίησέ την αντί να τη σβήσεις.': ['The service has bookings and cannot be deleted. Deactivate it instead.', 'El servicio tiene reservas y no se puede eliminar. Desactívalo en su lugar.', 'Le service a des réservations et ne peut être supprimé. Désactivez-le plutôt.', '该服务已有预约，无法删除。请改为停用。'],
  'discount_percent πρέπει να είναι 0-100': ['discount_percent must be between 0 and 100', 'discount_percent debe estar entre 0 y 100', 'discount_percent doit être compris entre 0 et 100', 'discount_percent 必须介于 0 到 100'],
  'Άγνωστη ενότητα περιεχομένου': ['Unknown content section', 'Sección de contenido desconocida', 'Section de contenu inconnue', '未知内容板块'],
  'Ο γιατρός δεν βρέθηκε': ['Practitioner not found', 'Profesional no encontrado', 'Praticien introuvable', '未找到接诊人员'],
  'Δεν έχεις δικαίωμα σε αυτόν τον γιατρό': ['You do not have permission for this practitioner', 'No tienes permiso para este profesional', 'Vous n\'avez pas l\'autorisation pour ce praticien', '您无权操作该接诊人员'],
  'Λείπει το service_id': ['service_id is missing', 'Falta service_id', 'service_id est manquant', '缺少 service_id'],
  'Αναμένεται πίνακας prices': ['A prices array is expected', 'Se espera un array prices', 'Un tableau prices est attendu', '需要 prices 数组'],
  'Το πακέτο δεν ανήκει στην υπηρεσία αυτού του γιατρού': ['The package does not belong to this practitioner\'s service', 'El paquete no pertenece al servicio de este profesional', 'Le forfait n\'appartient pas au service de ce praticien', '该套餐不属于此接诊人员的服务'],
  'Λείπει το email': ['The email is missing', 'Falta el email', 'L\'e-mail est manquant', '缺少邮箱'],
  'Δεν υπάρχει λογαριασμός με αυτό το email. Ο γιατρός πρέπει να εγγραφεί πρώτα.': ['There is no account with that email. The practitioner must register first.', 'No hay ninguna cuenta con ese email. El profesional debe registrarse primero.', 'Aucun compte avec cet e-mail. Le praticien doit d\'abord s\'inscrire.', '该邮箱没有账号。接诊人员需先注册。'],
  'Ο λογαριασμός είναι ήδη συνδεδεμένος με άλλον γιατρό': ['That account is already linked to another practitioner', 'Esa cuenta ya está vinculada a otro profesional', 'Ce compte est déjà lié à un autre praticien', '该账号已关联其他接诊人员'],
  'Αυτό το προϊόν δεν διαθέτει συνδρομή': ['This product does not offer a subscription', 'Este producto no ofrece suscripción', 'Ce produit ne propose pas d\'abonnement', '该产品不提供订阅'],
  'Έχεις ήδη ενεργή συνδρομή για αυτό το προϊόν': ['You already have an active subscription for this product', 'Ya tienes una suscripción activa para este producto', 'Vous avez déjà un abonnement actif pour ce produit', '您已有该产品的有效订阅'],
  'Λείπει το κατοικίδιο ή το αναγνωριστικό συσκευής': ['The pet or the device identifier is missing', 'Falta la mascota o el identificador del dispositivo', 'L\'animal ou l\'identifiant de l\'appareil est manquant', '缺少宠物或设备标识'],
  'Μη έγκυρο αναγνωριστικό συσκευής': ['Invalid device identifier', 'Identificador de dispositivo no válido', 'Identifiant d\'appareil non valide', '设备标识无效'],
  'Η συσκευή είναι ήδη καταχωρημένη': ['The device is already registered', 'El dispositivo ya está registrado', 'L\'appareil est déjà enregistré', '该设备已注册'],
  'Μη έγκυρες συντεταγμένες': ['Invalid coordinates', 'Coordenadas no válidas', 'Coordonnées non valides', '坐标无效'],
  'Το γεωγραφικό πλάτος πρέπει να είναι από -90 έως 90': ['Latitude must be between -90 and 90', 'La latitud debe estar entre -90 y 90', 'La latitude doit être comprise entre -90 et 90', '纬度必须在 -90 到 90 之间'],
  'Το γεωγραφικό μήκος πρέπει να είναι από -180 έως 180': ['Longitude must be between -180 and 180', 'La longitud debe estar entre -180 y 180', 'La longitude doit être comprise entre -180 et 180', '经度必须在 -180 到 180 之间'],
  'Μη έγκυρο latitude': ['Invalid latitude', 'Latitud no válida', 'Latitude non valide', '纬度无效'],
  'Μη έγκυρο longitude': ['Invalid longitude', 'Longitud no válida', 'Longitude non valide', '经度无效'],
  'Το περιεχόμενο αυτό διαχειρίζεται μόνο ο διαχειριστής': ['Only an administrator manages this content', 'Solo un administrador gestiona este contenido', 'Seul un administrateur gère ce contenu', '此内容仅由管理员管理'],
  'Η εγγραφή δεν βρέθηκε': ['Record not found', 'Registro no encontrado', 'Enregistrement introuvable', '未找到记录'],
  'Η εγγραφή δεν σου ανήκει': ['This record is not yours', 'Este registro no es tuyo', 'Cet enregistrement ne vous appartient pas', '该记录不属于您'],
  'Μη μεταφράσιμο πεδίο': ['This field cannot be translated', 'Campo no traducible', 'Champ non traduisible', '该字段不可翻译'],
  'Δεν υποστηρίζεται αναφορά για αυτή την οντότητα': ['Reporting is not supported for this entity', 'No se admite informe para esta entidad', 'Le signalement n\'est pas pris en charge pour cette entité', '该实体不支持举报'],
  'Δεν βρέθηκε αρχείο': ['No file was found', 'No se encontró ningún archivo', 'Aucun fichier trouvé', '未找到文件'],
  'Μη επιτρεπόμενος τύπος αρχείου': ['File type not allowed', 'Tipo de archivo no permitido', 'Type de fichier non autorisé', '不允许的文件类型'],
  'Το αρχείο δεν αντιστοιχεί στον δηλωμένο τύπο': ['The file does not match the declared type', 'El archivo no coincide con el tipo declarado', 'Le fichier ne correspond pas au type déclaré', '文件与声明的类型不符'],
  'Το αρχείο δεν είναι έγκυρο WebP': ['The file is not valid WebP', 'El archivo no es un WebP válido', 'Le fichier n\'est pas un WebP valide', '文件不是有效的 WebP'],
  'Σφάλμα κατά το upload': ['Upload failed', 'Error al subir', 'Échec du téléversement', '上传失败'],
  'user_id ή cookie_id απαιτείται': ['user_id or cookie_id is required', 'Se requiere user_id o cookie_id', 'user_id ou cookie_id est requis', '需要 user_id 或 cookie_id'],
  'Απαιτείται σύνδεση': ['You need to be logged in', 'Se requiere iniciar sesión', 'Connexion requise', '需要登录'],
  'Έχεις ήδη ενεργό αίτημα διαγραφής': ['You already have an active deletion request', 'Ya tienes una solicitud de eliminación activa', 'Vous avez déjà une demande de suppression en cours', '您已有一个有效的删除请求'],
  'Το αίτημα καταχωρήθηκε. Ο λογαριασμός σου θα διαγραφεί οριστικά σε 30 μέρες. Μπορείς να ακυρώσεις το αίτημα οποιαδήποτε στιγμή.': ['Your request has been recorded. Your account will be permanently deleted in 30 days. You can cancel the request at any time.', 'Tu solicitud ha sido registrada. Tu cuenta se eliminará definitivamente en 30 días. Puedes cancelar la solicitud en cualquier momento.', 'Votre demande a été enregistrée. Votre compte sera définitivement supprimé dans 30 jours. Vous pouvez annuler à tout moment.', '您的请求已登记。您的账号将在 30 天后永久删除。您可随时取消该请求。'],
  'Δεν βρέθηκε ενεργό αίτημα διαγραφής': ['No active deletion request was found', 'No se encontró ninguna solicitud de eliminación activa', 'Aucune demande de suppression active trouvée', '未找到有效的删除请求'],
  'Το αίτημα διαγραφής ακυρώθηκε': ['The deletion request has been cancelled', 'La solicitud de eliminación ha sido cancelada', 'La demande de suppression a été annulée', '删除请求已取消'],
  'Κανένα επιτρεπόμενο πεδίο για ενημέρωση': ['No permitted fields to update', 'Ningún campo permitido para actualizar', 'Aucun champ autorisé à mettre à jour', '没有可更新的允许字段'],
  'Δεν υπάρχουν πεδία για ενημέρωση': ['There are no fields to update', 'No hay campos para actualizar', 'Aucun champ à mettre à jour', '没有要更新的字段'],
  'Τρέχων και νέος κωδικός είναι υποχρεωτικοί': ['The current and new passwords are required', 'La contraseña actual y la nueva son obligatorias', 'Les mots de passe actuel et nouveau sont obligatoires', '当前密码和新密码为必填项'],
  'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες': ['The new password must be at least 8 characters', 'La nueva contraseña debe tener al menos 8 caracteres', 'Le nouveau mot de passe doit contenir au moins 8 caractères', '新密码至少需要 8 个字符'],
  'Δεν είναι δυνατή η αλλαγή κωδικού για αυτόν τον χρήστη (πιθανώς συνδέθηκε με Google/Facebook)': ['The password cannot be changed for this user (they probably signed in with Google or Facebook)', 'No se puede cambiar la contraseña de este usuario (probablemente inició sesión con Google o Facebook)', 'Le mot de passe ne peut pas être modifié pour cet utilisateur (connexion via Google ou Facebook)', '无法更改该用户的密码（可能使用 Google 或 Facebook 登录）'],
  'Λανθασμένος τρέχων κωδικός': ['The current password is incorrect', 'La contraseña actual es incorrecta', 'Le mot de passe actuel est incorrect', '当前密码不正确'],
  'Ο νέος κωδικός είναι ίδιος με τον τρέχοντα': ['The new password is the same as the current one', 'La nueva contraseña es igual a la actual', 'Le nouveau mot de passe est identique à l\'actuel', '新密码与当前密码相同'],
  'Λείπει product_id': ['product_id is missing', 'Falta product_id', 'product_id est manquant', '缺少 product_id'],
  'Η συνεδρία δεν έχει πληρωθεί ακόμα': ['The session has not been paid yet', 'La sesión aún no se ha pagado', 'La séance n\'a pas encore été payée', '该问诊尚未付款'],
  'Η συνεδρία έχει ακυρωθεί': ['The session has been cancelled', 'La sesión ha sido cancelada', 'La séance a été annulée', '该问诊已取消'],
  'Η ακύρωση δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.': ['The cancellation could not be completed with the payment provider. Nothing was changed — please try again shortly.', 'No se pudo completar la cancelación con el proveedor de pagos. No se ha cambiado nada; inténtalo de nuevo en unos minutos.', 'L\'annulation n\'a pas pu être finalisée auprès du prestataire de paiement. Rien n\'a été modifié — réessayez dans un instant.', '无法在支付服务商处完成取消。未做任何更改，请稍后重试。'],
  // Εκδηλώσεις με πληρωμή — ακεραιότητα χρημάτων
  'Υπάρχουν πληρωμένες συμμετοχές ή πληρωμές σε εξέλιξη — ακύρωσέ τες ή επικοινώνησε με την υποστήριξη. Η εκδήλωση δεν διαγράφηκε.': ['There are paid registrations or payments in progress — cancel them or contact support. The event was not deleted.', 'Hay inscripciones pagadas o pagos en curso: cancélalos o contacta con soporte. El evento no se ha eliminado.', 'Des inscriptions payées ou des paiements en cours existent — annulez-les ou contactez le support. L\'événement n\'a pas été supprimé.', '存在已付款的报名或进行中的付款——请先取消或联系客服。活动未被删除。'],
  'Υπάρχουν πληρωμένες συμμετοχές: η ημερομηνία, η ώρα, η τιμή και το νόμισμα δεν αλλάζουν πλέον. Επικοινώνησε με την υποστήριξη.': ['There are paid registrations: the date, time, price and currency can no longer be changed. Contact support.', 'Hay inscripciones pagadas: la fecha, la hora, el precio y la moneda ya no se pueden cambiar. Contacta con soporte.', 'Des inscriptions ont été payées : la date, l\'heure, le prix et la devise ne peuvent plus être modifiés. Contactez le support.', '已有付款报名：日期、时间、价格和币种不能再更改。请联系客服。'],
  'Εκκρεμεί επιστροφή χρημάτων για τη συμμετοχή σου — επικοινώνησε με την υποστήριξη πριν δηλώσεις ξανά.': ['A refund for your registration is still pending — contact support before registering again.', 'Hay un reembolso pendiente de tu inscripción: contacta con soporte antes de inscribirte de nuevo.', 'Un remboursement de votre inscription est en attente — contactez le support avant de vous réinscrire.', '您的报名仍有待处理的退款——请先联系客服再重新报名。'],
  'Η ακύρωση είναι ήδη σε εξέλιξη': ['The cancellation is already in progress', 'La cancelación ya está en curso', 'L\'annulation est déjà en cours', '取消已在处理中'],
  'Η συμμετοχή άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.': ['Your registration changed in the meantime — refresh the page and try again.', 'Tu inscripción ha cambiado entretanto: actualiza la página e inténtalo de nuevo.', 'Votre inscription a changé entre-temps — actualisez la page et réessayez.', '您的报名状态已发生变化——请刷新页面后重试。'],
  'Για εκδήλωση με τιμή, η ημερομηνία πρέπει να έχει μορφή ΕΕΕΕ-ΜΜ-ΗΗ και η ώρα ΩΩ:ΛΛ': ['For a paid event, the date must be in YYYY-MM-DD format and the time in HH:MM', 'Para un evento de pago, la fecha debe tener el formato AAAA-MM-DD y la hora HH:MM', 'Pour un événement payant, la date doit être au format AAAA-MM-JJ et l\'heure HH:MM', '付费活动的日期格式必须为 YYYY-MM-DD，时间格式为 HH:MM'],
  'Οι πληρωμές εκδηλώσεων γίνονται μόνο σε ευρώ (EUR)': ['Event payments are only accepted in euros (EUR)', 'Los pagos de eventos solo se aceptan en euros (EUR)', 'Les paiements d\'événements sont acceptés uniquement en euros (EUR)', '活动付款仅接受欧元 (EUR)'],
  'Η υπηρεσία χαρτών είναι απασχολημένη — δοκίμασε σε λίγο': ['The map service is busy — try again shortly', 'El servicio de mapas está ocupado: inténtalo en un momento', 'Le service de cartes est occupé — réessayez dans un instant', '地图服务繁忙——请稍后再试'],
  'Η κλήση είναι διαθέσιμη από 30 λεπτά πριν έως 3 ώρες μετά την ώρα της συνεδρίας': ['The call is available from 30 minutes before until 3 hours after the session time', 'La llamada está disponible desde 30 minutos antes hasta 3 horas después de la hora de la sesión', 'L\'appel est disponible de 30 minutes avant à 3 heures après l\'heure de la séance', '通话可在问诊时间前 30 分钟至后 3 小时内进行'],
}

const IDX: Record<Exclude<Lang, 'el'>, number> = { en: 0, es: 1, fr: 2, zh: 3 }

/** Μεταφράζει ένα μήνυμα. Άγνωστο ή ελληνικά → αυτούσιο. */
export function translateMessage(text: string, lang: Lang): string {
  if (lang === 'el') return text
  const row = MESSAGES[text]
  return row ? row[IDX[lang]] : text
}

/** Γλώσσα αιτήματος: χρήστης → Accept-Language → ελληνικά. */
function langOfRequest(req: any): Lang {
  const fromUser = (req.user?.preferred_language || '').slice(0, 2)
  if (LANGS.includes(fromUser as Lang)) return fromUser as Lang
  const header = String(req.headers?.['accept-language'] || '')
  // «fr-FR,fr;q=0.9,en;q=0.8» → δοκιμάζουμε με τη σειρά προτίμησης
  for (const part of header.split(',')) {
    const code = part.trim().split(';')[0].slice(0, 2).toLowerCase()
    if (LANGS.includes(code as Lang)) return code as Lang
  }
  return 'el'
}

/**
 * Εγκατάσταση στον server. Καλείται ΜΙΑ φορά, μετά τα plugins και πριν
 * τα routes.
 */
export function registerMessageTranslation(app: FastifyInstance): void {
  app.addHook('onSend', async (req: any, _reply, payload: any) => {
    // Μόνο JSON απαντήσεις μας αφορούν· ό,τι άλλο περνά ανέπαφο.
    if (typeof payload !== 'string' || !payload.startsWith('{')) return payload
    const lang = langOfRequest(req)
    if (lang === 'el') return payload
    try {
      const body = JSON.parse(payload)
      let changed = false
      for (const field of ['message', 'error'] as const) {
        const v = body[field]
        if (typeof v === 'string') {
          const tr = translateMessage(v, lang)
          if (tr !== v) { body[field] = tr; changed = true }
        }
      }
      return changed ? JSON.stringify(body) : payload
    } catch {
      // Μη έγκυρο JSON: το αφήνουμε όπως είναι αντί να σπάσουμε την απάντηση.
      return payload
    }
  })
}
