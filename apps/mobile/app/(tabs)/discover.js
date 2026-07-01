"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscoverScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../../src/lib/api");
var O = '#E65100';
var SECTIONS = [
    { emoji: '💻', title: 'Τηλεϊατρική', sub: 'Κλείσε online ραντεβού', route: '/telehealth' },
    { emoji: '📋', title: 'Ιατρικός Φάκελος', sub: 'Πλήρες ιστορικό υγείας', route: '/passport' },
    { emoji: '🧠', title: 'AI Υγεία', sub: 'Ανάλυση φωτογραφίας', route: '/ai-health' },
    { emoji: '💜', title: 'AI Emotion', sub: 'Τι νιώθει το ζώο σου', route: '/ai-emotion' },
    { emoji: '⚖️', title: 'Νομική Υποστήριξη', sub: 'Ελληνική νομοθεσία', route: '/legal' },
    { emoji: '🛡️', title: 'Ασφάλιση', sub: 'Προστασία κατοικιδίου', route: '/insurance' },
    { emoji: '🗺️', title: 'GPS Tracker', sub: 'Βρες το κατοικίδιό σου', route: '/tracker' },
    { emoji: '🐾', title: 'Playdates', sub: 'Βγες με άλλα κατοικίδια', route: '/playdates' },
    { emoji: '🏘️', title: 'Κοινότητες', sub: 'Ομάδες ιδιοκτητών', route: '/communities' },
];
function DiscoverScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['events'],
        queryFn: function () { return api_1.api.get('/events?upcoming=true&limit=3').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
    }).data, events = _a === void 0 ? [] : _a;
    return (<react_native_1.ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Εξερεύνηση</react_native_1.Text>
        <react_native_1.Text style={s.sub}>Ανακάλυψε όλες τις λειτουργίες</react_native_1.Text>
      </react_native_1.View>

      {/* Feature grid */}
      <react_native_1.View style={s.section}>
        <react_native_1.Text style={s.sectionTitle}>Λειτουργίες</react_native_1.Text>
        <react_native_1.View style={s.grid}>
          {SECTIONS.map(function (item) { return (<react_native_1.TouchableOpacity key={item.route} style={s.card} onPress={function () { return router.push(item.route); }} activeOpacity={0.7}>
              <react_native_1.Text style={s.cardEmoji}>{item.emoji}</react_native_1.Text>
              <react_native_1.Text style={s.cardTitle}>{item.title}</react_native_1.Text>
              <react_native_1.Text style={s.cardSub} numberOfLines={1}>{item.sub}</react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      {/* Events */}
      {events.length > 0 && (<react_native_1.View style={s.section}>
          <react_native_1.Text style={s.sectionTitle}>Επερχόμενα Events</react_native_1.Text>
          {events.map(function (e) { return (<react_native_1.View key={e.id} style={s.eventCard}>
              <react_native_1.View style={s.eventLeft}>
                <react_native_1.Text style={s.eventEmoji}>📅</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                <react_native_1.Text style={s.eventTitle} numberOfLines={1}>{e.title}</react_native_1.Text>
                <react_native_1.Text style={s.eventDate}>{e.date} {e.time ? "\u00B7 ".concat(e.time) : ''}</react_native_1.Text>
                {e.location && <react_native_1.Text style={s.eventLoc} numberOfLines={1}>📍 {e.location}</react_native_1.Text>}
              </react_native_1.View>
            </react_native_1.View>); })}
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827' },
    sub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    section: { paddingHorizontal: 16, marginTop: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: { width: '31%', backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
    cardEmoji: { fontSize: 28, marginBottom: 6 },
    cardTitle: { fontSize: 11, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 2 },
    cardSub: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
    eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
    eventLeft: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    eventEmoji: { fontSize: 20 },
    eventTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    eventDate: { fontSize: 12, color: O, fontWeight: '600', marginBottom: 2 },
    eventLoc: { fontSize: 12, color: '#6B7280' },
});
