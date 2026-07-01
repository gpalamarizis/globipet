"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ForgotPasswordScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
function ForgotPasswordScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(''), email = _a[0], setEmail = _a[1];
    var _b = (0, react_1.useState)(false), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), sent = _c[0], setSent = _c[1];
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!email) {
                        react_native_1.Alert.alert('Σφάλμα', 'Εισάγετε το email σας');
                        return [2 /*return*/];
                    }
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, api_1.api.post('/auth/forgot-password', { email: email })];
                case 2:
                    _b.sent();
                    setSent(true);
                    return [3 /*break*/, 5];
                case 3:
                    _a = _b.sent();
                    react_native_1.Alert.alert('Σφάλμα', 'Παρουσιάστηκε πρόβλημα. Δοκιμάστε ξανά.');
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
      <react_native_1.View style={styles.inner}>
        <react_native_1.Text style={styles.logo}>🔐</react_native_1.Text>
        <react_native_1.Text style={styles.title}>Επαναφορά κωδικού</react_native_1.Text>
        {sent ? (<react_native_1.View style={styles.successBox}>
            <react_native_1.Text style={styles.successText}>✅ Το email εστάλη! Ελέγξτε το inbox σας.</react_native_1.Text>
            <react_native_1.TouchableOpacity style={styles.btn} onPress={function () { return router.push('/auth/login'); }}>
              <react_native_1.Text style={styles.btnText}>Πίσω στη σύνδεση</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>) : (<react_native_1.View style={styles.form}>
            <react_native_1.Text style={styles.desc}>Εισάγετε το email σας και θα σας στείλουμε οδηγίες επαναφοράς.</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF"/>
            <react_native_1.TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
              <react_native_1.Text style={styles.btnText}>{loading ? 'Αποστολή...' : 'Αποστολή'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={function () { return router.back(); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <react_native_1.Text style={{ color: '#E65100' }}>← Πίσω</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>)}
      </react_native_1.View>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    logo: { fontSize: 56, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20 },
    form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24 },
    desc: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 22 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, color: '#111827' },
    btn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successBox: { width: '100%', alignItems: 'center', gap: 20 },
    successText: { fontSize: 16, color: '#111827', textAlign: 'center', lineHeight: 24 },
});
