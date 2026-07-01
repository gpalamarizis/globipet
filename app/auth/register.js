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
exports.default = RegisterScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var auth_1 = require("../../src/store/auth");
function RegisterScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, auth_1.useAuthStore)(), register = _a.register, isLoading = _a.isLoading;
    var _b = (0, react_1.useState)({ full_name: '', email: '', password: '', role: 'user' }), form = _b[0], setForm = _b[1];
    var handleRegister = function () { return __awaiter(_this, void 0, void 0, function () {
        var err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!form.full_name || !form.email || !form.password) {
                        react_native_1.Alert.alert('Σφάλμα', 'Συμπληρώστε όλα τα πεδία');
                        return [2 /*return*/];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, register(form)];
                case 2:
                    _c.sent();
                    router.replace('/(tabs)');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _c.sent();
                    react_native_1.Alert.alert('Σφάλμα', ((_b = (_a = err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα εγγραφής');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.KeyboardAvoidingView style={{ flex: 1 }} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
      <react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <react_native_1.Text style={styles.logo}>🐾</react_native_1.Text>
        <react_native_1.Text style={styles.title}>Εγγραφή</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>Γίνετε μέλος της κοινότητάς μας</react_native_1.Text>

        <react_native_1.View style={styles.form}>
          <react_native_1.TextInput style={styles.input} placeholder="Ονοματεπώνυμο" value={form.full_name} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { full_name: v })); }); }} placeholderTextColor="#9CA3AF"/>
          <react_native_1.TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { email: v })); }); }} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF"/>
          <react_native_1.TextInput style={styles.input} placeholder="Κωδικός (τουλάχιστον 8 χαρακτήρες)" value={form.password} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { password: v })); }); }} secureTextEntry placeholderTextColor="#9CA3AF"/>

          <react_native_1.Text style={styles.roleLabel}>Τύπος λογαριασμού</react_native_1.Text>
          <react_native_1.View style={styles.roleRow}>
            {[{ value: 'user', label: '🐾 Ιδιοκτήτης' }, { value: 'service_provider', label: '🩺 Πάροχος' }].map(function (r) { return (<react_native_1.TouchableOpacity key={r.value} style={[styles.roleBtn, form.role === r.value && styles.roleBtnActive]} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { role: r.value })); }); }}>
                <react_native_1.Text style={[styles.roleBtnText, form.role === r.value && styles.roleBtnTextActive]}>{r.label}</react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
            <react_native_1.Text style={styles.buttonText}>{isLoading ? 'Εγγραφή...' : 'Δημιουργία λογαριασμού'}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={styles.footer}>
          <react_native_1.Text style={styles.footerText}>Έχετε ήδη λογαριασμό; </react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/auth/login'); }}>
            <react_native_1.Text style={styles.footerLink}>Σύνδεση</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    inner: { alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
    logo: { fontSize: 48, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: '800', color: '#E65100', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
    form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#111827' },
    roleLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
    roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    roleBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    roleBtnActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
    roleBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    roleBtnTextActive: { color: '#E65100', fontWeight: '700' },
    button: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    footer: { flexDirection: 'row', marginTop: 24 },
    footerText: { color: '#6B7280', fontSize: 14 },
    footerLink: { color: '#E65100', fontWeight: '700', fontSize: 14 },
});
