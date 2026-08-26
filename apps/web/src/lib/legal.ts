/**
 * Νομικά κείμενα — Πολιτική Απορρήτου και Όροι Χρήσης.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ
 *   Τα νομικά κείμενα είναι μακροσκελή, αλλάζουν σπάνια και με διαφορετική
 *   διαδικασία από τα labels της διεπαφής. Ανακατεμένα στο i18n.ts κάνουν
 *   το αρχείο δυσδιάχειρο και αυξάνουν τον κίνδυνο κατά τη μετάφραση.
 *
 * ΣΥΝΕΠΕΙΑ ΜΕ ΤΟ ΑΡΧΕΙΟ ΔΡΑΣΤΗΡΙΟΤΗΤΩΝ
 *   Το περιεχόμενο αντιστοιχεί ένα προς ένα με τις 11 δραστηριότητες
 *   επεξεργασίας του Αρχείου του άρθρου 30. Σε έλεγχο, τα δύο έγγραφα
 *   πρέπει να λένε το ίδιο πράγμα.
 *
 * ΓΛΩΣΣΕΣ
 *   Ελληνικά και αγγλικά. Οι υπόλοιπες γλώσσες πέφτουν στα αγγλικά έως
 *   ότου γίνει επαγγελματική μετάφραση — νομικό κείμενο δεν μεταφράζεται
 *   μηχανικά με ασφάλεια.
 *
 * ΔΕΝ ΣΥΝΙΣΤΑ ΝΟΜΙΚΗ ΣΥΜΒΟΥΛΗ
 *   Συντάχθηκε με βάση τις πραγματικές ροές δεδομένων της πλατφόρμας.
 *   Απαιτείται έλεγχος από νομικό σύμβουλο πριν τεθεί σε ισχύ.
 */

export const LEGAL_VERSION = '1.0'
export const LEGAL_UPDATED = '2026-08-26'

export type LegalSection = { title: string; body: string }
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] }

