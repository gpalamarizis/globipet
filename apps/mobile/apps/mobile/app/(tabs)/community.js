"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommunityScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_native_1 = require("lucide-react-native");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
function CommunityScreen() {
    var router = (0, expo_router_1.useRouter)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var playdates = (0, react_query_1.useQuery)({
        queryKey: ['playdates-mobile'],
        queryFn: function () { return api_1.api.get('/playdates').then(function (r) { var _a, _b, _c; return (_c = (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.slice(0, 3)) !== null && _c !== void 0 ? _c : []; }); },
        enabled: isAuthenticated,
    }).data;
    var communities = (0, react_query_1.useQuery)({
        queryKey: ['communities-mobile'],
        queryFn: function () { return api_1.api.get('/communities').then(function (r) { var _a, _b, _c; return (_c = (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.communities) === null || _b === void 0 ? void 0 : _b.slice(0, 3)) !== null && _c !== void 0 ? _c : []; }); },
        enabled: isAuthenticated,
    }).data;
    var posts = (0, react_query_1.useQuery)({
        queryKey: ['social-mobile'],
        queryFn: function () { return api_1.api.get('/posts?limit=3').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data;
    if (!isAuthenticated)
        return (<react_native_1.View style={s.center}>
      <react_native_1.Text style={s.bigEmoji}>🐾</react_native_1.Text>
      <react_native_1.Text style={s.emptyTitle}>Συνδεθείτε για πρόσβαση</react_native_1.Text>
      <react_native_1.TouchableOpacity style={s.primaryBtn} onPress={function () { return router.push('/auth/login'); }}>
        <react_native_1.Text style={s.primaryBtnText}>Σύνδεση</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
    var eventTypeEmoji = { walk: '🚶', play: '🎾', meetup: '🐾', training: '🎓', other: '✨' };
    return (<react_native_1.ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <react_native_1.View style={s.header}>
        <react_native_1.Text style={s.title}>Κοινότητα</react_native_1.Text>
        <react_native_1.Text style={s.subtitle}>Playdates, Κοινότητες & Social</react_native_1.Text>
      </react_native_1.View>

      {/* Quick actions */}
      <react_native_1.View style={s.quickRow}>
        <react_native_1.TouchableOpacity style={s.quickBtn} onPress={function () { return router.push('/playdates'); }}>
          <lucide_react_native_1.PawPrint size={20} color="#10B981"/>
          <react_native_1.Text style={[s.quickLabel, { color: '#10B981' }]}>Playdates</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={s.quickBtn} onPress={function () { return router.push('/communities'); }}>
          <lucide_react_native_1.Building2 size={20} color="#8B5CF6"/>
          <react_native_1.Text style={[s.quickLabel, { color: '#8B5CF6' }]}>Κοινότητες</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={s.quickBtn} onPress={function () { return router.push('/social'); }}>
          <lucide_react_native_1.Heart size={20} color="#EF4444"/>
          <react_native_1.Text style={[s.quickLabel, { color: '#EF4444' }]}>Social</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Playdates */}
      <react_native_1.View style={s.section}>
        <react_native_1.View style={s.sectionRow}>
          <react_native_1.Text style={s.sectionTitle}>📅 Playdates</react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/playdates'); }}>
            <react_native_1.Text style={s.seeAll}>Όλα →</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        {(playdates === null || playdates === void 0 ? void 0 : playdates.length) === 0 && (<react_native_1.TouchableOpacity style={s.emptyCard} onPress={function () { return router.push('/playdates'); }}>
            <react_native_1.Text style={s.emptyCardText}>+ Δημιούργησε το πρώτο playdate!</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
        {playdates === null || playdates === void 0 ? void 0 : playdates.map(function (ev) {
            var _a;
            return (<react_native_1.TouchableOpacity key={ev.id} style={s.card} onPress={function () { return router.push('/playdates'); }}>
            <react_native_1.Text style={s.cardEmoji}>{eventTypeEmoji[ev.event_type] || '🐾'}</react_native_1.Text>
            <react_native_1.View style={s.cardInfo}>
              <react_native_1.Text style={s.cardTitle}>{ev.title}</react_native_1.Text>
              <react_native_1.Text style={s.cardSub}>{ev.date} · {ev.location}</react_native_1.Text>
              <react_native_1.Text style={s.cardSub}>{((_a = ev.invitations) === null || _a === void 0 ? void 0 : _a.length) || 0} συμμετέχοντες</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.View>

      {/* Communities */}
      <react_native_1.View style={s.section}>
        <react_native_1.View style={s.sectionRow}>
          <react_native_1.Text style={s.sectionTitle}>🏘️ Κοινότητες</react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/communities'); }}>
            <react_native_1.Text style={s.seeAll}>Όλες →</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        {(communities === null || communities === void 0 ? void 0 : communities.length) === 0 && (<react_native_1.TouchableOpacity style={s.emptyCard} onPress={function () { return router.push('/communities'); }}>
            <react_native_1.Text style={s.emptyCardText}>+ Δημιούργησε κοινότητα στη γειτονιά σου!</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
        {communities === null || communities === void 0 ? void 0 : communities.map(function (c) { return (<react_native_1.TouchableOpacity key={c.id} style={s.card} onPress={function () { return router.push('/communities'); }}>
            <react_native_1.Text style={s.cardEmoji}>🏘️</react_native_1.Text>
            <react_native_1.View style={s.cardInfo}>
              <react_native_1.Text style={s.cardTitle}>{c.name}</react_native_1.Text>
              <react_native_1.Text style={s.cardSub}>{c.city} · {c.member_count} μέλη</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      {/* Social posts */}
      <react_native_1.View style={s.section}>
        <react_native_1.View style={s.sectionRow}>
          <react_native_1.Text style={s.sectionTitle}>❤️ Social Feed</react_native_1.Text>
          <react_native_1.TouchableOpacity onPress={function () { return router.push('/social'); }}>
            <react_native_1.Text style={s.seeAll}>Όλα →</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
        {posts === null || posts === void 0 ? void 0 : posts.map(function (post) {
            var _a;
            return (<react_native_1.TouchableOpacity key={post.id} style={s.postCard} onPress={function () { return router.push('/social'); }}>
            <react_native_1.View style={s.postAvatar}>
              <react_native_1.Text style={s.postAvatarText}>{((_a = post.author_name) === null || _a === void 0 ? void 0 : _a[0]) || '?'}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={s.postInfo}>
              <react_native_1.Text style={s.postAuthor}>{post.author_name}</react_native_1.Text>
              <react_native_1.Text style={s.postContent} numberOfLines={2}>{post.content}</react_native_1.Text>
              <react_native_1.Text style={s.postMeta}>❤️ {post.likes_count} · 💬 {post.comments_count}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.View>

      <react_native_1.View style={{ height: 40 }}/>
    </react_native_1.ScrollView>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: '800', color: '#111827' },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    quickRow: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', marginBottom: 8 },
    quickBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
    quickLabel: { fontSize: 11, fontWeight: '700' },
    section: { marginBottom: 8 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16 },
    seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cardEmoji: { fontSize: 28, marginRight: 12 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    cardSub: { fontSize: 12, color: '#6B7280' },
    emptyCard: { margin: 16, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' },
    emptyCardText: { color: '#9CA3AF', fontSize: 13 },
    postCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    postAvatarText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
    postInfo: { flex: 1 },
    postAuthor: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
    postContent: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    postMeta: { fontSize: 11, color: '#9CA3AF' },
    bigEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 20 },
    primaryBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
