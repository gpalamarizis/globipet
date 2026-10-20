import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Syringe, Stethoscope, Pill, FlaskConical, ScanLine, Scissors, TriangleAlert, Heart, Smile, Scale, Dna, Activity, Award, Plane, Users, PawPrint, Download, ChevronRight, Plus, Trash2, X, Pencil } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ιατρικός φάκελος — πλήρης, ίδιος με το web.
 *
 * ΓΙΑΤΙ ΞΑΝΑΓΡΑΦΤΗΚΕ
 *   Το κινητό είχε τέσσερις καρτέλες, το web δεκαέξι. Ο κτηνίατρος που
 *   ανοίγει τον φάκελο από τηλέφωνο δεν έβλεπε φάρμακα, εργαστηριακά,
 *   χειρουργεία, αλλεργίες, χρόνιες παθήσεις — τα μισά που χρειάζεται.
 *
 * ΓΙΑΤΙ ΜΙΑ ΓΕΝΙΚΗ ΑΠΟΔΟΣΗ ΚΑΙ ΟΧΙ ΔΕΚΑΕΞΙ ΜΠΛΟΚ
 *   Κάθε κατηγορία είναι λίστα εγγραφών με τίτλο, ημερομηνία και λίγα
 *   πεδία. Μία περιγραφή ανά κατηγορία κρατά τη συμπεριφορά ίδια παντού
 *   και κάνει την προσθήκη νέας κατηγορίας μία γραμμή.
 */

type FieldSpec = {
  key: string
  labelKey: string
  /** Μόνο στη φόρμα (η τιμή φαίνεται ήδη ως σήμα στην κάρτα). */
  formOnly?: boolean
}
/** Επιλογή: η τιμή που αποθηκεύεται και το κλειδί του κειμένου της.
 *  `el`: η τιμή είναι το ελληνικό κείμενο (όπως τη γράφει το web, π.χ. συχνότητα). */
type Opt = { value: string; labelKey: string; el?: boolean }
type TabSpec = {
  id: string
  /** Τμήμα διαδρομής για προσθήκη και διαγραφή· χωρίς αυτό η καρτέλα
   *  είναι ανάγνωση μόνο (ταυτότητα, γενεαλογία, πρόσβαση). */
  api?: string
  Icon: any
  labelKey: string
  /** Κλειδί στην απάντηση του server. */
  data?: string
  /** Πεδίο που γίνεται τίτλος της εγγραφής. */
  title?: string
  /** Ετικέτα του πεδίου τίτλου στη φόρμα (αλλιώς το όνομα της καρτέλας). */
  titleLabelKey?: string
  /** Πεδίο ημερομηνίας. */
  date?: string
  /** Πεδία που εμφανίζονται ως ζεύγη. */
  fields?: FieldSpec[]
  /** Πεδίο που γίνεται σήμα, με τόνο. */
  badge?: { key: string; danger?: string[] }
  /** Πεδία με σταθερές τιμές (ίδιες με τα <select> του web): επιλογή στη
   *  φόρμα, μεταφρασμένο κείμενο στην κάρτα. */
  opts?: Record<string, Opt[]>
  /** Υποχρεωτικά πεδία (schema.prisma / passport.ts). */
  required?: string[]
  /** Προεπιλογές της φόρμας — ίδιες με το «Νέο …» του web. */
  defaults?: () => Record<string, string>
  /** Ο server δεν αποθηκεύει σημειώσεις (HealthRecord δεν έχει notes). */
  noNotes?: boolean
}

// Επιλογές με κλειδί κειμένου `prefix + τιμή`· το «other» δείχνει «Άλλο».
const opt = (prefix: string, values: string[], otherKey = 'passport.vt_other'): Opt[] =>
  values.map(v => ({ value: v, labelKey: v === 'other' ? otherKey : prefix + v }))

// Τύπος εμβολίου — ίδιες τιμές με το web. Χωρίς επιλογή δεν στέλνεται και
// ο server βάζει 'other' (ίδιο default με το web, όπου το πεδίο ξεκινά «—»).
// Χωρίς αυτό το πεδίο η κάρτα «Κατάσταση εγγράφων» δεν έβρισκε ποτέ λύσσα
// για εμβόλια που περάστηκαν από το κινητό.
const VACCINE_TYPES = [
  { value: 'core', labelKey: 'passport.vt_core' },
  { value: 'non_core', labelKey: 'passport.vt_non_core' },
  { value: 'rabies', labelKey: 'passport.vt_rabies' },
  { value: 'other', labelKey: 'passport.vt_other' },
]

// Συχνότητα: το web αποθηκεύει το ελληνικό κείμενο της επιλογής.
const FREQUENCY: Opt[] = ['onceDaily', 'twiceDaily', 'threeDaily', 'weekly', 'monthly', 'asNeeded']
  .map(k => ({ value: k, labelKey: `passport.fq_${k}`, el: true }))

