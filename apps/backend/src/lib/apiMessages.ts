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
  'Συμπλήρωσε πρώτα την ημερομηνία γέννησής σου για να συνεχίσεις.': ['Please enter your date of birth first to continue.', 'Introduce primero tu fecha de nacimiento para continuar.', 'Indique d\'abord votre date de naissance pour continuer.', '请先填写您的出生日期以继续。'],
  'Η εγγραφή υπάρχει ήδη': ['This record already exists', 'Este registro ya existe', 'Cet enregistrement existe déjà', '该记录已存在'],
  'Μη αποδεκτή υπηρεσία ειδοποιήσεων': ['Unsupported notification service', 'Servicio de notificaciones no admitido', 'Service de notifications non pris en charge', '不支持的通知服务'],
  'Το αίτημα διαγραφής λόγω ηλικίας ακυρώνεται μόνο από την υποστήριξη.': ['An age-related deletion request can only be cancelled by support.', 'Una solicitud de eliminación por motivos de edad solo puede cancelarla el equipo de soporte.', 'Une demande de suppression liée à l\'âge ne peut être annulée que par le support.', '因年龄原因提交的删除请求只能由客服取消。'],
  'Επιβεβαίωσε πρώτα το email σου για να δεις τον ιατρικό φάκελο που σου κοινοποιήθηκε.': ['Please confirm your email first to view the medical record shared with you.', 'Confirma primero tu email para ver el historial médico que se ha compartido contigo.', 'Confirmez d\'abord votre e-mail pour consulter le dossier médical partagé avec vous.', '请先验证您的邮箱，才能查看与您共享的医疗档案。'],
  'Το εργαλείο SQL δεν είναι διαθέσιμο: δεν έχει οριστεί σύνδεση μόνο ανάγνωσης στη βάση.': ['The SQL tool is not available: no read-only database connection has been configured.', 'La herramienta SQL no está disponible: no se ha configurado una conexión de solo lectura a la base de datos.', 'L\'outil SQL n\'est pas disponible : aucune connexion en lecture seule à la base de données n\'a été configurée.', 'SQL 工具不可用：尚未配置只读数据库连接。'],
  'Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή — δοκίμασε ξανά σε λίγο': ['The AI service is not available right now — please try again shortly', 'El servicio de IA no está disponible en este momento — inténtalo de nuevo en un momento', 'Le service d\'IA n\'est pas disponible pour le moment — réessayez dans un instant', 'AI 服务暂时不可用，请稍后重试'],
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
  'Το ποσοστό πρέπει να είναι κάτω από 100 — δωρεάν παροχή μόνο μετά από συμφωνία με την GlobiPet': ['The percentage must be below 100 — free offers only by agreement with GlobiPet', 'El porcentaje debe ser inferior a 100: ofertas gratuitas solo previo acuerdo con GlobiPet', 'Le pourcentage doit être inférieur à 100 — offres gratuites uniquement sur accord avec GlobiPet', '百分比必须低于 100——免费优惠需与 GlobiPet 协商同意'],
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
  'Η ακύρωση αυτής της συνεδρίας έχει χρέωση — χρησιμοποίησε την ενημερωμένη εφαρμογή ή επικοινώνησε με την υποστήριξη.': ['Cancelling this session incurs a charge — please use the updated app or contact support.', 'Cancelar esta sesión tiene un cargo: usa la versión actualizada de la app o contacta con soporte.', 'L\'annulation de cette séance est payante — utilisez la version à jour de l\'application ou contactez le support.', '取消此问诊会产生费用——请使用最新版应用或联系客服。'],
  'Η ημερομηνία και η ώρα αλλάζουν έως 24 ώρες πριν από το ραντεβού.': ['The date and time can be changed up to 24 hours before the appointment.', 'La fecha y la hora se pueden cambiar hasta 24 horas antes de la cita.', 'La date et l\'heure peuvent être modifiées jusqu\'à 24 heures avant le rendez-vous.', '日期和时间最晚可在预约前 24 小时更改。'],
  'Η νέα ημερομηνία και ώρα πρέπει να είναι στο μέλλον.': ['The new date and time must be in the future.', 'La nueva fecha y hora deben ser futuras.', 'La nouvelle date et heure doivent être dans le futur.', '新的日期和时间必须是将来的时间。'],
  'Η κράτηση έχει πληρωθεί· για ακύρωση επικοινώνησε με την υποστήριξη.': ['The booking has been paid; to cancel it, please contact support.', 'La reserva ya está pagada; para cancelarla, contacta con soporte.', 'La réservation a été payée ; pour l\'annuler, contactez le support.', '该预约已付款；如需取消，请联系客服。'],
  'Η συνεδρία έχει πληρωθεί· για ακύρωση επικοινώνησε με την υποστήριξη.': ['The session has been paid; to cancel it, please contact support.', 'La sesión ya está pagada; para cancelarla, contacta con soporte.', 'La séance a été payée ; pour l\'annuler, contactez le support.', '该问诊已付款；如需取消，请联系客服。'],
  'Η παραγγελία έχει ακυρωθεί': ['The order has been cancelled', 'El pedido ha sido cancelado', 'La commande a été annulée', '该订单已取消'],
  'Η παραγγελία δεν μπορεί πλέον να πληρωθεί': ['This order can no longer be paid', 'Este pedido ya no se puede pagar', 'Cette commande ne peut plus être payée', '该订单已无法付款'],
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
  'Το αίτημα δεν βρέθηκε': ['Request not found', 'Solicitud no encontrada', 'Demande introuvable', '未找到该请求'],
  'Το αίτημα δεν είναι πλέον ενεργό': ['The request is no longer active', 'La solicitud ya no está activa', 'La demande n\'est plus active', '该请求已不再有效'],
  'Γράψε μια σύντομη σημείωση (τουλάχιστον 3 χαρακτήρες).': ['Write a short note (at least 3 characters).', 'Escribe una nota breve (al menos 3 caracteres).', 'Rédigez une courte note (au moins 3 caractères).', '请填写简短备注（至少 3 个字符）。'],
  'Το αίτημα το έκανε ο ίδιος ο χρήστης — μόνο εκείνος μπορεί να το ακυρώσει.': ['The user made this request themselves — only they can cancel it.', 'La solicitud la hizo el propio usuario: solo él puede cancelarla.', 'Cette demande a été faite par l\'utilisateur lui-même : lui seul peut l\'annuler.', '该请求由用户本人提出，只有用户本人可以取消。'],
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
  'Έχεις ήδη συνδρομή σε παύση για αυτό το προϊόν': ['You already have a paused subscription for this product', 'Ya tienes una suscripción en pausa para este producto', 'Vous avez déjà un abonnement en pause pour ce produit', '您已有该产品的已暂停订阅'],
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
  // Ακύρωση τηλεϊατρικής (lib/cancellation → cancelTelehealth)
  'Η ώρα της συνεδρίας έχει περάσει — η συνεδρία δεν ακυρώνεται πλέον.': ['The session time has passed — the session can no longer be cancelled.', 'La hora de la sesión ya ha pasado: la sesión ya no se puede cancelar.', 'L\'heure de la séance est passée — la séance ne peut plus être annulée.', '问诊时间已过——该问诊无法再取消。'],
  'Η συνεδρία δεν μπορεί να ακυρωθεί σε αυτή την κατάσταση.': ['The session cannot be cancelled in its current status.', 'La sesión no se puede cancelar en este estado.', 'La séance ne peut pas être annulée dans cet état.', '该问诊在当前状态下无法取消。'],
  'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η συνεδρία δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.': ['The refund could not be completed, so the session was not cancelled. Please try again shortly.', 'No se pudo completar el reembolso, así que la sesión no se ha cancelado. Inténtalo de nuevo en un momento.', 'Le remboursement n\'a pas abouti, la séance n\'a donc pas été annulée. Réessayez dans un instant.', '退款未完成，因此问诊未取消。请稍后重试。'],
  'Η συνεδρία άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.': ['The session changed in the meantime — refresh the page and try again.', 'La sesión ha cambiado entretanto: actualiza la página e inténtalo de nuevo.', 'La séance a changé entre-temps — actualisez la page et réessayez.', '该问诊已发生变化——请刷新页面后重试。'],
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
  'Η δήλωση δεν είναι δυνατή αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.': ['Registration is not possible right now. Please try again shortly.', 'La inscripción no es posible en este momento. Inténtalo de nuevo en un momento.', 'L\'inscription n\'est pas possible pour le moment. Réessayez dans un instant.', '目前无法报名，请稍后再试。'],
  'Η εκδήλωση έχει ήδη ξεκινήσει ή πραγματοποιηθεί — η ακύρωση με επιστροφές γίνεται μόνο από την υποστήριξη.': ['The event has already started or taken place — only support can cancel it with refunds.', 'El evento ya ha empezado o se ha celebrado: solo el equipo de soporte puede cancelarlo con reembolsos.', 'L\'événement a déjà commencé ou eu lieu — seul le support peut l\'annuler avec remboursements.', '活动已开始或已举行——只有客服可以取消并退款。'],
  'Η εικόνα είναι πολύ μεγάλη (έως 5MB)': ['The image is too large (max 5MB)', 'La imagen es demasiado grande (máx. 5 MB)', 'L\'image est trop volumineuse (5 Mo max.)', '图片过大（最大 5MB）'],
  'Η κλήση είναι διαθέσιμη από 30 λεπτά πριν έως 3 ώρες μετά την ώρα της συνεδρίας':['The call is available from 30 minutes before until 3 hours after the session time', 'La llamada está disponible desde 30 minutos antes hasta 3 horas después de la hora de la sesión', 'L\'appel est disponible de 30 minutes avant à 3 heures après l\'heure de la séance', '通话可在问诊时间前 30 分钟至后 3 小时内进行'],
  // ── Ε10: μηνύματα που έλειπαν (επέστρεφαν πάντα ελληνικά) ──────────────
  // Πληρωμές / επαλήθευση
  'Η πληρωμή δεν ξεκίνησε.': ['The payment could not be started.', 'No se pudo iniciar el pago.', 'Le paiement n\'a pas pu être lancé.', '无法发起付款。'],
  'Μη έγκυρο αναγνωριστικό συναλλαγής': ['Invalid transaction ID', 'Identificador de transacción no válido', 'Identifiant de transaction non valide', '交易编号无效'],
  'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.': ['The payment could not be verified yet. Please try again shortly.', 'No se pudo completar la verificación del pago. Inténtalo de nuevo en un momento.', 'La vérification du paiement n\'a pas abouti. Réessayez dans un instant.', '付款验证未完成，请稍后重试。'],
  'Η κράτηση δεν μπορεί πλέον να πληρωθεί': ['This booking can no longer be paid', 'Esta reserva ya no se puede pagar', 'Cette réservation ne peut plus être payée', '该预约已无法付款'],
  'Η συνδρομή δεν δημιουργήθηκε.': ['The subscription was not created.', 'No se ha creado la suscripción.', 'L\'abonnement n\'a pas été créé.', '订阅未创建。'],
  'Η αλλαγή δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.': ['The change could not be completed with the payment provider. Nothing was changed — please try again shortly.', 'No se pudo completar el cambio con el proveedor de pagos. No se ha cambiado nada; inténtalo de nuevo en unos minutos.', 'La modification n\'a pas pu être effectuée auprès du prestataire de paiement. Rien n\'a été modifié — réessayez dans un instant.', '无法在支付服务商处完成更改。未做任何更改，请稍后重试。'],
  // Κρατήσεις
  'Η ώρα του ραντεβού έχει περάσει — η κράτηση δεν ακυρώνεται πλέον.': ['The appointment time has passed — the booking can no longer be cancelled.', 'La hora de la cita ya ha pasado: la reserva ya no se puede cancelar.', 'L\'heure du rendez-vous est passée — la réservation ne peut plus être annulée.', '预约时间已过——该预约无法再取消。'],
  'Η κράτηση δεν μπορεί να ακυρωθεί σε αυτή την κατάσταση.': ['The booking cannot be cancelled in its current status.', 'La reserva no se puede cancelar en este estado.', 'La réservation ne peut pas être annulée dans cet état.', '该预约在当前状态下无法取消。'],
  'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η κράτηση δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.': ['The refund could not be completed, so the booking was not cancelled. Please try again shortly.', 'No se pudo completar el reembolso, así que la reserva no se ha cancelado. Inténtalo de nuevo en un momento.', 'Le remboursement n\'a pas abouti, la réservation n\'a donc pas été annulée. Réessayez dans un instant.', '退款未完成，因此预约未取消。请稍后重试。'],
  'Η κράτηση άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.': ['The booking changed in the meantime — refresh the page and try again.', 'La reserva ha cambiado entretanto: actualiza la página e inténtalo de nuevo.', 'La réservation a changé entre-temps — actualisez la page et réessayez.', '该预约已发生变化——请刷新页面后重试。'],
  'Μόνο κράτηση σε αναμονή επιβεβαιώνεται': ['Only a pending booking can be confirmed', 'Solo se puede confirmar una reserva pendiente', 'Seule une réservation en attente peut être confirmée', '只有待确认的预约才能确认'],
  'Μόνο επιβεβαιωμένη κράτηση σημειώνεται ως «δεν προσήλθε»': ['Only a confirmed booking can be marked as a no-show', 'Solo una reserva confirmada se puede marcar como «no se presentó»', 'Seule une réservation confirmée peut être marquée « absent »', '只有已确认的预约才能标记为“未到场”'],
  // Εκδηλώσεις
  'Μη εξουσιοδοτημένη πρόσβαση': ['Unauthorised access', 'Acceso no autorizado', 'Accès non autorisé', '未经授权的访问'],
  'Η εκδήλωση ακυρώθηκε από τον διοργανωτή': ['The event was cancelled by the organizer', 'El evento ha sido cancelado por el organizador', 'L\'événement a été annulé par l\'organisateur', '该活动已被组织者取消'],
  'Υπάρχουν πληρωμένες συμμετοχές ή επιστροφές σε εξέλιξη — χρησιμοποίησε την «Ακύρωση εκδήλωσης» ώστε να επιστραφούν τα χρήματα. Η εκδήλωση δεν διαγράφηκε.': ['There are paid registrations or refunds in progress — use “Cancel event” so the money is refunded. The event was not deleted.', 'Hay inscripciones pagadas o reembolsos en curso: usa «Cancelar evento» para que se devuelva el dinero. El evento no se ha eliminado.', 'Des inscriptions payées ou des remboursements sont en cours — utilisez « Annuler l\'événement » pour que l\'argent soit remboursé. L\'événement n\'a pas été supprimé.', '存在已付款的报名或进行中的退款——请使用“取消活动”以退还款项。活动未被删除。'],
  'Η ακύρωση δεν ξεκίνησε. Δοκίμασε ξανά σε λίγο.': ['The cancellation could not be started. Please try again shortly.', 'No se pudo iniciar la cancelación. Inténtalo de nuevo en un momento.', 'L\'annulation n\'a pas pu démarrer. Réessayez dans un instant.', '无法开始取消，请稍后重试。'],
  'Η εκδήλωση ακυρώθηκε, αλλά κάποιες επιστροφές χρημάτων δεν ολοκληρώθηκαν. Δοκίμασε ξανά σε λίγο.': ['The event was cancelled, but some refunds were not completed. Please try again shortly.', 'El evento se ha cancelado, pero algunos reembolsos no se han completado. Inténtalo de nuevo en un momento.', 'L\'événement a été annulé, mais certains remboursements n\'ont pas abouti. Réessayez dans un instant.', '活动已取消，但部分退款尚未完成。请稍后重试。'],
  'Η ακύρωση δεν ολοκληρώθηκε. Δοκίμασε ξανά.': ['The cancellation was not completed. Please try again.', 'La cancelación no se ha completado. Inténtalo de nuevo.', 'L\'annulation n\'a pas abouti. Réessayez.', '取消未完成，请重试。'],
  // Εισαγωγές / διαχείριση
  'Δεν υπάρχουν εγγραφές για εισαγωγή': ['There are no rows to import', 'No hay registros para importar', 'Aucune ligne à importer', '没有可导入的记录'],
  'Λείπουν υποχρεωτικά πεδία (name, price, category)': ['Required fields are missing (name, price, category)', 'Faltan campos obligatorios (name, price, category)', 'Des champs obligatoires sont manquants (name, price, category)', '缺少必填字段（name、price、category）'],
  'Λείπουν υποχρεωτικά πεδία (provider_name, provider_email, service_type, city)': ['Required fields are missing (provider_name, provider_email, service_type, city)', 'Faltan campos obligatorios (provider_name, provider_email, service_type, city)', 'Des champs obligatoires sont manquants (provider_name, provider_email, service_type, city)', '缺少必填字段（provider_name、provider_email、service_type、city）'],
  'Λείπει το όνομα εταιρείας': ['The company name is missing', 'Falta el nombre de la empresa', 'Le nom de la société est manquant', '缺少公司名称'],
  'Ο στόχος δεν σου ανήκει': ['This target is not yours', 'Este objetivo no es tuyo', 'Cette cible ne vous appartient pas', '该目标不属于您'],
  'Το αρχείο είναι πολύ μεγάλο (25MB για βίντεο)': ['The file is too large (25MB for videos)', 'El archivo es demasiado grande (25 MB para vídeos)', 'Le fichier est trop volumineux (25 Mo pour les vidéos)', '文件过大（视频最大 25MB）'],
  'Το αρχείο είναι πολύ μεγάλο (5MB)': ['The file is too large (5MB)', 'El archivo es demasiado grande (5 MB)', 'Le fichier est trop volumineux (5 Mo)', '文件过大（最大 5MB）'],
  // Γενικά / επικύρωση
  'Μη έγκυρα δεδομένα': ['Invalid data', 'Datos no válidos', 'Données non valides', '数据无效'],
  'Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.': ['Something went wrong. Please try again shortly.', 'Algo ha salido mal. Inténtalo de nuevo en un momento.', 'Une erreur s\'est produite. Réessayez dans un instant.', '出了点问题，请稍后重试。'],
  'Η ανάλυση δεν ολοκληρώθηκε.': ['The analysis could not be completed.', 'No se pudo completar el análisis.', 'L\'analyse n\'a pas pu être effectuée.', '分析未完成。'],
  'Η ενέργεια δεν ολοκληρώθηκε.': ['The action could not be completed.', 'No se pudo completar la acción.', 'L\'action n\'a pas pu être effectuée.', '操作未完成。'],
  'Μη έγκυρη διεύθυνση email': ['Invalid email address', 'Dirección de email no válida', 'Adresse e-mail non valide', '邮箱地址无效'],
  'Η διεύθυνση email είναι υπερβολικά μεγάλη': ['The email address is too long', 'La dirección de email es demasiado larga', 'L\'adresse e-mail est trop longue', '邮箱地址过长'],
  'Το τηλέφωνο είναι υπερβολικά μεγάλο': ['The phone number is too long', 'El teléfono es demasiado largo', 'Le numéro de téléphone est trop long', '电话号码过长'],
  'Η διεύθυνση πρέπει να ξεκινά με http:// ή https://': ['The address must start with http:// or https://', 'La dirección debe empezar por http:// o https://', 'L\'adresse doit commencer par http:// ou https://', '地址必须以 http:// 或 https:// 开头'],
  'Ο κωδικός είναι υπερβολικά μεγάλος': ['The password is too long', 'La contraseña es demasiado larga', 'Le mot de passe est trop long', '密码过长'],
  'Ο κωδικός είναι υποχρεωτικός': ['The password is required', 'La contraseña es obligatoria', 'Le mot de passe est obligatoire', '密码为必填项'],
  'Μη έγκυρος σύνδεσμος επαναφοράς': ['Invalid reset link', 'Enlace de restablecimiento no válido', 'Lien de réinitialisation non valide', '重置链接无效'],
  'Πρέπει να αποδεχτείς τους Όρους Χρήσης και την Πολιτική Απορρήτου': ['You must accept the Terms of Use and the Privacy Policy', 'Debes aceptar las Condiciones de uso y la Política de privacidad', 'Vous devez accepter les Conditions d\'utilisation et la Politique de confidentialité', '您必须接受使用条款和隐私政策'],
  'Το βιογραφικό ξεπερνά τους 2000 χαρακτήρες': ['The bio exceeds 2000 characters', 'La biografía supera los 2000 caracteres', 'La biographie dépasse 2000 caractères', '个人简介超过 2000 个字符'],
  'Το πεδίο ονοματεπώνυμο είναι υποχρεωτικό': ['The full name field is required', 'El campo nombre completo es obligatorio', 'Le champ nom complet est obligatoire', '姓名为必填项'],
  'Το πεδίο ονοματεπώνυμο ξεπερνά τους 120 χαρακτήρες': ['The full name field exceeds 120 characters', 'El campo nombre completo supera los 120 caracteres', 'Le champ nom complet dépasse 120 caractères', '姓名超过 120 个字符'],
  // Αποτυχημένες επιστροφές (routes/admin-refunds.ts, routes/admin.ts)
  'Έχει ήδη σημειωθεί ως λυμένο': ['Already marked as resolved', 'Ya está marcado como resuelto', 'Déjà marqué comme résolu', '已标记为已解决'],
  'Γράψε σημείωση για το πώς λύθηκε η επιστροφή': ['Write a note on how the refund was resolved', 'Escribe una nota sobre cómo se resolvió el reembolso', 'Rédigez une note expliquant comment le remboursement a été réglé', '请填写退款如何解决的备注'],
  'Δεν ήταν δυνατός ο έλεγχος της συναλλαγής στη Viva — δεν έγινε επιστροφή': ['The transaction could not be checked with Viva — no refund was made', 'No se pudo comprobar la transacción en Viva: no se ha realizado ningún reembolso', 'Impossible de vérifier la transaction auprès de Viva — aucun remboursement n\'a été effectué', '无法在 Viva 核查该交易——未进行退款'],
  'Η επιστροφή δεν είναι σε κατάσταση αποτυχίας — ανανέωσε τη σελίδα': ['The refund is not in a failed state — refresh the page', 'El reembolso no está en estado fallido: actualiza la página', 'Le remboursement n\'est pas en échec — actualisez la page', '该退款不处于失败状态——请刷新页面'],
  'Η νέα απόπειρα επιστροφής γίνεται μόνο για συμμετοχές σε εκδηλώσεις': ['A refund can only be retried for event registrations', 'Solo se puede reintentar el reembolso de inscripciones a eventos', 'Une nouvelle tentative de remboursement n\'est possible que pour les inscriptions aux événements', '仅活动报名可重新尝试退款'],
  'Η συναλλαγή εμφανίζεται ήδη επιστραμμένη στη Viva — χρησιμοποίησε «Σήμανση ως λυμένο»': ['The transaction already shows as refunded in Viva — use “Mark as resolved”', 'La transacción ya figura como reembolsada en Viva: usa «Marcar como resuelto»', 'La transaction apparaît déjà comme remboursée chez Viva — utilisez « Marquer comme résolu »', '该交易在 Viva 中已显示为已退款——请使用“标记为已解决”'],
  'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο': ['Temporary error — try again shortly', 'Error temporal: inténtalo de nuevo en un momento', 'Erreur temporaire — réessayez dans un instant', '临时错误——请稍后重试'],
  'Το ποσό δεν συμφωνεί με το πληρωμένο — ανανέωσε τη σελίδα': ['The amount does not match what was paid — refresh the page', 'El importe no coincide con lo pagado: actualiza la página', 'Le montant ne correspond pas à ce qui a été payé — actualisez la page', '金额与已付款金额不符——请刷新页面'],
  'Η επιστροφή είναι σε εξέλιξη — θα ενημερωθείς': ['The refund is in progress — we will let you know', 'El reembolso está en curso: te avisaremos', 'Le remboursement est en cours — nous vous tiendrons informé', '退款正在处理中——我们会通知您'],
  'Η επιστροφή είναι ήδη σε εξέλιξη': ['The refund is already in progress', 'El reembolso ya está en curso', 'Le remboursement est déjà en cours', '退款已在处理中'],
  // Ε12
  'Αποσυνδέθηκες από όλες τις συσκευές': ['You have been signed out of all devices', 'Has cerrado sesión en todos los dispositivos', 'Vous avez été déconnecté de tous les appareils', '您已在所有设备上退出登录'],
  'Μη έγκυρος σύνδεσμος επιβεβαίωσης': ['Invalid confirmation link', 'Enlace de confirmación no válido', 'Lien de confirmation non valide', '确认链接无效'],
  'Μη έγκυρος ή ληγμένος σύνδεσμος επιβεβαίωσης': ['Invalid or expired confirmation link', 'Enlace de confirmación no válido o caducado', 'Lien de confirmation non valide ou expiré', '确认链接无效或已过期'],
  'Το email σου επιβεβαιώθηκε': ['Your email is confirmed', 'Tu email está confirmado', 'Votre e-mail est confirmé', '您的邮箱已确认'],
  'Το email σου είναι ήδη επιβεβαιωμένο': ['Your email is already confirmed', 'Tu email ya está confirmado', 'Votre e-mail est déjà confirmé', '您的邮箱已确认'],
  'Σου στείλαμε νέο email επιβεβαίωσης': ['We sent you a new confirmation email', 'Te hemos enviado un nuevo email de confirmación', 'Nous vous avons envoyé un nouvel e-mail de confirmation', '我们已向您发送新的确认邮件'],
  'Η σύνδεση με Google δεν είναι διαθέσιμη αυτή τη στιγμή': ['Google sign-in is not available right now', 'El inicio de sesión con Google no está disponible en este momento', 'La connexion avec Google n\'est pas disponible pour le moment', 'Google 登录暂时不可用'],
  'Η σύνδεση με Facebook δεν είναι διαθέσιμη αυτή τη στιγμή': ['Facebook sign-in is not available right now', 'El inicio de sesión con Facebook no está disponible en este momento', 'La connexion avec Facebook n\'est pas disponible pour le moment', 'Facebook 登录暂时不可用'],
  'Το email του λογαριασμού Google δεν είναι επιβεβαιωμένο': ['The email of your Google account is not verified', 'El email de tu cuenta de Google no está verificado', 'L\'e-mail de votre compte Google n\'est pas vérifié', '您的 Google 账户邮箱尚未验证'],
  'Μη έγκυρη διεύθυνση φωτογραφίας': ['Invalid photo address', 'Dirección de la foto no válida', 'Adresse de la photo non valide', '照片地址无效'],
  'Έχεις ήδη ενεργή συνδρομή AI': ['You already have an active AI subscription', 'Ya tienes una suscripción de IA activa', 'Vous avez déjà un abonnement IA actif', '您已有有效的 AI 订阅'],
  'Η συνδρομή AI σου έχει εκκρεμή πληρωμή — ακύρωσέ τη πριν ξεκινήσεις νέα': ['Your AI subscription has a pending payment — cancel it before starting a new one', 'Tu suscripción de IA tiene un pago pendiente: cancélala antes de empezar una nueva', 'Votre abonnement IA a un paiement en attente — résiliez-le avant d\'en souscrire un nouveau', '您的 AI 订阅有待处理的付款——请先取消再开始新的订阅'],
  'Δεν υπάρχει ενεργή συνδρομή AI για ακύρωση': ['There is no active AI subscription to cancel', 'No hay ninguna suscripción de IA activa que cancelar', 'Aucun abonnement IA actif à résilier', '没有可取消的有效 AI 订阅'],
  'Έφτασες το ημερήσιο όριο χρήσης AI — δοκίμασε ξανά αύριο': ['You have reached today\'s AI usage limit — try again tomorrow', 'Has alcanzado el límite diario de uso de IA: vuelve a intentarlo mañana', 'Vous avez atteint la limite quotidienne d\'utilisation de l\'IA — réessayez demain', '您已达到今日 AI 使用上限——请明天再试'],
  'Κάποιο κείμενο είναι πολύ μεγάλο': ['Some of the text is too long', 'Algún texto es demasiado largo', 'Un des textes est trop long', '部分文本过长'],
  'Επίλεξε τουλάχιστον ένα κύριο πακέτο — τα πρόσθετα δεν κλείνονται μόνα τους': ['Choose at least one main package — add-ons cannot be booked on their own', 'Elige al menos un paquete principal: los extras no se pueden reservar solos', 'Choisissez au moins une formule principale — les options ne se réservent pas seules', '请至少选择一个主套餐——附加项不能单独预订'],
  'Μη έγκυρη ημερομηνία ή ώρα συνεδρίας': ['Invalid session date or time', 'Fecha u hora de la sesión no válida', 'Date ou heure de séance non valide', '会诊日期或时间无效'],
  'Η ημερομηνία και η ώρα της συνεδρίας πρέπει να είναι στο μέλλον': ['The session date and time must be in the future', 'La fecha y la hora de la sesión deben ser futuras', 'La date et l\'heure de la séance doivent être dans le futur', '会诊日期和时间必须是将来的时间'],
  'Ο κτηνίατρος δεν έχει ορίσει τιμή για την τηλεϊατρική': ['The vet has not set a price for telehealth', 'El veterinario no ha fijado un precio para la telemedicina', 'Le vétérinaire n\'a pas fixé de tarif pour la téléconsultation', '该兽医尚未设置远程问诊价格'],
  'Η υπηρεσία τηλεϊατρικής δεν είναι διαθέσιμη': ['The telehealth service is not available', 'El servicio de telemedicina no está disponible', 'Le service de téléconsultation n\'est pas disponible', '远程问诊服务不可用'],
  'Πάρα πολλά είδη στην παραγγελία (έως 50)': ['Too many items in the order (up to 50)', 'Demasiados artículos en el pedido (máximo 50)', 'Trop d\'articles dans la commande (50 maximum)', '订单中的商品过多（最多 50 件）'],
  'Δεν υπάρχει αρκετό απόθεμα για κάποια προϊόντα': ['There is not enough stock for some products', 'No hay suficiente stock de algunos productos', 'Le stock est insuffisant pour certains produits', '部分商品库存不足'],
  'Η παραγγελία έχει πληρωθεί — για ακύρωση επικοινώνησε με την υποστήριξη': ['The order has been paid — contact support to cancel it', 'El pedido ya está pagado: para cancelarlo, contacta con el soporte', 'La commande a été payée — contactez l\'assistance pour l\'annuler', '该订单已付款——如需取消请联系客服'],
  'Η παραγγελία άλλαξε στο μεταξύ — ανανέωσε τη σελίδα': ['The order changed in the meantime — refresh the page', 'El pedido ha cambiado mientras tanto: actualiza la página', 'La commande a changé entre-temps — actualisez la page', '订单已发生变化——请刷新页面'],
  'Η προβολή (boost) πρέπει να είναι ακέραιος από 0 έως 100': ['The boost must be a whole number from 0 to 100', 'La prioridad (boost) debe ser un número entero de 0 a 100', 'La mise en avant (boost) doit être un nombre entier de 0 à 100', '推广值（boost）必须是 0 到 100 之间的整数'],
  'Οι καμπάνιες της πλατφόρμας ισχύουν μόνο για την τιμή συνδρομής — όχι για προϊόντα ή υπηρεσίες παρόχων': ['Platform campaigns apply only to the subscription price — not to providers\' products or services', 'Las campañas de la plataforma solo se aplican al precio de la suscripción, no a productos o servicios de los proveedores', 'Les campagnes de la plateforme s\'appliquent uniquement au prix de l\'abonnement — pas aux produits ou services des prestataires', '平台活动仅适用于订阅价格——不适用于服务商的商品或服务'],
  'Η αρχική σελίδα και «όλες οι σελίδες» διατίθενται μόνο από την GlobiPet': ['The home page and “all pages” are available only through GlobiPet', 'La página de inicio y «todas las páginas» solo están disponibles a través de GlobiPet', 'La page d\'accueil et « toutes les pages » sont réservées à GlobiPet', '首页和“所有页面”仅由 GlobiPet 提供'],
  'Δεν μπορείς να διαγράψεις τον δικό σου λογαριασμό': ['You cannot delete your own account', 'No puedes eliminar tu propia cuenta', 'Vous ne pouvez pas supprimer votre propre compte', '您不能删除自己的账户'],
  'Η διαγραφή δεν ολοκληρώθηκε — δοκίμασε ξανά': ['The deletion was not completed — please try again', 'La eliminación no se completó; inténtalo de nuevo', 'La suppression n\'a pas abouti — veuillez réessayer', '删除未完成，请重试'],
  'Το ερώτημα χρησιμοποιεί μη επιτρεπτή συνάρτηση': ['The query uses a function that is not allowed', 'La consulta usa una función no permitida', 'La requête utilise une fonction non autorisée', '该查询使用了不允许的函数'],
  'Το ερώτημα απέτυχε': ['The query failed', 'La consulta ha fallado', 'La requête a échoué', '查询失败'],
  'Μη έγκυρη ημερομηνία λήξης': ['Invalid expiry date', 'Fecha de caducidad no válida', 'Date d\'expiration non valide', '到期日期无效'],
  'Μη έγκυρη διεύθυνση (URL)': ['Invalid address (URL)', 'Dirección (URL) no válida', 'Adresse (URL) non valide', '地址（URL）无效'],
  'Το email καταχωρήθηκε. Αν υπάρχει επαληθευμένος λογαριασμός με αυτό το email, συνδέεται με τον γιατρό.': ['The email has been saved. If a verified account exists with this email, it is linked to the doctor.', 'Se ha guardado el correo electrónico. Si existe una cuenta verificada con este correo, se vincula al médico.', 'L\'e-mail a été enregistré. Si un compte vérifié existe avec cet e-mail, il est associé au médecin.', '邮箱已保存。如果存在使用该邮箱的已验证账户，该账户将与这位医生关联。'],
  'Μη έγκυρη αναφορά αρχείου': ['Invalid file reference', 'Referencia de archivo no válida', 'Référence de fichier non valide', '文件引用无效'],
  'Η ιδιωτική αποθήκευση δεν είναι διαθέσιμη': ['Private storage is not available', 'El almacenamiento privado no está disponible', 'Le stockage privé n\'est pas disponible', '私有存储不可用'],
  'Ο σύνδεσμος έληξε. Πάτησε ξανά «Εξαγωγή PDF».': ['The link has expired. Press “Export PDF” again.', 'El enlace ha caducado. Pulsa de nuevo «Exportar PDF».', 'Le lien a expiré. Cliquez à nouveau sur « Exporter en PDF ».', '链接已过期，请再次点击“导出 PDF”。'],
  'Επιβεβαίωσε πρώτα το email σου': ['Please confirm your email first', 'Confirma primero tu email', 'Confirmez d\'abord votre e-mail', '请先验证您的邮箱'],
  'Δεν ακυρώθηκαν όλες οι συνδρομές του χρήστη στο Stripe. Ο λογαριασμός δεν διαγράφηκε — δοκίμασε ξανά σε λίγο.': ['Not all of the user\'s Stripe subscriptions could be cancelled. The account was not deleted — please try again shortly.', 'No se pudieron cancelar todas las suscripciones del usuario en Stripe. La cuenta no se ha eliminado; inténtalo de nuevo en unos minutos.', 'Tous les abonnements Stripe de l\'utilisateur n\'ont pas pu être annulés. Le compte n\'a pas été supprimé — veuillez réessayer dans quelques instants.', '未能取消该用户在 Stripe 的全部订阅。账户未被删除，请稍后重试。'],
  // Ε13
  'Η πρόσκληση δεν βρέθηκε ή δεν ισχύει πλέον': ['The invitation was not found or is no longer valid', 'No se ha encontrado la invitación o ya no es válida', 'L’invitation est introuvable ou n’est plus valide', '未找到该邀请或邀请已失效'],
  'Ο λογαριασμός σου είναι ήδη συνδεδεμένος με άλλο μέλος προσωπικού': ['Your account is already linked to another staff member', 'Tu cuenta ya está vinculada a otro miembro del equipo', 'Votre compte est déjà lié à un autre membre de l’équipe', '您的账户已关联到另一位员工'],
  'Η πρόσκληση καταχωρήθηκε. Αν υπάρχει λογαριασμός με αυτό το email, ο χρήστης θα τη δει στο προφίλ του και θα πρέπει να την αποδεχθεί.': ['The invitation has been saved. If an account exists with this email, the user will see it in their profile and must accept it.', 'Se ha guardado la invitación. Si existe una cuenta con este email, el usuario la verá en su perfil y deberá aceptarla.', 'L’invitation a été enregistrée. Si un compte existe avec cet e-mail, l’utilisateur la verra dans son profil et devra l’accepter.', '邀请已保存。如果存在使用该邮箱的账户，该用户将在个人资料中看到邀请，并需接受后才会关联。'],
  'Πρέπει να είσαι τουλάχιστον 15 ετών για να χρησιμοποιήσεις το GlobiPet. Ο λογαριασμός σου κλείνει και θα διαγραφεί.': ['You must be at least 15 to use GlobiPet. Your account is being closed and will be deleted.', 'Debes tener al menos 15 años para usar GlobiPet. Tu cuenta se cierra y se eliminará.', 'Vous devez avoir au moins 15 ans pour utiliser GlobiPet. Votre compte est fermé et sera supprimé.', '使用 GlobiPet 需年满 15 岁。您的账号将被关闭并删除。'],
  'Η ημερομηνία γέννησης έχει ήδη οριστεί': ['Your date of birth has already been set', 'La fecha de nacimiento ya se ha indicado', 'La date de naissance a déjà été indiquée', '出生日期已设置'],
  // Ε16 (διορθώσεις ελέγχου)
  'Υπάρχει ήδη ανοιχτή πληρωμή για άλλο πλάνο AI. Ολοκλήρωσέ την ή δοκίμασε ξανά σε λίγα λεπτά.': ['There is already an open payment for another AI plan. Complete it or try again in a few minutes.', 'Ya hay un pago abierto para otro plan de IA. Complétalo o inténtalo de nuevo en unos minutos.', 'Un paiement est déjà en cours pour une autre formule IA. Finalisez-le ou réessayez dans quelques minutes.', '另一个 AI 套餐已有未完成的付款。请完成该付款，或几分钟后重试。'],
}

