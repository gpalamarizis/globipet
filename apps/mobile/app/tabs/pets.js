"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PetsScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var auth_1 = require("../../src/store/auth");
var api_1 = require("../../src/lib/api");
var speciesEmoji = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾' };
function PetsScreen() {
    var router = (0, expo_router_1.useRouter)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _b = _a.data, pets = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var toggleLost = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isLost = _a.isLost;
            return api_1.api.patch("/pets/".concat(id), { is_lost: isLost });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['my-pets'] }); },
    });
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.center}>
      <react_native_1.Text style={styles.emoji}>🔒</react_native_1.Text>
      <react_native_1.Text style={styles.title}>Απαιτείται σύνδεση</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.btn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={styles.btnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Τα κατοικίδιά μου</react_native_1.Text>
        <react_native_1.TouchableOpacity style={styles.addBtn}>
          <react_native_1.Text style={styles.addBtnText}>+ Προσθήκη</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
      <react_native_1.FlatList data={pets} keyExtractor={function (i) { return i.id; }} contentContainerStyle={{ padding: 16 }} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.View style={styles.card}>
            <react_native_1.Text style={styles.petEmoji}>{speciesEmoji[item.species] || '🐾'}</react_native_1.Text>
            <react_native_1.View style={styles.petInfo}>
              <react_native_1.Text style={styles.petName}>{item.name}</react_native_1.Text>
              <react_native_1.Text style={styles.petDetail}>{item.breed || item.species} · {item.age} ετών</react_native_1.Text>
            </react_native_1.View>
            {item.is_lost && <react_native_1.View style={styles.lostBadge}><react_native_1.Text style={styles.lostText}>ΧΑΜΕΝΟ</react_native_1.Text></react_native_1.View>}
            <react_native_1.TouchableOpacity onPress={function () { return toggleLost.mutate({ id: item.id, isLost: !item.is_lost }); }} style={[styles.lostBtn, item.is_lost && styles.foundBtn]}>
              <react_native_1.Text style={styles.lostBtnText}>{item.is_lost ? '✓ Βρέθηκε' : '! Χάθηκε'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}>
            <react_native_1.Text style={styles.emptyEmoji}>🐾</react_native_1.Text>
            <react_native_1.Text style={styles.emptyText}>Δεν έχετε κατοικίδια ακόμα</react_native_1.Text>
          </react_native_1.View>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 24, fontWeight: '800', color: '#111827' },
    addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    petEmoji: { fontSize: 36, marginRight: 12 },
    petInfo: { flex: 1 },
    petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    petDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    lostBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
    lostText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
    lostBtn: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    foundBtn: { backgroundColor: '#D1FAE5' },
    lostBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    emoji: { fontSize: 48, marginBottom: 16 },
    btn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
    btnText: { color: '#fff', fontWeight: '700' },
});
