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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Social;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
function Social() {
    var _this = this;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, auth_1.useAuthStore)(), user = _a.user, isAuthenticated = _a.isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), newPost = _b[0], setNewPost = _b[1];
    var _c = (0, react_1.useState)(false), showCompose = _c[0], setShowCompose = _c[1];
    var _d = (0, react_1.useState)(null), imagePreview = _d[0], setImagePreview = _d[1];
    var _e = (0, react_1.useState)(null), selectedImage = _e[0], setSelectedImage = _e[1];
    var _f = (0, react_1.useState)([]), tags = _f[0], setTags = _f[1];
    var _g = (0, react_1.useState)(''), tagInput = _g[0], setTagInput = _g[1];
    var _h = (0, react_1.useState)('all'), activeFilter = _h[0], setActiveFilter = _h[1];
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['posts', activeFilter],
        queryFn: function () { return api_1.api.get("/posts?filter=".concat(activeFilter, "&limit=20")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _k = _j.data, posts = _k === void 0 ? [] : _k, isLoading = _j.isLoading;
    var createPost = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var image_url, fd, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        image_url = null;
                        if (!selectedImage) return [3 /*break*/, 2];
                        fd = new FormData();
                        fd.append('file', selectedImage);
                        fd.append('folder', 'posts');
                        return [4 /*yield*/, api_1.api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })];
                    case 1:
                        data = (_a.sent()).data;
                        image_url = data.url;
                        _a.label = 2;
                    case 2: return [2 /*return*/, api_1.api.post('/posts', { content: newPost, image_url: image_url, tags: tags })];
                }
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            setNewPost('');
            setSelectedImage(null);
            setImagePreview(null);
            setTags([]);
            setShowCompose(false);
            react_hot_toast_1.default.success(t('socialExtra.published'));
        },
    });
    var likePost = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.post("/posts/".concat(id, "/like")); },
        onMutate: function (id) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['posts', activeFilter] })];
                    case 1:
                        _a.sent();
                        queryClient.setQueryData(['posts', activeFilter], function (old) {
                            return old === null || old === void 0 ? void 0 : old.map(function (p) { return p.id === id ? __assign(__assign({}, p), { likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1, is_liked: !p.is_liked }) : p; });
                        });
                        return [2 /*return*/];
                }
            });
        }); },
        onSettled: function () { return queryClient.invalidateQueries({ queryKey: ['posts'] }); },
    });
    var filters = [
        { value: 'all', label: t('social.filters.all') },
        { value: 'following', label: t('social.filters.following') },
        { value: 'trending', label: t('social.filters.trending') },
    ];
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">{t('social.title')}</h1>
        {isAuthenticated && (<button onClick={function () { return setShowCompose(!showCompose); }} className="btn-primary flex items-center gap-2">
            <lucide_react_1.Plus size={18}/> {t('social.newPost')}
          </button>)}
      </div>

      <framer_motion_1.AnimatePresence>
        {showCompose && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-brand-900 font-semibold text-sm overflow-hidden">
                {(user === null || user === void 0 ? void 0 : user.profile_photo) ? <img src={user.profile_photo} className="w-full h-full object-cover" alt=""/> : (0, utils_1.getInitials)((user === null || user === void 0 ? void 0 : user.full_name) || 'U')}
              </div>
              <div className="flex-1">
                <textarea className="w-full bg-transparent resize-none text-sm placeholder:text-gray-400 outline-none min-h-[80px]" placeholder={t('social.postPlaceholder')} value={newPost} onChange={function (e) { return setNewPost(e.target.value); }} autoFocus/>
                {imagePreview && (<div className="relative mt-2 inline-block">
                    <img src={imagePreview} alt="" className="h-32 rounded-xl object-cover"/>
                    <button onClick={function () { setSelectedImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center"><lucide_react_1.X size={12}/></button>
                  </div>)}
                {tags.length > 0 && (<div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(function (tag) { return <span key={tag} className="badge-blue flex items-center gap-1">#{tag}<button onClick={function () { return setTags(function (t) { return t.filter(function (x) { return x !== tag; }); }); }}><lucide_react_1.X size={10}/></button></span>; })}
                  </div>)}
                <input type="text" placeholder={t('socialExtra.hashtagHint')} value={tagInput} onChange={function (e) { return setTagInput(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter' && tagInput.trim()) {
            setTags(function (p) { return __spreadArray(__spreadArray([], p, true), [tagInput.trim().replace('#', '')], false); });
            setTagInput('');
        } }} className="mt-2 text-xs bg-transparent outline-none text-gray-500 placeholder:text-gray-300 w-full"/>
              </div>
            </div>
            <div className="divider my-3"/>
            <div className="flex items-center justify-between">
              <label className="btn-ghost p-2 cursor-pointer"><lucide_react_1.Image size={18} className="text-gray-500"/><input type="file" accept="image/*" className="hidden" onChange={function (e) { var _a; var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]; if (f) {
            setSelectedImage(f);
            setImagePreview(URL.createObjectURL(f));
        } }}/></label>
              <div className="flex gap-2">
                <button onClick={function () { return setShowCompose(false); }} className="btn-ghost text-sm">{t('social.cancel')}</button>
                <button onClick={function () { return createPost.mutate(); }} disabled={!newPost.trim() || createPost.isPending} className="btn-primary text-sm py-2 flex items-center gap-2">
                  <lucide_react_1.Send size={14}/>{createPost.isPending ? t('social.publishing') : t('social.publish')}
                </button>
              </div>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <div className="flex gap-2 mb-6">
        {filters.map(function (f) { return (<button key={f.value} onClick={function () { return setActiveFilter(f.value); }} className={(0, utils_1.cn)('px-4 py-1.5 rounded-full text-sm font-medium transition-all', activeFilter === f.value ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 border border-gray-200 dark:border-gray-700')}>
            {f.label}
          </button>); })}
      </div>

      {isLoading ? (<div className="space-y-4">{[1, 2, 3].map(function (i) { return <div key={i} className="card p-4 space-y-3"><div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-full"/><div className="flex-1 space-y-2"><div className="skeleton h-4 w-32"/><div className="skeleton h-3 w-20"/></div></div><div className="skeleton h-16 w-full"/></div>; })}</div>) : (<div className="space-y-4">
          {posts.map(function (post, i) {
                var _a;
                return (<framer_motion_1.motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm">
                    {post.author_photo ? <img src={post.author_photo} alt="" className="w-full h-full object-cover"/> : (0, utils_1.getInitials)(post.author_name || 'U')}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{post.author_name}</p>
                    <p className="text-xs text-gray-400">{(0, utils_1.formatRelativeTime)(post.created_at)}{post.pet_name && <span className="text-brand-600"> · 🐾 {post.pet_name}</span>}</p>
                  </div>
                </div>
                <button className="btn-ghost p-1.5"><lucide_react_1.MoreHorizontal size={16} className="text-gray-400"/></button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="" className="w-full rounded-xl object-cover max-h-80 mb-3"/>}
              {((_a = post.tags) === null || _a === void 0 ? void 0 : _a.length) > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{post.tags.map(function (tag) { return <span key={tag} className="text-xs text-brand-700 dark:text-brand-400 hover:underline cursor-pointer">#{tag}</span>; })}</div>}
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button onClick={function () { return isAuthenticated && likePost.mutate(post.id); }} className={(0, utils_1.cn)('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors', post.is_liked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <lucide_react_1.Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'}/><span>{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><lucide_react_1.MessageCircle size={16}/><span>{post.comments_count}</span></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"><lucide_react_1.Bookmark size={16}/></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><lucide_react_1.Share2 size={16}/></button>
              </div>
            </framer_motion_1.motion.div>);
            })}
          {posts.length === 0 && <div className="text-center py-16"><p className="text-4xl mb-3">🐾</p><p className="font-semibold text-gray-900 dark:text-white mb-1">{t('socialExtra.noPostsTitle')}</p><p className="text-sm text-gray-500">{t('socialExtra.noPostsDesc')}</p></div>}
        </div>)}
    </div>);
}
