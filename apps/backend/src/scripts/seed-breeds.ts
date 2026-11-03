/**
 * Κατάλογος ράτσων — περιεχόμενο αναφοράς της πλατφόρμας (σελίδα /breeds).
 *
 * Ο πίνακας breeds ήταν άδειος στην παραγωγή, οπότε η σελίδα Ράτσες έγραφε
 * «Καμία ράτσα». Αυτό το script ΠΡΟΣΘΕΤΕΙ μόνο όσες ράτσες λείπουν (έλεγχος
 * με το όνομα): δεν σβήνει, δεν αλλάζει υπάρχουσες εγγραφές, δεν αγγίζει
 * χρήστες ή κρατήσεις. Ασφαλές να ξανατρέξει.
 *
 * Εκτέλεση (μόνο με ρητή επιβεβαίωση, επειδή γράφει στη βάση του DATABASE_URL):
 *   set CONFIRM_SEED_BREEDS=yes
 *   npx tsx src/scripts/seed-breeds.ts
 *
 * Βαθμοί 1–5: grooming_needs, exercise_needs, trainability.
 * Γενικές, ενημερωτικές πληροφορίες — όχι κτηνιατρική συμβουλή.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type B = {
  name: string; name_el: string; species: 'dog' | 'cat'; origin: string
  size: 'small' | 'medium' | 'large' | 'giant'
  weight: [number, number]; life: [number, number]
  temperament: string[]; health: string[]; pros: string[]; cons: string[]
  grooming: number; exercise: number; train: number
  kids: boolean; pets: boolean; apartment: boolean; popularity: number
  description: string
}

const BREEDS: B[] = [
  { name: 'Labrador Retriever', name_el: 'Λαμπραντόρ Ριτρίβερ', species: 'dog', origin: 'Καναδάς / Ηνωμένο Βασίλειο', size: 'large', weight: [25, 36], life: [10, 12],
    temperament: ['Φιλικός', 'Ενεργητικός', 'Ήπιος'], health: ['Δυσπλασία ισχίου και αγκώνα', 'Παχυσαρκία'], pros: ['Ιδανικός για οικογένειες', 'Εύκολος στην εκπαίδευση'], cons: ['Χρειάζεται πολλή άσκηση', 'Τάση για υπερβολικό φαγητό'],
    grooming: 2, exercise: 5, train: 5, kids: true, pets: true, apartment: false, popularity: 100,
    description: 'Ένας από τους πιο αγαπημένους οικογενειακούς σκύλους: φιλικός, υπομονετικός και πρόθυμος να μάθει. Χρειάζεται καθημερινή άσκηση και προσοχή στη διατροφή του.' },
  { name: 'Golden Retriever', name_el: 'Γκόλντεν Ριτρίβερ', species: 'dog', origin: 'Σκωτία', size: 'large', weight: [25, 34], life: [10, 12],
    temperament: ['Τρυφερός', 'Έξυπνος', 'Υπομονετικός'], health: ['Δυσπλασία ισχίου', 'Δερματικές αλλεργίες'], pros: ['Εξαιρετικός με παιδιά', 'Πολύ εκπαιδεύσιμος'], cons: ['Μαδάει πολύ', 'Δεν του αρέσει η μοναξιά'],
    grooming: 3, exercise: 4, train: 5, kids: true, pets: true, apartment: false, popularity: 95,
    description: 'Ήρεμος και τρυφερός σκύλος με μεγάλη διάθεση για συνεργασία. Ταιριάζει σε οικογένειες με χρόνο για βόλτες, παιχνίδι και τακτικό βούρτσισμα.' },
  { name: 'German Shepherd', name_el: 'Γερμανικός Ποιμενικός', species: 'dog', origin: 'Γερμανία', size: 'large', weight: [22, 40], life: [9, 13],
    temperament: ['Πιστός', 'Προστατευτικός', 'Έξυπνος'], health: ['Δυσπλασία ισχίου', 'Εκφυλιστική μυελοπάθεια'], pros: ['Εξαιρετικός φύλακας', 'Μαθαίνει γρήγορα'], cons: ['Χρειάζεται εκπαίδευση από νωρίς', 'Μαδάει όλο τον χρόνο'],
    grooming: 3, exercise: 5, train: 5, kids: true, pets: false, apartment: false, popularity: 90,
    description: 'Ευφυής, αφοσιωμένος και εργατικός. Χρειάζεται σταθερή εκπαίδευση, κοινωνικοποίηση και πολλή σωματική και πνευματική απασχόληση.' },
  { name: 'French Bulldog', name_el: 'Γαλλικό Μπουλντόγκ', species: 'dog', origin: 'Γαλλία', size: 'small', weight: [8, 14], life: [10, 12],
    temperament: ['Παιχνιδιάρης', 'Κοινωνικός', 'Ήρεμος'], health: ['Αναπνευστικά (βραχυκεφαλικό σύνδρομο)', 'Ευαισθησία στη ζέστη'], pros: ['Ιδανικός για διαμέρισμα', 'Λίγη άσκηση'], cons: ['Δεν αντέχει τη ζέστη', 'Πιθανά αναπνευστικά προβλήματα'],
    grooming: 1, exercise: 2, train: 3, kids: true, pets: true, apartment: true, popularity: 88,
    description: 'Μικρός, κοινωνικός και ήρεμος σύντροφος για την πόλη. Θέλει προσοχή το καλοκαίρι: βόλτες τις δροσερές ώρες και αποφυγή έντονης άσκησης στη ζέστη.' },
  { name: 'Maltese', name_el: 'Μαλτέζ', species: 'dog', origin: 'Μεσόγειος', size: 'small', weight: [2, 4], life: [12, 15],
    temperament: ['Τρυφερός', 'Ζωηρός', 'Δεμένος με τον άνθρωπο'], health: ['Οδοντικά προβλήματα', 'Δακρυϊκές κηλίδες'], pros: ['Ιδανικός για διαμέρισμα', 'Μαδάει ελάχιστα'], cons: ['Χρειάζεται συχνή περιποίηση τριχώματος', 'Ευαίσθητος σε άγρια μεταχείριση'],
    grooming: 4, exercise: 2, train: 3, kids: false, pets: true, apartment: true, popularity: 85,
    description: 'Μικρόσωμος σύντροφος με μακρύ λευκό τρίχωμα που θέλει τακτικό βούρτσισμα και grooming. Αγαπά την παρέα και προσαρμόζεται εύκολα σε διαμέρισμα.' },
  { name: 'Yorkshire Terrier', name_el: 'Γιόρκσαϊρ Τεριέ', species: 'dog', origin: 'Αγγλία', size: 'small', weight: [2, 3.5], life: [13, 16],
    temperament: ['Θαρραλέος', 'Ζωηρός', 'Περίεργος'], health: ['Οδοντικά προβλήματα', 'Εξάρθρωση επιγονατίδας'], pros: ['Κατάλληλος για διαμέρισμα', 'Μαδάει λίγο'], cons: ['Μπορεί να γαβγίζει πολύ', 'Ευαίσθητος στο κρύο'],
    grooming: 4, exercise: 2, train: 3, kids: false, pets: true, apartment: true, popularity: 80,
    description: 'Μικρός σε μέγεθος αλλά με μεγάλη προσωπικότητα. Χρειάζεται τακτική περιποίηση του τριχώματος και φροντίδα των δοντιών.' },
  { name: 'Chihuahua', name_el: 'Τσιουάουα', species: 'dog', origin: 'Μεξικό', size: 'small', weight: [1.5, 3], life: [14, 17],
    temperament: ['Αφοσιωμένος', 'Γρήγορος', 'Επιφυλακτικός με ξένους'], health: ['Οδοντικά προβλήματα', 'Εξάρθρωση επιγονατίδας'], pros: ['Ελάχιστη άσκηση', 'Μεγάλη διάρκεια ζωής'], cons: ['Εύθραυστος', 'Ευαίσθητος στο κρύο'],
    grooming: 1, exercise: 1, train: 3, kids: false, pets: false, apartment: true, popularity: 70,
    description: 'Η μικρότερη ράτσα σκύλου, πολύ δεμένη με τον άνθρωπό της. Χρειάζεται προσεκτικό χειρισμό και προστασία από το κρύο.' },
  { name: 'Poodle', name_el: 'Κανίς', species: 'dog', origin: 'Γερμανία / Γαλλία', size: 'medium', weight: [3, 32], life: [12, 15],
    temperament: ['Πολύ έξυπνος', 'Ενεργητικός', 'Κοινωνικός'], health: ['Παθήσεις ματιών', 'Νόσος Addison'], pros: ['Σχεδόν δεν μαδάει', 'Πολύ εκπαιδεύσιμος'], cons: ['Χρειάζεται τακτικό κούρεμα', 'Βαριέται χωρίς απασχόληση'],
    grooming: 5, exercise: 3, train: 5, kids: true, pets: true, apartment: true, popularity: 75,
    description: 'Υπάρχει σε τρία μεγέθη (toy, μινιατούρα, στάνταρ). Από τους πιο έξυπνους σκύλους, με τρίχωμα που μαδάει ελάχιστα αλλά θέλει κούρεμα κάθε λίγες εβδομάδες.' },
  { name: 'Beagle', name_el: 'Μπιγκλ', species: 'dog', origin: 'Αγγλία', size: 'medium', weight: [9, 11], life: [12, 15],
    temperament: ['Χαρούμενος', 'Περίεργος', 'Φιλικός'], health: ['Ωτίτιδες', 'Παχυσαρκία'], pros: ['Καλός με παιδιά και ζώα', 'Λίγη περιποίηση'], cons: ['Ακολουθεί μυρωδιές — θέλει λουρί', 'Μπορεί να είναι θορυβώδης'],
    grooming: 2, exercise: 4, train: 2, kids: true, pets: true, apartment: false, popularity: 72,
    description: 'Κυνηγόσκυλο με εξαιρετική όσφρηση και πολλή ενέργεια. Φιλικός με όλους, αλλά πεισματάρης στην εκπαίδευση και χρειάζεται λουρί σε ανοιχτούς χώρους.' },
  { name: 'Cocker Spaniel', name_el: 'Κόκερ Σπάνιελ', species: 'dog', origin: 'Αγγλία', size: 'medium', weight: [12, 15], life: [12, 15],
    temperament: ['Γλυκός', 'Ενεργητικός', 'Χαρούμενος'], health: ['Ωτίτιδες', 'Παθήσεις ματιών'], pros: ['Καλός με παιδιά', 'Εκπαιδεύσιμος'], cons: ['Χρειάζεται τακτική περιποίηση', 'Θέλει φροντίδα στα αυτιά'],
    grooming: 4, exercise: 3, train: 4, kids: true, pets: true, apartment: true, popularity: 65,
    description: 'Τρυφερός και χαρούμενος σκύλος μεσαίου μεγέθους. Τα μακριά αυτιά και το τρίχωμα θέλουν τακτικό καθάρισμα και βούρτσισμα.' },
  { name: 'Siberian Husky', name_el: 'Χάσκι Σιβηρίας', species: 'dog', origin: 'Σιβηρία', size: 'large', weight: [16, 27], life: [12, 14],
    temperament: ['Ενεργητικός', 'Κοινωνικός', 'Ανεξάρτητος'], health: ['Παθήσεις ματιών', 'Δυσπλασία ισχίου'], pros: ['Φιλικός με ανθρώπους', 'Ανθεκτικός'], cons: ['Δύσκολος στη ζέστη', 'Πολύ μεγάλη ανάγκη άσκησης'],
    grooming: 3, exercise: 5, train: 2, kids: true, pets: false, apartment: false, popularity: 60,
    description: 'Σκύλος έλκηθρου με τεράστια αντοχή. Στην ελληνική ζέστη χρειάζεται σκιά, νερό και άσκηση μόνο τις δροσερές ώρες.' },
  { name: 'Border Collie', name_el: 'Μπόρντερ Κόλεϊ', species: 'dog', origin: 'Ηνωμένο Βασίλειο', size: 'medium', weight: [14, 20], life: [12, 15],
    temperament: ['Εξαιρετικά έξυπνος', 'Εργατικός', 'Πρόθυμος'], health: ['Δυσπλασία ισχίου', 'Παθήσεις ματιών (CEA)'], pros: ['Μαθαίνει σχεδόν τα πάντα', 'Ιδανικός για αθλήματα'], cons: ['Χρειάζεται πολλή πνευματική απασχόληση', 'Ακατάλληλος για καθιστική ζωή'],
    grooming: 3, exercise: 5, train: 5, kids: true, pets: true, apartment: false, popularity: 58,
    description: 'Ποιμενικός σκύλος και ίσως ο πιο έξυπνος. Χρειάζεται καθημερινή άσκηση και εκπαίδευση, αλλιώς βρίσκει μόνος του… απασχόληση.' },
  { name: 'Cane Corso', name_el: 'Κάνε Κόρσο', species: 'dog', origin: 'Ιταλία', size: 'giant', weight: [40, 50], life: [9, 12],
    temperament: ['Προστατευτικός', 'Σοβαρός', 'Πιστός'], health: ['Δυσπλασία ισχίου', 'Γαστρική στρέψη'], pros: ['Πολύ καλός φύλακας', 'Αφοσιωμένος στην οικογένεια'], cons: ['Θέλει έμπειρο ιδιοκτήτη', 'Χρειάζεται κοινωνικοποίηση από κουτάβι'],
    grooming: 1, exercise: 4, train: 4, kids: true, pets: false, apartment: false, popularity: 55,
    description: 'Μεγαλόσωμος μολοσσοειδής φύλακας. Χρειάζεται σταθερή, θετική εκπαίδευση και κοινωνικοποίηση από νωρίς.' },
  { name: 'Pomeranian', name_el: 'Πομεράνιαν', species: 'dog', origin: 'Γερμανία / Πολωνία', size: 'small', weight: [1.5, 3.5], life: [12, 16],
    temperament: ['Ζωηρός', 'Περίεργος', 'Τολμηρός'], health: ['Εξάρθρωση επιγονατίδας', 'Κατάρρευση τραχείας'], pros: ['Κατάλληλος για διαμέρισμα', 'Χαρούμενος σύντροφος'], cons: ['Πυκνό τρίχωμα που θέλει βούρτσισμα', 'Γαβγίζει'],
    grooming: 4, exercise: 2, train: 3, kids: false, pets: true, apartment: true, popularity: 62,
    description: 'Μικρό «αρκουδάκι» με πυκνό διπλό τρίχωμα και πολλή ενέργεια. Για τις βόλτες προτιμάται σαμαράκι αντί για περιλαίμιο.' },
  { name: 'Shih Tzu', name_el: 'Σιτζού', species: 'dog', origin: 'Θιβέτ / Κίνα', size: 'small', weight: [4, 7.5], life: [10, 16],
    temperament: ['Τρυφερός', 'Ήρεμος', 'Κοινωνικός'], health: ['Αναπνευστικά', 'Παθήσεις ματιών'], pros: ['Ιδανικός για διαμέρισμα', 'Καλός με όλους'], cons: ['Χρειάζεται τακτικό grooming', 'Ευαίσθητος στη ζέστη'],
    grooming: 5, exercise: 1, train: 3, kids: true, pets: true, apartment: true, popularity: 63,
    description: 'Γλυκός σύντροφος με μακρύ τρίχωμα που συνήθως κρατιέται κοντό με κούρεμα. Θέλει προσοχή στα μάτια και στη ζέστη.' },
  { name: 'Kokoni', name_el: 'Κοκόνι (Ελληνικό Μελιταίο)', species: 'dog', origin: 'Ελλάδα', size: 'small', weight: [4, 8], life: [13, 16],
    temperament: ['Χαρούμενος', 'Δεμένος με την οικογένεια', 'Έξυπνος'], health: ['Γενικά ανθεκτική ράτσα'], pros: ['Ιδανικό για διαμέρισμα', 'Προσαρμόζεται εύκολα'], cons: ['Δεν του αρέσει η μοναξιά', 'Μπορεί να γαβγίζει'],
    grooming: 3, exercise: 2, train: 4, kids: true, pets: true, apartment: true, popularity: 68,
    description: 'Η παραδοσιακή μικρόσωμη ράτσα της Ελλάδας: έξυπνο, εύκολο στην καθημερινότητα και πολύ δεμένο με τους ανθρώπους του.' },
  { name: 'Greek Harehound', name_el: 'Ελληνικός Ιχνηλάτης', species: 'dog', origin: 'Ελλάδα', size: 'medium', weight: [17, 20], life: [12, 14],
    temperament: ['Ενεργητικός', 'Επίμονος', 'Πιστός'], health: ['Γενικά ανθεκτική ράτσα'], pros: ['Ανθεκτικός σε ζέστη και ορεινό έδαφος', 'Λίγη περιποίηση'], cons: ['Πολύ μεγάλη ανάγκη άσκησης', 'Δυνατό γάβγισμα'],
    grooming: 1, exercise: 5, train: 3, kids: true, pets: true, apartment: false, popularity: 40,
    description: 'Ελληνικό κυνηγόσκυλο με εξαιρετική όσφρηση και αντοχή. Ταιριάζει σε δραστήριους ιδιοκτήτες με χώρο και χρόνο για πολλή κίνηση.' },
  { name: 'Greek Shepherd', name_el: 'Ελληνικός Ποιμενικός', species: 'dog', origin: 'Ελλάδα', size: 'large', weight: [32, 50], life: [12, 14],
    temperament: ['Προστατευτικός', 'Ανεξάρτητος', 'Αφοσιωμένος'], health: ['Δυσπλασία ισχίου'], pros: ['Εξαιρετικός φύλακας κοπαδιού και κτήματος', 'Ανθεκτικός'], cons: ['Ακατάλληλος για διαμέρισμα', 'Θέλει έμπειρο ιδιοκτήτη'],
    grooming: 2, exercise: 4, train: 2, kids: true, pets: false, apartment: false, popularity: 38,
    description: 'Παραδοσιακός φύλακας των κοπαδιών στην ελληνική ύπαιθρο. Ανεξάρτητος και πολύ προστατευτικός· χρειάζεται χώρο και σταθερή καθοδήγηση.' },
  { name: 'Domestic Shorthair', name_el: 'Κοινή κοντότριχη γάτα', species: 'cat', origin: 'Παγκόσμια', size: 'medium', weight: [3.5, 6], life: [13, 17],
    temperament: ['Προσαρμοστική', 'Ανεξάρτητη', 'Παιχνιδιάρα'], health: ['Παχυσαρκία', 'Οδοντικά προβλήματα'], pros: ['Ανθεκτική', 'Εύκολη στη φροντίδα'], cons: ['Ο χαρακτήρας διαφέρει πολύ από γάτα σε γάτα'],
    grooming: 1, exercise: 3, train: 2, kids: true, pets: true, apartment: true, popularity: 100,
    description: 'Η πιο συνηθισμένη γάτα στα ελληνικά σπίτια, συχνά από υιοθεσία. Ανθεκτική και προσαρμοστική, με ποικιλία χρωμάτων και χαρακτήρων.' },
  { name: 'Persian', name_el: 'Περσική', species: 'cat', origin: 'Ιράν (Περσία)', size: 'medium', weight: [3, 6], life: [12, 15],
    temperament: ['Ήρεμη', 'Τρυφερή', 'Ήσυχη'], health: ['Πολυκυστική νόσος νεφρών', 'Αναπνευστικά (βραχυκεφαλική)'], pros: ['Ιδανική για ήσυχο σπίτι', 'Πολύ ήρεμη'], cons: ['Καθημερινό βούρτσισμα', 'Φροντίδα στα μάτια'],
    grooming: 5, exercise: 1, train: 2, kids: true, pets: true, apartment: true, popularity: 75,
    description: 'Ήρεμη γάτα με μακρύ, πυκνό τρίχωμα που θέλει καθημερινό βούρτσισμα. Ιδανική για ήσυχο περιβάλλον.' },
  { name: 'British Shorthair', name_el: 'Βρετανική κοντότριχη', species: 'cat', origin: 'Ηνωμένο Βασίλειο', size: 'medium', weight: [4, 8], life: [12, 17],
    temperament: ['Ήρεμη', 'Ανεξάρτητη', 'Ήπια'], health: ['Υπερτροφική μυοκαρδιοπάθεια', 'Παχυσαρκία'], pros: ['Αντέχει τη μοναξιά', 'Εύκολη στη φροντίδα'], cons: ['Δεν της αρέσει να την κρατούν πολύ'],
    grooming: 2, exercise: 2, train: 2, kids: true, pets: true, apartment: true, popularity: 70,
    description: 'Στιβαρή, ήρεμη γάτα με πυκνό «βελούδινο» τρίχωμα. Προσαρμόζεται εύκολα σε διαμέρισμα και σε εργαζόμενους ιδιοκτήτες.' },
  { name: 'Maine Coon', name_el: 'Μέιν Κουν', species: 'cat', origin: 'ΗΠΑ', size: 'large', weight: [5, 11], life: [12, 15],
    temperament: ['Κοινωνική', 'Ήπια', 'Παιχνιδιάρα'], health: ['Υπερτροφική μυοκαρδιοπάθεια', 'Δυσπλασία ισχίου'], pros: ['Πολύ φιλική', 'Καλή με παιδιά και σκύλους'], cons: ['Μακρύ τρίχωμα που θέλει βούρτσισμα', 'Χρειάζεται χώρο'],
    grooming: 4, exercise: 3, train: 3, kids: true, pets: true, apartment: true, popularity: 65,
    description: 'Από τις μεγαλύτερες ράτσες γάτας, γνωστή ως «ήπιος γίγαντας». Κοινωνική και παιχνιδιάρα, με πυκνό τρίχωμα που θέλει τακτικό βούρτσισμα.' },
  { name: 'Siamese', name_el: 'Σιαμέζα', species: 'cat', origin: 'Ταϊλάνδη', size: 'medium', weight: [3, 5], life: [12, 20],
    temperament: ['Ομιλητική', 'Δεμένη με τον άνθρωπο', 'Έξυπνη'], health: ['Οδοντικά προβλήματα', 'Παθήσεις αναπνευστικού'], pros: ['Πολύ κοινωνική', 'Έξυπνη και εκπαιδεύσιμη'], cons: ['Φωνακλού', 'Δεν της αρέσει η μοναξιά'],
    grooming: 1, exercise: 3, train: 4, kids: true, pets: true, apartment: true, popularity: 60,
    description: 'Κομψή, «ομιλητική» γάτα με γαλάζια μάτια. Ζητά παρέα και επικοινωνία και δεν αντέχει πολλές ώρες μόνη.' },
  { name: 'Ragdoll', name_el: 'Ράγκντολ', species: 'cat', origin: 'ΗΠΑ', size: 'large', weight: [4.5, 9], life: [12, 17],
    temperament: ['Πολύ ήρεμη', 'Τρυφερή', 'Εμπιστευτική'], health: ['Υπερτροφική μυοκαρδιοπάθεια'], pros: ['Ιδανική για οικογένειες', 'Ήρεμη'], cons: ['Θέλει βούρτσισμα', 'Πολύ εμπιστευτική — μόνο εσωτερικός χώρος'],
    grooming: 3, exercise: 2, train: 3, kids: true, pets: true, apartment: true, popularity: 58,
    description: 'Μεγαλόσωμη, ήρεμη γάτα που «χαλαρώνει» στην αγκαλιά. Ταιριάζει σε οικογένειες και ζει ιδανικά σε εσωτερικό χώρο.' },
  { name: 'Sphynx', name_el: 'Σφινξ', species: 'cat', origin: 'Καναδάς', size: 'medium', weight: [3, 5], life: [8, 14],
    temperament: ['Κοινωνική', 'Ενεργητική', 'Περίεργη'], health: ['Υπερτροφική μυοκαρδιοπάθεια', 'Δερματικά'], pros: ['Δεν μαδάει', 'Πολύ κοινωνική'], cons: ['Θέλει τακτικό μπάνιο', 'Ευαίσθητη σε κρύο και ήλιο'],
    grooming: 3, exercise: 3, train: 3, kids: true, pets: true, apartment: true, popularity: 45,
    description: 'Η γνωστή «άτριχη» γάτα. Δεν μαδάει, αλλά το δέρμα της χρειάζεται τακτικό καθάρισμα και προστασία από κρύο και ήλιο.' },
]

async function main() {
  if (process.env.CONFIRM_SEED_BREEDS !== 'yes') {
    console.error('❌ seed-breeds: γράφει στη βάση του DATABASE_URL. Όρισε CONFIRM_SEED_BREEDS=yes για να τρέξει.')
    process.exit(1)
  }
  const existing = new Set((await prisma.breed.findMany({ select: { name: true } })).map(b => b.name.toLowerCase()))
  let added = 0
  for (const b of BREEDS) {
    if (existing.has(b.name.toLowerCase())) continue
    await prisma.breed.create({
      data: {
        name: b.name, name_el: b.name_el, species: b.species, origin: b.origin, size: b.size,
        weight_min: b.weight[0], weight_max: b.weight[1], lifespan_min: b.life[0], lifespan_max: b.life[1],
        temperament: b.temperament, health_issues: b.health, pros: b.pros, cons: b.cons,
        grooming_needs: b.grooming, exercise_needs: b.exercise, trainability: b.train,
        good_with_children: b.kids, good_with_pets: b.pets, apartment_friendly: b.apartment,
        popularity: b.popularity, description: b.description,
      },
    })
    added++
  }
  console.log(`✓ seed-breeds: προστέθηκαν ${added}, υπήρχαν ήδη ${BREEDS.length - added}.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
