"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SocialScreen;
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../../src/lib/api");
var auth_1 = require("../../src/store/auth");
function SocialScreen() {
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['posts'],
        queryFn: function () { return api_1.api.get('/posts?limit=20').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _b = _a.data, posts = _b === void 0 ? [] : _b, isLoading = _a.isLoading, refetch = _a.refetch;
    var likePost = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.post("/posts/".concat(id, "/like")); },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['posts'] }); },
    });
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Social Feed</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.FlatList data={posts} keyExtractor={function (i) { return i.id; }} refreshControl={<react_native_1.RefreshControl refreshing={isLoading} onRefresh={refetch}/>} contentContainerStyle={{ padding: 16 }} renderItem={function (_a) {
            var _b, _c;
            var item = _a.item;
            return (<react_native_1.View style={styles.post}>
            <react_native_1.View style={styles.postHeader}>
              <react_native_1.View style={styles.avatar}>
                <react_native_1.Text style={styles.avatarText}>{((_b = item.author_name) === null || _b === void 0 ? void 0 : _b[0]) || 'U'}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View>
                <react_native_1.Text style={styles.authorName}>{item.author_name}</react_native_1.Text>
                <react_native_1.Text style={styles.postTime}>{new Date(item.created_at).toLocaleDateString('el-GR')}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.Text style={styles.content}>{item.content}</react_native_1.Text>
            {((_c = item.tags) === null || _c === void 0 ? void 0 : _c.length) > 0 && (<react_native_1.View style={styles.tags}>
                {item.tags.map(function (t) { return <react_native_1.Text key={t} style={styles.tag}>#{t}</react_native_1.Text>; })}
              </react_native_1.View>)}
            <react_native_1.View style={styles.actions}>
              <react_native_1.TouchableOpacity style={styles.action} onPress={function () { return isAuthenticated && likePost.mutate(item.id); }}>
                <react_native_1.Text>{item.is_liked ? '❤️' : '🤍'} {item.likes_count || 0}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={styles.action}>
                <react_native_1.Text>💬 {item.comments_count || 0}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.Text style={styles.empty}>Δεν υπάρχουν δημοσιεύσεις ακόμα</react_native_1.Text>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 24, fontWeight: '800', color: '#111827' },
    post: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    avatarText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
    authorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    postTime: { fontSize: 12, color: '#9CA3AF' },
    content: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 10 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { fontSize: 13, color: '#E65100' },
    actions: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
