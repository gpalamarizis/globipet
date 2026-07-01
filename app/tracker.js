"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Screen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var titles = {
    'telehealth': '🩺 Τηλεϊατρική',
    'tracker': '📍 GPS Tracker',
    'insurance': '🛡️ Ασφάλιση',
    'passport': '📗 Pet Passport',
    'ai-health': '🧠 AI Υγεία',
    'ai-emotion': '💜 AI Emotion',
    'playdates': '🐾 Playdates',
    'communities': '🏘️ Κοινότητες',
    'bookings': '📅 Κρατήσεις',
    'orders': '📦 Παραγγελίες',
};
function Screen() {
    var router = (0, expo_router_1.useRouter)();
    var name = 'tracker';
    return (<react_native_1.View style={s.container}>
      <react_native_1.TouchableOpacity style={s.back} onPress={function () { return router.back(); }}>
        <react_native_1.Text style={s.backText}>← Πίσω</react_native_1.Text>
      </react_native_1.TouchableOpacity>
      <react_native_1.Text style={s.title}>{titles[name] || name}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Σύντομα διαθέσιμο στο mobile</react_native_1.Text>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
    back: { position: 'absolute', top: 60, left: 20 },
    backText: { color: '#E65100', fontSize: 15, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
    sub: { fontSize: 14, color: '#6B7280' },
});