const TABS: TabSpec[] = [
  { id: 'identity', Icon: BookOpen, labelKey: 'passport.identity' },

  // Το batch_number δεν έχει στήλη στο Vaccination (ο server το αγνοεί).
  { id: 'vaccines', api: 'vaccination', Icon: Syringe, labelKey: 'passport.vaccines',
    data: 'vaccinations', title: 'vaccine_name', date: 'date_administered',
    badge: { key: 'vaccine_type' },
    opts: { vaccine_type: VACCINE_TYPES },
    required: ['vaccine_name', 'date_administered'],
    defaults: () => ({ date_administered: localToday() }),
    fields: [
      { key: 'next_due_date', labelKey: 'passport.nextDue' },
      { key: 'vet_name', labelKey: 'passport.vet' },
    ] },

  // Ίδια πεδία με το web· το /health δεν αποθηκεύει diagnosis/treatment/notes.
  { id: 'health', api: 'health', Icon: Stethoscope, labelKey: 'passport.visits',
    data: 'healthRecords', title: 'title', date: 'date',
    opts: { record_type: opt('passport.rt_', ['examination', 'diagnosis', 'follow_up', 'specialist', 'emergency', 'other']) },
    required: ['title', 'date'],
    defaults: () => ({ date: localToday(), record_type: 'examination' }),
    noNotes: true,
    fields: [
      { key: 'record_type', labelKey: 'passport.recordType' },
      { key: 'vet_name', labelKey: 'passport.vet' },
      { key: 'clinic_name', labelKey: 'passport.clinic' },
      { key: 'description', labelKey: 'providerDash.description' },
      { key: 'cost', labelKey: 'passport.cost' },
      { key: 'next_appointment', labelKey: 'passport.nextAppointment' },
    ] },

  { id: 'meds', api: 'medication', Icon: Pill, labelKey: 'passport.medications',
    data: 'medications', title: 'name', date: 'start_date',
    badge: { key: 'is_active' },
    opts: { frequency: FREQUENCY, route: opt('passport.ro_', ['oral', 'injection', 'topical', 'eye_drops', 'ear_drops']) },
    required: ['name', 'dosage', 'frequency', 'start_date'],
    defaults: () => ({ start_date: localToday(), frequency: 'onceDaily' }),
    fields: [
      { key: 'active_ingredient', labelKey: 'passport.ingredient' },
      { key: 'dosage', labelKey: 'passport.dosage' },
      { key: 'frequency', labelKey: 'passport.frequency' },
      { key: 'route', labelKey: 'passport.route' },
      { key: 'end_date', labelKey: 'passport.until' },
    ] },

  { id: 'lab', api: 'lab', Icon: FlaskConical, labelKey: 'passport.lab',
    data: 'labResults', title: 'title', date: 'date',
    badge: { key: 'is_abnormal' },
    opts: { result_type: opt('passport.lt_', ['blood_count', 'biochemistry', 'urine', 'fecal', 'biopsy', 'culture', 'hormone', 'serology', 'other']) },
    required: ['title', 'result_type', 'date'],
    defaults: () => ({ date: localToday(), result_type: 'blood_count' }),
    fields: [
      { key: 'result_type', labelKey: 'passport.resultType' },
      { key: 'lab_name', labelKey: 'passport.labName' },
      { key: 'vet_name', labelKey: 'passport.vet' },
      { key: 'findings', labelKey: 'ai.findings' },
    ] },

  { id: 'imaging', api: 'imaging', Icon: ScanLine, labelKey: 'passport.imaging',
    data: 'imaging', title: 'imaging_type', date: 'date',
    opts: { imaging_type: opt('passport.it_', ['xray', 'ultrasound', 'ct', 'mri', 'endoscopy', 'echocardiogram', 'other']) },
    required: ['imaging_type', 'date'],
    defaults: () => ({ date: localToday(), imaging_type: 'xray' }),
    fields: [
      { key: 'body_region', labelKey: 'passport.bodyRegion' },
      { key: 'vet_name', labelKey: 'passport.vet' },
      { key: 'clinic_name', labelKey: 'passport.clinic' },
      { key: 'findings', labelKey: 'ai.findings' },
    ] },

  { id: 'surgery', api: 'surgery', Icon: Scissors, labelKey: 'passport.surgeries',
    data: 'surgeries', title: 'procedure', date: 'date',
    opts: {
      category: opt('passport.sc_', ['orthopedic', 'soft_tissue', 'dental', 'ophthalmic', 'neurological', 'reproductive', 'other'], 'passport.sc_other'),
      anesthesia: opt('passport.an_', ['general', 'local', 'sedation']),
    },
    required: ['procedure', 'date'],
    defaults: () => ({ date: localToday() }),
    fields: [
      { key: 'category', labelKey: 'providerDash.category' },
      { key: 'surgeon_name', labelKey: 'passport.surgeon' },
      { key: 'clinic_name', labelKey: 'passport.clinic' },
      { key: 'anesthesia', labelKey: 'passport.anesthesia' },
      { key: 'duration_min', labelKey: 'passport.durationMin' },
      { key: 'complications', labelKey: 'passport.complications' },
      { key: 'outcome', labelKey: 'passport.outcome' },
      { key: 'follow_up', labelKey: 'passport.followUp' },
      { key: 'cost', labelKey: 'passport.cost' },
    ] },

  { id: 'allergies', api: 'allergy', Icon: TriangleAlert, labelKey: 'passport.allergies',
    data: 'allergies', title: 'allergen', date: 'diagnosed_date',
    badge: { key: 'severity', danger: ['severe', 'anaphylactic', 'high'] },
    opts: {
      allergen_type: opt('passport.at_', ['food', 'medication', 'environmental', 'insect', 'contact', 'other']),
      severity: opt('passport.st_', ['mild', 'moderate', 'severe', 'anaphylactic']),
    },
    required: ['allergen', 'allergen_type'],
    defaults: () => ({ allergen_type: 'food', severity: 'moderate' }),
    fields: [
      { key: 'allergen_type', labelKey: 'passport.allergenType' },
      { key: 'severity', labelKey: 'ai.severity', formOnly: true },
      { key: 'reaction', labelKey: 'passport.reaction' },
      { key: 'treatment', labelKey: 'passport.treatment' },
    ] },

  { id: 'chronic', api: 'chronic', Icon: Heart, labelKey: 'passport.chronic',
    data: 'chronicConditions', title: 'condition', date: 'diagnosed_date',
    badge: { key: 'status' },
    opts: { status: opt('passport.cs_', ['active', 'managed', 'resolved']) },
    required: ['condition'],
    defaults: () => ({ status: 'active' }),
    fields: [
      { key: 'status', labelKey: 'passport.status', formOnly: true },
      { key: 'diagnosed_by', labelKey: 'passport.diagnosedBy' },
      { key: 'clinic_name', labelKey: 'passport.clinic' },
      { key: 'treatment_plan', labelKey: 'passport.treatmentPlan' },
      { key: 'monitoring', labelKey: 'passport.monitoring' },
    ] },

  { id: 'dental', api: 'dental', Icon: Smile, labelKey: 'passport.dental',
    data: 'dentalRecords', title: 'procedure', date: 'date',
    opts: {
      procedure: opt('passport.dp_', ['cleaning', 'extraction', 'xray', 'root_canal', 'other']),
      // Το web αποθηκεύει «Stage N».
      grade: [1, 2, 3, 4].map(n => ({ value: `Stage ${n}`, labelKey: `passport.stage_${n}` })),
    },
    required: ['procedure', 'date'],
    defaults: () => ({ date: localToday(), procedure: 'cleaning' }),
    fields: [
      { key: 'vet_name', labelKey: 'passport.vet' },
      { key: 'teeth_treated', labelKey: 'passport.teeth' },
      { key: 'grade', labelKey: 'passport.grade' },
      { key: 'next_due', labelKey: 'passport.nextDue' },
      { key: 'cost', labelKey: 'passport.cost' },
    ] },

  // Οι σημειώσεις έχουν δικό τους πεδίο στη φόρμα (όχι δεύτερη φορά εδώ).
  { id: 'weight', api: 'weight', Icon: Scale, labelKey: 'passport.weight',
    data: 'weightRecords', title: 'weight_kg', date: 'date',
    required: ['weight_kg', 'date'],
    defaults: () => ({ date: localToday() }),
    fields: [
      { key: 'bcs', labelKey: 'passport.bcs' },
      { key: 'vet_name', labelKey: 'passport.vet' },
    ] },

  { id: 'genetic', api: 'genetic', Icon: Dna, labelKey: 'passport.genetic',
    data: 'geneticTests', title: 'test_name', date: 'date',
    required: ['test_name', 'date'],
    defaults: () => ({ date: localToday() }),
    fields: [
      { key: 'provider', labelKey: 'passport.provider' },
      { key: 'results', labelKey: 'passport.results' },
      { key: 'breeds_detected', labelKey: 'passport.breedsDetected' },
      { key: 'conditions_found', labelKey: 'passport.conditionsFound' },
    ] },

  // Η στήλη είναι temperature_c (όχι temperature).
  { id: 'vitals', api: 'vitals', Icon: Activity, labelKey: 'passport.vitals',
    data: 'vitalSigns', title: 'date', date: 'date',
    // Ίδιες τιμές με το <select> του web.
    opts: { capillary_refill: [
      { value: '<2sec', labelKey: 'passport.crt_normal' },
      { value: '2-3sec', labelKey: 'passport.crt_prolonged' },
      { value: '>3sec', labelKey: 'passport.crt_critical' },
    ] },
    required: ['date'],
    defaults: () => ({ date: localToday() }),
    fields: [
      { key: 'temperature_c', labelKey: 'passport.temperature' },
      { key: 'heart_rate', labelKey: 'passport.heartRate' },
      { key: 'respiratory_rate', labelKey: 'passport.respiratory' },
      { key: 'blood_pressure', labelKey: 'passport.bloodPressure' },
      { key: 'capillary_refill', labelKey: 'passport.crt' },
      { key: 'vet_name', labelKey: 'passport.vet' },
    ] },

  { id: 'pedigree', Icon: Award, labelKey: 'passport.pedigree' },

  { id: 'travel', api: 'travel', Icon: Plane, labelKey: 'passport.travel',
    data: 'travelDocs', title: 'destination_country', titleLabelKey: 'passport.destCountry', date: 'departure_date',
    opts: { travel_type: opt('passport.tt_', ['flight', 'ferry', 'train', 'road', 'international']) },
    required: ['travel_type', 'destination_city', 'departure_date'],
    defaults: () => ({ travel_type: 'flight' }),
    fields: [
      { key: 'travel_type', labelKey: 'passport.travelType' },
      { key: 'origin_city', labelKey: 'passport.from' },
      { key: 'destination_city', labelKey: 'passport.to' },
      { key: 'carrier', labelKey: 'passport.carrier' },
      { key: 'booking_ref', labelKey: 'passport.bookingRef' },
    ] },

  // Πρόσβαση κτηνιάτρων: χορήγηση (POST /passport/access/:petId) και
  // ανάκληση (DELETE /passport/access/:id), όπως στο web. Πριν ήταν μόνο
  // ανάγνωση στο κινητό.
  { id: 'access', api: 'access', Icon: Users, labelKey: 'passport.access',
    data: 'accessList', title: 'provider_email', date: 'granted_at',
    badge: { key: 'status' },
    required: ['provider_email'],
    fields: [
      { key: 'provider_name', labelKey: 'passport.acc_vetName' },
      { key: 'reason', labelKey: 'passport.acc_reasonComment' },
      { key: 'expires_at', labelKey: 'passport.acc_accessExpiry' },
    ] },
]