// ═══════════════════════════════════════════════════════════════════════
//  ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ — ΕΛΛΗΝΙΚΑ
// ═══════════════════════════════════════════════════════════════════════
const privacyEl: LegalDoc = {
  title: 'Πολιτική Απορρήτου',
  intro:
    'Η παρούσα πολιτική περιγράφει πώς η OB.AN ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε. συλλέγει, χρησιμοποιεί ' +
    'και προστατεύει τα προσωπικά σου δεδομένα όταν χρησιμοποιείς την πλατφόρμα GlobiPet. ' +
    'Είναι γραμμένη ώστε να διαβάζεται, όχι για να καλύπτει νομικά κενά.',
  sections: [
    {
      title: '1. Ποιος είναι υπεύθυνος',
      body:
        'Υπεύθυνος επεξεργασίας είναι η OB.AN ΜΟΝΟΠΡΟΣΩΠΗ ΙΔΙΩΤΙΚΗ ΚΕΦΑΛΑΙΟΥΧΙΚΗ ΕΤΑΙΡΕΙΑ, ' +
        'με ΑΦΜ 802501406, που λειτουργεί την πλατφόρμα με την εμπορική ονομασία GlobiPet.\n\n' +
        'Για κάθε θέμα προστασίας δεδομένων: legal@globipet.com\n\n' +
        'Δεν έχει οριστεί Υπεύθυνος Προστασίας Δεδομένων. Η ανάγκη ορισμού επανεξετάζεται ' +
        'καθώς μεγαλώνει η πλατφόρμα.',
    },
    {
      title: '2. Ποια δεδομένα συλλέγουμε',
      body:
        'Στοιχεία λογαριασμού: ονοματεπώνυμο, email, τηλέφωνο, ημερομηνία γέννησης, ' +
        'διεύθυνση, φωτογραφία προφίλ, γλώσσα προτίμησης.\n\n' +
        'Στοιχεία κατοικιδίων: όνομα, είδος, φυλή, ηλικία, βάρος, αριθμός microchip.\n\n' +
        'Ιατρικά δεδομένα κατοικιδίων: εμβολιασμοί, φάρμακα, αλλεργίες, χρόνιες παθήσεις, ' +
        'εξετάσεις, απεικονίσεις, χειρουργεία, οδοντιατρικά, γενετικοί έλεγχοι.\n\n' +
        'Δεδομένα χρήσης: κρατήσεις, παραγγελίες, αξιολογήσεις, δημοσιεύσεις στην κοινότητα.\n\n' +
        'Τεχνικά δεδομένα: διεύθυνση IP, τύπος συσκευής, χρόνος πρόσβασης.\n\n' +
        'Προαιρετικά: τοποθεσία κατοικιδίου μέσω συσκευής εντοπισμού, εφόσον το ενεργοποιήσεις.\n\n' +
        'Δεν συλλέγουμε ποτέ στοιχεία τραπεζικής κάρτας. Οι πληρωμές γίνονται απευθείας ' +
        'στη Viva Payments και τα στοιχεία της κάρτας δεν περνούν από τα συστήματά μας.',
    },
    {
      title: '3. Γιατί τα χρησιμοποιούμε',
      body:
        'Για να λειτουργεί ο λογαριασμός σου και να μπορείς να συνδέεσαι.\n\n' +
        'Για να κρατάς ραντεβού με παρόχους και να ολοκληρώνονται οι υπηρεσίες.\n\n' +
        'Για να τηρείς το ιατρικό ιστορικό του ζώου σου σε ένα σημείο.\n\n' +
        'Για να αγοράζεις προϊόντα και να εκδίδονται τα παραστατικά που απαιτεί ο νόμος.\n\n' +
        'Για να σου στέλνουμε ειδοποιήσεις σχετικές με τις κρατήσεις σου.\n\n' +
        'Για να προστατεύουμε την πλατφόρμα από κακόβουλη χρήση.\n\n' +
        'Δεν πουλάμε δεδομένα σε τρίτους. Δεν κάνουμε αυτοματοποιημένη λήψη αποφάσεων ' +
        'που να παράγει έννομα αποτελέσματα για εσένα.',
    },
    {
      title: '4. Σε ποια νομική βάση',
      body:
        'Εκτέλεση σύμβασης — άρθρο 6 παρ. 1 στοιχ. β΄: λογαριασμός, κρατήσεις, παραγγελίες, ' +
        'ιατρικός φάκελος, τηλεϊατρική.\n\n' +
        'Συγκατάθεση — άρθρο 6 παρ. 1 στοιχ. α΄: υπηρεσίες τεχνητής νοημοσύνης, εντοπισμός ' +
        'τοποθεσίας, εμπορική επικοινωνία, προαιρετικά cookies. Μπορείς να την ανακαλέσεις ' +
        'ανά πάσα στιγμή.\n\n' +
        'Νομική υποχρέωση — άρθρο 6 παρ. 1 στοιχ. γ΄: τήρηση φορολογικών παραστατικών.\n\n' +
        'Έννομο συμφέρον — άρθρο 6 παρ. 1 στοιχ. στ΄: ασφάλεια συστημάτων, λειτουργία της ' +
        'κοινότητας. Μπορείς να εναντιωθείς.',
    },
    {
      title: '5. Με ποιους μοιραζόμαστε δεδομένα',
      body:
        'Με τον πάροχο που επιλέγεις: όταν κάνεις κράτηση, λαμβάνει το όνομά σου, το email ' +
        'σου και τα στοιχεία του ραντεβού. Δεν βλέπει τον ιατρικό φάκελο του ζώου σου εκτός ' +
        'αν του τον κοινοποιήσεις ρητά.\n\n' +
        'Με άλλους χρήστες: μόνο ό,τι δημοσιεύεις εσύ στην κοινότητα.\n\n' +
        'Με τις αρχές: μόνο εφόσον υπάρχει νόμιμη υποχρέωση.\n\n' +
        'Δεν διαβιβάζουμε δεδομένα για διαφημιστικούς σκοπούς.',
    },
    {
      title: '6. Ποιοι μας υποστηρίζουν τεχνικά',
      body:
        'Railway — φιλοξενία εφαρμογής και βάσης δεδομένων. Εγκαταστάσεις στην ΕΕ.\n\n' +
        'Cloudflare — δίκτυο διανομής και αποθήκευση αρχείων. Εγκαταστάσεις στην ΕΕ.\n\n' +
        'Viva Payments — επεξεργασία πληρωμών. Ελλάδα.\n\n' +
        'Resend — αποστολή email. ΗΠΑ.\n\n' +
        'Anthropic — υπηρεσίες τεχνητής νοημοσύνης. ΗΠΑ. Λαμβάνει μόνο το περιεχόμενο που ' +
        'υποβάλλεις για ανάλυση, και δεν το χρησιμοποιεί για εκπαίδευση μοντέλων.\n\n' +
        'Καθένας ενεργεί κατ’ εντολή μας και μόνο για τον σκοπό που του αναθέτουμε.',
    },
    {
      title: '7. Διαβιβάσεις εκτός Ευρώπης',
      body:
        'Δύο από τους παρόχους μας εδρεύουν στις ΗΠΑ: η Resend για την αποστολή email και ' +
        'η Anthropic για τις υπηρεσίες AI.\n\n' +
        'Οι διαβιβάσεις αυτές γίνονται με τις εγγυήσεις που προβλέπει το κεφάλαιο V του ' +
        'Γενικού Κανονισμού — Τυποποιημένες Συμβατικές Ρήτρες της Ευρωπαϊκής Επιτροπής ή ' +
        'πιστοποίηση στο πλαίσιο επάρκειας ΕΕ–ΗΠΑ.\n\n' +
        'Όλα τα υπόλοιπα δεδομένα παραμένουν εντός Ευρωπαϊκής Ένωσης.',
    },
    {
      title: '8. Πόσο καιρό τα κρατάμε',
      body:
        'Λογαριασμός και προφίλ κατοικιδίων: όσο ο λογαριασμός είναι ενεργός.\n\n' +
        'Μετά από αίτημα διαγραφής: 30 ημέρες περίοδος χάριτος για να αλλάξεις γνώμη, και ' +
        'μετά οριστική διαγραφή.\n\n' +
        'Κρατήσεις και παραγγελίες: πέντε έτη, για λογιστικούς και φορολογικούς λόγους. ' +
        'Τα στοιχεία που σε ταυτοποιούν ανωνυμοποιούνται.\n\n' +
        'Ιστορικό τοποθεσίας: 90 ημέρες.\n\n' +
        'Ειδοποιήσεις: δώδεκα μήνες.\n\n' +
        'Συγκαταθέσεις: πέντε έτη μετά την ανάκληση, ως απόδειξη ότι τηρήσαμε τον νόμο.\n\n' +
        'Τεχνικά αρχεία καταγραφής: έξι μήνες.',
    },
    {
      title: '9. Τα δικαιώματά σου',
      body:
        'Πρόσβαση — άρθρο 15: κατεβάζεις πλήρες αρχείο με όλα τα δεδομένα σου, από τις ' +
        'ρυθμίσεις του λογαριασμού.\n\n' +
        'Διόρθωση — άρθρο 16: διορθώνεις τα στοιχεία σου από το προφίλ.\n\n' +
        'Διαγραφή — άρθρο 17: ζητάς διαγραφή λογαριασμού. Εκτελείται σε 30 ημέρες και ' +
        'μπορείς να την ακυρώσεις μέσα σε αυτό το διάστημα.\n\n' +
        'Φορητότητα — άρθρο 20: το ίδιο αρχείο, σε μορφή που διαβάζεται από άλλο σύστημα.\n\n' +
        'Ανάκληση συγκατάθεσης — άρθρο 7 παρ. 3: από τις προτιμήσεις cookies και τις ' +
        'ρυθμίσεις λογαριασμού.\n\n' +
        'Εναντίωση — άρθρο 21 και Περιορισμός — άρθρο 18: με αίτημα στο legal@globipet.com.\n\n' +
        'Απαντάμε εντός ενός μήνα. Αν το αίτημα είναι σύνθετο, μπορεί να παραταθεί κατά ' +
        'δύο μήνες, και θα σε ενημερώσουμε.\n\n' +
        'Έχεις επίσης δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού ' +
        'Χαρακτήρα, Λ. Κηφισίας 1-3, 115 23 Αθήνα, www.dpa.gr',
    },
    {
      title: '10. Πώς τα προστατεύουμε',
      body:
        'Όλη η επικοινωνία είναι κρυπτογραφημένη με TLS.\n\n' +
        'Οι κωδικοί αποθηκεύονται με bcrypt και δεν είναι αναστρέψιμοι. Ούτε εμείς μπορούμε ' +
        'να δούμε τον κωδικό σου.\n\n' +
        'Οι σύνδεσμοι επαναφοράς κωδικού αποθηκεύονται ως hash και ισχύουν μία ώρα.\n\n' +
        'Υπάρχουν αυστηρά όρια στις προσπάθειες σύνδεσης, για προστασία από επιθέσεις.\n\n' +
        'Τα αρχεία που ανεβάζεις ελέγχονται ως προς τον πραγματικό τους τύπο, όχι μόνο ως ' +
        'προς την επέκταση.\n\n' +
        'Κάθε πάροχος βλέπει αποκλειστικά τα δικά του δεδομένα.\n\n' +
        'Η βάση δεδομένων διαθέτει δυνατότητα επαναφοράς σε χρονικό σημείο.',
    },
    {
      title: '11. Cookies',
      body:
        'Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία της πλατφόρμας — σύνδεση, ' +
        'καλάθι, προτιμήσεις. Αυτά δεν απαιτούν συγκατάθεση.\n\n' +
        'Για κάθε άλλη κατηγορία ζητάμε τη συγκατάθεσή σου κατά την πρώτη επίσκεψη.\n\n' +
        'Μπορείς να αλλάξεις τις επιλογές σου οποτεδήποτε από τη σελίδα προτιμήσεων cookies.',
    },
    {
      title: '12. Ηλικία',
      body:
        'Η εγγραφή επιτρέπεται από τα 15 έτη και άνω, σύμφωνα με το όριο που ισχύει στην ' +
        'Ελλάδα για τη συγκατάθεση ανηλίκου σε υπηρεσίες της κοινωνίας της πληροφορίας.\n\n' +
        'Κατά την εγγραφή ζητείται ημερομηνία γέννησης και ο έλεγχος γίνεται αυτόματα.\n\n' +
        'Για συναλλαγές και πληρωμές ενδέχεται να απαιτείται ενηλικίωση ή συναίνεση ' +
        'κηδεμόνα, κατά τις διατάξεις περί δικαιοπρακτικής ικανότητας.\n\n' +
        'Αν διαπιστώσουμε λογαριασμό κάτω των 15, τον διαγράφουμε.',
    },
    {
      title: '13. Δεδομένα υγείας ζώων',
      body:
        'Ο ιατρικός φάκελος αφορά το ζώο σου, όχι εσένα. Τα δεδομένα υγείας ζώου δεν ' +
        'συνιστούν ειδική κατηγορία δεδομένων κατά το άρθρο 9 του Κανονισμού, το οποίο ' +
        'αφορά φυσικά πρόσωπα.\n\n' +
        'Παραμένουν όμως δικά σου προσωπικά δεδομένα, επειδή συνδέονται με τον λογαριασμό ' +
        'σου. Τα προστατεύουμε με την ίδια σοβαρότητα.',
    },
    {
      title: '14. Αλλαγές στην πολιτική',
      body:
        'Αν αλλάξει κάτι ουσιώδες, θα σε ενημερώσουμε με email ή με ειδοποίηση μέσα στην ' +
        'πλατφόρμα, πριν τεθεί σε ισχύ.\n\n' +
        'Η ημερομηνία τελευταίας ενημέρωσης εμφανίζεται στην κορυφή της σελίδας.',
    },
    {
      title: '15. Επικοινωνία',
      body:
        'Για κάθε ερώτημα ή άσκηση δικαιώματος: legal@globipet.com\n\n' +
        'OB.AN ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε. · ΑΦΜ 802501406',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════
//  ΟΡΟΙ ΧΡΗΣΗΣ — ΕΛΛΗΝΙΚΑ
// ═══════════════════════════════════════════════════════════════════════
const termsEl: LegalDoc = {
  title: 'Όροι Χρήσης',
  intro:
    'Οι παρόντες όροι διέπουν τη χρήση της πλατφόρμας GlobiPet. Με τη δημιουργία ' +
    'λογαριασμού δηλώνεις ότι τους αποδέχεσαι.',
  sections: [
    {
      title: '1. Τι είναι το GlobiPet',
      body:
        'Το GlobiPet είναι πλατφόρμα διαμεσολάβησης που συνδέει ιδιοκτήτες κατοικιδίων με ' +
        'παρόχους υπηρεσιών — κτηνιατρεία, grooming, εκπαιδευτές, sitters, walkers, ' +
        'μεταφορείς, φωτογράφους — και διαθέτει κατάστημα προϊόντων.\n\n' +
        'Λειτουργεί από την OB.AN ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε., ΑΦΜ 802501406.',
    },
    {
      title: '2. Ο ρόλος μας',
      body:
        'Είμαστε διαμεσολαβητής. Οι υπηρεσίες παρέχονται από ανεξάρτητους επαγγελματίες, ' +
        'όχι από εμάς.\n\n' +
        'Δεν εγγυόμαστε την ποιότητα, την καταλληλότητα ή το αποτέλεσμα των υπηρεσιών που ' +
        'παρέχει τρίτος. Η σύμβαση υπηρεσίας συνάπτεται ανάμεσα σε εσένα και τον πάροχο.\n\n' +
        'Ελέγχουμε τα βασικά στοιχεία των παρόχων κατά την εγγραφή, αλλά δεν πιστοποιούμε ' +
        'τα προσόντα τους.',
    },
    {
      title: '3. Λογαριασμός',
      body:
        'Πρέπει να είσαι τουλάχιστον 15 ετών.\n\n' +
        'Τα στοιχεία που δηλώνεις πρέπει να είναι ακριβή και ενημερωμένα.\n\n' +
        'Είσαι υπεύθυνος για τη φύλαξη του κωδικού σου και για κάθε ενέργεια που γίνεται ' +
        'από τον λογαριασμό σου.\n\n' +
        'Ένας λογαριασμός ανά πρόσωπο. Δεν επιτρέπεται η μεταβίβαση.',
    },
    {
      title: '4. Κρατήσεις και ακυρώσεις',
      body:
        'Η κράτηση δεσμεύει εσένα και τον πάροχο.\n\n' +
        'Οι όροι ακύρωσης ορίζονται από κάθε πάροχο και εμφανίζονται πριν επιβεβαιώσεις.\n\n' +
        'Επαναλαμβανόμενες μη εμφανίσεις σε ραντεβού μπορεί να οδηγήσουν σε περιορισμό ' +
        'του λογαριασμού.',
    },
    {
      title: '5. Πληρωμές',
      body:
        'Οι πληρωμές διεκπεραιώνονται από τη Viva Payments. Δεν αποθηκεύουμε στοιχεία ' +
        'κάρτας.\n\n' +
        'Οι τιμές εμφανίζονται με ΦΠΑ όπου απαιτείται.\n\n' +
        'Ενδέχεται να παρακρατείται προμήθεια πλατφόρμας από το ποσό που αποδίδεται στον ' +
        'πάροχο. Το ποσοστό γνωστοποιείται στον πάροχο κατά την εγγραφή του.',
    },
    {
      title: '6. Υποχρεώσεις παρόχων',
      body:
        'Ο πάροχος οφείλει να διαθέτει τις άδειες και τα προσόντα που απαιτεί ο νόμος για ' +
        'τη δραστηριότητά του.\n\n' +
        'Οφείλει να δηλώνει με ακρίβεια τις υπηρεσίες, τις τιμές και τη διαθεσιμότητά του.\n\n' +
        'Είναι υπεύθυνος για τα στοιχεία του προσωπικού που καταχωρεί, περιλαμβανομένων ' +
        'των ειδικοτήτων και των αριθμών μητρώου.\n\n' +
        'Ευθύνεται αποκλειστικά για την υπηρεσία που παρέχει.',
    },
    {
      title: '7. Περιεχόμενο χρηστών',
      body:
        'Ό,τι δημοσιεύεις παραμένει δικό σου. Μας παραχωρείς άδεια να το εμφανίζουμε στην ' +
        'πλατφόρμα.\n\n' +
        'Δεν επιτρέπεται περιεχόμενο παράνομο, προσβλητικό, παραπλανητικό, ή που παραβιάζει ' +
        'δικαιώματα τρίτων.\n\n' +
        'Οι αξιολογήσεις πρέπει να βασίζονται σε πραγματική εμπειρία.\n\n' +
        'Μπορούμε να αφαιρέσουμε περιεχόμενο που παραβιάζει τους όρους.',
    },
    {
      title: '8. Υπηρεσίες τεχνητής νοημοσύνης',
      body:
        'Οι λειτουργίες AI είναι ενημερωτικές και υποστηρικτικές.\n\n' +
        'ΔΕΝ αποτελούν κτηνιατρική διάγνωση και δεν υποκαθιστούν την εξέταση από ' +
        'κτηνίατρο.\n\n' +
        'Σε περίπτωση ανησυχίας για την υγεία του ζώου σου, απευθύνσου σε κτηνίατρο.\n\n' +
        'Δεν φέρουμε ευθύνη για αποφάσεις που λαμβάνεις βασιζόμενος αποκλειστικά σε ' +
        'αποτέλεσμα AI.',
    },
    {
      title: '9. Ιατρικός φάκελος',
      body:
        'Ο φάκελος είναι εργαλείο οργάνωσης, όχι επίσημο ιατρικό αρχείο.\n\n' +
        'Εσύ είσαι υπεύθυνος για την ακρίβεια όσων καταχωρείς.\n\n' +
        'Σου συνιστούμε να διατηρείς και δικά σου αντίγραφα των σημαντικών εγγράφων.',
    },
    {
      title: '10. Απαγορευμένες χρήσεις',
      body:
        'Απαγορεύεται η χρήση της πλατφόρμας για παράνομο σκοπό, η προσπάθεια παράκαμψης ' +
        'των μέτρων ασφαλείας, η αυτοματοποιημένη συλλογή δεδομένων, η πλαστοπροσωπία, ' +
        'και η δημιουργία ψευδών κρατήσεων ή αξιολογήσεων.',
    },
    {
      title: '11. Διακοπή λογαριασμού',
      body:
        'Μπορείς να διαγράψεις τον λογαριασμό σου οποτεδήποτε από τις ρυθμίσεις.\n\n' +
        'Μπορούμε να αναστείλουμε ή να τερματίσουμε λογαριασμό που παραβιάζει τους όρους, ' +
        'με προηγούμενη ενημέρωση εκτός αν συντρέχει σοβαρός λόγος.\n\n' +
        'Εκκρεμείς υποχρεώσεις παραμένουν και μετά τη διακοπή.',
    },
    {
      title: '12. Ευθύνη',
      body:
        'Η πλατφόρμα παρέχεται όπως είναι. Καταβάλλουμε κάθε εύλογη προσπάθεια για τη ' +
        'διαθεσιμότητα και την ασφάλειά της, χωρίς να εγγυόμαστε αδιάλειπτη λειτουργία.\n\n' +
        'Δεν ευθυνόμαστε για ζημία που προκύπτει από την παροχή υπηρεσίας τρίτου.\n\n' +
        'Καμία διάταξη των παρόντων όρων δεν περιορίζει δικαιώματα που σου αναγνωρίζει ' +
        'αναγκαστικού δικαίου διάταξη περί προστασίας καταναλωτή.',
    },
    {
      title: '13. Αλλαγές στους όρους',
      body:
        'Θα σε ενημερώνουμε για ουσιώδεις αλλαγές πριν τεθούν σε ισχύ.\n\n' +
        'Η συνέχιση της χρήσης μετά την ενημέρωση σημαίνει αποδοχή.',
    },
    {
      title: '14. Εφαρμοστέο δίκαιο',
      body:
        'Εφαρμόζεται το ελληνικό δίκαιο.\n\n' +
        'Αρμόδια είναι τα δικαστήρια Αθηνών, με την επιφύλαξη των δικαιωμάτων που έχεις ' +
        'ως καταναλωτής να προσφύγεις στα δικαστήρια της κατοικίας σου.\n\n' +
        'Για εξωδικαστική επίλυση μπορείς να απευθυνθείς στην πλατφόρμα ηλεκτρονικής ' +
        'επίλυσης διαφορών της Ευρωπαϊκής Επιτροπής.',
    },
    {
      title: '15. Επικοινωνία',
      body:
        'OB.AN ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε. · ΑΦΜ 802501406\n\n' +
        'legal@globipet.com',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════
//  PRIVACY POLICY — ENGLISH
// ═══════════════════════════════════════════════════════════════════════
const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  intro:
    'This policy explains how OB.AN Single Member P.C. collects, uses and protects your ' +
    'personal data when you use the GlobiPet platform. It is written to be read, not to ' +
    'cover legal gaps.',
  sections: [
    {
      title: '1. Who is responsible',
      body:
        'The data controller is OB.AN SINGLE MEMBER PRIVATE COMPANY, VAT 802501406, ' +
        'operating the platform under the trade name GlobiPet.\n\n' +
        'For any data protection matter: legal@globipet.com\n\n' +
        'No Data Protection Officer has been appointed. The need for one is reassessed as ' +
        'the platform grows.',
    },
    {
      title: '2. What data we collect',
      body:
        'Account details: full name, email, phone, date of birth, address, profile photo, ' +
        'preferred language.\n\n' +
        'Pet details: name, species, breed, age, weight, microchip number.\n\n' +
        'Pet medical data: vaccinations, medication, allergies, chronic conditions, lab ' +
        'results, imaging, surgeries, dental records, genetic tests.\n\n' +
        'Usage data: bookings, orders, reviews, community posts.\n\n' +
        'Technical data: IP address, device type, access time.\n\n' +
        'Optional: pet location via tracking device, if you enable it.\n\n' +
        'We never collect card details. Payments go directly to Viva Payments and card ' +
        'data never passes through our systems.',
    },
    {
      title: '3. Why we use it',
      body:
        'To run your account and let you sign in.\n\n' +
        'To let you book providers and complete services.\n\n' +
        'To keep your pet’s medical history in one place.\n\n' +
        'To sell products and issue the documents the law requires.\n\n' +
        'To send you notifications about your bookings.\n\n' +
        'To protect the platform from misuse.\n\n' +
        'We do not sell data. We do not make automated decisions producing legal effects ' +
        'for you.',
    },
    {
      title: '4. Legal basis',
      body:
        'Contract — Article 6(1)(b): account, bookings, orders, medical records, telehealth.\n\n' +
        'Consent — Article 6(1)(a): AI services, location tracking, marketing, optional ' +
        'cookies. You may withdraw at any time.\n\n' +
        'Legal obligation — Article 6(1)(c): tax records.\n\n' +
        'Legitimate interest — Article 6(1)(f): security, community operation. You may object.',
    },
    {
      title: '5. Who we share with',
      body:
        'The provider you choose: when you book, they receive your name, email and booking ' +
        'details. They do not see your pet’s medical record unless you share it explicitly.\n\n' +
        'Other users: only what you publish in the community.\n\n' +
        'Authorities: only where legally required.\n\n' +
        'We do not share data for advertising.',
    },
    {
      title: '6. Our technical providers',
      body:
        'Railway — application and database hosting. EU facilities.\n\n' +
        'Cloudflare — content delivery and file storage. EU facilities.\n\n' +
        'Viva Payments — payment processing. Greece.\n\n' +
        'Resend — email delivery. United States.\n\n' +
        'Anthropic — AI services. United States. Receives only the content you submit for ' +
        'analysis, and does not use it to train models.\n\n' +
        'Each acts on our instructions and only for the purpose we assign.',
    },
    {
      title: '7. Transfers outside Europe',
      body:
        'Two providers are US-based: Resend for email and Anthropic for AI.\n\n' +
        'These transfers rely on the safeguards in Chapter V of the GDPR — the European ' +
        'Commission’s Standard Contractual Clauses or certification under the EU–US Data ' +
        'Privacy Framework.\n\n' +
        'All other data stays within the European Union.',
    },
    {
      title: '8. How long we keep it',
      body:
        'Account and pet profiles: as long as the account is active.\n\n' +
        'After a deletion request: 30-day grace period, then permanent deletion.\n\n' +
        'Bookings and orders: five years, for accounting and tax. Identifying details are ' +
        'anonymised.\n\n' +
        'Location history: 90 days.\n\n' +
        'Notifications: twelve months.\n\n' +
        'Consent records: five years after withdrawal, as proof of compliance.\n\n' +
        'Technical logs: six months.',
    },
    {
      title: '9. Your rights',
      body:
        'Access — Article 15: download a complete file of your data from account settings.\n\n' +
        'Rectification — Article 16: edit your details in your profile.\n\n' +
        'Erasure — Article 17: request account deletion. Executed after 30 days; you may ' +
        'cancel within that period.\n\n' +
        'Portability — Article 20: the same file, in a machine-readable format.\n\n' +
        'Withdraw consent — Article 7(3): from cookie preferences and account settings.\n\n' +
        'Object — Article 21 and Restrict — Article 18: email legal@globipet.com.\n\n' +
        'We respond within one month, extendable by two months for complex requests, with ' +
        'notice to you.\n\n' +
        'You may also lodge a complaint with the Hellenic Data Protection Authority, ' +
        '1-3 Kifissias Ave, 115 23 Athens, www.dpa.gr',
    },
    {
      title: '10. How we protect it',
      body:
        'All traffic is encrypted with TLS.\n\n' +
        'Passwords are stored with bcrypt and cannot be reversed. Not even we can see them.\n\n' +
        'Password reset links are stored as hashes and expire after one hour.\n\n' +
        'Strict rate limits protect sign-in against brute force.\n\n' +
        'Uploaded files are checked by actual file signature, not just extension.\n\n' +
        'Each provider sees only their own data.\n\n' +
        'The database supports point-in-time recovery.',
    },
    {
      title: '11. Cookies',
      body:
        'We use essential cookies for the platform to work — sign-in, cart, preferences. ' +
        'These do not require consent.\n\n' +
        'For every other category we ask for your consent on first visit.\n\n' +
        'You can change your choices at any time from the cookie preferences page.',
    },
    {
      title: '12. Age',
      body:
        'Registration is permitted from age 15, in line with the Greek threshold for a ' +
        'minor’s consent to information society services.\n\n' +
        'Date of birth is requested at sign-up and checked automatically.\n\n' +
        'Transactions and payments may require legal capacity or guardian consent.\n\n' +
        'If we find an account belonging to someone under 15, we delete it.',
    },
    {
      title: '13. Animal health data',
      body:
        'The medical record concerns your pet, not you. Animal health data is not a special ' +
        'category under Article 9, which applies to natural persons.\n\n' +
        'It remains your personal data because it is linked to your account, and we protect ' +
        'it with equal care.',
    },
    {
      title: '14. Changes to this policy',
      body:
        'If something material changes, we will tell you by email or in-platform notice ' +
        'before it takes effect.\n\n' +
        'The last updated date appears at the top of this page.',
    },
    {
      title: '15. Contact',
      body:
        'For any question or to exercise a right: legal@globipet.com\n\n' +
        'OB.AN Single Member P.C. · VAT 802501406',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════
//  TERMS OF SERVICE — ENGLISH
// ═══════════════════════════════════════════════════════════════════════
const termsEn: LegalDoc = {
  title: 'Terms of Service',
  intro:
    'These terms govern your use of the GlobiPet platform. By creating an account you ' +
    'accept them.',
  sections: [
    {
      title: '1. What GlobiPet is',
      body:
        'GlobiPet is a marketplace connecting pet owners with service providers — veterinary ' +
        'clinics, groomers, trainers, sitters, walkers, transport and photographers — and ' +
        'offers a product store.\n\n' +
        'It is operated by OB.AN Single Member P.C., VAT 802501406.',
    },
    {
      title: '2. Our role',
      body:
        'We are an intermediary. Services are delivered by independent professionals, not ' +
        'by us.\n\n' +
        'We do not guarantee the quality, suitability or outcome of a third party’s service. ' +
        'The service contract is between you and the provider.\n\n' +
        'We verify basic provider details at sign-up but do not certify their qualifications.',
    },
    {
      title: '3. Your account',
      body:
        'You must be at least 15 years old.\n\n' +
        'The details you provide must be accurate and current.\n\n' +
        'You are responsible for keeping your password safe and for activity under your ' +
        'account.\n\n' +
        'One account per person. Accounts may not be transferred.',
    },
    {
      title: '4. Bookings and cancellations',
      body:
        'A booking binds both you and the provider.\n\n' +
        'Cancellation terms are set by each provider and shown before you confirm.\n\n' +
        'Repeated no-shows may lead to account restrictions.',
    },
    {
      title: '5. Payments',
      body:
        'Payments are processed by Viva Payments. We do not store card details.\n\n' +
        'Prices include VAT where applicable.\n\n' +
        'A platform commission may be withheld from the amount paid to the provider. The ' +
        'rate is disclosed to providers at registration.',
    },
    {
      title: '6. Provider obligations',
      body:
        'Providers must hold the licences and qualifications their activity requires by law.\n\n' +
        'They must accurately state their services, prices and availability.\n\n' +
        'They are responsible for the staff details they enter, including specialties and ' +
        'registration numbers.\n\n' +
        'They are solely liable for the service they deliver.',
    },
    {
      title: '7. User content',
      body:
        'What you post remains yours. You grant us a licence to display it on the platform.\n\n' +
        'Content that is unlawful, offensive, misleading or infringes third-party rights is ' +
        'not permitted.\n\n' +
        'Reviews must reflect genuine experience.\n\n' +
        'We may remove content that breaches these terms.',
    },
    {
      title: '8. AI services',
      body:
        'AI features are informational and supportive.\n\n' +
        'They are NOT a veterinary diagnosis and do not replace examination by a vet.\n\n' +
        'If you are concerned about your pet’s health, consult a veterinarian.\n\n' +
        'We are not liable for decisions taken solely on an AI result.',
    },
    {
      title: '9. Medical records',
      body:
        'The record is an organisational tool, not an official medical file.\n\n' +
        'You are responsible for the accuracy of what you enter.\n\n' +
        'We recommend keeping your own copies of important documents.',
    },
    {
      title: '10. Prohibited use',
      body:
        'You may not use the platform for unlawful purposes, attempt to bypass security ' +
        'measures, scrape data automatically, impersonate others, or create false bookings ' +
        'or reviews.',
    },
    {
      title: '11. Termination',
      body:
        'You may delete your account at any time from settings.\n\n' +
        'We may suspend or terminate an account that breaches these terms, with prior notice ' +
        'unless there is serious cause.\n\n' +
        'Outstanding obligations survive termination.',
    },
    {
      title: '12. Liability',
      body:
        'The platform is provided as is. We make reasonable efforts to keep it available and ' +
        'secure, without guaranteeing uninterrupted operation.\n\n' +
        'We are not liable for damage arising from a third party’s service.\n\n' +
        'Nothing in these terms limits rights granted to you by mandatory consumer ' +
        'protection law.',
    },
    {
      title: '13. Changes to these terms',
      body:
        'We will notify you of material changes before they take effect.\n\n' +
        'Continued use after notice means acceptance.',
    },
    {
      title: '14. Governing law',
      body:
        'Greek law applies.\n\n' +
        'The courts of Athens have jurisdiction, without prejudice to your right as a ' +
        'consumer to bring proceedings in the courts of your domicile.\n\n' +
        'For out-of-court settlement you may use the European Commission’s online dispute ' +
        'resolution platform.',
    },
    {
      title: '15. Contact',
      body:
        'OB.AN Single Member P.C. · VAT 802501406\n\n' +
        'legal@globipet.com',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════

const DOCS = {
  el: { privacy: privacyEl, terms: termsEl },
  en: { privacy: privacyEn, terms: termsEn },
}

/**
 * Επιστρέφει το νομικό κείμενο στη γλώσσα του χρήστη.
 * Γλώσσες χωρίς επίσημη μετάφραση πέφτουν στα αγγλικά — ποτέ σε κενό.
 */
export function getLegalDoc(kind: 'privacy' | 'terms', lang?: string): LegalDoc {
  const code = (lang || 'el').slice(0, 2).toLowerCase()
  const set = (DOCS as any)[code] || DOCS.en
  return set[kind]
}
