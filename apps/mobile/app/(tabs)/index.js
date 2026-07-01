"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var auth_1 = require("../../src/store/auth");
var api_1 = require("../../src/lib/api");
var O = '#E65100';
var QUICK_ACTIONS = [
    { emoji: '✂️', label: 'Περιποίηση', route: '/(tabs)/services', type: 'grooming' },
    { emoji: '🩺', label: 'Κτηνίατρος', route: '/(tabs)/services', type: 'veterinary' },
    { emoji: '🚶', label: 'Βόλτες', route: '/(tabs)/services', type: 'walking' },
    { emoji: '🏠', label: 'Φιλοξενία', route: '/(tabs)/services', type: 'pet_sitting' },
    { emoji: '💊', label: 'Φαρμακείο', route: '/(tabs)/services', type: 'pharmacy' },
    { emoji: '🎓', label: 'Εκπαίδευση', route: '/(tabs)/services', type: 'training' },
    { emoji: '🚗', label: 'Pet Taxi', route: '/(tabs)/services', type: 'pet_taxi' },
    { emoji: '⚖️', label: 'Νομικά', route: '/legal', type: 'legal' },
    { emoji: '💻', label: 'Τηλεϊατρική', route: '/telehealth', type: 'telehealth' },
    { emoji: '🛡️', label: 'Ασφάλιση', route: '/insurance', type: 'insurance' },
    { emoji: '🧠', label: 'AI Υγεία', route: '/ai-health', type: 'ai' },
    { emoji: '📋', label: 'Φάκελος', route: '/passport', type: 'passport' },
];
function HomeScreen() {
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, isAuthenticated = _b.isAuthenticated, loadToken = _b.loadToken;
    (0, react_1.useEffect)(function () { loadToken(); }, []);
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['featured-services'],
        queryFn: function () { return api_1.api.get('/services?limit=6').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, services = _c === void 0 ? [] : _c;
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['featured-products'],
        queryFn: function () { return api_1.api.get('/products?featured=true&limit=4').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, products = _d === void 0 ? [] : _d;
    return (<react_native_1.ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <react_native_1.View style={s.header}>
        <react_native_1.View style={s.headerTop}>
          <react_native_1.View style={s.logoBox}>
            <react_native_1.Image source={require('../../assets/icon.png')} style={s.logo}/>
          </react_native_1.View>
          <react_native_1.View style={{ flex: 1 }}>
            <react_native_1.Text style={s.greeting} numberOfLines={1}>
              {isAuthenticated ? "\u0393\u03B5\u03B9\u03B1, ".concat((_a = user === null || user === void 0 ? void 0 : user.full_name) === null || _a === void 0 ? void 0 : _a.split(' ')[0], "! \uD83D\uDC4B") : 'Καλώς ήρθατε! 🐾'}
            </react_native_1.Text>
            <react_native_1.Text style={s.tagline}>Best care for the best friends</react_native_1.Text>
          </react_native_1.View>
          {isAuthenticated && (user === null || user === void 0 ? void 0 : user.profile_photo) && (<react_native_1.Image source={{ uri: user.profile_photo }} style={s.avatar}/>)}
        </react_native_1.View>

        {/* Search */}
        <react_native_1.TouchableOpacity style={s.searchBar} onPress={function () { return router.push('/(tabs)/services'); }}>
          <react_native_1.Text style={s.searchIcon}>🔍</react_native_1.Text>
          <react_native_1.Text style={s.searchPlaceholder}>Αναζήτηση υπηρεσίας ή παρόχου...</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Quick actions grid — 4 per row, wrap */}
      <react_native_1.View style={s.section}>
        <react_native_1.Text style={s.sectionTitle}>Υπηρεσίες</react_native_1.Text>
        <react_native_1.View style={s.actionGrid}>
          {QUICK_ACTIONS.map(function (a) { return (<react_native_1.TouchableOpacity key={a.type} style={s.actionItem} onPress={function () { return router.push(a.route); }} activeOpacity={0.7}>
              <react_native_1.View style={s.actionIcon}>
                <react_native_1.Text style={s.actionEmoji}>{a.emoji}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={s.actionLabel} numberOfLines={1}>{a.label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      {/* Featured services */}
      {services.length > 0 && (<react_native_1.View style={s.section}>
          <react_native_1.View style={s.sectionHeader}>
            <react_native_1.Text style={s.sectionTitle}>Κορυφαίοι Πάροχοι</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push('/(tabs)/services'); }}>
              <react_native_1.Text style={s.seeAll}>Όλοι →</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          {services.slice(0, 4).map(function (sv) {
                var _a;
                return (<react_native_1.TouchableOpacity key={sv.id} style={s.serviceCard} onPress={function () { return router.push("/services/".concat(sv.id)); }} activeOpacity={0.7}>
              <react_native_1.View style={s.serviceAvatar}>
                {sv.image_url
                        ? <react_native_1.Image source={{ uri: sv.image_url }} style={s.serviceAvatarImg}/>
                        : <react_native_1.Text style={s.serviceAvatarEmoji}>🐾</react_native_1.Text>}
              </react_native_1.View>
              <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                <react_native_1.Text style={s.serviceName} numberOfLines={1}>{sv.provider_name}</react_native_1.Text>
                <react_native_1.Text style={s.serviceSub} numberOfLines={1}>{sv.service_type} · {sv.city}</react_native_1.Text>
                <react_native_1.Text style={s.serviceRating}>⭐ {((_a = sv.rating) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || '5.0'} · {sv.reviews_count || 0} κριτικές</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={s.servicePrice}>€{sv.price}</react_native_1.Text>
            </react_native_1.TouchableOpacity>);
            })}
        </react_native_1.View>)}

      {/* Featured products */}
      {products.length > 0 && (<react_native_1.View style={s.section}>
          <react_native_1.View style={s.sectionHeader}>
            <react_native_1.Text style={s.sectionTitle}>Προτεινόμενα Προϊόντα</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push('/(tabs)/marketplace'); }}>
              <react_native_1.Text style={s.seeAll}>Όλα →</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          <react_native_1.View style={s.productGrid}>
            {products.slice(0, 4).map(function (p) { return (<react_native_1.TouchableOpacity key={p.id} style={s.productCard} onPress={function () { return router.push("/products/".concat(p.id)); }} activeOpacity={0.7}>
                <react_native_1.View style={s.productImg}>
                  {p.image_url
                    ? <react_native_1.Image source={{ uri: p.image_url }} style={s.productImgSrc}/>
                    : <react_native_1.Text style={{ fontSize: 28 }}>🛍️</react_native_1.Text>}
                </react_native_1.View>
                <react_native_1.Text style={s.productName} numberOfLines={2}>{p.name}</react_native_1.Text>
                <react_native_1.Text style={s.productPrice}>€{p.price}</react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Not logged in banner */}
      {!isAuthenticated && (<react_native_1.View style={s.authBanner}>
          <react_native_1.Text style={s.authTitle}>Ξεκινήστε Σήμερα 🐾</react_native_1.Text>
          <react_native_1.Text style={s.authSub}>Εγγραφείτε δωρεάν και διαχειριστείτε όλα όσα χρειάζεται το κατοικίδιό σας</react_native_1.Text>
          <react_native_1.View style={s.authBtns}>
            <react_native_1.TouchableOpacity style={s.authLoginBtn} onPress={function () { return router.push('/auth/login'); }}>
              <react_native_1.Text style={s.authLoginText}>Σύνδεση</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={s.authRegisterBtn} onPress={function () { return router.push('/auth/register'); }}>
              <react_native_1.Text style={s.authRegisterText}>Εγγραφή</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    logoBox: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
    logo: { width: 40, height: 40 },
    greeting: { fontSize: 15, fontWeight: '700', color: '#111827' },
    tagline: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
    avatar: { width: 36, height: 36, borderRadius: 18, flexShrink: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
    searchIcon: { fontSize: 15 },
    searchPlaceholder: { fontSize: 14, color: '#9CA3AF' },
    section: { marginTop: 16, paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
    seeAll: { fontSize: 13, color: O, fontWeight: '600' },
    // Quick actions - 4 per row
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actionItem: { width: '22%', alignItems: 'center' },
    actionIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
    actionEmoji: { fontSize: 22 },
    actionLabel: { fontSize: 10, color: '#374151', fontWeight: '600', textAlign: 'center' },
    // Service cards
    serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, gap: 10 },
    serviceAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    serviceAvatarImg: { width: 44, height: 44 },
    serviceAvatarEmoji: { fontSize: 20 },
    serviceName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    serviceSub: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    serviceRating: { fontSize: 11, color: '#6B7280' },
    servicePrice: { fontSize: 15, fontWeight: '800', color: O, flexShrink: 0 },
    // Product grid - 2 per row
    productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    productCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
    productImg: { width: '100%', height: 100, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    productImgSrc: { width: '100%', height: 100 },
    productName: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 4 },
    productPrice: { fontSize: 14, fontWeight: '800', color: O },
    // Auth banner
    authBanner: { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
    authTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
    authSub: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
    authBtns: { flexDirection: 'row', gap: 10 },
    authLoginBtn: { flex: 1, borderWidth: 1.5, borderColor: O, borderRadius: 12, padding: 12, alignItems: 'center' },
    authLoginText: { color: O, fontWeight: '700' },
    authRegisterBtn: { flex: 1, backgroundColor: O, borderRadius: 12, padding: 12, alignItems: 'center' },
    authRegisterText: { color: '#fff', fontWeight: '700' },
});
