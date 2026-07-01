"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommunitiesScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var api_1 = require("../src/lib/api");
var auth_1 = require("../src/store/auth");
var ORANGE = '#E65100';
function CommunitiesScreen() {
    var router = (0, expo_router_1.useRouter)();
    var qc = (0, react_query_1.useQueryClient)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['communities'],
        queryFn: function () { return api_1.api.get('/communities').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _b = _a.data, data = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var join = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.post("/communities/".concat(id, "/join")); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['communities'] }); react_native_1.Alert.alert('✅', 'Εγγραφήκατε!'); },
    });
    var typeEmoji = { dogs: '🐶', cats: '🐱', birds: '🐦', rabbits: '🐰', general: '🐾' };
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>Κοινότητες</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      {isLoading ? <react_native_1.ActivityIndicator color={ORANGE} style={{ marginTop: 40 }}/> :
            data.length === 0 ? (<react_native_1.View style={s.empty}><react_native_1.Text style={s.emptyEmoji}>🏘️</react_native_1.Text><react_native_1.Text style={s.emptyText}>Δεν υπάρχουν κοινότητες</react_native_1.Text></react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map(function (c) { return (<react_native_1.View key={c.id} style={s.card}>
                <react_native_1.View style={s.cardHeader}>
                  <react_native_1.Text style={s.emoji}>{typeEmoji[c.type] || '🐾'}</react_native_1.Text>
                  <react_native_1.View style={{ flex: 1 }}>
                    <react_native_1.Text style={s.cardTitle}>{c.name}</react_native_1.Text>
                    <react_native_1.Text style={s.members}>{c.members_count || 0} μέλη</react_native_1.Text>
                  </react_native_1.View>
                  {c.is_private && <react_native_1.Text style={s.privateBadge}>🔒</react_native_1.Text>}
                </react_native_1.View>
                {c.description && <react_native_1.Text style={s.desc} numberOfLines={2}>{c.description}</react_native_1.Text>}
                {isAuthenticated && !c.is_member && (<react_native_1.TouchableOpacity style={s.joinBtn} onPress={function () { return join.mutate(c.id); }}>
                    <react_native_1.Text style={s.joinText}>Εγγραφή</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}
                {c.is_member && <react_native_1.Text style={s.memberText}>✅ Μέλος</react_native_1.Text>}
              </react_native_1.View>); })}
          </react_native_1.ScrollView>)}
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    emoji: { fontSize: 32 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    members: { fontSize: 12, color: '#9CA3AF' },
    privateBadge: { fontSize: 18 },
    desc: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
    joinBtn: { backgroundColor: ORANGE, borderRadius: 12, padding: 12, alignItems: 'center' },
    joinText: { color: '#fff', fontWeight: '700' },
    memberText: { color: '#10B981', fontWeight: '600', textAlign: 'center' },
});
