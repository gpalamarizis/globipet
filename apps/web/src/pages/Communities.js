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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Communities;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var react_hot_toast_1 = require("react-hot-toast");
function Communities() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f;
    var user = (0, auth_1.useAuthStore)().user;
    var qc = (0, react_query_1.useQueryClient)();
    var _g = (0, react_1.useState)('list'), view = _g[0], setView = _g[1];
    var _h = (0, react_1.useState)(null), selectedId = _h[0], setSelectedId = _h[1];
    var _j = (0, react_1.useState)(false), showCreateModal = _j[0], setShowCreateModal = _j[1];
    var _k = (0, react_1.useState)(false), gpsLoading = _k[0], setGpsLoading = _k[1];
    var _l = (0, react_1.useState)(null), userCoords = _l[0], setUserCoords = _l[1];
    var _m = (0, react_1.useState)(''), msgText = _m[0], setMsgText = _m[1];
    var _o = (0, react_1.useState)(false), imgUploading = _o[0], setImgUploading = _o[1];
    var messagesEndRef = (0, react_1.useRef)(null);
    var fileInputRef = (0, react_1.useRef)(null);
    var pollRef = (0, react_1.useRef)(null);
    var _p = (0, react_1.useState)({
        name: '', description: '', address: '', city: (user === null || user === void 0 ? void 0 : user.city) || '',
        radius_km: 1.0, latitude: null, longitude: null,
    }), form = _p[0], setForm = _p[1];
    var inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-800 dark:text-white";
    var labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block";
    // Get GPS
    var getGPS = function () {
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(function (pos) { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); react_hot_toast_1.default.success('Τοποθεσία εντοπίστηκε!'); }, function () { setGpsLoading(false); react_hot_toast_1.default.error('Δεν επιτράπηκε πρόσβαση στην τοποθεσία'); });
    };
    var _q = (0, react_query_1.useQuery)({
        queryKey: ['communities', userCoords],
        queryFn: function () { return api_1.api.get('/communities', { params: userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : {} }).then(function (r) { return r.data; }); },
        enabled: !!user,
    }), data = _q.data, isLoading = _q.isLoading;
    var _r = (0, react_query_1.useQuery)({
        queryKey: ['community', selectedId],
        queryFn: function () { return api_1.api.get("/communities/".concat(selectedId)).then(function (r) { return r.data; }); },
        enabled: !!selectedId,
    }), communityData = _r.data, refetchMessages = _r.refetch;
    // Poll messages every 3 seconds when in chat
    (0, react_1.useEffect)(function () {
        if (view === 'chat' && selectedId) {
            pollRef.current = setInterval(function () { return refetchMessages(); }, 3000);
        }
        return function () { if (pollRef.current)
            clearInterval(pollRef.current); };
    }, [view, selectedId]);
    (0, react_1.useEffect)(function () {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    }, [communityData === null || communityData === void 0 ? void 0 : communityData.messages]);
    var createCommunity = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/communities', __assign(__assign({}, form), { latitude: form.latitude, longitude: form.longitude })); },
        onSuccess: function (res) {
            qc.invalidateQueries({ queryKey: ['communities'] });
            setShowCreateModal(false);
            setForm({ name: '', description: '', address: '', city: (user === null || user === void 0 ? void 0 : user.city) || '', radius_km: 1.0, latitude: null, longitude: null });
            react_hot_toast_1.default.success("\u039A\u03BF\u03B9\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1 \u03B4\u03B7\u03BC\u03B9\u03BF\u03C5\u03C1\u03B3\u03AE\u03B8\u03B7\u03BA\u03B5! ".concat(res.data.nearbyInvited > 0 ? "".concat(res.data.nearbyInvited, " \u03C7\u03C1\u03AE\u03C3\u03C4\u03B5\u03C2 \u03B5\u03B9\u03B4\u03BF\u03C0\u03BF\u03B9\u03AE\u03B8\u03B7\u03BA\u03B1\u03BD.") : ''));
        },
        onError: function (e) { return react_hot_toast_1.default.error((e === null || e === void 0 ? void 0 : e.message) || 'Σφάλμα δημιουργίας'); },
    });
    var joinCommunity = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.post("/communities/".concat(id, "/join")); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['communities'] }); qc.invalidateQueries({ queryKey: ['community', selectedId] }); react_hot_toast_1.default.success('Έγινες μέλος!'); },
    });
    var leaveCommunity = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/communities/".concat(id, "/leave")); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['communities'] }); qc.invalidateQueries({ queryKey: ['community', selectedId] }); react_hot_toast_1.default.success('Αποχώρησες'); },
    });
    var sendMessage = (0, react_query_1.useMutation)({
        mutationFn: function (payload) { return api_1.api.post("/communities/".concat(selectedId, "/messages"), payload); },
        onSuccess: function () { refetchMessages(); setMsgText(''); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα αποστολής'); },
    });
    var handleImageUpload = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, url, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file = (_b = e.target.files) === null || _b === void 0 ? void 0 : _b[0];
                    if (!file)
                        return [2 /*return*/];
                    setImgUploading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.uploadFile)(file, 'communities')];
                case 2:
                    url = _c.sent();
                    sendMessage.mutate({ image_url: url });
                    return [3 /*break*/, 5];
                case 3:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('Σφάλμα upload');
                    return [3 /*break*/, 5];
                case 4:
                    setImgUploading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var geocodeAddress = function () { return __awaiter(_this, void 0, void 0, function () {
        var res_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!form.address && !form.city)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, api_1.api.get('/communities/geocode', { params: { address: form.address || form.city } })];
                case 2:
                    res_1 = _b.sent();
                    if (res_1.data.lat) {
                        setForm(function (f) { return (__assign(__assign({}, f), { latitude: res_1.data.lat, longitude: res_1.data.lon })); });
                        react_hot_toast_1.default.success('Διεύθυνση εντοπίστηκε!');
                    }
                    else
                        react_hot_toast_1.default.error('Δεν βρέθηκαν συντεταγμένες');
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('Σφάλμα geocoding');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var openChat = function (id) { setSelectedId(id); setView('chat'); };
    var community = communityData;
    var isMember = community === null || community === void 0 ? void 0 : community.isMember;
    var myEmail = user === null || user === void 0 ? void 0 : user.email;
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {view === 'list' && (<>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <lucide_react_1.Users size={24} className="text-white"/>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Τοπικές Κοινότητες</h1>
                  <p className="text-sm text-gray-500">Βρες ιδιοκτήτες κοντά σου</p>
                </div>
              </div>
              <button onClick={function () { return setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors">
                <lucide_react_1.Plus size={16}/> Νέα Κοινότητα
              </button>
            </div>

            {/* GPS Button */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Εύρεση κοντινών κοινοτήτων</p>
                <p className="text-xs text-gray-400">{userCoords ? "\uD83D\uDCCD GPS \u03B5\u03BD\u03B5\u03C1\u03B3\u03CC" : 'Ενεργοποίησε το GPS για κοντινά αποτελέσματα'}</p>
              </div>
              <button onClick={getGPS} disabled={gpsLoading} className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ".concat(userCoords ? 'bg-green-100 text-green-700' : 'bg-purple-500 text-white hover:bg-purple-600')}>
                {gpsLoading ? <lucide_react_1.Loader2 size={16} className="animate-spin"/> : <lucide_react_1.Navigation size={16}/>}
                {userCoords ? 'GPS Ενεργό' : 'GPS'}
              </button>
            </div>

            {isLoading ? (<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>) : ((_a = data === null || data === void 0 ? void 0 : data.communities) === null || _a === void 0 ? void 0 : _a.length) === 0 ? (<div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                <p className="text-4xl mb-3">🏘️</p>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Δεν βρέθηκαν κοινότητες</p>
                <p className="text-sm text-gray-500 mb-4">Δημιούργησε την πρώτη κοινότητα στην περιοχή σου!</p>
                <button onClick={function () { return setShowCreateModal(true); }} className="px-6 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium">Δημιουργία</button>
              </div>) : (<div className="space-y-3">
                {(_b = data === null || data === void 0 ? void 0 : data.communities) === null || _b === void 0 ? void 0 : _b.map(function (c) {
                    var _a;
                    return (<div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {c.image_url ? (<img src={c.image_url} className="w-14 h-14 rounded-xl object-cover shrink-0" alt={c.name}/>) : (<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-2xl">🏘️</span>
                        </div>)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                          {c.distance !== undefined && (<span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{c.distance.toFixed(1)}km</span>)}
                        </div>
                        {c.description && <p className="text-sm text-gray-500 mb-1 line-clamp-1">{c.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><lucide_react_1.MapPin size={10}/>{c.city}</span>
                          <span className="flex items-center gap-1"><lucide_react_1.Users size={10}/>{c.member_count} μέλη</span>
                          <span>📏 {c.radius_km}km ακτίνα</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                      <button onClick={function () { return openChat(c.id); }} className="flex-1 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-medium">
                        💬 Chat
                      </button>
                      {((_a = c.members) === null || _a === void 0 ? void 0 : _a.some(function (m) { return m.user_email === myEmail; })) ? (<button onClick={function () { return leaveCommunity.mutate(c.id); }} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">
                          Αποχώρηση
                        </button>) : (<button onClick={function () { return joinCommunity.mutate(c.id); }} className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium">
                          Συμμετοχή
                        </button>)}
                    </div>
                  </div>);
                })}
              </div>)}
          </>)}

        {view === 'chat' && community && (<div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Chat header */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-3 flex items-center gap-3">
              <button onClick={function () { return setView('list'); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                <lucide_react_1.ChevronLeft size={18} className="text-gray-500"/>
              </button>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 dark:text-white">{community.name}</h2>
                <p className="text-xs text-gray-400">{community.member_count} μέλη · {community.city}</p>
              </div>
              {!isMember && (<button onClick={function () { return joinCommunity.mutate(community.id); }} className="px-3 py-1.5 bg-purple-500 text-white rounded-xl text-xs font-medium">
                  Συμμετοχή
                </button>)}
            </div>

            {/* Members strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {(_c = community.members) === null || _c === void 0 ? void 0 : _c.map(function (m) { return (<div key={m.user_email} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center">
                    {m.user_photo ? <img src={m.user_photo} className="w-full h-full object-cover"/> : <span className="text-purple-700 text-xs font-bold">{m.user_name[0]}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 max-w-[40px] truncate">{m.user_name.split(' ')[0]}</span>
                </div>); })}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {((_d = community.messages) === null || _d === void 0 ? void 0 : _d.length) === 0 && (<div className="text-center py-8 text-gray-400 text-sm">Δεν υπάρχουν μηνύματα ακόμα. Ξεκίνησε τη συζήτηση!</div>)}
              {(_e = community.messages) === null || _e === void 0 ? void 0 : _e.map(function (msg) {
                var isMe = msg.author_email === myEmail;
                return (<div key={msg.id} className={"flex gap-2 ".concat(isMe ? 'flex-row-reverse' : '')}>
                    <div className="w-7 h-7 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center shrink-0">
                      {msg.author_photo ? <img src={msg.author_photo} className="w-full h-full object-cover"/> : <span className="text-purple-700 text-xs font-bold">{msg.author_name[0]}</span>}
                    </div>
                    <div className={"max-w-[70%] ".concat(isMe ? 'items-end' : 'items-start', " flex flex-col")}>
                      {!isMe && <span className="text-xs text-gray-400 mb-0.5 ml-1">{msg.author_name}</span>}
                      <div className={"rounded-2xl px-3 py-2 ".concat(isMe ? 'bg-purple-500 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm shadow-sm')}>
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                        {msg.image_url && <img src={msg.image_url} className="max-w-full rounded-xl mt-1" alt="img"/>}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 mx-1">{new Date(msg.created_at).toLocaleTimeString('el', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>);
            })}
              <div ref={messagesEndRef}/>
            </div>

            {/* Input */}
            {isMember ? (<div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm flex items-center gap-2">
                <button onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} disabled={imgUploading} className="p-2 text-gray-400 hover:text-purple-500 transition-colors">
                  {imgUploading ? <lucide_react_1.Loader2 size={18} className="animate-spin"/> : <lucide_react_1.Image size={18}/>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                <input className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Γράψε μήνυμα..." value={msgText} onChange={function (e) { return setMsgText(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey && msgText.trim()) {
                e.preventDefault();
                sendMessage.mutate({ content: msgText.trim() });
            } }}/>
                <button onClick={function () { return msgText.trim() && sendMessage.mutate({ content: msgText.trim() }); }} disabled={!msgText.trim() || sendMessage.isPending} className="p-2 bg-purple-500 text-white rounded-xl disabled:opacity-50">
                  <lucide_react_1.Send size={16}/>
                </button>
              </div>) : (<div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-3 text-center text-sm text-purple-600">
                Γίνε μέλος για να στείλεις μήνυμα
              </div>)}
          </div>)}
      </div>

      {/* Create Modal */}
      <framer_motion_1.AnimatePresence>
        {showCreateModal && (<>
            <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={function () { return setShowCreateModal(false); }}/>
            <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέα Κοινότητα</h3>
                <button onClick={function () { return setShowCreateModal(false); }}><lucide_react_1.X size={18} className="text-gray-400"/></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Όνομα *</label><input className={inputCls} value={form.name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { name: e.target.value })); }); }} placeholder="π.χ. Κυνόφιλοι Κολωνακίου"/></div>
                <div><label className={labelCls}>Περιγραφή</label><textarea className={inputCls} rows={2} value={form.description} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { description: e.target.value })); }); }}/></div>
                <div>
                  <label className={labelCls}>Διεύθυνση / Περιοχή *</label>
                  <div className="flex gap-2">
                    <input className={inputCls} value={form.address} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { address: e.target.value })); }); }} placeholder="π.χ. Πλατεία Κολωνακίου, Αθήνα"/>
                    <button onClick={geocodeAddress} className="px-3 py-2 bg-purple-500 text-white rounded-xl text-xs whitespace-nowrap">Εύρεση</button>
                  </div>
                  {form.latitude && <p className="text-xs text-green-600 mt-1">✅ {form.latitude.toFixed(4)}, {(_f = form.longitude) === null || _f === void 0 ? void 0 : _f.toFixed(4)}</p>}
                </div>
                <div><label className={labelCls}>Ή χρησιμοποίησε GPS</label>
                  <button onClick={function () {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    setForm(function (f) { return (__assign(__assign({}, f), { latitude: pos.coords.latitude, longitude: pos.coords.longitude })); });
                    react_hot_toast_1.default.success('GPS εντοπίστηκε!');
                });
            }} className="w-full py-2 border border-purple-200 text-purple-600 rounded-xl text-sm flex items-center justify-center gap-2">
                    <lucide_react_1.Navigation size={14}/> Χρήση GPS
                  </button>
                </div>
                <div><label className={labelCls}>Πόλη *</label><input className={inputCls} value={form.city} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { city: e.target.value })); }); }}/></div>
                <div>
                  <label className={labelCls}>Ακτίνα: {form.radius_km} km</label>
                  <input type="range" min="0.5" max="5" step="0.5" value={form.radius_km} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { radius_km: parseFloat(e.target.value) })); }); }} className="w-full accent-purple-500"/>
                  <div className="flex justify-between text-xs text-gray-400"><span>0.5km</span><span>5km</span></div>
                </div>
              </div>
              <button onClick={function () { return createCommunity.mutate(); }} disabled={!form.name || !form.city || (!form.latitude && !form.address) || createCommunity.isPending} className="w-full mt-4 py-3 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50">
                {createCommunity.isPending ? 'Δημιουργία...' : 'Δημιουργία Κοινότητας'}
              </button>
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
