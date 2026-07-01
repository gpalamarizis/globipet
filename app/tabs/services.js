"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServicesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var types = ['all', 'grooming', 'veterinary', 'walking', 'pet_sitting', 'training', 'boarding', 'pet_taxi'];
var typeLabels = { all: 'Όλες', grooming: 'Grooming', veterinary: 'Κτηνίατρος', walking: 'Βόλτες', pet_sitting: 'Sitting', training: 'Εκπαίδευση', boarding: 'Boarding', pet_taxi: 'Taxi' };
function ServicesScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), type = _b[0], setType = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['services', type, search],
        queryFn: function () { return api_1.api.get("/services?type=".concat(type !== 'all' ? type : '', "&search=").concat(search, "&limit=20")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _d = _c.data, services = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Υπηρεσίες</react_native_1.Text>
        <react_native_1.TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF"/>
      </react_native_1.View>

      <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {types.map(function (t) { return (<react_native_1.TouchableOpacity key={t} style={[styles.filterChip, type === t && styles.filterChipActive]} onPress={function () { return setType(t); }}>
            <react_native_1.Text style={[styles.filterText, type === t && styles.filterTextActive]}>{typeLabels[t]}</react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.ScrollView>

      <react_native_1.FlatList data={services} keyExtractor={function (i) { return i.id; }} contentContainerStyle={{ padding: 16 }} renderItem={function (_a) {
            var _b;
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={styles.card} onPress={function () { return router.push("/services/".concat(item.id)); }}>
            <react_native_1.View style={styles.cardAvatar}>
              <react_native_1.Text style={styles.cardAvatarText}>{((_b = item.name) === null || _b === void 0 ? void 0 : _b[0]) || '🐾'}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.cardContent}>
              <react_native_1.Text style={styles.cardName}>{item.name}</react_native_1.Text>
              <react_native_1.Text style={styles.cardType}>{item.type} · {item.duration_minutes} λεπτά</react_native_1.Text>
              <react_native_1.Text style={styles.cardRating}>⭐ {item.rating || '5.0'} · {item.reviews_count || 0} κριτικές</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.cardRight}>
              <react_native_1.Text style={styles.cardPrice}>€{item.price}</react_native_1.Text>
              <react_native_1.TouchableOpacity style={styles.bookBtn}>
                <react_native_1.Text style={styles.bookBtnText}>Κράτηση</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        }} ListEmptyComponent={<react_native_1.Text style={styles.empty}>Δεν βρέθηκαν υπηρεσίες</react_native_1.Text>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
    search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
    filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    filterChipActive: { backgroundColor: '#E65100' },
    filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    filterTextActive: { color: '#fff', fontWeight: '700' },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
    cardContent: { flex: 1 },
    cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    cardType: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    cardRating: { fontSize: 12, color: '#6B7280' },
    cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
    cardPrice: { fontSize: 15, fontWeight: '700', color: '#E65100' },
    bookBtn: { backgroundColor: '#E65100', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
    bookBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
