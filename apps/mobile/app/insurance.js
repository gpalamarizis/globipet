"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InsuranceScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
function InsuranceScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['insurance-products'],
        queryFn: function () { return api_1.api.get('/insurance').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
    }), _b = _a.data, data = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var mockProducts = [
        { id: '1', name: 'Βασικό Πλάνο', price: 9.99, period: 'μήνα', covers: ['Κτηνίατρος', 'Επείγοντα', 'Φάρμακα'], color: '#3B82F6' },
        { id: '2', name: 'Premium Πλάνο', price: 19.99, period: 'μήνα', covers: ['Κτηνίατρος', 'Επείγοντα', 'Φάρμακα', 'Χειρουργεία', 'Οδοντιατρικά'], color: ORANGE },
        { id: '3', name: 'Ετήσιο Πλάνο', price: 149.99, period: 'χρόνο', covers: ['Όλα τα παραπάνω', 'Εξωτερικό', 'Τηλεϊατρική'], color: '#8B5CF6' },
    ];
    var products = data.length > 0 ? data : mockProducts;
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>Ασφάλιση</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
        <react_native_1.View style={s.heroBanner}>
          <react_native_1.Text style={s.heroEmoji}>🛡️</react_native_1.Text>
          <react_native_1.Text style={s.heroTitle}>Προστατέψτε το κατοικίδιό σας</react_native_1.Text>
          <react_native_1.Text style={s.heroSub}>Επιλέξτε το πλάνο που ταιριάζει στις ανάγκες σας</react_native_1.Text>
        </react_native_1.View>

        {isLoading ? <react_native_1.ActivityIndicator color={ORANGE}/> :
            products.map(function (p) { return (<react_native_1.View key={p.id} style={[s.card, { borderTopColor: p.color, borderTopWidth: 4 }]}>
              <react_native_1.Text style={s.planName}>{p.name}</react_native_1.Text>
              <react_native_1.View style={s.priceRow}>
                <react_native_1.Text style={[s.price, { color: p.color }]}>€{p.price}</react_native_1.Text>
                <react_native_1.Text style={s.period}>/{p.period}</react_native_1.Text>
              </react_native_1.View>
              {(p.covers || []).map(function (c) { return (<react_native_1.Text key={c} style={s.cover}>✅ {c}</react_native_1.Text>); })}
              <react_native_1.TouchableOpacity style={[s.btn, { backgroundColor: p.color }]} onPress={function () { return react_native_1.Alert.alert('Σύντομα', 'Η αγορά ασφάλισης θα είναι διαθέσιμη σύντομα'); }}>
                <react_native_1.Text style={s.btnText}>Επιλογή Πλάνου</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>); })}

        <react_native_1.View style={s.infoBox}>
          <react_native_1.Text style={s.infoTitle}>ℹ️ Γιατί ασφάλιση κατοικιδίου;</react_native_1.Text>
          <react_native_1.Text style={s.infoText}>Οι κτηνιατρικές δαπάνες μπορεί να ξεπεράσουν τα €3.000 για σοβαρές παθήσεις. Με ασφάλιση GlobiPet καλύπτεστε έως 80%.</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    heroBanner: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
    heroEmoji: { fontSize: 48, marginBottom: 8 },
    heroTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
    heroSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
    planName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
    price: { fontSize: 32, fontWeight: '900' },
    period: { fontSize: 16, color: '#6B7280', marginLeft: 4 },
    cover: { fontSize: 14, color: '#374151', marginBottom: 6 },
    btn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    infoBox: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 24 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 8 },
    infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
});
