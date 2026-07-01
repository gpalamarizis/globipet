"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PassportScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
var TABS = [
    { id: 'identity', label: '📋 Ταυτότητα' },
    { id: 'vaccines', label: '💉 Εμβόλια' },
    { id: 'health', label: '🩺 Εξετάσεις' },
    { id: 'meds', label: '💊 Φάρμακα' },
    { id: 'lab', label: '🧪 Εργαστήριο' },
    { id: 'imaging', label: '🔬 Απεικόνιση' },
    { id: 'surgery', label: '🔪 Χειρουργεία' },
    { id: 'allergies', label: '⚠️ Αλλεργίες' },
    { id: 'chronic', label: '❤️ Χρόνιες' },
    { id: 'dental', label: '🦷 Οδοντιατρικά' },
    { id: 'weight', label: '⚖️ Βάρος' },
    { id: 'travel', label: '✈️ Διαβατήριο' },
];
var speciesEmoji = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' };
function InfoRow(_a) {
    var label = _a.label, value = _a.value;
    if (!value)
        return null;
    return (<react_native_1.View style={r.row}>
      <react_native_1.Text style={r.label}>{label}</react_native_1.Text>
      <react_native_1.Text style={r.value}>{String(value)}</react_native_1.Text>
    </react_native_1.View>);
}
function RecordCard(_a) {
    var title = _a.title, subtitle = _a.subtitle, date = _a.date, badge = _a.badge, badgeColor = _a.badgeColor;
    return (<react_native_1.View style={r.card}>
      <react_native_1.View style={r.cardHeader}>
        <react_native_1.Text style={r.cardTitle} numberOfLines={2}>{title}</react_native_1.Text>
        {badge && <react_native_1.View style={[r.badge, { backgroundColor: (badgeColor || '#6B7280') + '20' }]}>
          <react_native_1.Text style={[r.badgeText, { color: badgeColor || '#6B7280' }]}>{badge}</react_native_1.Text>
        </react_native_1.View>}
      </react_native_1.View>
      {subtitle && <react_native_1.Text style={r.cardSub}>{subtitle}</react_native_1.Text>}
      {date && <react_native_1.Text style={r.cardDate}>📅 {date}</react_native_1.Text>}
    </react_native_1.View>);
}
function PassportScreen() {
    var _a, _b;
    var router = (0, expo_router_1.useRouter)();
    var _c = (0, react_1.useState)(null), selectedPetId = _c[0], setSelectedPetId = _c[1];
    var _d = (0, react_1.useState)('identity'), activeTab = _d[0], setActiveTab = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, pets = _e === void 0 ? [] : _e;
    var activePetId = selectedPetId || (pets.length === 1 ? (_a = pets[0]) === null || _a === void 0 ? void 0 : _a.id : null);
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['passport', activePetId],
        queryFn: function () { return api_1.api.get("/passport/".concat(activePetId)).then(function (r) { return r.data; }); },
        enabled: !!activePetId,
    }), passport = _f.data, isLoading = _f.isLoading;
    var p = passport || {};
    var pet = passport === null || passport === void 0 ? void 0 : passport.pet;
    return (<react_native_1.View style={r.container}>
      <react_native_1.View style={r.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={r.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={r.title}>Ιατρικός Φάκελος</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      {/* Pet selector */}
      {pets.length > 1 && (<react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          {pets.map(function (pet) { return (<react_native_1.TouchableOpacity key={pet.id} style={[r.petChip, activePetId === pet.id && r.petChipActive]} onPress={function () { return setSelectedPetId(pet.id); }}>
              <react_native_1.Text style={r.petChipText}>{speciesEmoji[pet.species] || '🐾'} {pet.name}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.ScrollView>)}

      {!activePetId ? (<react_native_1.View style={r.empty}>
          <react_native_1.Text style={r.emptyEmoji}>🐾</react_native_1.Text>
          <react_native_1.Text style={r.emptyText}>Επίλεξε κατοικίδιο</react_native_1.Text>
        </react_native_1.View>) : isLoading ? (<react_native_1.ActivityIndicator color={ORANGE} style={{ marginTop: 40 }}/>) : (<>
          {/* Alert banners */}
          {((_b = p.allergies) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<react_native_1.View style={r.alertBanner}>
              <react_native_1.Text style={r.alertText}>⚠️ Αλλεργίες: {p.allergies.map(function (a) { return a.allergen; }).join(', ')}</react_native_1.Text>
            </react_native_1.View>)}

          {/* Tab bar */}
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            {TABS.map(function (tab) { return (<react_native_1.TouchableOpacity key={tab.id} style={[r.tab, activeTab === tab.id && r.tabActive]} onPress={function () { return setActiveTab(tab.id); }}>
                <react_native_1.Text style={[r.tabText, activeTab === tab.id && r.tabTextActive]}>{tab.label}</react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.ScrollView>

          {/* Content */}
          <react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
            {activeTab === 'identity' && pet && (<react_native_1.View style={r.section}>
                <react_native_1.Text style={r.sectionTitle}>{speciesEmoji[pet.species] || '🐾'} {pet.name}</react_native_1.Text>
                <InfoRow label="Είδος" value={pet.species}/>
                <InfoRow label="Ράτσα" value={pet.breed}/>
                <InfoRow label="Φύλο" value={pet.gender}/>
                <InfoRow label="Γέννηση" value={pet.birthday}/>
                <InfoRow label="Χρώμα" value={pet.color}/>
                <InfoRow label="Αποστειρωμένο" value={pet.is_sterilized ? 'Ναι' : 'Όχι'}/>
                <InfoRow label="Μικροτσίπ" value={pet.microchip}/>
              </react_native_1.View>)}

            {activeTab === 'vaccines' && ((p.vaccinations || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν εμβόλια</react_native_1.Text> :
                (p.vaccinations || []).map(function (v) { return (<RecordCard key={v.id} title={v.vaccine_name} subtitle={"".concat(v.vaccine_type, " \u00B7 ").concat(v.vet_name || '')} date={v.date_administered} badge={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'Εκπρόθεσμο' : v.next_due_date ? "\u0395\u03C0\u03CC\u03BC: ".concat(v.next_due_date) : undefined} badgeColor={v.next_due_date && new Date(v.next_due_date) < new Date() ? '#EF4444' : '#10B981'}/>); }))}

            {activeTab === 'health' && ((p.healthRecords || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν εξετάσεις</react_native_1.Text> :
                (p.healthRecords || []).map(function (h) { return (<RecordCard key={h.id} title={h.title} subtitle={"".concat(h.vet_name || '', " \u00B7 ").concat(h.clinic_name || '')} date={h.date}/>); }))}

            {activeTab === 'meds' && ((p.medications || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν φάρμακα</react_native_1.Text> :
                (p.medications || []).map(function (m) { return (<RecordCard key={m.id} title={"".concat(m.name, " ").concat(m.dosage)} subtitle={"".concat(m.frequency, " \u00B7 ").concat(m.prescribed_by || '')} date={"".concat(m.start_date).concat(m.end_date ? ' → ' + m.end_date : '')} badge={m.is_active ? 'Ενεργό' : 'Ολοκλήρωσε'} badgeColor={m.is_active ? '#10B981' : '#6B7280'}/>); }))}

            {activeTab === 'lab' && ((p.labResults || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν εργαστηριακές</react_native_1.Text> :
                (p.labResults || []).map(function (l) { return (<RecordCard key={l.id} title={l.title} subtitle={"".concat(l.result_type, " \u00B7 ").concat(l.lab_name || '')} date={l.date} badge={l.is_abnormal ? 'Παθολογικά' : 'Φυσιολογικά'} badgeColor={l.is_abnormal ? '#EF4444' : '#10B981'}/>); }))}

            {activeTab === 'imaging' && ((p.imaging || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν απεικονιστικές</react_native_1.Text> :
                (p.imaging || []).map(function (img) { return (<RecordCard key={img.id} title={img.imaging_type.toUpperCase()} subtitle={"".concat(img.body_region || '', " \u00B7 ").concat(img.vet_name || '')} date={img.date}/>); }))}

            {activeTab === 'surgery' && ((p.surgeries || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν χειρουργεία</react_native_1.Text> :
                (p.surgeries || []).map(function (s) { return (<RecordCard key={s.id} title={s.procedure} subtitle={"".concat(s.surgeon_name || '', " \u00B7 ").concat(s.clinic_name || '')} date={s.date}/>); }))}

            {activeTab === 'allergies' && ((p.allergies || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν αλλεργίες</react_native_1.Text> :
                (p.allergies || []).map(function (a) { return (<RecordCard key={a.id} title={a.allergen} subtitle={"".concat(a.allergen_type, " \u00B7 ").concat(a.reaction || '')} badge={a.severity} badgeColor={a.severity === 'severe' || a.severity === 'anaphylactic' ? '#EF4444' : a.severity === 'moderate' ? '#F59E0B' : '#10B981'}/>); }))}

            {activeTab === 'chronic' && ((p.chronicConditions || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν χρόνιες παθήσεις</react_native_1.Text> :
                (p.chronicConditions || []).map(function (c) { return (<RecordCard key={c.id} title={c.condition} subtitle={c.diagnosed_by} date={c.diagnosed_date} badge={c.status === 'active' ? 'Ενεργή' : c.status === 'managed' ? 'Ελεγχόμενη' : 'Ύφεση'} badgeColor={c.status === 'active' ? '#EF4444' : c.status === 'managed' ? '#F59E0B' : '#10B981'}/>); }))}

            {activeTab === 'dental' && ((p.dentalRecords || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν οδοντιατρικά</react_native_1.Text> :
                (p.dentalRecords || []).map(function (d) { return (<RecordCard key={d.id} title={d.procedure} subtitle={"".concat(d.vet_name || '', " \u00B7 ").concat(d.clinic_name || '')} date={d.date}/>); }))}

            {activeTab === 'weight' && ((p.weightRecords || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν μετρήσεις</react_native_1.Text> :
                (p.weightRecords || []).slice().reverse().map(function (w) { return (<RecordCard key={w.id} title={"".concat(w.weight_kg, " kg")} subtitle={"BCS: ".concat(w.bcs || '-', "/9 \u00B7 ").concat(w.vet_name || '')} date={w.date}/>); }))}

            {activeTab === 'travel' && (<>
                <react_native_1.View style={r.travelInfo}>
                  <react_native_1.Text style={r.travelTitle}>🇬🇷 Εσωτερικό Ταξίδι</react_native_1.Text>
                  {['Μικροτσίπ', 'Εμβόλιο Λύσσας', 'Βιβλιάριο υγείας', 'Κτηνιατρικό πιστοποιητικό'].map(function (i) { return (<react_native_1.Text key={i} style={r.travelItem}>✅ {i}</react_native_1.Text>); })}
                </react_native_1.View>
                <react_native_1.View style={[r.travelInfo, { borderLeftColor: ORANGE }]}>
                  <react_native_1.Text style={r.travelTitle}>🌍 Διεθνές Ταξίδι (ΕΕ)</react_native_1.Text>
                  {['EU Pet Passport', 'Μικροτσίπ πριν εμβολιασμό', 'Εμβόλιο Λύσσας (21+ ημέρες)', 'Τίτλοι αντισωμάτων'].map(function (i) { return (<react_native_1.Text key={i} style={r.travelItem}>✅ {i}</react_native_1.Text>); })}
                </react_native_1.View>
                {(p.travelDocs || []).length === 0 ? <react_native_1.Text style={r.noData}>Δεν υπάρχουν ταξίδια</react_native_1.Text> :
                    (p.travelDocs || []).map(function (t) { return (<RecordCard key={t.id} title={"".concat(t.origin_city || '', " \u2192 ").concat(t.destination_city)} subtitle={"".concat(t.travel_type, " \u00B7 ").concat(t.carrier || '')} date={t.departure_date}/>); })}
              </>)}

            <react_native_1.View style={{ height: 20 }}/>
          </react_native_1.ScrollView>
        </>)}
    </react_native_1.View>);
}
var r = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    petChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    petChipActive: { backgroundColor: ORANGE },
    petChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    alertBanner: { margin: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    alertText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
    tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    tabActive: { backgroundColor: ORANGE },
    tabText: { fontSize: 13, color: '#374151', fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    label: { fontSize: 13, color: '#6B7280' },
    value: { fontSize: 13, fontWeight: '600', color: '#111827' },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    noData: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    travelInfo: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    travelTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
    travelItem: { fontSize: 13, color: '#374151', marginBottom: 4 },
});
