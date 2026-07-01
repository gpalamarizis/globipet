"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PackagesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
function PackagesScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, auth_1.useAuthStore)(), user = _a.user, isAuthenticated = _a.isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(false), showModal = _b[0], setShowModal = _b[1];
    var _c = (0, react_1.useState)(null), editingPkg = _c[0], setEditingPkg = _c[1];
    var _d = (0, react_1.useState)({}), form = _d[0], setForm = _d[1];
    var canAccess = isAuthenticated && ((user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'admin');
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['provider-packages'],
        queryFn: function () { return api_1.api.get('/provider/packages').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: canAccess,
    }), _f = _e.data, packages = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return editingPkg
            ? api_1.api.patch("/provider/packages/".concat(editingPkg.id), form)
            : api_1.api.post('/provider/packages', form); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
            setShowModal(false);
            setEditingPkg(null);
        },
        onError: function (e) { var _a, _b; return react_native_1.Alert.alert('Σφάλμα', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Κάτι πήγε στραβά'); },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/provider/packages/".concat(id)); },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); },
    });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_active = _a.is_active;
            return api_1.api.patch("/provider/packages/".concat(id), { is_active: is_active });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); },
    });
    var openCreate = function () {
        setEditingPkg(null);
        setForm({ name: '', description: '', price: '', session_count: 1, validity_days: 30, is_active: true });
        setShowModal(true);
    };
    var openEdit = function (pkg) {
        setEditingPkg(pkg);
        setForm(__assign({}, pkg));
        setShowModal(true);
    };
    if (!isAuthenticated)
        return (<react_native_1.View style={styles.centered}>
      <react_native_1.Text style={styles.lockEmoji}>🔒</react_native_1.Text>
      <react_native_1.Text style={styles.guestTitle}>Συνδεθείτε για πρόσβαση</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.loginBtn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={styles.loginBtnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    if (!canAccess)
        return (<react_native_1.View style={styles.centered}>
      <react_native_1.Text style={styles.lockEmoji}>🚫</react_native_1.Text>
      <react_native_1.Text style={styles.guestTitle}>Μόνο για παρόχους υπηρεσιών</react_native_1.Text>
    </react_native_1.View>);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.headerRow}>
          <react_native_1.Text style={styles.title}>📦 Τα πακέτα μου</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <react_native_1.Text style={styles.addBtnText}>+ Νέο</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        <react_native_1.Text style={styles.subtitle}>Δημιουργήστε πακέτα υπηρεσιών για τους πελάτες σας</react_native_1.Text>
      </react_native_1.View>

      {isLoading ? (<react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator color="#E65100" size="large"/></react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={styles.list}>
          {packages.length === 0 ? (<react_native_1.View style={styles.emptyContainer}>
              <react_native_1.Text style={styles.emptyEmoji}>📦</react_native_1.Text>
              <react_native_1.Text style={styles.emptyTitle}>Δεν έχετε πακέτα ακόμα</react_native_1.Text>
              <react_native_1.Text style={styles.emptySubtitle}>Δημιουργήστε πακέτα για να αυξήσετε τις πωλήσεις σας</react_native_1.Text>
              <react_native_1.TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <react_native_1.Text style={styles.createBtnText}>Δημιουργία πακέτου</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>) : packages.map(function (pkg) { return (<react_native_1.View key={pkg.id} style={[styles.card, !pkg.is_active && styles.cardInactive]}>
              <react_native_1.View style={styles.cardHeader}>
                <react_native_1.View style={styles.cardTitleRow}>
                  <react_native_1.Text style={styles.pkgName}>{pkg.name}</react_native_1.Text>
                  <react_native_1.View style={[styles.activeBadge, { backgroundColor: pkg.is_active ? '#D1FAE5' : '#F3F4F6' }]}>
                    <react_native_1.Text style={[styles.activeText, { color: pkg.is_active ? '#065F46' : '#6B7280' }]}>
                      {pkg.is_active ? 'Ενεργό' : 'Ανενεργό'}
                    </react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                {pkg.description && <react_native_1.Text style={styles.pkgDesc}>{pkg.description}</react_native_1.Text>}
              </react_native_1.View>

              <react_native_1.View style={styles.pkgStats}>
                <react_native_1.View style={styles.stat}>
                  <react_native_1.Text style={styles.statValue}>€{pkg.price}</react_native_1.Text>
                  <react_native_1.Text style={styles.statLabel}>Τιμή</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.statDivider}/>
                <react_native_1.View style={styles.stat}>
                  <react_native_1.Text style={styles.statValue}>{pkg.session_count}</react_native_1.Text>
                  <react_native_1.Text style={styles.statLabel}>Συνεδρίες</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.statDivider}/>
                <react_native_1.View style={styles.stat}>
                  <react_native_1.Text style={styles.statValue}>{pkg.validity_days}</react_native_1.Text>
                  <react_native_1.Text style={styles.statLabel}>Ημέρες</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={styles.cardActions}>
                <react_native_1.TouchableOpacity style={styles.actionBtn} onPress={function () { return toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active }); }}>
                  <react_native_1.Text style={styles.actionBtnText}>{pkg.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={function () { return openEdit(pkg); }}>
                  <react_native_1.Text style={styles.editBtnText}>Επεξεργασία</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.deleteBtn} onPress={function () { return react_native_1.Alert.alert('Διαγραφή', "\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(pkg.name, "\";"), [
                    { text: 'Ακύρωση', style: 'cancel' },
                    { text: 'Διαγραφή', style: 'destructive', onPress: function () { return deleteMutation.mutate(pkg.id); } }
                ]); }}>
                  <react_native_1.Text style={styles.deleteBtnText}>🗑️</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>); })}
          <react_native_1.View style={{ height: 40 }}/>
        </react_native_1.ScrollView>)}

      {/* Modal */}
      <react_native_1.Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <react_native_1.View style={styles.modal}>
          <react_native_1.View style={styles.modalHeader}>
            <react_native_1.Text style={styles.modalTitle}>{editingPkg ? 'Επεξεργασία' : 'Νέο πακέτο'}</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return setShowModal(false); }}>
              <react_native_1.Text style={styles.modalClose}>✕</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          <react_native_1.ScrollView style={styles.modalBody}>
            <react_native_1.Text style={styles.fieldLabel}>Όνομα *</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={form.name || ''} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { name: v })); }} placeholder="π.χ. Πακέτο 5 λουσίματος"/>

            <react_native_1.Text style={styles.fieldLabel}>Περιγραφή</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, styles.textarea]} value={form.description || ''} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { description: v })); }} placeholder="Περιγραφή πακέτου..." multiline numberOfLines={3}/>

            <react_native_1.View style={styles.row}>
              <react_native_1.View style={styles.halfField}>
                <react_native_1.Text style={styles.fieldLabel}>Τιμή (€) *</react_native_1.Text>
                <react_native_1.TextInput style={styles.input} value={String(form.price || '')} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { price: v })); }} keyboardType="decimal-pad" placeholder="0.00"/>
              </react_native_1.View>
              <react_native_1.View style={styles.halfField}>
                <react_native_1.Text style={styles.fieldLabel}>Αριθμός συνεδριών *</react_native_1.Text>
                <react_native_1.TextInput style={styles.input} value={String(form.session_count || '')} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { session_count: parseInt(v) || 1 })); }} keyboardType="number-pad" placeholder="5"/>
              </react_native_1.View>
            </react_native_1.View>

            <react_native_1.Text style={styles.fieldLabel}>Ισχύς (ημέρες)</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={String(form.validity_days || '')} onChangeText={function (v) { return setForm(__assign(__assign({}, form), { validity_days: parseInt(v) || 30 })); }} keyboardType="number-pad" placeholder="30"/>
          </react_native_1.ScrollView>
          <react_native_1.View style={styles.modalFooter}>
            <react_native_1.TouchableOpacity style={styles.cancelBtn} onPress={function () { return setShowModal(false); }}>
              <react_native_1.Text style={styles.cancelBtnText}>Άκυρο</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]} onPress={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name || !form.price}>
              <react_native_1.Text style={styles.saveBtnText}>{saveMutation.isPending ? 'Αποθήκευση...' : (editingPkg ? 'Ενημέρωση' : 'Δημιουργία')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 22, fontWeight: '800', color: '#111827' },
    subtitle: { fontSize: 13, color: '#6B7280' },
    addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardInactive: { opacity: 0.6 },
    cardHeader: { marginBottom: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    pkgName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
    pkgDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    activeText: { fontSize: 11, fontWeight: '600' },
    pkgStats: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800', color: '#E65100' },
    statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#E5E7EB' },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    actionBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    editBtn: { borderColor: '#E65100' },
    editBtnText: { color: '#E65100', fontWeight: '700', fontSize: 12 },
    deleteBtn: { width: 40, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
    deleteBtnText: { fontSize: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    lockEmoji: { fontSize: 48, marginBottom: 16 },
    guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
    loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
    loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    emptyContainer: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
    emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
    createBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modal: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    modalClose: { fontSize: 20, color: '#6B7280', padding: 4 },
    modalBody: { flex: 1, padding: 20 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
    textarea: { height: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    cancelBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
    saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
