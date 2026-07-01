"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OrdersScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
function OrdersScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['orders'],
        queryFn: function () { return api_1.api.get('/orders/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _b = _a.data, data = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var statusLabel = function (s) { return ({ pending: 'Εκκρεμεί', confirmed: 'Επιβεβαιώθηκε', processing: 'Σε επεξεργασία', shipped: 'Εστάλη', delivered: 'Παραδόθηκε', cancelled: 'Ακυρώθηκε' }[s] || s); };
    var statusColor = function (s) { return ({ confirmed: '#10B981', processing: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', pending: '#F59E0B', cancelled: '#EF4444' }[s] || '#6B7280'); };
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>Παραγγελίες</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      {isLoading ? <react_native_1.ActivityIndicator color={ORANGE} style={{ marginTop: 40 }}/> :
            data.length === 0 ? (<react_native_1.View style={s.empty}>
            <react_native_1.Text style={s.emptyEmoji}>📦</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>Δεν υπάρχουν παραγγελίες</react_native_1.Text>
            <react_native_1.TouchableOpacity style={s.shopBtn} onPress={function () { return router.push('/(tabs)/marketplace'); }}>
              <react_native_1.Text style={s.shopBtnText}>Πήγαινε στο Κατάστημα</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map(function (order) {
                    var _a, _b;
                    return (<react_native_1.View key={order.id} style={s.card}>
                <react_native_1.View style={s.cardHeader}>
                  <react_native_1.Text style={s.orderId}>#{order.id.slice(0, 8).toUpperCase()}</react_native_1.Text>
                  <react_native_1.View style={[s.badge, { backgroundColor: statusColor(order.status) + '20' }]}>
                    <react_native_1.Text style={[s.badgeText, { color: statusColor(order.status) }]}>{statusLabel(order.status)}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.Text style={s.date}>{new Date(order.created_at).toLocaleDateString('el-GR')}</react_native_1.Text>
                {(order.items || []).slice(0, 3).map(function (item, i) { return (<react_native_1.View key={i} style={s.item}>
                    <react_native_1.Text style={s.itemName}>{item.name || item.product_name}</react_native_1.Text>
                    <react_native_1.Text style={s.itemQty}>×{item.quantity}</react_native_1.Text>
                  </react_native_1.View>); })}
                {((_a = order.items) === null || _a === void 0 ? void 0 : _a.length) > 3 && <react_native_1.Text style={s.moreItems}>+{order.items.length - 3} ακόμα προϊόντα</react_native_1.Text>}
                <react_native_1.View style={s.footer}>
                  {order.tracking_number && <react_native_1.Text style={s.tracking}>🚚 {order.tracking_number}</react_native_1.Text>}
                  <react_native_1.Text style={s.total}>€{(_b = order.total_amount) === null || _b === void 0 ? void 0 : _b.toFixed(2)}</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>);
                })}
          </react_native_1.ScrollView>)}
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
    shopBtn: { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    shopBtnText: { color: '#fff', fontWeight: '700' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    orderId: { fontSize: 14, fontWeight: '700', color: '#111827' },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    date: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
    item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    itemName: { fontSize: 13, color: '#374151', flex: 1 },
    itemQty: { fontSize: 13, color: '#6B7280' },
    moreItems: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    tracking: { fontSize: 12, color: '#6B7280' },
    total: { fontSize: 18, fontWeight: '800', color: ORANGE },
});
