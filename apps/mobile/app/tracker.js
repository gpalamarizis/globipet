"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TrackerScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
function TrackerScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
    }).data, pets = _a === void 0 ? [] : _a;
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>GPS Tracker</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
        <react_native_1.View style={s.mapPlaceholder}>
          <react_native_1.Text style={s.mapEmoji}>🗺️</react_native_1.Text>
          <react_native_1.Text style={s.mapTitle}>Χάρτης GPS</react_native_1.Text>
          <react_native_1.Text style={s.mapSub}>Η ζωντανή τοποθεσία εμφανίζεται εδώ</react_native_1.Text>
        </react_native_1.View>

        <react_native_1.Text style={s.sectionTitle}>Κατοικίδια</react_native_1.Text>
        {pets.length === 0 ? (<react_native_1.Text style={s.noData}>Δεν έχετε καταχωρημένα κατοικίδια</react_native_1.Text>) : (pets.map(function (pet) { return (<react_native_1.View key={pet.id} style={s.petCard}>
              <react_native_1.View style={s.petInfo}>
                <react_native_1.Text style={s.petEmoji}>{pet.species === 'cat' ? '🐱' : '🐶'}</react_native_1.Text>
                <react_native_1.View>
                  <react_native_1.Text style={s.petName}>{pet.name}</react_native_1.Text>
                  <react_native_1.Text style={s.petBreed}>{pet.breed || pet.species}</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
              <react_native_1.View style={s.statusRow}>
                <react_native_1.View style={[s.statusDot, { backgroundColor: pet.last_location ? '#10B981' : '#D1D5DB' }]}/>
                <react_native_1.Text style={s.statusText}>{pet.last_location ? 'Διαθέσιμο' : 'Χωρίς tracker'}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={s.trackBtn} onPress={function () { return react_native_1.Alert.alert('Σύντομα', 'Η σύνδεση GPS tracker θα είναι διαθέσιμη σύντομα. Χρησιμοποιήστε το web app για πλήρη λειτουργία.'); }}>
                <react_native_1.Text style={s.trackBtnText}>📍 Εντοπισμός</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>); }))}

        <react_native_1.View style={s.infoBox}>
          <react_native_1.Text style={s.infoTitle}>📡 Πώς λειτουργεί</react_native_1.Text>
          <react_native_1.Text style={s.infoText}>Συνδέστε ένα GPS tracker (Tractive, Weenect κλπ) στο κολάρο του κατοικιδίου σας και παρακολουθείτε την τοποθεσία του σε πραγματικό χρόνο.</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    mapPlaceholder: { backgroundColor: '#1E293B', borderRadius: 20, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    mapEmoji: { fontSize: 48, marginBottom: 8 },
    mapTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    mapSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
    noData: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 20 },
    petCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
    petInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    petEmoji: { fontSize: 32 },
    petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    petBreed: { fontSize: 13, color: '#6B7280' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, color: '#6B7280' },
    trackBtn: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center' },
    trackBtnText: { color: '#fff', fontWeight: '700' },
    infoBox: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginTop: 8 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 8 },
    infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
});
