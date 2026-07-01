"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscoverScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_native_1 = require("lucide-react-native");
var api_1 = require("../../src/lib/api");
var quickLinks = [
    { icon: lucide_react_native_1.Scissors, label: 'Υπηρεσίες', route: '/services', color: '#F97316', bg: '#FFF7ED' },
    { icon: lucide_react_native_1.ShoppingBag, label: 'Κατάστημα', route: '/marketplace', color: '#3B82F6', bg: '#EFF6FF' },
    { icon: lucide_react_native_1.Stethoscope, label: 'Τηλεϊατρική', route: '/telehealth', color: '#10B981', bg: '#ECFDF5' },
    { icon: lucide_react_native_1.Shield, label: 'Ασφάλιση', route: '/insurance', color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: lucide_react_native_1.MapPin, label: 'Tracker', route: '/tracker', color: '#EF4444', bg: '#FEF2F2' },
    { icon: lucide_react_native_1.Brain, label: 'AI Υγεία', route: '/ai-health', color: '#EC4899', bg: '#FDF2F8' },
    { icon: lucide_react_native_1.Heart, label: 'AI Emotion', route: '/ai-emotion', color: '#F59E0B', bg: '#FFFBEB' },
    { icon: lucide_react_native_1.BookOpen, label: 'Passport', route: '/passport', color: '#6366F1', bg: '#EEF2FF' },
];
function DiscoverScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var services = (0, react_query_1.useQuery)({
        queryKey: ['discover-services', search],
        queryFn: function () { return api_1.api.get('/services', { params: { q: search || undefined, limit: 6 } }).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data;
    var products = (0, react_query_1.useQuery)({
        queryKey: ['discover-products', search],
        queryFn: function () { return api_1.api.get('/products', { params: { q: search || undefined, limit: 4 } }).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data;
    return (<react_native_1.ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Discover</react_native_1.Text>
        <react_native_1.Text style={s.subtitle}>Υπηρεσίες, κατάστημα και AI εργαλεία</react_native_1.Text>
      </react_native_1.View>

      {/* Search */}
      <react_native_1.View style={s.searchRow}>
        <lucide_react_native_1.Search size={16} color="#9CA3AF" style={s.searchIcon}/>
        <react_native_1.TextInput style={s.searchInput} placeholder="Αναζήτηση..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF"/>
      </react_native_1.View>

      {/* Quick links */}
      <react_native_1.View style={s.section}>
        <react_native_1.Text style={s.sectionTitle}>Γρήγορη Πρόσβαση</react_native_1.Text>
        <react_native_1.View style={s.grid}>
          {quickLinks.map(function (item) { return (<react_native_1.TouchableOpacity key={item.route} style={[s.quickCard, { backgroundColor: item.bg }]} onPress={function () { return router.push(item.route); }}>
              <item.icon size={22} color={item.color}/>
              <react_native_1.Text style={[s.quickLabel, { color: item.color }]}>{item.label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      {/* Services */}
      <react_native_1.View style={s.section}>
        <react_native_1.View style={s.sectionRow}>
          <react_native_1.Text style={s.sectionTitle}>Υπηρεσίες</react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/services'); }}>
            <react_native_1.Text style={s.seeAll}>Όλες →</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
          {services === null || services === void 0 ? void 0 : services.map(function (sv) {
            var _a;
            return (<react_native_1.TouchableOpacity key={sv.id} style={s.serviceCard} onPress={function () { return router.push("/services/".concat(sv.id)); }}>
              <react_native_1.View style={s.serviceAvatar}>
                {sv.cover_image
                    ? <react_native_1.Image source={{ uri: sv.cover_image }} style={{ width: '100%', height: '100%', borderRadius: 12 }}/>
                    : <react_native_1.Text style={{ fontSize: 28 }}>✂️</react_native_1.Text>}
              </react_native_1.View>
              <react_native_1.Text style={s.serviceName} numberOfLines={1}>{sv.title || sv.name}</react_native_1.Text>
              <react_native_1.Text style={s.serviceCity}>{sv.city}</react_native_1.Text>
              <react_native_1.View style={s.serviceFooter}>
                <react_native_1.Text style={s.serviceRating}>⭐ {((_a = sv.rating) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || '5.0'}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>);
        })}
        </react_native_1.ScrollView>
      </react_native_1.View>

      {/* Products */}
      <react_native_1.View style={s.section}>
        <react_native_1.View style={s.sectionRow}>
          <react_native_1.Text style={s.sectionTitle}>Κατάστημα</react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/marketplace'); }}>
            <react_native_1.Text style={s.seeAll}>Όλα →</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        <react_native_1.View style={s.productsGrid}>
          {products === null || products === void 0 ? void 0 : products.map(function (p) { return (<react_native_1.TouchableOpacity key={p.id} style={s.productCard} onPress={function () { return router.push("/marketplace/".concat(p.id)); }}>
              <react_native_1.View style={s.productImg}>
                {p.image_url
                ? <react_native_1.Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }}/>
                : <react_native_1.Text style={{ fontSize: 32 }}>📦</react_native_1.Text>}
              </react_native_1.View>
              <react_native_1.Text style={s.productName} numberOfLines={2}>{p.name}</react_native_1.Text>
              <react_native_1.Text style={s.productPrice}>€{p.price}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={{ height: 40 }}/>
    </react_native_1.ScrollView>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: '800', color: '#111827' },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB' },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#111827' },
    section: { marginBottom: 8 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
    seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    quickCard: { width: '22%', margin: '1.5%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 },
    quickLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    hScroll: { paddingLeft: 16 },
    serviceCard: { width: 152, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    serviceAvatar: { height: 80, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    serviceName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
    serviceCity: { fontSize: 11, color: '#6B7280' },
    serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    serviceRating: { fontSize: 11, color: '#6B7280' },
    productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    productCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, margin: '1.5%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    productImg: { height: 90, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    productName: { fontSize: 12, color: '#111827', fontWeight: '500', marginBottom: 4 },
    productPrice: { fontSize: 14, fontWeight: '700', color: '#E65100' },
});
