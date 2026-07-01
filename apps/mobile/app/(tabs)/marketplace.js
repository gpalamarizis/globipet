"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MarketplaceScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
var O = '#E65100';
var CATEGORIES = [
    { id: 'all', label: 'Όλα', emoji: '🛍️' },
    { id: 'food', label: 'Τροφές', emoji: '🦴' },
    { id: 'toys', label: 'Παιχνίδια', emoji: '🎾' },
    { id: 'accessories', label: 'Αξεσουάρ', emoji: '🎀' },
    { id: 'health', label: 'Υγεία', emoji: '💊' },
    { id: 'hygiene', label: 'Υγιεινή', emoji: '🛁' },
];
function MarketplaceScreen() {
    var router = (0, expo_router_1.useRouter)();
    var qc = (0, react_query_1.useQueryClient)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), category = _b[0], setCategory = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['products', category, search],
        queryFn: function () { return api_1.api.get("/products?".concat(category !== 'all' ? "category=".concat(category, "&") : '', "search=").concat(search, "&limit=30")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _d = _c.data, products = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    var addToCart = (0, react_query_1.useMutation)({
        mutationFn: function (productId) { return api_1.api.post('/cart', { product_id: productId, quantity: 1 }); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['cart'] }); },
    });
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Κατάστημα</react_native_1.Text>
        <react_native_1.View style={s.searchRow}>
          <react_native_1.Text>🔍</react_native_1.Text>
          <react_native_1.TextInput style={s.search} placeholder="Αναζήτηση..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF"/>
        </react_native_1.View>
      </react_native_1.View>

      {/* Category filter — wrap */}
      <react_native_1.View style={s.filterWrap}>
        {CATEGORIES.map(function (c) { return (<react_native_1.TouchableOpacity key={c.id} style={[s.chip, category === c.id && s.chipActive]} onPress={function () { return setCategory(c.id); }}>
            <react_native_1.Text style={s.chipEmoji}>{c.emoji}</react_native_1.Text>
            <react_native_1.Text style={[s.chipText, category === c.id && s.chipTextActive]}>{c.label}</react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      <react_native_1.FlatList data={products} keyExtractor={function (i) { return i.id; }} numColumns={2} columnWrapperStyle={{ gap: 10 }} contentContainerStyle={{ padding: 12, paddingBottom: 100, gap: 10 }} showsVerticalScrollIndicator={false} ListEmptyComponent={<react_native_1.View style={s.empty}>
            <react_native_1.Text style={s.emptyEmoji}>{isLoading ? '⏳' : '🔍'}</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>{isLoading ? 'Φόρτωση...' : 'Δεν βρέθηκαν προϊόντα'}</react_native_1.Text>
          </react_native_1.View>} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={s.card} activeOpacity={0.8} onPress={function () { return router.push("/products/".concat(item.id)); }}>
            <react_native_1.View style={s.imgBox}>
              {item.image_url
                    ? <react_native_1.Image source={{ uri: item.image_url }} style={s.img}/>
                    : <react_native_1.Text style={{ fontSize: 36 }}>🛍️</react_native_1.Text>}
            </react_native_1.View>
            <react_native_1.Text style={s.name} numberOfLines={2}>{item.name}</react_native_1.Text>
            {item.brand && <react_native_1.Text style={s.brand}>{item.brand}</react_native_1.Text>}
            <react_native_1.View style={s.priceRow}>
              <react_native_1.Text style={s.price}>€{item.price}</react_native_1.Text>
              <react_native_1.TouchableOpacity style={s.cartBtn} onPress={function (e) { e.stopPropagation(); if (isAuthenticated)
                addToCart.mutate(item.id); }}>
                <react_native_1.Text style={s.cartBtnText}>+ Καλάθι</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        }}/>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
    search: { flex: 1, fontSize: 14, color: '#111827' },
    filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
    chipActive: { backgroundColor: O },
    chipEmoji: { fontSize: 13 },
    chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
    imgBox: { width: '100%', height: 110, borderRadius: 10, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    img: { width: '100%', height: 110 },
    name: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
    brand: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 15, fontWeight: '800', color: O },
    cartBtn: { backgroundColor: O, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    cartBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 16 },
    emptyEmoji: { fontSize: 40, marginBottom: 10 },
    emptyText: { color: '#9CA3AF', fontSize: 15 },
});
