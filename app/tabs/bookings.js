"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BookingsScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var auth_1 = require("../../src/store/auth");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var statusColor = { pending: '#FEF3C7', confirmed: '#D1FAE5', completed: '#DBEAFE', cancelled: '#FEE2E2' };
var statusText = { pending: 'Εκκρεμεί', confirmed: 'Επιβεβ.', completed: 'Ολοκλ.', cancelled: 'Ακυρ.' };
function BookingsScreen() {
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['my-bookings'],
        queryFn: function () { return api_1.api.get('/bookings/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, bookings = _a === void 0 ? [] : _a;
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.center}>
      <react_native_1.Text style={styles.emoji}>🔒</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.btn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={styles.btnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Κρατήσεις</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.FlatList data={bookings} keyExtractor={function (i) { return i.id; }} contentContainerStyle={{ padding: 16 }} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.View style={styles.card}>
            <react_native_1.View style={styles.cardIcon}><react_native_1.Text style={{ fontSize: 24 }}>✂️</react_native_1.Text></react_native_1.View>
            <react_native_1.View style={styles.cardInfo}>
              <react_native_1.Text style={styles.cardName}>{item.service_name || 'Υπηρεσία'}</react_native_1.Text>
              <react_native_1.Text style={styles.cardDate}>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('el-GR') : '—'}</react_native_1.Text>
              <react_native_1.Text style={styles.cardProvider}>{item.provider_name || '—'}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || '#F3F4F6' }]}>
              <react_native_1.Text style={styles.statusText}>{statusText[item.status] || item.status}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}><react_native_1.Text style={styles.emptyEmoji}>📅</react_native_1.Text><react_native_1.Text style={styles.emptyText}>Δεν υπάρχουν κρατήσεις</react_native_1.Text></react_native_1.View>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 24, fontWeight: '800', color: '#111827' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    cardDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    cardProvider: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 56, marginBottom: 12 },
    emptyText: { fontSize: 15, color: '#9CA3AF' },
    emoji: { fontSize: 48, marginBottom: 16 },
    btn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    btnText: { color: '#fff', fontWeight: '700' },
});
