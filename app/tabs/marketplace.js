"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MarketplaceScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var width = react_native_1.Dimensions.get('window').width;
function MarketplaceScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), category = _b[0], setCategory = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['products', category, search],
        queryFn: function () { return api_1.api.get("/products?category=".concat(category !== 'all' ? category : '', "&search=").concat(search, "&limit=20")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, products = _c === void 0 ? [] : _c;
    var categories = ['all', 'food', 'toys', 'accessories', 'health', 'grooming'];
    var catLabels = { all: 'Όλα', food: 'Τροφές', toys: 'Παιχνίδια', accessories: 'Αξεσουάρ', health: 'Υγεία', grooming: 'Grooming' };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Κατάστημα</react_native_1.Text>
        <react_native_1.TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF"/>
        <react_native_1.FlatList horizontal data={categories} keyExtractor={function (i) { return i; }} showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={[styles.chip, category === item && styles.chipActive]} onPress={function () { return setCategory(item); }}>
              <react_native_1.Text style={[styles.chipText, category === item && styles.chipTextActive]}>{catLabels[item]}</react_native_1.Text>
            </react_native_1.TouchableOpacity>);
        }}/>
      </react_native_1.View>

      <react_native_1.FlatList data={products} keyExtractor={function (i) { return i.id; }} numColumns={2} contentContainerStyle={{ padding: 8 }} renderItem={function (_a) {
            var _b;
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={styles.card} onPress={function () { return router.push("/marketplace/".concat(item.id)); }}>
            <react_native_1.View style={styles.imgContainer}>
              {((_b = item.images) === null || _b === void 0 ? void 0 : _b[0]) ? <react_native_1.Image source={{ uri: item.images[0] }} style={styles.img}/>
                    : <react_native_1.Text style={{ fontSize: 36 }}>📦</react_native_1.Text>}
            </react_native_1.View>
            <react_native_1.Text style={styles.name} numberOfLines={2}>{item.name}</react_native_1.Text>
            <react_native_1.View style={styles.cardFooter}>
              <react_native_1.Text style={styles.price}>€{item.price}</react_native_1.Text>
              <react_native_1.TouchableOpacity style={styles.addBtn}>
                <react_native_1.Text style={styles.addBtnText}>+</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        }} ListEmptyComponent={<react_native_1.Text style={styles.empty}>Δεν βρέθηκαν προϊόντα</react_native_1.Text>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
    search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    chipActive: { backgroundColor: '#E65100' },
    chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    card: { width: (width - 24) / 2, backgroundColor: '#fff', borderRadius: 16, margin: 4, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    imgContainer: { height: 120, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
    img: { width: '100%', height: '100%' },
    name: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 15, fontWeight: '800', color: '#E65100' },
    addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E65100', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
