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
exports.default = ProfileScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var auth_1 = require("../../src/store/auth");
function ProfileScreen() {
    var _this = this;
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, isAuthenticated = _b.isAuthenticated, logout = _b.logout;
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.guestContainer}>
        <react_native_1.Text style={styles.guestEmoji}>🔒</react_native_1.Text>
        <react_native_1.Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση</react_native_1.Text>
        <react_native_1.TouchableOpacity style={styles.loginBtn} onPress={function () { return router.push('/auth/login'); }}>
          <react_native_1.Text style={styles.loginBtnText}>Σύνδεση</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={styles.registerBtn} onPress={function () { return router.push('/auth/register'); }}>
          <react_native_1.Text style={styles.registerBtnText}>Εγγραφή</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
    var menuItems = [
        { emoji: '🐾', label: 'Τα κατοικίδιά μου', route: '/pets' },
        { emoji: '📅', label: 'Κρατήσεις', route: '/bookings' },
        { emoji: '📦', label: 'Παραγγελίες', route: '/orders' },
        { emoji: '❤️', label: 'Wishlist', route: '/wishlist' },
        { emoji: '🗺️', label: 'GPS Tracker', route: '/tracker' },
        { emoji: '🩺', label: 'Τηλεϊατρική', route: '/telehealth' },
        { emoji: '⚙️', label: 'Ρυθμίσεις', route: '/settings' },
    ];
    return (<react_native_1.ScrollView style={styles.container}>
      {/* Profile header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.avatar}>
          <react_native_1.Text style={styles.avatarText}>{((_a = user === null || user === void 0 ? void 0 : user.full_name) === null || _a === void 0 ? void 0 : _a[0]) || 'U'}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.Text style={styles.name}>{user === null || user === void 0 ? void 0 : user.full_name}</react_native_1.Text>
        <react_native_1.Text style={styles.email}>{user === null || user === void 0 ? void 0 : user.email}</react_native_1.Text>
        <react_native_1.View style={styles.roleBadge}>
          <react_native_1.Text style={styles.roleText}>
            {(user === null || user === void 0 ? void 0 : user.role) === 'service_provider' ? '🩺 Πάροχος' : (user === null || user === void 0 ? void 0 : user.role) === 'admin' ? '⚡ Admin' : '🐾 Ιδιοκτήτης'}
          </react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      {/* Menu */}
      <react_native_1.View style={styles.menu}>
        {menuItems.map(function (item) { return (<react_native_1.TouchableOpacity key={item.route} style={styles.menuItem}>
            <react_native_1.Text style={styles.menuEmoji}>{item.emoji}</react_native_1.Text>
            <react_native_1.Text style={styles.menuLabel}>{item.label}</react_native_1.Text>
            <react_native_1.Text style={styles.menuArrow}>›</react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      {/* Logout */}
      <react_native_1.TouchableOpacity style={styles.logoutBtn} onPress={function () { return react_native_1.Alert.alert('Αποσύνδεση', 'Σίγουρα θέλετε να αποσυνδεθείτε;', [
            { text: 'Ακύρωση', style: 'cancel' },
            { text: 'Αποσύνδεση', style: 'destructive', onPress: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, logout()];
                        case 1:
                            _a.sent();
                            router.replace('/auth/login');
                            return [2 /*return*/];
                    }
                }); }); } }
        ]); }}>
        <react_native_1.Text style={styles.logoutText}>Αποσύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.View style={{ height: 40 }}/>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 120 },
    guestEmoji: { fontSize: 64, marginBottom: 16 },
    guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24 },
    loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
    loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    registerBtn: { borderWidth: 1.5, borderColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
    registerBtnText: { color: '#E65100', fontWeight: '700', fontSize: 16 },
    header: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 70, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarText: { fontSize: 32, fontWeight: '800', color: '#E65100' },
    name: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    email: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    roleBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    roleText: { fontSize: 13, color: '#E65100', fontWeight: '600' },
    menu: { backgroundColor: '#fff', marginTop: 16, borderRadius: 16, marginHorizontal: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    menuEmoji: { fontSize: 22, marginRight: 12 },
    menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
    menuArrow: { fontSize: 20, color: '#D1D5DB' },
    logoutBtn: { margin: 16, marginTop: 12, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16, alignItems: 'center' },
    logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
