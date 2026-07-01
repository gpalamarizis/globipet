"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CartScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
function CartScreen() {
    var router = (0, expo_router_1.useRouter)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['cart'],
        queryFn: function () { return api_1.api.get('/cart').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _b = _a.data, cart = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var updateQty = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, qty = _a.qty;
            return qty <= 0 ? api_1.api.delete("/cart/".concat(id)) : api_1.api.patch("/cart/".concat(id), { quantity: qty });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['cart'] }); },
    });
    var total = cart.reduce(function (s, i) { return s + i.product_price * i.quantity; }, 0);
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.centered}>
      <react_native_1.Text style={styles.lockEmoji}>🔒</react_native_1.Text>
      <react_native_1.Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση στο καλάθι</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.loginBtn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={styles.loginBtnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    if (isLoading)
        return (<react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator color="#E65100" size="large"/></react_native_1.View>);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>🛒 Καλάθι ({cart.length})</react_native_1.Text>
      </react_native_1.View>

      {cart.length === 0 ? (<react_native_1.View style={styles.centered}>
          <react_native_1.Text style={styles.emptyEmoji}>🛒</react_native_1.Text>
          <react_native_1.Text style={styles.emptyTitle}>Το καλάθι σας είναι άδειο</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.browseBtn} onPress={function () { return router.push('/marketplace'); }}>
            <react_native_1.Text style={styles.browseBtnText}>Δείτε προϊόντα</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : (<>
          <react_native_1.ScrollView contentContainerStyle={styles.list}>
            {cart.map(function (item) { return (<react_native_1.View key={item.id} style={styles.card}>
                <react_native_1.View style={styles.itemImage}>
                  {item.product_image
                    ? <react_native_1.Image source={{ uri: item.product_image }} style={styles.image}/>
                    : <react_native_1.Text style={styles.imagePlaceholder}>📦</react_native_1.Text>}
                </react_native_1.View>
                <react_native_1.View style={styles.itemInfo}>
                  <react_native_1.Text style={styles.itemName} numberOfLines={2}>{item.product_name}</react_native_1.Text>
                  <react_native_1.Text style={styles.itemPrice}>€{item.product_price.toFixed(2)}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.qtyControl}>
                  <react_native_1.TouchableOpacity style={styles.qtyBtn} onPress={function () { return updateQty.mutate({ id: item.id, qty: item.quantity - 1 }); }}>
                    <react_native_1.Text style={styles.qtyBtnText}>−</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.Text style={styles.qty}>{item.quantity}</react_native_1.Text>
                  <react_native_1.TouchableOpacity style={styles.qtyBtn} onPress={function () { return updateQty.mutate({ id: item.id, qty: item.quantity + 1 }); }}>
                    <react_native_1.Text style={styles.qtyBtnText}>+</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </react_native_1.View>); })}
            <react_native_1.View style={{ height: 120 }}/>
          </react_native_1.ScrollView>

          <react_native_1.View style={styles.footer}>
            <react_native_1.View style={styles.totalRow}>
              <react_native_1.Text style={styles.totalLabel}>Σύνολο</react_native_1.Text>
              <react_native_1.Text style={styles.totalValue}>€{total.toFixed(2)}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.TouchableOpacity style={styles.checkoutBtn} onPress={function () { return router.push('/checkout'); }}>
              <react_native_1.Text style={styles.checkoutBtnText}>Ολοκλήρωση αγοράς →</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </>)}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827' },
    list: { padding: 16, gap: 10 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    itemImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
    image: { width: 60, height: 60 },
    imagePlaceholder: { fontSize: 24 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
    itemPrice: { fontSize: 15, fontWeight: '800', color: '#E65100' },
    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 18, color: '#374151', fontWeight: '600' },
    qty: { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    totalLabel: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
    totalValue: { fontSize: 20, fontWeight: '900', color: '#111827' },
    checkoutBtn: { backgroundColor: '#E65100', borderRadius: 14, padding: 16, alignItems: 'center' },
    checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    lockEmoji: { fontSize: 48, marginBottom: 16 },
    guestTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
    loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
    loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 20 },
    browseBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