const IDX: Record<Exclude<Lang, 'el'>, number> = { en: 0, es: 1, fr: 2, zh: 3 }

/**
 * Μηνύματα με μεταβλητό μέρος (αριθμοί, κωδικοί) — δεν ταιριάζουν ακριβώς
 * σε κλειδί του MESSAGES. Κάθε κανόνας: ελληνικό πρότυπο → [en, es, fr, zh]
 * με $1, $2 … για τα κομμάτια που κρατιούνται αυτούσια.
 */
const PATTERNS: Array<[RegExp, [string, string, string, string]]> = [
  // 429 του rate limit (index.ts)
  [/^Πολλά αιτήματα\. Δοκίμασε ξανά σε (\d+) δευτερόλεπτα\.$/, ['Too many requests. Try again in $1 seconds.', 'Demasiadas solicitudes. Inténtalo de nuevo en $1 segundos.', 'Trop de requêtes. Réessayez dans $1 secondes.', '请求过多，请在 $1 秒后重试。']],
  [/^Πολλές προσπάθειες\. Δοκίμασε ξανά σε (\d+) λεπτά\.$/, ['Too many attempts. Try again in $1 minutes.', 'Demasiados intentos. Inténtalo de nuevo en $1 minutos.', 'Trop de tentatives. Réessayez dans $1 minutes.', '尝试次数过多，请在 $1 分钟后重试。']],
  // Διαχείριση
  [/^Το ποσό υπερβαίνει το πληρωμένο \((.+) €\)$/, ['The amount exceeds what was paid ($1 €)', 'El importe supera lo pagado ($1 €)', 'Le montant dépasse ce qui a été payé ($1 €)', '金额超过已付款金额（$1 €）']],
  [/^Μη έγκυρη τιμή για (.+): πρέπει να είναι 0-100$/, ['Invalid value for $1: must be 0-100', 'Valor no válido para $1: debe estar entre 0 y 100', 'Valeur non valide pour $1 : doit être comprise entre 0 et 100', '$1 的值无效：必须在 0-100 之间']],
  [/^Το (.+) δεν έχει ρυθμιστεί στον διακομιστή$/, ['$1 is not configured on the server', '$1 no está configurado en el servidor', '$1 n\'est pas configuré sur le serveur', '服务器未配置 $1']],
  [/^Δεν βρέθηκε εταιρεία: (.+)$/, ['Company not found: $1', 'Empresa no encontrada: $1', 'Société introuvable : $1', '未找到公司：$1']],
  [/^Εστάλη σε (\d+) από (\d+) παραλήπτες \((\d+) απέτυχαν\)$/, ['Sent to $1 of $2 recipients ($3 failed)', 'Enviado a $1 de $2 destinatarios ($3 fallidos)', 'Envoyé à $1 destinataires sur $2 ($3 échecs)', '已发送给 $2 位收件人中的 $1 位（$3 位失败）']],
  [/^Εστάλη σε (\d+) από (\d+) παραλήπτες$/, ['Sent to $1 of $2 recipients', 'Enviado a $1 de $2 destinatarios', 'Envoyé à $1 destinataires sur $2', '已发送给 $2 位收件人中的 $1 位']],
]

/** «(κωδικός a3f91c)» που προσθέτει το lib/errors.ts στα σφάλματα συστήματος. */
const REF_SUFFIX = /^([\s\S]*\S) \(κωδικός ([0-9a-f]+)\)$/
const REF_WORD: Record<Exclude<Lang, 'el'>, string> = { en: 'code', es: 'código', fr: 'code', zh: '代码' }

/** Μεταφράζει ένα μήνυμα. Άγνωστο ή ελληνικά → αυτούσιο. */
export function translateMessage(text: string, lang: Lang): string {
  if (lang === 'el') return text
  const row = MESSAGES[text]
  if (row) return row[IDX[lang]]
  for (const [re, tr] of PATTERNS) {
    const m = re.exec(text)
    if (m) return tr[IDX[lang]].replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '')
  }
  // Σφάλμα συστήματος (lib/errors.ts): μεταφράζεται το μήνυμα, ο κωδικός μένει.
  const ref = REF_SUFFIX.exec(text)
  if (ref) {
    const base = translateMessage(ref[1], lang)
    if (base !== ref[1]) return `${base} (${REF_WORD[lang]} ${ref[2]})`
  }
  return text
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
