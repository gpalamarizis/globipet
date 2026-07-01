"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelehealthScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var auth_1 = require("../src/store/auth");
var ORANGE = '#E65100';
function TelehealthScreen() {
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var _b = (0, react_1.useState)('now'), tab = _b[0], setTab = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)(null), selected = _d[0], setSelected = _d[1];
    var _e = (0, react_1.useState)(''), date = _e[0], setDate = _e[1];
    var _f = (0, react_1.useState)('10:00'), time = _f[0], setTime = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['telehealth-available'],
        queryFn: function () { return api_1.api.get('/telehealth/available-now').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        refetchInterval: 30000,
    }), _h = _g.data, availableVets = _h === void 0 ? [] : _h, loadingNow = _g.isLoading, refetch = _g.refetch;
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['telehealth-vets'],
        queryFn: function () { return api_1.api.get('/services?service_type=veterinary&limit=24').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: tab === 'scheduled',
    }), _k = _j.data, allVets = _k === void 0 ? [] : _k, loadingAll = _j.isLoading;
    var vets = tab === 'now' ? availableVets : allVets;
    var filtered = vets.filter(function (v) { var _a; return (_a = v.provider_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase()); });
    var isLoading = tab === 'now' ? loadingNow : loadingAll;
    var book = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/telehealth', {
            provider_email: selected.provider_email,
            provider_name: selected.provider_name,
            service_id: selected.id,
            scheduled_date: tab === 'now' ? new Date().toISOString().split('T')[0] : date,
            scheduled_time: tab === 'now' ? new Date().toTimeString().slice(0, 5) : time,
            duration: 30,
            price: selected.price,
        }); },
        onSuccess: function (res) {
            var _a;
            setSelected(null);
            if ((_a = res.data) === null || _a === void 0 ? void 0 : _a.checkoutUrl) {
                react_native_1.Alert.alert('Πληρωμή', "\u039C\u03B5\u03C4\u03B1\u03C6\u03BF\u03C1\u03AC \u03C3\u03C4\u03BF Viva Wallet \u03B3\u03B9\u03B1 \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE \u20AC".concat(selected.price), [
                    { text: 'Άκυρο', style: 'cancel' },
                    { text: 'Πλήρωσε', onPress: function () { return react_native_1.Alert.alert('Σύντομα', 'Άνοιγμα browser για πληρωμή'); } },
                ]);
            }
        },
        onError: function () { return react_native_1.Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η κράτηση'); },
    });
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }} style={s.backBtn}>
          <react_native_1.Text style={s.backText}>‹ Πίσω</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>Τηλεϊατρική</react_native_1.Text>
        <react_native_1.View style={{ width: 60 }}/>
      </react_native_1.View>

      {/* Tabs */}
      <react_native_1.View style={s.tabs}>
        <react_native_1.TouchableOpacity style={[s.tab, tab === 'now' && s.tabActive]} onPress={function () { return setTab('now'); }}>
          <react_native_1.Text style={[s.tabText, tab === 'now' && s.tabTextActive]}>
            ⚡ Τώρα {availableVets.length > 0 ? "(".concat(availableVets.length, ")") : ''}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[s.tab, tab === 'scheduled' && s.tabActive]} onPress={function () { return setTab('scheduled'); }}>
          <react_native_1.Text style={[s.tabText, tab === 'scheduled' && s.tabTextActive]}>📅 Προγραμματισμένη</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.TextInput style={s.search} placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChangeText={setSearch}/>

      {isLoading ? (<react_native_1.ActivityIndicator color={ORANGE} style={{ marginTop: 40 }}/>) : filtered.length === 0 ? (<react_native_1.View style={s.empty}>
          <react_native_1.Text style={s.emptyEmoji}>🩺</react_native_1.Text>
          <react_native_1.Text style={s.emptyText}>{tab === 'now' ? 'Κανένας κτηνίατρος διαθέσιμος τώρα' : 'Δεν βρέθηκαν κτηνίατροι'}</react_native_1.Text>
          {tab === 'now' && <react_native_1.TouchableOpacity onPress={function () { return setTab('scheduled'); }}><react_native_1.Text style={s.link}>Κλείσε προγραμματισμένο →</react_native_1.Text></react_native_1.TouchableOpacity>}
        </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
          {filtered.map(function (vet) {
                var _a, _b;
                return (<react_native_1.TouchableOpacity key={vet.id} style={s.card} onPress={function () {
                        if (!isAuthenticated) {
                            react_native_1.Alert.alert('Σύνδεση απαιτείται');
                            return;
                        }
                        setSelected(vet);
                    }}>
              <react_native_1.View style={s.vetAvatar}><react_native_1.Text style={s.vetAvatarText}>{(_a = vet.provider_name) === null || _a === void 0 ? void 0 : _a[0]}</react_native_1.Text></react_native_1.View>
              <react_native_1.View style={{ flex: 1 }}>
                <react_native_1.Text style={s.vetName}>{vet.provider_name}</react_native_1.Text>
                <react_native_1.Text style={s.vetSpec}>{((_b = vet.specializations) === null || _b === void 0 ? void 0 : _b[0]) || 'Γενική Κτηνιατρική'}</react_native_1.Text>
                <react_native_1.Text style={s.vetRating}>⭐ {vet.rating || 0} ({vet.reviews_count || 0})</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={{ alignItems: 'flex-end' }}>
                {vet.is_available_now && <react_native_1.View style={s.onlineDot}/>}
                <react_native_1.Text style={s.vetPrice}>€{vet.price}</react_native_1.Text>
                <react_native_1.Text style={s.bookBtn}>{tab === 'now' ? '⚡ Τώρα' : 'Κλείσε'}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>);
            })}
        </react_native_1.ScrollView>)}

      {/* Booking Modal */}
      <react_native_1.Modal visible={!!selected} transparent animationType="slide">
        <react_native_1.View style={s.overlay}>
          <react_native_1.View style={s.modal}>
            <react_native_1.Text style={s.modalTitle}>{selected === null || selected === void 0 ? void 0 : selected.provider_name}</react_native_1.Text>
            <react_native_1.Text style={s.modalSub}>{((_a = selected === null || selected === void 0 ? void 0 : selected.specializations) === null || _a === void 0 ? void 0 : _a[0]) || 'Γενική Κτηνιατρική'}</react_native_1.Text>
            {tab === 'scheduled' && (<>
                <react_native_1.Text style={s.label}>Ημερομηνία (ΕΕΕΕ-ΜΜ-ΗΗ)</react_native_1.Text>
                <react_native_1.TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-07-01"/>
                <react_native_1.Text style={s.label}>Ώρα</react_native_1.Text>
                <react_native_1.TextInput style={s.input} value={time} onChangeText={setTime} placeholder="10:00"/>
              </>)}
            {tab === 'now' && <react_native_1.Text style={s.nowInfo}>🔒 Πληρωμή μέσω Viva Wallet πριν την κλήση</react_native_1.Text>}
            <react_native_1.Text style={s.price}>Κόστος: €{selected === null || selected === void 0 ? void 0 : selected.price}</react_native_1.Text>
            <react_native_1.View style={s.modalBtns}>
              <react_native_1.TouchableOpacity style={s.cancelBtn} onPress={function () { return setSelected(null); }}>
                <react_native_1.Text style={s.cancelText}>Άκυρο</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={s.confirmBtn} onPress={function () { return book.mutate(); }} disabled={book.isPending}>
                <react_native_1.Text style={s.confirmText}>{book.isPending ? '...' : '💳 Πλήρωσε & Κλείσε'}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 60 },
    backText: { color: ORANGE, fontSize: 17 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
    tabTextActive: { color: '#111827' },
    search: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
    link: { color: ORANGE, fontSize: 14, fontWeight: '600' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    vetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
    vetAvatarText: { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
    vetName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    vetSpec: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    vetRating: { fontSize: 12, color: '#F59E0B', marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginBottom: 4 },
    vetPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
    bookBtn: { fontSize: 12, color: ORANGE, fontWeight: '600', marginTop: 4 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 12 },
    nowInfo: { fontSize: 13, color: '#2563EB', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 12 },
    price: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
    modalBtns: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    cancelText: { color: '#374151', fontWeight: '600' },
    confirmBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center' },
    confirmText: { color: '#fff', fontWeight: '700' },
});