// Αριθμητικά πεδία (Int / Float στο schema) και λίστες (String[]): η φόρμα
// δίνει κείμενο, που το Prisma απορρίπτει — μετατρέπονται πριν την αποστολή.
const NUM_INT = new Set(['bcs', 'heart_rate', 'respiratory_rate', 'duration_min'])
const NUM_FLOAT = new Set(['weight_kg', 'temperature_c', 'cost'])
const LIST_KEYS = new Set(['breeds_detected', 'conditions_found'])
// Boolean στο schema (π.χ. PetLabResult.is_abnormal): στη φόρμα 'true'/'', στον server true/false.
const BOOL_KEYS = new Set(['is_abnormal'])

// Πεδία ημερομηνίας της φόρμας — τα ίδια που στο web είναι <input type="date">,
// και το expires_at της πρόσβασης. Στο κινητό γράφονται ως κείμενο, οπότε
// ελέγχονται πριν φύγουν: το expires_at είναι DateTime στη βάση (ελεύθερο
// κείμενο → Invalid Date → 500) και τα υπόλοιπα, αν και String, συγκρίνονται
// και ταξινομούνται ως YYYY-MM-DD (π.χ. λύσσα σε ισχύ, ταξινόμηση λίστας).
const DATE_KEYS = new Set([
  'date', 'date_administered', 'next_due_date', 'next_appointment', 'start_date', 'end_date',
  'diagnosed_date', 'next_due', 'departure_date', 'return_date', 'expires_at',
])

