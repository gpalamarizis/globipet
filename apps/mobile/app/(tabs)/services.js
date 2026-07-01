"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServicesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var O = '#E65100';
var SERVICE_TYPES = [
    { id: 'all', label: 'Όλες', emoji: '🐾' },
    { id: 'grooming', label: 'Περιποίηση', emoji: '✂️' },
    { id: 'veterinary', label: 'Κτηνίατρος', emoji: '🩺' },
    { id: 'walking', label: 'Βόλτες', emoji: '🚶' },
    { id: 'pet_sitting', label: 'Φιλοξενία', emoji: '🏠' },
    { id: 'training', label: 'Εκπαίδευση', emoji: '🎓' },
    { id: 'pet_taxi', label: 'Taxi', emoji: '🚗' },
    { id: 'photography', label: 'Φωτογράφηση', emoji: '📸' },
    { id: 'pharmacy', label: 'Φαρμακείο', emoji: '💊' },
    { id: 'legal', label: 'Νομικά', emoji: '⚖️' },
];
function ServicesScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), type = _b[0], setType = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['services', type, search],
        queryFn: function () { return api_1.api.get("/services?".concat(type !== 'all' ? "service_type=".concat(type, "&") : '', "search=").concat(search, "&limit=30")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _d = _c.data, services = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    return (<react_native_1.View style={s.container}>
      {/* Header */}
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Υπηρεσίες</react_native_1.Text>
        <react_native_1.View style={s.searchRow}>
          <react_native_1.Text style={s.searchIcon}>🔍</react_native_1.Text>
          <react_native_1.TextInput style={s.search} placeholder="Αναζήτηση..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF"/>
          {search.length > 0 && (<react_native_1.TouchableOpacity onPress={function () { return setSearch(''); }}><react_native_1.Text style={s.clearBtn}>✕</react_native_1.Text></react_native_1.TouchableOpacity>)}
        </react_native_1.View>
      </react_native_1.View>

      {/* Category filter — wrap, no scroll */}
      <react_native_1.View style={s.filterContainer}>
        <react_native_1.View style={s.filterWrap}>
          {SERVICE_TYPES.map(function (t) { return (<react_native_1.TouchableOpacity key={t.id} style={[s.chip, type === t.id && s.chipActive]} onPress={function () { return setType(t.id); }}>
              <react_native_1.Text style={s.chipEmoji}>{t.emoji}</react_native_1.Text>
              <react_native_1.Text style={[s.chipText, type === t.id && s.chipTextActive]}>{t.label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      {/* Results */}
      <react_native_1.FlatList data={services} keyExtractor={function (i) { return i.id; }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }} showsVerticalScrollIndicator={false} ListEmptyComponent={<react_native_1.View style={s.empty}>
            <react_native_1.Text style={s.emptyEmoji}>{isLoading ? '⏳' : '🔍'}</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>{isLoading ? 'Φόρτωση...' : 'Δεν βρέθηκαν υπηρεσίες'}</react_native_1.Text>
          </react_native_1.View>} renderItem={function (_a) {
            var _b, _c;
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={s.card} onPress={function () { return router.push("/services/".concat(item.id)); }} activeOpacity={0.7}>
            {/* Avatar / photo */}
            <react_native_1.View style={s.avatar}>
              {item.image_url
                    ? <react_native_1.Image source={{ uri: item.image_url }} style={s.avatarImg}/>
                    : <react_native_1.Text style={s.avatarEmoji}>
                    {item.service_type === 'grooming' ? '✂️' : item.service_type === 'veterinary' ? '🩺' :
                            item.service_type === 'walking' ? '🚶' : item.service_type === 'training' ? '🎓' :
                                item.service_type === 'pet_taxi' ? '🚗' : '🐾'}
                  </react_native_1.Text>}
            </react_native_1.View>
            {/* Info */}
            <react_native_1.View style={s.info}>
              <react_native_1.Text style={s.name} numberOfLines={1}>{item.provider_name}</react_native_1.Text>
              <react_native_1.Text style={s.sub} numberOfLines={1}>
                {((_b = SERVICE_TYPES.find(function (t) { return t.id === item.service_type; })) === null || _b === void 0 ? void 0 : _b.label) || item.service_type}
                {item.city ? " \u00B7 ".concat(item.city) : ''}
              </react_native_1.Text>
              <react_native_1.View style={s.ratingRow}>
                <react_native_1.Text style={s.star}>⭐</react_native_1.Text>
                <react_native_1.Text style={s.rating}>{((_c = item.rating) === null || _c === void 0 ? void 0 : _c.toFixed(1)) || '5.0'}</react_native_1.Text>
                <react_native_1.Text style={s.ratingCount}>({item.reviews_count || 0})</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            {/* Price + book */}
            <react_native_1.View style={s.right}>
              <react_native_1.Text style={s.price}>€{item.price}</react_native_1.Text>
              <react_native_1.View style={s.bookBtn}>
                <react_native_1.Text style={s.bookText}>Κράτηση</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        }}/>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchIcon: { fontSize: 15, marginRight: 8 },
    search: { flex: 1, fontSize: 14, color: '#111827' },
    clearBtn: { color: '#9CA3AF', fontSize: 16, paddingLeft: 8 },
    filterContainer: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
    chipActive: { backgroundColor: O },
    chipEmoji: { fontSize: 13 },
    chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
    avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden', flexShrink: 0 },
    avatarImg: { width: 52, height: 52, borderRadius: 14 },
    avatarEmoji: { fontSize: 22 },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    sub: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    star: { fontSize: 11 },
    rating: { fontSize: 12, fontWeight: '700', color: '#111827' },
    ratingCount: { fontSize: 11, color: '#9CA3AF' },
    right: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
    price: { fontSize: 15, fontWeight: '800', color: O },
    bookBtn: { backgroundColor: O, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    bookText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 40, marginBottom: 10 },
    emptyText: { color: '#9CA3AF', fontSize: 15 },
});
