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
exports.default = PetsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var react_i18next_1 = require("react-i18next");
var auth_1 = require("../../src/store/auth");
var api_1 = require("../../src/lib/api");
var speciesEmoji = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾' };
var defaultForm = { name: '', species: 'dog', breed: '', age: '', weight: '', gender: 'male', color: '', microchip_number: '' };
function PetsScreen() {
    var router = (0, expo_router_1.useRouter)();
    var t = (0, react_i18next_1.useTranslation)().t;
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showAdd = _a[0], setShowAdd = _a[1];
    var _b = (0, react_1.useState)(defaultForm), form = _b[0], setForm = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, pets = _c === void 0 ? [] : _c;
    var addPet = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/pets', __assign(__assign({}, form), { age: form.age ? parseFloat(form.age) : null, weight: form.weight ? parseFloat(form.weight) : null })); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['my-pets'] }); setShowAdd(false); setForm(defaultForm); react_native_1.Alert.alert('✅', t('pets.added')); },
        onError: function (err) { var _a, _b; return react_native_1.Alert.alert(t('common.error'), ((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || t('pets.add_error')); },
    });
    var toggleLost = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isLost = _a.isLost;
            return api_1.api.patch("/pets/".concat(id), { is_lost: isLost });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['my-pets'] }); },
    });
    if (!isAuthenticated)
        return (<react_native_1.View style={s.center}>
      <react_native_1.Text style={s.bigEmoji}>🔒</react_native_1.Text>
      <react_native_1.Text style={s.emptyText}>{t('pets.auth_required')}</react_native_1.Text>
      <react_native_1.TouchableOpacity style={s.primaryBtn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={s.primaryBtnText}>{t('auth.login')}</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.headerTitle}>{t('pets.title')}</react_native_1.Text>
        <react_native_1.TouchableOpacity style={s.addBtn} onPress={function () { return setShowAdd(true); }}>
          <react_native_1.Text style={s.addBtnText}>{t('pets.add')}</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.FlatList data={pets} keyExtractor={function (i) { return i.id; }} contentContainerStyle={{ padding: 16 }} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.View style={s.card}>
            <react_native_1.Text style={s.petEmoji}>{speciesEmoji[item.species] || '🐾'}</react_native_1.Text>
            <react_native_1.View style={s.petInfo}>
              <react_native_1.Text style={s.petName}>{item.name}</react_native_1.Text>
              <react_native_1.Text style={s.petDetail}>{item.breed || item.species}{item.age ? " \u00B7 ".concat(item.age, " ").concat(t('pets.years')) : ''}</react_native_1.Text>
              {item.microchip_number ? <react_native_1.Text style={s.chipText}>📱 {item.microchip_number}</react_native_1.Text> : <react_native_1.Text style={s.noChip}>{t('pets.no_chip')}</react_native_1.Text>}
            </react_native_1.View>
            {item.is_lost && <react_native_1.View style={s.lostBadge}><react_native_1.Text style={s.lostBadgeText}>{t('pets.lost_badge')}</react_native_1.Text></react_native_1.View>}
            <react_native_1.TouchableOpacity onPress={function () { return toggleLost.mutate({ id: item.id, isLost: !item.is_lost }); }} style={[s.statusBtn, item.is_lost ? s.foundBtn : s.lostBtn]}>
              <react_native_1.Text style={s.statusBtnText}>{item.is_lost ? t('pets.mark_found') : t('pets.mark_lost')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={s.center}>
            <react_native_1.Text style={s.bigEmoji}>🐾</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>{t('pets.no_pets')}</react_native_1.Text>
            <react_native_1.TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={function () { return setShowAdd(true); }}>
              <react_native_1.Text style={s.primaryBtnText}>{t('pets.add_pet')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>}/>

      <react_native_1.Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <react_native_1.ScrollView style={s.modal} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          <react_native_1.View style={s.modalHeader}>
            <react_native_1.Text style={s.modalTitle}>{t('pets.new_pet')}</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return setShowAdd(false); }}><react_native_1.Text style={s.closeBtn}>✕</react_native_1.Text></react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.Text style={s.label}>{t('pets.species')}</react_native_1.Text>
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {Object.entries(speciesEmoji).map(function (_a) {
            var k = _a[0], e = _a[1];
            return (<react_native_1.TouchableOpacity key={k} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { species: k })); }); }} style={[s.speciesChip, form.species === k && s.speciesChipActive]}>
                <react_native_1.Text style={{ fontSize: 22 }}>{e}</react_native_1.Text>
                <react_native_1.Text style={[s.speciesLabel, form.species === k && s.speciesLabelActive]}>{k}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.ScrollView>

          <react_native_1.Text style={s.label}>{t('pets.name')}</react_native_1.Text>
          <react_native_1.TextInput style={s.input} placeholder={t('pets.name_placeholder')} value={form.name} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { name: v })); }); }}/>

          <react_native_1.Text style={s.label}>{t('pets.breed')}</react_native_1.Text>
          <react_native_1.TextInput style={s.input} placeholder={t('pets.breed_placeholder')} value={form.breed} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { breed: v })); }); }}/>

          <react_native_1.View style={{ flexDirection: 'row', gap: 12 }}>
            <react_native_1.View style={{ flex: 1 }}>
              <react_native_1.Text style={s.label}>{t('pets.age')}</react_native_1.Text>
              <react_native_1.TextInput style={s.input} placeholder="3" keyboardType="numeric" value={form.age} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { age: v })); }); }}/>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1 }}>
              <react_native_1.Text style={s.label}>{t('pets.weight')}</react_native_1.Text>
              <react_native_1.TextInput style={s.input} placeholder="5.5" keyboardType="numeric" value={form.weight} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { weight: v })); }); }}/>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.Text style={s.label}>{t('pets.gender')}</react_native_1.Text>
          <react_native_1.View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {[['male', t('pets.male')], ['female', t('pets.female')]].map(function (_a) {
            var v = _a[0], l = _a[1];
            return (<react_native_1.TouchableOpacity key={v} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { gender: v })); }); }} style={[s.genderBtn, form.gender === v && s.genderBtnActive]}>
                <react_native_1.Text style={[s.genderLabel, form.gender === v && s.genderLabelActive]}>{l}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>

          <react_native_1.Text style={s.label}>{t('pets.color')}</react_native_1.Text>
          <react_native_1.TextInput style={s.input} placeholder={t('pets.color_placeholder')} value={form.color} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { color: v })); }); }}/>

          <react_native_1.Text style={s.label}>{t('pets.microchip')}</react_native_1.Text>
          <react_native_1.View style={s.chipRow}>
            <react_native_1.TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder={t('pets.microchip_placeholder')} keyboardType="numeric" maxLength={15} value={form.microchip_number} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { microchip_number: v })); }); }}/>
          </react_native_1.View>
          <react_native_1.Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontStyle: 'italic' }}>{t('pets.microchip_note')}</react_native_1.Text>

          <react_native_1.TouchableOpacity onPress={function () { return addPet.mutate(); }} disabled={!form.name || addPet.isPending} style={[s.primaryBtn, { marginTop: 20 }, (!form.name || addPet.isPending) && { opacity: 0.5 }]}>
            <react_native_1.Text style={s.primaryBtnText}>{addPet.isPending ? t('pets.saving') : t('pets.save')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.ScrollView>
      </react_native_1.Modal>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
    addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    petEmoji: { fontSize: 36, marginRight: 12 },
    petInfo: { flex: 1 },
    petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    petDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    chipText: { fontSize: 11, color: '#6B7280', marginTop: 3 },
    noChip: { fontSize: 11, color: '#D1D5DB', marginTop: 3 },
    lostBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
    lostBadgeText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
    statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    lostBtn: { backgroundColor: '#FEF3C7' },
    foundBtn: { backgroundColor: '#D1FAE5' },
    statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    bigEmoji: { fontSize: 64, marginBottom: 16 },
    emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
    primaryBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modal: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    closeBtn: { fontSize: 18, color: '#9CA3AF' },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 14, color: '#111827' },
    speciesChip: { alignItems: 'center', padding: 10, marginRight: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 68 },
    speciesChipActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
    speciesLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
    speciesLabelActive: { color: '#E65100', fontWeight: '600' },
    genderBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    genderBtnActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
    genderLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
    genderLabelActive: { color: '#E65100', fontWeight: '700' },
    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
});
