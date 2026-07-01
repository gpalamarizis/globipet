"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var auth_1 = require("../../src/store/auth");
var api_1 = require("../../src/lib/api");
var width = react_native_1.Dimensions.get('window').width;
var categories = [
    { emoji: '✂️', label: 'Grooming', type: 'grooming' },
    { emoji: '🩺', label: 'Κτηνίατρος', type: 'veterinary' },
    { emoji: '🚶', label: 'Βόλτα', type: 'walking' },
    { emoji: '🏠', label: 'Φιλοξενία', type: 'pet_sitting' },
    { emoji: '🎓', label: 'Εκπαίδευση', type: 'training' },
    { emoji: '🚗', label: 'Μεταφορά', type: 'pet_taxi' },
    { emoji: '💻', label: 'Τηλειατρική', type: 'telehealth' },
    { emoji: '💊', label: 'Φαρμακείο', type: 'pharmacy' },
    { emoji: '🛡️', label: 'Ασφάλεια', type: 'insurance' },
];
function HomeScreen() {
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, isAuthenticated = _b.isAuthenticated, loadToken = _b.loadToken;
    (0, react_1.useEffect)(function () { loadToken(); }, []);
    var services = (0, react_query_1.useQuery)({
        queryKey: ['featured-services'],
        queryFn: function () { return api_1.api.get('/services?limit=4').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data;
    var products = (0, react_query_1.useQuery)({
        queryKey: ['featured-products'],
        queryFn: function () { return api_1.api.get('/products?limit=4').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data;
    return (<react_native_1.ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.View>
          <react_native_1.Text style={styles.greeting}>
            {isAuthenticated ? "\u0393\u03B5\u03B9\u03B1, ".concat((_a = user === null || user === void 0 ? void 0 : user.full_name) === null || _a === void 0 ? void 0 : _a.split(' ')[0], "! \uD83D\uDC4B") : 'Καλώς ήρθατε! 🐾'}
          </react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>Best care for the best human's friends</react_native_1.Text>
        </react_native_1.View>
        {isAuthenticated && (user === null || user === void 0 ? void 0 : user.profile_photo) && (<react_native_1.Image source={{ uri: user.profile_photo }} style={styles.avatar}/>)}
      </react_native_1.View>

      {/* Search bar */}
      <react_native_1.TouchableOpacity style={styles.searchBar} onPress={function () { return router.push('/services'); }}>
        <react_native_1.Text style={styles.searchText}>🔍  Αναζήτηση υπηρεσίας...</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      {/* Categories */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionTitle}>Υπηρεσίες</react_native_1.Text>
        <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(function (cat) { return (<react_native_1.TouchableOpacity key={cat.type} style={styles.categoryItem} onPress={function () { return router.push("/services?type=".concat(cat.type)); }}>
              <react_native_1.View style={styles.categoryIcon}>
                <react_native_1.Text style={styles.categoryEmoji}>{cat.emoji}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.categoryLabel}>{cat.label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.ScrollView>
      </react_native_1.View>

      {/* Featured Services */}
      {(services === null || services === void 0 ? void 0 : services.length) > 0 && (<react_native_1.View style={styles.section}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.Text style={styles.sectionTitle}>Κορυφαίοι Πάροχοι</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push('/services'); }}>
              <react_native_1.Text style={styles.seeAll}>Όλοι →</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {services.map(function (service) {
                var _a;
                return (<react_native_1.TouchableOpacity key={service.id} style={styles.serviceCard} onPress={function () { return router.push("/services/".concat(service.id)); }}>
                <react_native_1.View style={styles.serviceAvatar}>
                  <react_native_1.Text style={styles.serviceAvatarText}>{((_a = service.name) === null || _a === void 0 ? void 0 : _a[0]) || '🐾'}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.serviceName} numberOfLines={1}>{service.name}</react_native_1.Text>
                <react_native_1.Text style={styles.serviceType}>{service.type}</react_native_1.Text>
                <react_native_1.Text style={styles.servicePrice}>€{service.price}/ώρα</react_native_1.Text>
                <react_native_1.Text style={styles.serviceRating}>⭐ {service.rating || '5.0'}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.ScrollView>
        </react_native_1.View>)}

      {/* Featured Products */}
      {(products === null || products === void 0 ? void 0 : products.length) > 0 && (<react_native_1.View style={styles.section}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.Text style={styles.sectionTitle}>Κατάστημα</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push('/marketplace'); }}>
              <react_native_1.Text style={styles.seeAll}>Όλα →</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          <react_native_1.View style={styles.productsGrid}>
            {products.map(function (product) {
                var _a;
                return (<react_native_1.TouchableOpacity key={product.id} style={styles.productCard} onPress={function () { return router.push("/marketplace/".concat(product.id)); }}>
                <react_native_1.View style={styles.productImage}>
                  {((_a = product.images) === null || _a === void 0 ? void 0 : _a[0])
                        ? <react_native_1.Image source={{ uri: product.images[0] }} style={styles.productImg}/>
                        : <react_native_1.Text style={{ fontSize: 32 }}>📦</react_native_1.Text>}
                </react_native_1.View>
                <react_native_1.Text style={styles.productName} numberOfLines={2}>{product.name}</react_native_1.Text>
                <react_native_1.Text style={styles.productPrice}>€{product.price}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>
        </react_native_1.View>)}

      {/* CTA for non-auth */}
      {!isAuthenticated && (<react_native_1.View style={styles.ctaSection}>
          <react_native_1.Text style={styles.ctaTitle}>Εγγραφείτε δωρεάν</react_native_1.Text>
          <react_native_1.Text style={styles.ctaSubtitle}>Διαχειριστείτε τα κατοικίδιά σας, κάντε κρατήσεις και πολλά άλλα</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.ctaButton} onPress={function () { return router.push('/auth/register'); }}>
            <react_native_1.Text style={styles.ctaButtonText}>Δημιουργία λογαριασμού</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={styles.ctaSecondary} onPress={function () { return router.push('/auth/login'); }}>
            <react_native_1.Text style={styles.ctaSecondaryText}>Έχω ήδη λογαριασμό</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>)}

      <react_native_1.View style={{ height: 40 }}/>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
    greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    searchBar: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    searchText: { color: '#9CA3AF', fontSize: 14 },
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
    seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
    categoriesScroll: { paddingLeft: 16 },
    categoryItem: { alignItems: 'center', marginRight: 16, width: 72 },
    categoryIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    categoryEmoji: { fontSize: 24 },
    categoryLabel: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500' },
    serviceCard: { width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginLeft: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    serviceAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    serviceAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
    serviceName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
    serviceType: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
    servicePrice: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 2 },
    serviceRating: { fontSize: 11, color: '#6B7280' },
    productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    productCard: { width: (width - 48) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 12, margin: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    productImage: { height: 100, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    productImg: { width: '100%', height: '100%' },
    productName: { fontSize: 12, color: '#111827', fontWeight: '500', marginBottom: 4 },
    productPrice: { fontSize: 14, fontWeight: '700', color: '#E65100' },
    ctaSection: { margin: 16, backgroundColor: '#E65100', borderRadius: 20, padding: 24 },
    ctaTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
    ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 20 },
    ctaButton: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
    ctaButtonText: { color: '#E65100', fontWeight: '700', fontSize: 15 },
    ctaSecondary: { alignItems: 'center', padding: 8 },
    ctaSecondaryText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
});