/** YYYY-MM-DD και υπαρκτή ημερομηνία (όχι 2026-02-30), χωρίς new Date('YYYY-MM-DD'). */
function isValidYmd(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const x = new Date(y, mo - 1, d)
  return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d
}

// Σημερινή τοπική ημερομηνία ως YYYY-MM-DD· σύγκριση με το next_due_date
// χωρίς new Date('YYYY-MM-DD'), που διαβάζεται ως UTC.
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PassportScreen() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  // Από την καρτέλα κατοικιδίου ο φάκελος ανοίγει κατευθείαν στο ζώο
  // (όπως στο web, όπου η σελίδα του ζώου δείχνει τον φάκελό του).
  const params = useLocalSearchParams<{ petId?: string }>()
  const [petId, setPetId] = useState(typeof params.petId === 'string' ? params.petId : '')
  const [tab, setTab] = useState('identity')

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['passport', petId],
    queryFn: () => api.get(`/passport/${petId}`).then(r => r.data?.data ?? r.data),
    enabled: !!petId,
  })

  /**
   * Προσθήκη και διαγραφή εγγραφών.
   *
   * Ο φάκελος ήταν ανάγνωση μόνο στο κινητό: ο κτηνίατρος που μόλις
   * εμβολίασε έπρεπε να ανοίξει υπολογιστή για να το καταχωρήσει. Η φόρμα
   * χτίζεται από την ίδια περιγραφή που αποδίδει τη λίστα, οπότε κάθε νέα
   * κατηγορία αποκτά φόρμα χωρίς επιπλέον κώδικα.
   */
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const addRecord = useMutation({
    mutationFn: (body: Record<string, any>) => api.post(`/passport/${spec.api}/${petId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passport', petId] })
      setAdding(false); setForm({})
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Η γενεαλογία είναι ΕΝΑ αντικείμενο ανά ζώο, όχι λίστα: ο server το
  // δημιουργεί ή το ενημερώνει με την ίδια κλήση.
  const savePedigree = useMutation({
    mutationFn: () => api.put(`/passport/pedigree/${petId}`, { ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passport', petId] })
      setAdding(false); setForm({})
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const deleteRecord = useMutation({
    mutationFn: ({ api: ep, id }: { api: string; id: string }) => api.delete(`/passport/${ep}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passport', petId] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Στην πρόσβαση το DELETE δεν σβήνει: κάνει την εγγραφή «Ανακλήθηκε».
  // Το Alert το λέει έτσι, όχι «Διαγραφή».
  const confirmDelete = (r: any) => {
    const revoke = spec.id === 'access'
    Alert.alert(t(revoke ? 'passport.revokeTitle' : 'passport.deleteTitle'), t(revoke ? 'passport.revokeQ' : 'passport.deleteQ'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t(revoke ? 'passport.revoke' : 'common.delete'), style: 'destructive',
        onPress: () => deleteRecord.mutate({ api: spec.api!, id: r.id }) },
    ])
  }

  /**
   * Έλεγχος και μετατροπή πριν την αποστολή — ίδιο σώμα με αυτό του web:
   * υποχρεωτικά πεδία, ημερομηνίες (βλ. DATE_KEYS), αριθμοί ως Number,
   * λίστες ως πίνακας, και η συχνότητα ως το ελληνικό κείμενο της επιλογής.
   */
  const submitRecord = () => {
    if (addRecord.isPending) return
    const body: Record<string, any> = {}
    for (const [k, raw] of Object.entries(form)) {
      const v = typeof raw === 'string' ? raw.trim() : raw
      if (v === '' || v == null) continue
      const o = spec.opts?.[k]?.find(x => x.value === v)
      if (o?.el) body[k] = t(o.labelKey, { lng: 'el' })
      else if (BOOL_KEYS.has(k)) body[k] = v === 'true'
      else if (NUM_INT.has(k) || NUM_FLOAT.has(k)) {
        const n = v.replace(',', '.')
        if (!/^\d+(\.\d+)?$/.test(n)) return Alert.alert(t('common.error'), t('passport.invalidNumber'))
        body[k] = NUM_INT.has(k) ? Math.round(parseFloat(n)) : parseFloat(n)
      } else if (LIST_KEYS.has(k)) body[k] = v.split(',').map(x => x.trim()).filter(Boolean)
      // Το email του κτηνιάτρου όπως το αποθηκεύει ο λογαριασμός του:
      // με κενά ή κεφαλαία η πρόσβαση δεν θα ταίριαζε ποτέ με το login του.
      else body[k] = k === 'provider_email' ? v.toLowerCase() : v
    }
    if ((spec.required ?? []).some(k => body[k] == null)) return Alert.alert(t('common.error'), t('passport.requiredMissing'))
    // BCS: κλίμακα 1–9 (στο web επιλογή 1–9).
    if (body.bcs != null && (body.bcs < 1 || body.bcs > 9)) return Alert.alert(t('common.error'), t('passport.bcsRange'))
    if (Object.keys(body).some(k => DATE_KEYS.has(k) && !isValidYmd(body[k]))) return Alert.alert(t('common.error'), t('passport.invalidDate'))
    addRecord.mutate(body)
  }

  const exportPdf = async () => {
    try {
      const { data: res } = await api.get(`/passport/${petId}/pdf`)
      const url = res?.url ?? res?.data?.url
      if (!url) return Alert.alert(t('common.error'), t('passport.pdfFailed'))
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('passport.pdfFailed'))
    }
  }

  if (!isAuthenticated) return (
    <Screen title={t('discover.medical_record')} back>
      <EmptyState icon={BookOpen} title={t('pets.login_required')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  // Χωρίς επιλεγμένο ζώο δεν υπάρχει φάκελος: ο φάκελος ανοίγει ανά ζώο.
  if (!petId) return (
    <Screen title={t('discover.medical_record')} back>
      <Text style={s.intro}>{t('passport.record_per_pet')}</Text>
      {pets.length === 0 ? (
        <EmptyState icon={PawPrint} title={t('pets.none_yet')} />
      ) : pets.map((p: any) => (
        <Card key={p.id} onPress={() => setPetId(p.id)}>
          <View style={s.row}>
            <Text style={s.emoji}>{p.species === 'cat' ? '🐈' : '🐕'}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.petName}>{p.name}</Text>
              <Text style={s.petMeta}>{t(`pets.kind_${p.species}`, { defaultValue: p.species })}</Text>
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </View>
        </Card>
      ))}
    </Screen>
  )

  const pet = data?.pet
  const spec = TABS.find(x => x.id === tab)!
  const records: any[] = spec.data ? (data?.[spec.data] ?? []) : []

  const fmt = (v: any) => {
    if (v == null || v === '') return null
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'boolean') return v ? t('common.yes') : t('common.no')
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
    return String(v)
  }

  // Τιμή πεδίου με επιλογές → μεταφρασμένο κείμενο (άγνωστη/ελεύθερη τιμή μένει ως έχει).
  const optLabel = (key: string, v: any) => {
    const o = spec.opts?.[key]?.find(x => (x.el ? t(x.labelKey, { lng: 'el' }) : x.value) === v)
    return o ? t(o.labelKey) : fmt(v)
  }

  const badgeFor = (r: any) => {
    if (!spec.badge) return null
    const v = r[spec.badge.key]
    if (v == null || v === '') return null
    if (spec.opts?.[spec.badge.key]) {
      return <Badge label={optLabel(spec.badge.key, v) ?? String(v)}
        tone={spec.badge.danger?.includes(String(v).toLowerCase()) ? 'danger' : 'neutral'} />
    }
    // Εργαστηριακά: παθολογικά / φυσιολογικά (όπως στο web), όχι «Ενεργό».
    if (spec.badge.key === 'is_abnormal' && typeof v === 'boolean') {
      return <Badge label={v ? t('passport.abnormal') : t('passport.normal')}
        tone={v ? 'danger' : 'success'} />
    }
    if (typeof v === 'boolean') {
      return <Badge label={v ? t('passport.active') : t('passport.inactive')}
        tone={v ? 'success' : 'neutral'} />
    }
    const danger = spec.badge.danger?.includes(String(v).toLowerCase())
    return <Badge label={t(`passport.st_${v}`, { defaultValue: String(v) })}
      tone={danger ? 'danger' : 'neutral'} />
  }

  // Πεδίο φόρμας: επιλογή (όπως τα <select> του web) ή κείμενο, με το
  // κατάλληλο πληκτρολόγιο για αριθμούς. Τα υποχρεωτικά σημειώνονται με *.
  const renderField = (key: string, labelKey: string) => {
    const req = !!spec.required?.includes(key)
    const label = req ? `${t(labelKey)} *` : t(labelKey)
    const options = spec.opts?.[key]
    if (options) return (
      <View key={key} style={{ gap: space.xs }}>
        <Text style={s.k}>{label}</Text>
        <View style={s.tabs}>
          {options.map(o => {
            const on = form[key] === o.value
            return (
              <TouchableOpacity key={o.value} activeOpacity={0.7}
                style={[s.tab, on && s.tabOn]}
                onPress={() => setForm(f => ({ ...f, [key]: on && !req ? '' : o.value }))}>
                <Text style={[s.tabTxt, on && s.tabTxtOn]}>{t(o.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
    return (
      <Input key={key} label={label} value={form[key] ?? ''}
        onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
        placeholder={DATE_KEYS.has(key) ? 'YYYY-MM-DD' : LIST_KEYS.has(key) ? t('passport.commaHint') : undefined}
        keyboardType={NUM_INT.has(key) || NUM_FLOAT.has(key) ? 'decimal-pad' : undefined} />
    )
  }

  return (
    <Screen title={pet?.name ?? t('discover.medical_record')} back scroll={false}
      action={
        <TouchableOpacity onPress={exportPdf} hitSlop={10}>
          <Download size={icon.md} color={colors.brand} />
        </TouchableOpacity>
      }>
      <ScrollView contentContainerStyle={s.body}>
        {/* Καρτέλες σε πλέγμα: δεκαέξι δεν χωρούν σε σειρά, και η οριζόντια
            κύλιση έκρυβε τις μισές. */}
        <View style={s.tabs}>
          {TABS.map(tb => {
            const on = tab === tb.id
            const count = tb.data ? (data?.[tb.data] ?? []).length : 0
            return (
              <TouchableOpacity key={tb.id} activeOpacity={0.7}
                style={[s.tab, on && s.tabOn]} onPress={() => setTab(tb.id)}>
                <tb.Icon size={13} color={on ? colors.textOnDark : colors.textMuted} />
                <Text style={[s.tabTxt, on && s.tabTxtOn]} numberOfLines={1}>{t(tb.labelKey)}</Text>
                {count > 0 && (
                  <View style={[s.count, on && s.countOn]}>
                    <Text style={[s.countTxt, on && s.countTxtOn]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Προσθήκη: μόνο όπου η κατηγορία γράφεται. Ταυτότητα, γενεαλογία
            και πρόσβαση δεν είναι λίστες εγγραφών. */}
        {tab === 'pedigree' && (
          <Button label={t('common.edit')}
            icon={<Pencil size={18} color={colors.textOnDark} />}
            onPress={() => {
              const pd = data?.pedigree ?? {}
              setForm({
                registration_number: pd.registration_number ?? '',
                kennel_club: pd.kennel_club ?? '',
                father_name: pd.father_name ?? '',
                mother_name: pd.mother_name ?? '',
                breeder_name: pd.breeder_name ?? '',
                breeder_contact: pd.breeder_contact ?? '',
              })
              setAdding(true)
            }} full />
        )}

        {tab === 'access' && <Text style={s.intro}>{t('passport.acc_accessInfo')}</Text>}
        {!!spec.api && (
          <Button label={tab === 'access' ? t('passport.acc_grantAccess') : t('passport.addRecord')}
            icon={<Plus size={18} color={colors.textOnDark} />}
            onPress={() => { setForm(spec.defaults?.() ?? {}); setAdding(true) }} full />
        )}

        {isLoading ? <SkeletonRows count={4} /> : (
          <>
            {/* Ταυτότητα */}
            {tab === 'identity' && pet && (
              <Card>
                <View style={s.petHead}>
                  <Text style={s.emojiBig}>{pet.species === 'cat' ? '🐈' : '🐕'}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.petName}>{pet.name}</Text>
                    <Text style={s.petMeta}>
                      {t(`pets.kind_${pet.species}`, { defaultValue: pet.species })}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                    </Text>
                  </View>
                </View>
                {([
                  ['passport.species', pet.species ? t(`pets.kind_${pet.species}`, { defaultValue: pet.species }) : null],
                  ['pets.gender', pet.gender === 'female' ? t('passport.female') : pet.gender === 'male' ? t('passport.male') : null],
                  ['passport.age', pet.age != null ? t('passport.age_years', { count: pet.age }) : null],
                  ['pets.weight', pet.weight ? `${pet.weight} kg` : null],
                  ['pets.color', fmt(pet.color)],
                  ['pets.microchip', fmt(pet.microchip_number)],
                  ['passport.sterilised', pet.is_sterilized != null ? fmt(pet.is_sterilized) : null],
                ] as const).filter(([, v]) => v).map(([k, v]) => (
                  <View key={k} style={s.kv}>
                    <Text style={s.k}>{t(k)}</Text>
                    <Text style={s.v} numberOfLines={2}>{v}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Pedigree: ένα αντικείμενο, όχι λίστα */}
            {tab === 'pedigree' && (
              data?.pedigree ? (
                <Card>
                  {([
                    ['passport.regNumber', data.pedigree.registration_number],
                    ['passport.kennelClub', data.pedigree.kennel_club],
                    ['passport.father', data.pedigree.father_name],
                    ['passport.mother', data.pedigree.mother_name],
                    ['passport.breeder', data.pedigree.breeder_name],
                    ['common.phone', data.pedigree.breeder_contact],
                  ] as const).filter(([, v]) => v).map(([k, v]) => (
                    <View key={k} style={s.kv}>
                      <Text style={s.k}>{t(k)}</Text>
                      <Text style={s.v} numberOfLines={2}>{String(v)}</Text>
                    </View>
                  ))}
                </Card>
              ) : <EmptyState icon={Award} title={t('passport.no_entries')} />
            )}

            {/* Κατάσταση εγγράφων ταξιδιού — ίδιοι έλεγχοι με το web. */}
            {tab === 'travel' && data && (
              <Card>
                <Text style={[s.recTitle, { marginBottom: space.sm }]}>{t('passport.docStatus')}</Text>
                {([
                  ['pets.microchip', !!pet?.microchip_number],
                  ['passport.rabiesVaccine', (data.vaccinations ?? []).some((v: any) =>
                    v.vaccine_type === 'rabies' && (!v.next_due_date || String(v.next_due_date).slice(0, 10) >= localToday()))],
                  // Δεν υπάρχει πεδίο «SNAP» στη βάση: «Ναι» μόνο αν κάποια εργαστηριακή ή
                  // εξέταση το αναφέρει ρητά στον τίτλο, αλλιώς ουδέτερο «έλεγξε» (όπως στο web).
                  ['passport.snapTest', [...(data.labResults ?? []), ...(data.healthRecords ?? [])]
                    .some((r: any) => /\bsnap\b/i.test(String(r.title ?? ''))) ? true : null],
                  ['passport.travelDocs', (data.travelDocs ?? []).length > 0],
                ] as const).map(([k, ok]) => (
                  <View key={k} style={[s.kv, { alignItems: 'center' }]}>
                    <Text style={s.k}>{t(k)}</Text>
                    <Badge label={ok === null ? t('passport.verifyManually') : ok ? t('common.yes') : t('common.no')}
                      tone={ok === null ? 'neutral' : ok ? 'success' : 'danger'} />
                  </View>
                ))}
              </Card>
            )}

            {/* Κάθε άλλη κατηγορία: λίστα εγγραφών */}
            {spec.data && (
              records.length === 0
                ? <EmptyState icon={spec.Icon} title={t('passport.no_entries')} />
                : records.map((r: any, i: number) => (
                    <Card key={r.id ?? i}>
                      <View style={s.recHead}>
                        <Text style={s.recTitle} numberOfLines={2}>
                          {optLabel(spec.title ?? 'title', r[spec.title ?? 'title']) ?? t(spec.labelKey)}
                        </Text>
                        {badgeFor(r)}
                        {!!spec.api && !!r.id && (spec.id !== 'access' || r.status === 'approved') && (
                          <TouchableOpacity onPress={() => confirmDelete(r)} hitSlop={8}>
                            <Trash2 size={15} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {spec.date && fmt(r[spec.date]) && (
                        <Text style={s.recDate}>{fmt(r[spec.date])}</Text>
                      )}
                      {spec.fields?.map(f => {
                        if (f.formOnly) return null
                        const v = optLabel(f.key, r[f.key])
                        if (!v) return null
                        return (
                          <View key={f.key} style={s.kv}>
                            <Text style={s.k}>{t(f.labelKey)}</Text>
                            <Text style={s.v} numberOfLines={3}>{v}</Text>
                          </View>
                        )
                      })}
                      {!!r.notes && (
                        <Text style={s.notes}>{r.notes}</Text>
                      )}
                    </Card>
                  ))
            )}
          </>
        )}

        <Button label={t('passport.exportPdf')}
          icon={<Download size={18} color={colors.textOnDark} />}
          onPress={exportPdf} full style={{ marginTop: space.lg }} />
      </ScrollView>

      {/* Φόρμα προσθήκης, χτισμένη από την περιγραφή της κατηγορίας */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t(spec.labelKey)}</Text>
              <TouchableOpacity onPress={() => setAdding(false)}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
              {tab === 'pedigree' ? (
                ([
                  ['registration_number', 'passport.regNumber'],
                  ['kennel_club', 'passport.kennelClub'],
                  ['father_name', 'passport.father'],
                  ['mother_name', 'passport.mother'],
                  ['breeder_name', 'passport.breeder'],
                  ['breeder_contact', 'common.phone'],
                ] as const).map(([key, labelKey]) => (
                  <Input key={key} label={t(labelKey)} value={form[key] ?? ''}
                    onChangeText={v => setForm(f => ({ ...f, [key]: v }))} />
                ))
              ) : null}

              {tab === 'access' ? (<>
                <Input label={t('passport.acc_vetEmailReq')} value={form.provider_email ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, provider_email: v }))}
                  keyboardType="email-address" autoCapitalize="none" />
                <Input label={t('passport.acc_vetName')} value={form.provider_name ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, provider_name: v }))} />
                <Input label={t('passport.acc_reasonComment')} value={form.reason ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, reason: v }))} />
                <Input label={t('passport.acc_accessExpiry')} value={form.expires_at ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, expires_at: v }))} placeholder="YYYY-MM-DD" />
              </>) : null}

              {tab !== 'pedigree' && tab !== 'access' && (<>
              {/* Ο τίτλος και η ημερομηνία πρώτα: είναι τα πεδία που
                  ταυτοποιούν την εγγραφή σε κάθε κατηγορία. */}
              {/* Στα ζωτικά ο τίτλος είναι η ίδια η ημερομηνία: ένα πεδίο, όχι δύο. */}
              {!!spec.title && spec.title !== spec.date && renderField(spec.title, spec.titleLabelKey ?? spec.labelKey)}
              {!!spec.date && renderField(spec.date, 'serviceDetail.date')}
              {tab === 'vaccines' && (
                <View style={{ gap: space.xs }}>
                  <Text style={s.k}>{t('passport.vaccineType')}</Text>
                  <View style={s.tabs}>
                    {VACCINE_TYPES.map(vt => {
                      const on = form.vaccine_type === vt.value
                      return (
                        <TouchableOpacity key={vt.value} activeOpacity={0.7}
                          style={[s.tab, on && s.tabOn]}
                          onPress={() => setForm(f => ({ ...f, vaccine_type: on ? '' : vt.value }))}>
                          <Text style={[s.tabTxt, on && s.tabTxtOn]}>{t(vt.labelKey)}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}
              {spec.fields?.map(f => renderField(f.key, f.labelKey))}
              {/* Εργαστηριακά: «Παθολογικά αποτελέσματα» (checkbox στο web). */}
              {tab === 'lab' && (
                <View style={s.tabs}>
                  <TouchableOpacity activeOpacity={0.7}
                    style={[s.tab, form.is_abnormal === 'true' && s.tabOn]}
                    onPress={() => setForm(f => ({ ...f, is_abnormal: f.is_abnormal === 'true' ? '' : 'true' }))}>
                    <Text style={[s.tabTxt, form.is_abnormal === 'true' && s.tabTxtOn]}>{t('passport.abnormalResults')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!spec.noNotes && (
                <Input label={t('serviceDetail.note')} value={form.notes ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline />
              )}
              </>)}
            </ScrollView>
            <Button label={t('common.save')}
              disabled={tab === 'pedigree'
                ? savePedigree.isPending
                // Ενεργό όταν είναι συμπληρωμένα τα ΥΠΟΧΡΕΩΤΙΚΑ πεδία του τύπου
                // (spec.required, ίδια με το submitRecord και το web) — όχι ο
                // τίτλος: στο ταξίδι η χώρα προορισμού δεν είναι υποχρεωτική.
                : (addRecord.isPending || (spec.required ?? []).some(k => !String(form[k] ?? '').trim()))}
              loading={addRecord.isPending || savePedigree.isPending}
              onPress={() => (tab === 'pedigree' ? savePedigree.mutate() : submitRecord())} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.md, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTxt: { fontSize: 11, color: colors.textMuted, fontWeight: weight.medium },
  tabTxtOn: { color: colors.textOnDark, fontWeight: weight.bold },
  count: {
    minWidth: 16, paddingHorizontal: 4, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt, alignItems: 'center',
  },
  countOn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countTxt: { fontSize: 10, color: colors.textMuted, fontWeight: weight.bold },
  countTxtOn: { color: colors.textOnDark },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  emoji: { fontSize: 26 },
  emojiBig: { fontSize: 40 },
  petHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  petName: { ...type.section, color: colors.text },
  petMeta: { ...type.caption, color: colors.textLight },

  recHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  recTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  recDate: { ...type.caption, color: colors.textLight, marginTop: 2 },
  notes: { ...type.caption, color: colors.textMuted, marginTop: space.sm, fontStyle: 'italic' },

  kv: {
    flexDirection: 'row', justifyContent: 'space-between', gap: space.md,
    paddingVertical: space.xs,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    marginTop: space.xs,
  },
  k: { ...type.caption, color: colors.textMuted, flexShrink: 0, maxWidth: '42%' },
  v: { ...type.caption, color: colors.text, fontWeight: weight.semibold, flex: 1, textAlign: 'right' },
})
