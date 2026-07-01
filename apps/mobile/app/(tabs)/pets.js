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
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
var O = '#E65100';
var EM = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾' };
function PetsScreen() {
    var router = (0, expo_router_1.useRouter)();
    var qc = (0, react_query_1.useQueryClient)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var _a = (0, react_1.useState)(false), showAdd = _a[0], setShowAdd = _a[1];
    var _b = (0, react_1.useState)({ name: '', species: 'dog', breed: '', birthday: '', gender: 'male' }), form = _b[0], setForm = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _d = _c.data, pets = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    var addPet = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/pets', form); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['my-pets'] }); setShowAdd(false); setForm({ name: '', species: 'dog', breed: '', birthday: '', gender: 'male' }); },
        onError: function () { return react_native_1.Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η προσθήκη'); },
    });
    if (!isAuthenticated)
        return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}><react_native_1.Text style={s.title}>Κατοικίδια</react_native_1.Text></react_native_1.View>
      <react_native_1.View style={s.empty}>
        <react_native_1.Text style={s.emptyEmoji}>🔒</react_native_1.Text>
        <react_native_1.Text style={s.emptyText}>Συνδεθείτε για πρόσβαση</react_native_1.Text>
        <react_native_1.TouchableOpacity style={s.loginBtn} onPress={function () { return router.push('/auth/login'); }}>
          <react_native_1.Text style={s.loginBtnText}>Σύνδεση</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Κατοικίδια</react_native_1.Text>
        <react_native_1.TouchableOpacity style={s.addBtn} onPress={function () { return setShowAdd(true); }}>
          <react_native_1.Text style={s.addBtnText}>+ Νέο</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {isLoading ? <react_native_1.ActivityIndicator color={O} style={{ marginTop: 40 }}/> :
            pets.length === 0 ? (<react_native_1.View style={s.empty}>
            <react_native_1.Text style={s.emptyEmoji}>🐾</react_native_1.Text>
            <react_native_1.Text style={s.emptyText}>Δεν έχετε κατοικίδια ακόμα</react_native_1.Text>
            <react_native_1.TouchableOpacity style={s.addFirstBtn} onPress={function () { return setShowAdd(true); }}>
              <react_native_1.Text style={s.addFirstBtnText}>Προσθέστε το πρώτο σας!</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {pets.map(function (pet) { return (<react_native_1.TouchableOpacity key={pet.id} style={s.petCard} activeOpacity={0.7} onPress={function () { return router.push("/passport"); }}>
                <react_native_1.View style={s.petAvatar}>
                  {pet.profile_photo
                        ? <react_native_1.Image source={{ uri: pet.profile_photo }} style={s.petAvatarImg}/>
                        : <react_native_1.Text style={s.petEmoji}>{EM[pet.species] || '🐾'}</react_native_1.Text>}
                </react_native_1.View>
                <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                  <react_native_1.Text style={s.petName}>{pet.name}</react_native_1.Text>
                  <react_native_1.Text style={s.petBreed}>{pet.breed || pet.species} · {pet.gender === 'male' ? '♂️' : '♀️'}</react_native_1.Text>
                  {pet.birthday && <react_native_1.Text style={s.petAge}>🎂 {pet.birthday}</react_native_1.Text>}
                  <react_native_1.View style={s.petTags}>
                    {pet.is_sterilized && <react_native_1.View style={s.tag}><react_native_1.Text style={s.tagText}>Στειρωμένο</react_native_1.Text></react_native_1.View>}
                    {pet.microchip && <react_native_1.View style={s.tag}><react_native_1.Text style={s.tagText}>Τσίπ ✓</react_native_1.Text></react_native_1.View>}
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.Text style={s.arrow}>›</react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.ScrollView>)}

      {/* Add Pet Modal */}
      <react_native_1.Modal visible={showAdd} transparent animationType="slide">
        <react_native_1.View style={s.overlay}>
          <react_native_1.View style={s.modal}>
            <react_native_1.View style={s.modalHeader}>
              <react_native_1.Text style={s.modalTitle}>Νέο Κατοικίδιο</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={function () { return setShowAdd(false); }}><react_native_1.Text style={s.closeBtn}>✕</react_native_1.Text></react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
              <react_native_1.Text style={s.label}>Όνομα *</react_native_1.Text>
              <react_native_1.TextInput style={s.input} value={form.name} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { name: v })); }); }} placeholder="π.χ. Ρεξ"/>
              <react_native_1.Text style={s.label}>Είδος</react_native_1.Text>
              <react_native_1.View style={s.speciesGrid}>
                {Object.entries(EM).map(function (_a) {
            var key = _a[0], emoji = _a[1];
            return (<react_native_1.TouchableOpacity key={key} style={[s.speciesChip, form.species === key && s.speciesChipActive]} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { species: key })); }); }}>
                    <react_native_1.Text style={s.speciesEmoji}>{emoji}</react_native_1.Text>
                    <react_native_1.Text style={[s.speciesLabel, form.species === key && s.speciesLabelActive]}>{key}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
        })}
              </react_native_1.View>
              <react_native_1.Text style={s.label}>Ράτσα</react_native_1.Text>
              <react_native_1.TextInput style={s.input} value={form.breed} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { breed: v })); }); }} placeholder="π.χ. Labrador"/>
              <react_native_1.Text style={s.label}>Ημ. Γέννησης (ΕΕΕΕ-ΜΜ-ΗΗ)</react_native_1.Text>
              <react_native_1.TextInput style={s.input} value={form.birthday} onChangeText={function (v) { return setForm(function (f) { return (__assign(__assign({}, f), { birthday: v })); }); }} placeholder="2022-01-15"/>
              <react_native_1.Text style={s.label}>Φύλο</react_native_1.Text>
              <react_native_1.View style={s.genderRow}>
                <react_native_1.TouchableOpacity style={[s.genderBtn, form.gender === 'male' && s.genderBtnActive]} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { gender: 'male' })); }); }}>
                  <react_native_1.Text style={[s.genderText, form.gender === 'male' && s.genderTextActive]}>♂️ Αρσενικό</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[s.genderBtn, form.gender === 'female' && s.genderBtnActive]} onPress={function () { return setForm(function (f) { return (__assign(__assign({}, f), { gender: 'female' })); }); }}>
                  <react_native_1.Text style={[s.genderText, form.gender === 'female' && s.genderTextActive]}>♀️ Θηλυκό</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={[s.saveBtn, !form.name && s.saveBtnDisabled]} disabled={!form.name || addPet.isPending} onPress={function () { return addPet.mutate(); }}>
                <react_native_1.Text style={s.saveBtnText}>{addPet.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827' },
    addBtn: { backgroundColor: O, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyEmoji: { fontSize: 60, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20, textAlign: 'center' },
    addFirstBtn: { backgroundColor: O, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
    addFirstBtnText: { color: '#fff', fontWeight: '700' },
    loginBtn: { backgroundColor: O, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
    loginBtnText: { color: '#fff', fontWeight: '700' },
    petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, gap: 12 },
    petAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    petAvatarImg: { width: 60, height: 60 },
    petEmoji: { fontSize: 28 },
    petName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
    petBreed: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
    petAge: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
    petTags: { flexDirection: 'row', gap: 6 },
    tag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    tagText: { fontSize: 10, color: '#16A34A', fontWeight: '600' },
    arrow: { fontSize: 24, color: '#D1D5DB', flexShrink: 0 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    closeBtn: { fontSize: 20, color: '#9CA3AF', padding: 4 },
    label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', marginBottom: 4 },
    speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    speciesChip: { alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: '#F3F4F6', width: '22%' },
    speciesChipActive: { backgroundColor: O },
    speciesEmoji: { fontSize: 22, marginBottom: 2 },
    speciesLabel: { fontSize: 9, color: '#374151', fontWeight: '600' },
    speciesLabelActive: { color: '#fff' },
    genderRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    genderBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    genderBtnActive: { borderColor: O, backgroundColor: '#FFF7ED' },
    genderText: { fontSize: 13, color: '#374151', fontWeight: '600' },
    genderTextActive: { color: O },
    saveBtn: { backgroundColor: O, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 16, marginBottom: 8 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
