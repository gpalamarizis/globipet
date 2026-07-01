"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComingSoonScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var META = {
    telehealth: { emoji: '🩺', title: 'Τηλεϊατρική', color: '#10B981', bg: '#ECFDF5' },
    tracker: { emoji: '📍', title: 'GPS Tracker', color: '#EF4444', bg: '#FEF2F2' },
    insurance: { emoji: '🛡️', title: 'Ασφάλιση', color: '#8B5CF6', bg: '#F5F3FF' },
    passport: { emoji: '📗', title: 'Pet Passport', color: '#6366F1', bg: '#EEF2FF' },
    'ai-emotion': { emoji: '💜', title: 'AI Emotion', color: '#F59E0B', bg: '#FFFBEB' },
    playdates: { emoji: '🐾', title: 'Playdates', color: '#10B981', bg: '#ECFDF5' },
    communities: { emoji: '🏘️', title: 'Κοινότητες', color: '#8B5CF6', bg: '#F5F3FF' },
    bookings: { emoji: '📅', title: 'Κρατήσεις', color: '#E65100', bg: '#FFF7ED' },
    orders: { emoji: '📦', title: 'Παραγγελίες', color: '#E65100', bg: '#FFF7ED' },
};
function ComingSoonScreen(_a) {
    var name = _a.name;
    var router = (0, expo_router_1.useRouter)();
    var meta = META[name] || { emoji: '✨', title: name, color: '#E65100', bg: '#FFF7ED' };
    return (<react_native_1.View style={s.container}>
      <react_native_1.TouchableOpacity style={s.back} onPress={function () { return router.back(); }}>
        <react_native_1.Text style={s.backText}>← Πίσω</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.View style={[s.badge, { backgroundColor: meta.bg }]}>
        <react_native_1.Text style={s.emoji}>{meta.emoji}</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.Text style={[s.title, { color: meta.color }]}>{meta.title}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Διαθέσιμο ήδη στο globipet.com</react_native_1.Text>
      <react_native_1.Text style={s.sub2}>Η εφαρμογή κινητού έρχεται πολύ σύντομα</react_native_1.Text>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
    back: { position: 'absolute', top: 60, left: 20 },
    backText: { color: '#E65100', fontSize: 15, fontWeight: '600' },
    badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    emoji: { fontSize: 34 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    sub: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
    sub2: { fontSize: 13, color: '#9CA3AF', marginTop: 3, textAlign: 'center' },
});
