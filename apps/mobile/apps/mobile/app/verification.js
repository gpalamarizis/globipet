"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VerificationScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
var STEPS = [
    { key: 'personal', title: 'Προσωπικά Στοιχεία', emoji: '👤' },
    { key: 'business', title: 'Επαγγελματικά Στοιχεία', emoji: '🏢' },
    { key: 'documents', title: 'Έγγραφα', emoji: '📄' },
];
function VerificationScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, auth_1.useAuthStore)(), user = _a.user, isAuthenticated = _a.isAuthenticated;
    var _b = (0, react_1.useState)(0), step = _b[0], setStep = _b[1];
    var _c = (0, react_1.useState)({
        full_name: (user === null || user === void 0 ? void 0 : user.full_name) || '',
        phone: (user === null || user === void 0 ? void 0 : user.phone) || '',
        city: (user === null || user === void 0 ? void 0 : user.city) || '',
        business_name: '',
        tax_number: '',
        years_experience: '',
        specializations: '',
        bio: '',
        website: '',
    }), form = _c[0], setForm = _c[1];
    var submitMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/provider/verification-request', form); },
        onSuccess: function () {
            react_native_1.Alert.alert('Επιτυχία!', 'Η αίτηση επαλήθευσης υποβλήθηκε. Θα επικοινωνήσουμε μαζί σας σύντομα.', [
                { text: 'OK', onPress: function () { return router.back(); } }
            ]);
        },
        onError: function (e) { var _a, _b; return react_native_1.Alert.alert('Σφάλμα', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Κάτι πήγε στραβά'); },
    });
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.centered}>
      <react_native_1.Text style={styles.lockEmoji}>🔒</react_native_1.Text>
      <react_native_1.Text style={styles.guestTitle}>Συνδεθείτε για να συνεχίσετε</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.loginBtn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={styles.loginBtnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    if (user === null || user === void 0 ? void 0 : user.is_verified)
        return (<react_native_1.View style={styles.centered}>
      <react_native_1.Text style={{ fontSize: 64, marginBottom: 16 }}>✅</react_native_1.Text>
      <react_native_1.Text style={styles.verifiedTitle}>Είστε ήδη επαληθευμένος!</react_native_1.Text>
      <react_native_1.Text style={styles.verifiedSubtitle}>Ο λογαριασμός σας έχει επαληθευτεί και είστε ενεργός πάροχος υπηρεσιών.</react_native_1.Text>
    </react_native_1.View>);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }} style={styles.backBtn}>
          <react_native_1.Text style={styles.backText}>← Πίσω</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.Text style={styles.title}>Επαλήθευση Παρόχου</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>Γίνετε επαληθευμένος πάροχος υπηρεσιών</react_native_1.Text>
      </react_native_1.View>

      {/* Steps */}
      <react_native_1.View style={styles.stepsRow}>
        {STEPS.map(function (s, i) { return (<react_native_1.View key={s.key} style={styles.stepItem}>
            <react_native_1.View style={[styles.stepCircle, i <= step && styles.stepCircleActive, i < step && styles.stepCircleDone]}>
              <react_native_1.Text style={styles.stepEmoji}>{i < step ? '✓' : s.emoji}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s.title}</react_native_1.Text>
          </react_native_1.View>); })}
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={styles.form}>
        {step === 0 && (<>
            <react_native_1.Text style={styles.sectionTitle}>Προσωπικά Στοιχεία</react_native_1.Text>
            {[['full_name', 'Ονοματεπώνυμο *', false], ['phone', 'Τηλέφωνο *', false], ['city', 'Πόλη *', false]].map(function (_a) {
                var key = _a[0], label = _a[1], secure = _a[2];
                return (<react_native_1.View key={key}>
                <react_native_1.Text style={styles.fieldLabel}>{label}</react_native_1.Text>
                <react_native_1.TextInput style={styles.input} value={form[key]} onChangeText={function (v) {
                    var _a;
                    return setForm(__assign(__assign({}, form), (_a = {}, _a[key] = v, _a)));
                }} secureTextEntry={secure} placeholder={label}/>
              </react_native_1.View>);
            })}
          </>)}

        {step === 1 && (<>
            <react_native_1.Text style={styles.sectionTitle}>Επαγγελματικά Στοιχεία</react_native_1.Text>
            {[['business_name', 'Επωνυμία Επιχείρησης'], ['tax_number', 'ΑΦΜ'], ['years_experience', 'Χρόνια Εμπειρίας'], ['website', 'Website']].map(function (_a) {
                var key = _a[0], label = _a[1];
                return (<react_native_1.View key={key}>
                <react_native_1.Text style={styles.fieldLabel}>{label}</react_native_1.Text>
                <react_native_1.TextInput style={styles.input} value={form[key]} onChangeText={function (v) {
                    var _a;
                    return setForm(__assign(__assign({}, form), (_a = {}, _a[key] = v, _a)));
                }} placeholder={label} keyboardType={key === 'years_experience' ? 'number-pad' : 'default'}/>
              </react_native_1.View>);
            })}
            <react_native_1.Text style={styles.fieldLabel}>Ειδικότητες</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={form.specializations} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { specializations: v })); }} placeholder="π.χ. grooming, εκπαίδευση, κτηνίατρος"/>
            <react_native_1.Text style={styles.fieldLabel}>Βιογραφικό</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, styles.textarea]} value={form.bio} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { bio: v })); }} placeholder="Περιγράψτε τις υπηρεσίες και την εμπειρία σας..." multiline numberOfLines={4}/>
          </>)}

        {step === 2 && (<>
            <react_native_1.Text style={styles.sectionTitle}>Απαιτούμενα Έγγραφα</react_native_1.Text>
            <react_native_1.View style={styles.infoBox}>
              <react_native_1.Text style={styles.infoText}>📋 Μετά την υποβολή, η ομάδα μας θα επικοινωνήσει μαζί σας για την αποστολή των παρακάτω εγγράφων:</react_native_1.Text>
            </react_native_1.View>
            {['Ταυτότητα ή Διαβατήριο', 'Βεβαίωση επαγγελματικής δραστηριότητας', 'Τυχόν επαγγελματικές άδειες', 'Φωτογραφία προφίλ'].map(function (doc, i) { return (<react_native_1.View key={i} style={styles.docItem}>
                <react_native_1.Text style={styles.docEmoji}>📄</react_native_1.Text>
                <react_native_1.Text style={styles.docLabel}>{doc}</react_native_1.Text>
              </react_native_1.View>); })}
            <react_native_1.View style={styles.agreementBox}>
              <react_native_1.Text style={styles.agreementText}>
                Με την υποβολή αυτής της αίτησης, αποδέχεστε τους Όρους Χρήσης και την Πολιτική Απορρήτου του GlobiPet.
              </react_native_1.Text>
            </react_native_1.View>
          </>)}

        <react_native_1.View style={{ height: 40 }}/>
      </react_native_1.ScrollView>

      <react_native_1.View style={styles.footer}>
        {step > 0 && (<react_native_1.TouchableOpacity style={styles.prevBtn} onPress={function () { return setStep(step - 1); }}>
            <react_native_1.Text style={styles.prevBtnText}>Πίσω</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
        {step < STEPS.length - 1 ? (<react_native_1.TouchableOpacity style={styles.nextBtn} onPress={function () { return setStep(step + 1); }}>
            <react_native_1.Text style={styles.nextBtnText}>Επόμενο →</react_native_1.Text>
          </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={[styles.nextBtn, submitMutation.isPending && styles.btnDisabled]} onPress={function () { return submitMutation.mutate(); }} disabled={submitMutation.isPending}>
            {submitMutation.isPending
                ? <react_native_1.ActivityIndicator color="#fff"/>
                : <react_native_1.Text style={styles.nextBtnText}>Υποβολή Αίτησης ✓</react_native_1.Text>}
          </react_native_1.TouchableOpacity>)}
      </react_native_1.View>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { marginBottom: 8 },
    backText: { fontSize: 14, color: '#E65100', fontWeight: '600' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#6B7280' },
    stepsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stepItem: { flex: 1, alignItems: 'center' },
    stepCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    stepCircleActive: { backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#E65100' },
    stepCircleDone: { backgroundColor: '#E65100' },
    stepEmoji: { fontSize: 18 },
    stepLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
    stepLabelActive: { color: '#E65100', fontWeight: '700' },
    form: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#111827' },
    textarea: { height: 100, textAlignVertical: 'top' },
    infoBox: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 16 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
    docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
    docEmoji: { fontSize: 20 },
    docLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
    agreementBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginTop: 16 },
    agreementText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
    footer: { flexDirection: 'row', gap: 10, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    prevBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    prevBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
    nextBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    lockEmoji: { fontSize: 48, marginBottom: 16 },
    guestTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
    loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
    loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    verifiedTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
    verifiedSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
