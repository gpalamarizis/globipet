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
