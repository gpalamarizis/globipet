"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BookingsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
function BookingsScreen() {
    var router = (0, expo_router_1.useRouter)();
    var qc = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)('upcoming'), tab = _a[0], setTab = _a[1];
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['bookings', tab],
        queryFn: function () { return api_1.api.get("/bookings?tab=".concat(tab)).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _c = _b.data, data = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    var cancel = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.patch("/bookings/".concat(id), { status: 'cancelled' }); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['bookings'] }); react_native_1.Alert.alert('Ακυρώθηκε'); },
    });
    var statusColor = function (s) { return ({ confirmed: '#10B981', pending: '#F59E0B', cancelled: '#EF4444' }[s] || '#6B7280'); };
    var statusLabel = function (s) { return ({ confirmed: 'Επιβεβαιωμένη', pending: 'Εκκρεμεί', cancelled: 'Ακυρώθηκε' }[s] || s); };
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }} style={s.backBtn}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>Κρατήσεις</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      <react_native_1.View style={s.tabs}>
        <react_native_1.TouchableOpacity style={[s.tab, tab === 'upcoming' && s.tabActive]} onPress={function () { return setTab('upcoming'); }}>
          <react_native_1.Text style={[s.tabText, tab === 'upcoming' && s.tabActive && { color: '#111827' }]}>Επερχόμενες</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[s.tab, tab === 'past' && s.tabActive]} onPress={function () { return setTab('past'); }}>
          <react_native_1.Text style={[s.tabText, tab === 'past' && s.tabActive && { color: '#111827' }]}>Παρελθόν</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {isLoading ? <react_native_1.ActivityIndicator color={ORANGE} style={{ marginTop: 40 }}/> :
            data.length === 0 ? (<react_native_1.View style={s.empty}>
            <react_native_1.Text style={s.emptyEmoji}>📅</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>Δεν υπάρχουν κρατήσεις</react_native_1.Text>
          </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map(function (b) { return (<react_native_1.View key={b.id} style={s.card}>
                <react_native_1.View style={s.cardHeader}>
                  <react_native_1.Text style={s.cardTitle}>{b.service_name || b.provider_name}</react_native_1.Text>
                  <react_native_1.View style={[s.badge, { backgroundColor: statusColor(b.status) + '20' }]}>
                    <react_native_1.Text style={[s.badgeText, { color: statusColor(b.status) }]}>{statusLabel(b.status)}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.Text style={s.cardInfo}>👤 {b.provider_name}</react_native_1.Text>
                <react_native_1.Text style={s.cardInfo}>📅 {b.booking_date} στις {b.booking_time}</react_native_1.Text>
                {b.pet_name && <react_native_1.Text style={s.cardInfo}>🐾 {b.pet_name}</react_native_1.Text>}
                <react_native_1.Text style={s.cardPrice}>€{b.total_price}</react_native_1.Text>
                {tab === 'upcoming' && b.status !== 'cancelled' && (<react_native_1.TouchableOpacity style={s.cancelBtn} onPress={function () { return react_native_1.Alert.alert('Ακύρωση', 'Ακύρωση κράτησης;', [
                            { text: 'Όχι', style: 'cancel' },
                            { text: 'Ναι', style: 'destructive', onPress: function () { return cancel.mutate(b.id); } },
                        ]); }}>
                    <react_native_1.Text style={s.cancelText}>Ακύρωση</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}
              </react_native_1.View>); })}
          </react_native_1.ScrollView>)}
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 32 }, backText: { color: ORANGE, fontSize: 24 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#fff', elevation: 2 },
    tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    cardInfo: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
    cardPrice: { fontSize: 16, fontWeight: '700', color: ORANGE, marginTop: 8 },
    cancelBtn: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center' },
    cancelText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});
